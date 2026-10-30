"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { isAtLeastAdmin, requireMembership, requireUser } from "@/lib/auth"
import { removeImage, uploadImage } from "@/lib/storage"
import { createProjectSchema } from "@/lib/schema"
import { createClient } from "@/lib/supabase/server"
import { UNIQUE_VIOLATION, slugify, withSuffix } from "@/lib/slug"

export interface ProjectFormState {
  status: "idle" | "error" | "saved"
  message?: string
  fieldErrors?: Record<string, string>
}

function parse(formData: FormData) {
  return createProjectSchema.safeParse({ name: String(formData.get("name") ?? "") })
}

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {}
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form")
    errors[key] ??= issue.message
  }
  return errors
}

export async function createProject(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "")
  const membership = await requireMembership(workspaceSlug)

  if (!isAtLeastAdmin(membership.role)) {
    return { status: "error", message: "Only admins and owners can create projects." }
  }

  const parsed = parse(formData)
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error.issues) }
  }

  const { name } = parsed.data
  const user = await requireUser()
  const supabase = await createClient()

  let slug = slugify(name)
  let createdSlug: string | null = null

  // No `.select()` on purpose — see the note in the welcome action: an
  // INSERT..RETURNING is also filtered by the SELECT policy.
  //
  // Retried rather than checked first: two people creating "Website" at the
  // same moment both pass a lookup and only the unique index can settle it.
  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase.from("projects").insert({
      workspace_id: membership.workspaceId,
      name,
      slug,
      created_by: user.id,
    })

    if (!error) {
      createdSlug = slug
      break
    }

    if (error.code !== UNIQUE_VIOLATION) {
      return { status: "error", message: error.message }
    }

    slug = withSuffix(slugify(name))
  }

  if (!createdSlug) {
    return { status: "error", message: "Could not find an available project URL." }
  }

  revalidatePath(`/${workspaceSlug}`, "layout")
  redirect(`/${workspaceSlug}/${createdSlug}`)
}

export async function updateProject(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "")
  const projectId = String(formData.get("projectId") ?? "")
  const membership = await requireMembership(workspaceSlug)

  if (!isAtLeastAdmin(membership.role)) {
    return { status: "error", message: "Only admins and owners can change project settings." }
  }

  const parsed = parse(formData)
  if (!parsed.success) {
    return { status: "error", fieldErrors: toFieldErrors(parsed.error.issues) }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("projects")
    .update({ name: parsed.data.name })
    .eq("id", projectId)
    .eq("workspace_id", membership.workspaceId)

  if (error) return { status: "error", message: error.message }

  revalidatePath(`/${workspaceSlug}`, "layout")
  return { status: "saved" }
}

/* ---------------------------------------------------------------- logo ---- */

async function currentLogo(projectId: string, workspaceId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("projects")
    .select("logo_url")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .single()

  return data?.logo_url ?? null
}

export async function updateProjectLogo(
  _prev: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "")
  const projectId = String(formData.get("projectId") ?? "")
  const membership = await requireMembership(workspaceSlug)

  if (!isAtLeastAdmin(membership.role)) {
    return { status: "error", message: "Only admins and owners can change the logo." }
  }

  // Keyed by workspace, not project: the storage policy checks workspace
  // membership on the first path segment, and a project id would tell it
  // nothing it could check.
  const uploaded = await uploadImage(formData.get("logo"), `${membership.workspaceId}/${projectId}`)
  if ("error" in uploaded) return { status: "error", message: uploaded.error }

  const supabase = await createClient()
  const previous = await currentLogo(projectId, membership.workspaceId)

  const { error } = await supabase
    .from("projects")
    .update({ logo_url: uploaded.url })
    .eq("id", projectId)
    .eq("workspace_id", membership.workspaceId)

  if (error) {
    await removeImage(uploaded.url)
    return { status: "error", message: error.message }
  }

  await removeImage(previous)
  revalidatePath(`/${workspaceSlug}`, "layout")
  return { status: "saved" }
}

export async function removeProjectLogo(formData: FormData): Promise<void> {
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "")
  const projectId = String(formData.get("projectId") ?? "")
  const membership = await requireMembership(workspaceSlug)
  if (!isAtLeastAdmin(membership.role)) return

  const supabase = await createClient()
  const previous = await currentLogo(projectId, membership.workspaceId)

  await supabase
    .from("projects")
    .update({ logo_url: null })
    .eq("id", projectId)
    .eq("workspace_id", membership.workspaceId)

  await removeImage(previous)
  revalidatePath(`/${workspaceSlug}`, "layout")
}

export async function deleteProject(formData: FormData) {
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "")
  const projectId = String(formData.get("projectId") ?? "")
  const membership = await requireMembership(workspaceSlug)

  if (!isAtLeastAdmin(membership.role)) redirect(`/${workspaceSlug}`)

  const supabase = await createClient()
  await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("workspace_id", membership.workspaceId)

  revalidatePath(`/${workspaceSlug}`, "layout")
  redirect(`/${workspaceSlug}`)
}
