"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/database.types"

/**
 * Browser client. Holds the anon key only — every row it can reach is decided
 * by RLS against the signed-in user.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
