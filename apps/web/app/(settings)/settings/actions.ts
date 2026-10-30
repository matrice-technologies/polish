"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUser } from "@/lib/auth"
import { AVATAR_BUCKET, removeImage, uploadImage } from "@/lib/storage"
import { createClient } from "@/lib/supabase/server"

export interface AccountSettingsState {
  status: "idle" | "saved" | "error"
  message?: string
}

const nameSchema = z.object({
  fullName: z.string().trim().max(80, "Keep it under 80 characters"),
})

/**
 * The display name, which is what shows in the sidebar and against anything
 * attributed to this person.
 *
 * Stored in the auth user's metadata rather than a profiles table: it is the
 * same field Google fills in on OAuth sign-up, so there is one place it lives
 * however the account was created.
 */
export async function updateAccountName(
  _prev: AccountSettingsState,
  formData: FormData,
): Promise<AccountSettingsState> {
  await requireUser()

  const parsed = nameSchema.safeParse({ fullName: String(formData.get("fullName") ?? "") })
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({
    data: { full_name: parsed.data.fullName || null },
  })

  if (error) return { status: "error", message: error.message }

  // The name is rendered by the sidebar, which lives in the app layout.
  revalidatePath("/", "layout")
  return { status: "saved" }
}

export async function updateAccountAvatar(
  _prev: AccountSettingsState,
  formData: FormData,
): Promise<AccountSettingsState> {
  const user = await requireUser()

  const uploaded = await uploadImage(formData.get("avatar"), user.id, AVATAR_BUCKET)
  if ("error" in uploaded) return { status: "error", message: uploaded.error }

  const supabase = await createClient()
  const previous = (user.user_metadata?.avatar_url as string | undefined) ?? null

  const { error } = await supabase.auth.updateUser({ data: { avatar_url: uploaded.url } })
  if (error) {
    await removeImage(uploaded.url)
    return { status: "error", message: error.message }
  }

  // A Google profile picture from OAuth sign-in is not one of ours, and
  // removeImage ignores anything outside our own buckets.
  await removeImage(previous)

  revalidatePath("/", "layout")
  return { status: "saved" }
}

export async function removeAccountAvatar(): Promise<void> {
  const user = await requireUser()
  const supabase = await createClient()

  const previous = (user.user_metadata?.avatar_url as string | undefined) ?? null
  await supabase.auth.updateUser({ data: { avatar_url: null } })
  await removeImage(previous)

  revalidatePath("/", "layout")
}
