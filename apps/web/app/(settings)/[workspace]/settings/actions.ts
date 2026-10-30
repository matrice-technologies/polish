"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createWorkspaceSchema } from "@/lib/schema"

import { isAtLeastAdmin, requireMembership } from "@/lib/auth"
import { removeImage, uploadImage } from "@/lib/storage"
import { createClient } from "@/lib/supabase/server"

export interface WorkspaceSettingsState {
  status: "idle" | "saved" | "error"
  message?: string
}

export async function renameWorkspace(
  _prev: WorkspaceSettingsState,
  formData: FormData,
): Promise<WorkspaceSettingsState> {
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "")
  const membership = await requireMembership(workspaceSlug)

  if (!isAtLeastAdmin(membership.role)) {
    return { status: "error", message: "Only admins and owners can rename a workspace." }
  }

  const parsed = createWorkspaceSchema.safeParse({ name: String(formData.get("name") ?? "") })
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("workspaces")
    .update({ name: parsed.data.name })
    .eq("id", membership.workspaceId)

  if (error) return { status: "error", message: error.message }

  // The name shows in the sidebar switcher, which lives in the layout.
  revalidatePath(`/${workspaceSlug}`, "layout")
  return { status: "saved" }
}

export async function deleteWorkspace(formData: FormData) {
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "")
  const confirmation = String(formData.get("confirm") ?? "")
  const membership = await requireMembership(workspaceSlug)

  // Owner-only, and the name must be typed out: this cascades to every project,
  // report and screenshot in the workspace.
  if (membership.role !== "owner") redirect(`/${workspaceSlug}/settings?error=owner`)
  if (confirmation !== membership.workspaceName) {
    redirect(`/${workspaceSlug}/settings?error=confirm`)
  }

  const supabase = await createClient()
  await supabase.from("workspaces").delete().eq("id", membership.workspaceId)

  redirect("/")
}

/* ---------------------------------------------------------------- logo ---- */

async function currentLogo(workspaceId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("workspaces")
    .select("logo_url")
    .eq("id", workspaceId)
    .single()

  return data?.logo_url ?? null
}

export async function updateWorkspaceLogo(
  _prev: WorkspaceSettingsState,
  formData: FormData,
): Promise<WorkspaceSettingsState> {
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "")
  const membership = await requireMembership(workspaceSlug)

  if (!isAtLeastAdmin(membership.role)) {
    return { status: "error", message: "Only admins and owners can change the logo." }
  }

  const uploaded = await uploadImage(formData.get("logo"), membership.workspaceId)
  if ("error" in uploaded) return { status: "error", message: uploaded.error }

  const supabase = await createClient()
  const previous = await currentLogo(membership.workspaceId)

  const { error } = await supabase
    .from("workspaces")
    .update({ logo_url: uploaded.url })
    .eq("id", membership.workspaceId)

  if (error) {
    // Do not strand the object we just wrote when the pointer to it failed.
    await removeImage(uploaded.url)
    return { status: "error", message: error.message }
  }

  await removeImage(previous)
  // The mark shows in the switcher, which lives in the workspace layout.
  revalidatePath("/", "layout")
  return { status: "saved" }
}

export async function removeWorkspaceLogo(formData: FormData): Promise<void> {
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "")
  const membership = await requireMembership(workspaceSlug)
  if (!isAtLeastAdmin(membership.role)) return

  const supabase = await createClient()
  const previous = await currentLogo(membership.workspaceId)

  await supabase.from("workspaces").update({ logo_url: null }).eq("id", membership.workspaceId)
  await removeImage(previous)

  revalidatePath("/", "layout")
}
