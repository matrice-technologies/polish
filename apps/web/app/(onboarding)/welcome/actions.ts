"use server"

import { redirect } from "next/navigation"
import { createWorkspaceSchema } from "@/lib/schema"

import { requireUser } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { UNIQUE_VIOLATION, slugify, withSuffix } from "@/lib/slug"

export interface WorkspaceFormState {
  status: "idle" | "error"
  message?: string
  name?: string
}

export async function createWorkspace(
  _prevState: WorkspaceFormState,
  formData: FormData,
): Promise<WorkspaceFormState> {
  await requireUser()
  const rawName = String(formData.get("name") ?? "")

  const parsed = createWorkspaceSchema.safeParse({ name: rawName })
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message, name: rawName }
  }

  const supabase = await createClient()
  const { name } = parsed.data

  // Goes through a SECURITY DEFINER function rather than a plain insert.
  // `INSERT ... RETURNING` also applies the SELECT policy to the new row, and
  // that policy requires membership — which the AFTER INSERT trigger has not
  // granted yet at that point, so a direct insert always fails RLS.
  //
  // Try the clean slug first, then suffixed variants. Retrying on the unique
  // constraint is race-free in a way that a pre-flight SELECT is not.
  let slug = slugify(name)
  let createdSlug: string | null = null

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase.rpc("create_workspace", {
      workspace_name: name,
      workspace_slug: slug,
    })

    if (!error && data) {
      createdSlug = data.slug
      break
    }

    if (error && error.code !== UNIQUE_VIOLATION) {
      return { status: "error", message: error.message, name }
    }

    slug = withSuffix(slugify(name))
  }

  if (!createdSlug) {
    return {
      status: "error",
      message: "Could not find an available workspace URL. Try a different name.",
      name,
    }
  }

  // The trigger on `workspaces` has already made this user its owner.
  redirect(`/${createdSlug}`)
}
