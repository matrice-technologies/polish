import "server-only"

import {
  DEFAULT_PROMPTS,
  livePrompts,
  mergePrompts,
  parseSettings,
  promptFromRow,
  type Prompt,
  type SyncedSettings,
} from "@polish/shared"

import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

/**
 * The signed-in person's prompts, built-ins included.
 *
 * Built-ins are merged in rather than seeded: someone who signs up on the web
 * and never opens the desktop app has no rows yet, but should see the same
 * starting prompts the app would give them. They share fixed ids with the app's
 * copies, so editing one here and syncing the app later lands on the same row,
 * and deleting one leaves a tombstone that outranks the built-in.
 */
export async function listPrompts(): Promise<Prompt[]> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("prompts")
    .select("id, name, instructions, shortcut, position, updated_at, deleted_at")
    .eq("user_id", user.id)

  if (error) throw error

  const { prompts } = mergePrompts(DEFAULT_PROMPTS, (data ?? []).map(promptFromRow))
  return livePrompts(prompts)
}

export async function getSyncedSettings(): Promise<SyncedSettings> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("user_settings")
    .select("settings")
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) throw error
  return parseSettings(data?.settings)
}
