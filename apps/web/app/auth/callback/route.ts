import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { siteOrigin } from "@/lib/site-url"

/**
 * Landing point for both magic links and the Google redirect. Exchanges the
 * one-time code for a session cookie, then forwards the user on.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  // Not `request.nextUrl.origin`: behind the proxy that is the container's own
  // bind address, so every redirect below would land the user on
  // https://0.0.0.0:3000. The session cookie is set either way, which is why
  // this only showed up as a dead page a refresh could recover from.
  const origin = await siteOrigin()
  const code = searchParams.get("code")
  const next = searchParams.get("next")

  // Supabase reports provider failures (denied consent, misconfigured client)
  // on the redirect itself rather than as a failed exchange.
  const authError = searchParams.get("error_description") ?? searchParams.get("error")
  if (authError) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(authError)}`)
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That sign-in link is invalid or has already been used.")}`,
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That sign-in link has expired. Request a new one.")}`,
    )
  }

  // Only ever redirect to a path on this origin — an absolute `next` would make
  // this an open redirect that leaks the freshly minted session.
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/"

  return NextResponse.redirect(`${origin}${destination}`)
}
