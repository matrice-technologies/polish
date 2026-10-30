"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"

/**
 * "Log in", or "Open app" for someone who already is. Decided from the
 * presence of the Supabase session cookie rather than by asking the server, so
 * the marketing pages stay static. A stale cookie only costs a trip through
 * /login, which sends a signed-out visitor to the form anyway.
 */
function hasSession(): boolean {
  return /(?:^|;\s*)sb-[^=]+-auth-token(?:\.\d+)?=/.test(document.cookie)
}

export function AccountLink({ className }: { className?: string }) {
  const signedIn = useSyncExternalStore(
    () => () => {},
    hasSession,
    () => false,
  )

  return (
    <Link href={signedIn ? "/prompts" : "/login"} className={className}>
      {signedIn ? "Open app" : "Log in"}
    </Link>
  )
}
