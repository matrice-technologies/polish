import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/lib/database.types"

/**
 * Runs before every matched request to refresh the Supabase session cookie and
 * bounce signed-out visitors away from the dashboard.
 *
 * In Next 16 this is `proxy.ts`, not `middleware.ts`, and it runs on the Node
 * runtime by default — which is what `@supabase/ssr` needs.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // getUser() revalidates the token with the auth server. Do not swap this for
  // getSession(), which trusts whatever the cookie claims.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  // /invite handles its own auth: it needs to render "expired" or "wrong
  // account" for a signed-out visitor rather than bounce them to a login page
  // that explains nothing. "/" is the landing page when signed out and a
  // redirect into the workspace when not, so it decides for itself too.
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/download") ||
    pathname.startsWith("/privacy") ||
    pathname.startsWith("/terms")

  if (!user && !isPublicRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/login"
    // Preserve where they were headed so login can return them there — query
    // included, since /desktop/link carries the code being approved in it.
    redirectUrl.search = ""
    redirectUrl.searchParams.set("next", pathname + request.nextUrl.search)
    return NextResponse.redirect(redirectUrl)
  }

  if (user && pathname.startsWith("/login")) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = "/"
    redirectUrl.search = ""
    return NextResponse.redirect(redirectUrl)
  }

  // Returning `response` (not a fresh NextResponse) preserves refreshed cookies.
  return response
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and `/api`.
     *
     * Every API route authenticates itself — the desktop link endpoints by
     * device code — and none of them use the session cookie. Running the proxy
     * over them would redirect an unauthenticated call to /login and answer a
     * machine client with an HTML page instead of the error it can act on.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|css)$).*)",
  ],
}
