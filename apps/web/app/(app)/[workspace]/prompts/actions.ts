"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { promptInputSchema, syncedSettingsSchema, type Prompt, type SyncedSettings } from "@polish/shared"

import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export type ActionResult = { ok: true } | { ok: false; message: string }

type PromptWrite = Pick<Prompt, "id" | "name" | "instructions" | "shortcut" | "position">

const promptWriteSchema = promptInputSchema.extend({
  id: z.uuid(),
  position: z.number().int(),
})

/**
 * Creates or updates a prompt. Upserted on (user_id, id) because a built-in
 * prompt has no row until the first time it is edited.
 *
 * `updated_at` is stamped here, at the moment of the edit, which is what the
 * desktop app's last-write-wins merge compares against its own edits.
 */
export async function savePrompt(input: PromptWrite): Promise<ActionResult> {
  const user = await requireUser()

  const parsed = promptWriteSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from("prompts").upsert(
    {
      ...parsed.data,
      user_id: user.id,
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
    { onConflict: "user_id,id" },
  )

  if (error) return { ok: false, message: error.message }

  revalidatePath("/[workspace]/prompts", "page")
  return { ok: true }
}

/** Deletes by tombstone, so the desktop app learns of it on its next sync. */
export async function deletePrompt(prompt: PromptWrite): Promise<ActionResult> {
  const user = await requireUser()

  const parsed = promptWriteSchema.safeParse(prompt)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const now = new Date().toISOString()
  const supabase = await createClient()
  const { error } = await supabase.from("prompts").upsert(
    { ...parsed.data, user_id: user.id, updated_at: now, deleted_at: now },
    { onConflict: "user_id,id" },
  )

  if (error) return { ok: false, message: error.message }

  revalidatePath("/[workspace]/prompts", "page")
  return { ok: true }
}

export async function saveSettings(settings: SyncedSettings): Promise<ActionResult> {
  const user = await requireUser()

  const parsed = syncedSettingsSchema.safeParse(settings)
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from("user_settings").upsert(
    { user_id: user.id, settings: parsed.data, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  )

  if (error) return { ok: false, message: error.message }

  revalidatePath("/[workspace]/prompts", "page")
  return { ok: true }
}
