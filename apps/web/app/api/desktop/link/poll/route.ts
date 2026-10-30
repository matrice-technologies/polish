import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { clientIp, rateLimit } from "@/lib/rate-limit"
import { createServiceClient } from "@/lib/supabase/server"
import { hashSecret } from "@/lib/tokens"

const bodySchema = z.object({ deviceCode: z.string().min(20).max(200) })

/**
 * Step two of the desktop sign-in: the app polls with its device code until the
 * person has approved the matching user code.
 *
 * Once approved, the link is consumed and the app is handed the hashed token of
 * a freshly generated magic link for that person. The app exchanges it with
 * Supabase (`verifyOtp`) for a session of its own — a real refresh token, so it
 * then talks to Supabase directly under RLS, and this app is out of the loop.
 * The token is single-use and short-lived; the device code that fetches it is
 * a 256-bit secret only the app holds.
 *
 * Responses: 202 pending, 410 expired or already used, 200 approved.
 */
export async function POST(request: NextRequest) {
  // The app polls every two seconds; this leaves room for a few at once.
  const limited = rateLimit(`poll:${clientIp(request)}`, 120, 60 * 1000)
  if (!limited.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "retry-after": String(limited.retryAfter) } },
    )
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  const supabase = createServiceClient()
  const { data: link, error } = await supabase
    .from("device_links")
    .select("id, user_id, approved_at, consumed_at, expires_at")
    .eq("device_code_hash", hashSecret(parsed.data.deviceCode))
    .maybeSingle()

  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 })
  if (!link) return NextResponse.json({ error: "invalid_device_code" }, { status: 404 })
  if (link.consumed_at) return NextResponse.json({ status: "used" }, { status: 410 })

  if (!link.approved_at || !link.user_id) {
    if (Date.parse(link.expires_at) < Date.now()) {
      return NextResponse.json({ status: "expired" }, { status: 410 })
    }
    return NextResponse.json({ status: "pending" }, { status: 202 })
  }

  // Claim it. The `consumed_at is null` guard makes two concurrent polls race
  // for one row update, so only one of them is ever handed a token.
  const { data: claimed } = await supabase
    .from("device_links")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", link.id)
    .is("consumed_at", null)
    .select("id")
  if (!claimed?.length) return NextResponse.json({ status: "used" }, { status: 410 })

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(link.user_id)
  const email = userData?.user?.email
  if (userError || !email) return NextResponse.json({ error: "server_error" }, { status: 500 })

  // Generating a link does not send one: nothing reaches the person's inbox.
  const { data: generated, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email,
  })
  if (linkError || !generated.properties?.hashed_token) {
    return NextResponse.json({ error: "server_error" }, { status: 500 })
  }

  return NextResponse.json({
    status: "approved",
    email,
    tokenHash: generated.properties.hashed_token,
    // Public values; the app needs them to reach Supabase directly.
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
}
