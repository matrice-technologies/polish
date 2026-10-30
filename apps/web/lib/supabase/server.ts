import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import type { Database } from "@/lib/database.types"

/**
 * Server client for Server Components, Server Actions and Route Handlers.
 * `cookies()` is async in this version of Next, so this helper is too.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Components cannot set cookies. Harmless: proxy.ts refreshes
            // the session on every request, so the write is never actually lost.
          }
        },
      },
    },
  )
}

/**
 * Service-role client. Bypasses RLS entirely, so it is confined to paths that
 * do their own authorization first: widget ingest (validates a project key),
 * the agent API (validates a bearer token) and invitation acceptance
 * (validates an invite token). Never import this into a Client Component.
 */
export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — service-role client unavailable")
  }

  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    cookies: {
      getAll: () => [],
      setAll: () => {},
    },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
