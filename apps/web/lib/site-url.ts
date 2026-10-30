import "server-only"

import { headers } from "next/headers"

/**
 * The app's public origin, e.g. `https://app.example.com`.
 *
 * Do **not** use `request.nextUrl.origin` behind a reverse proxy: the server
 * sees its own bind address, so that yields `https://0.0.0.0:3000` in
 * production. The real host arrives in the forwarded headers Traefik sets.
 *
 * Used anywhere a URL is handed to someone outside the request — magic links,
 * invitations, the CLI login page, the widget snippet.
 */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/$/, "")

  const headerList = await headers()
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host")
  const protocol = headerList.get("x-forwarded-proto") ?? "http"

  return `${protocol}://${host}`
}
