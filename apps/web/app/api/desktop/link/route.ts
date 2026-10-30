import { NextResponse, type NextRequest } from "next/server"
import { z } from "zod"

import { siteOrigin } from "@/lib/site-url"
import { createServiceClient } from "@/lib/supabase/server"
import { generateDeviceCodes } from "@/lib/tokens"

const bodySchema = z.object({ deviceName: z.string().trim().max(120).optional() })

/** Seconds a link stays approvable — matches the column default. */
const EXPIRES_IN = 600
/** How often the app should poll, in seconds. */
const INTERVAL = 2

/**
 * Step one of the desktop sign-in: the app asks for a pair of codes. It keeps
 * the device code to itself, shows the user code, and opens the verification
 * URL in the browser, where the person approves it.
 *
 * Unauthenticated by design — the caller has no account session yet. All this
 * hands out is a code that does nothing until someone signed in approves it.
 */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 })

  const { deviceCode, deviceCodeHash, userCode } = generateDeviceCodes()
  const supabase = createServiceClient()

  const { error } = await supabase.from("device_links").insert({
    device_code_hash: deviceCodeHash,
    user_code: userCode,
    device_name: parsed.data.deviceName || null,
    expires_at: new Date(Date.now() + EXPIRES_IN * 1000).toISOString(),
  })
  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 })

  const verificationUrl = new URL("/desktop/link", await siteOrigin())
  verificationUrl.searchParams.set("code", userCode)

  return NextResponse.json({
    deviceCode,
    userCode,
    verificationUrl: verificationUrl.toString(),
    expiresIn: EXPIRES_IN,
    interval: INTERVAL,
  })
}
