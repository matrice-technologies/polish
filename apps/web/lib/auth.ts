import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import type { WorkspaceRole } from "@/lib/schema"

import { createClient } from "@/lib/supabase/server"

/** The signed-in user, or a redirect to login. `proxy.ts` usually gets there first. */
export async function requireUser(): Promise<User> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")
  return user
}

export interface MembershipSummary {
  workspaceId: string
  workspaceName: string
  workspaceSlug: string
  /** An uploaded logo, or null when the generated mark stands in. */
  workspaceLogoUrl: string | null
  role: WorkspaceRole
}

/**
 * Every workspace the signed-in user belongs to, oldest first.
 *
 * The `user_id` filter is load-bearing and must stay. RLS on workspace_members
 * scopes reads to the workspace, not to the person — a member can see everyone
 * in their workspaces, which is what the members page needs. Without the filter
 * this returns one row per colleague: the same workspace repeats in the switcher,
 * and `role` comes from whichever row sorted first, so a member reads as an owner.
 */
export async function listMemberships(): Promise<MembershipSummary[]> {
  const supabase = await createClient()
  const user = await requireUser()

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, created_at, workspaces!inner(id, name, slug, logo_url)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => ({
    workspaceId: row.workspaces.id,
    workspaceName: row.workspaces.name,
    workspaceSlug: row.workspaces.slug,
    workspaceLogoUrl: row.workspaces.logo_url,
    role: row.role,
  }))
}

/**
 * Resolves a workspace by slug and confirms membership. Returns 404-ish
 * behaviour for non-members: RLS already hides the row, so "not found" and
 * "not allowed" are indistinguishable here — which is the intent.
 */
export async function requireMembership(slug: string): Promise<MembershipSummary> {
  const memberships = await listMemberships()
  const membership = memberships.find((m) => m.workspaceSlug === slug)
  if (!membership) redirect("/")
  return membership
}

export function isAtLeastAdmin(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin"
}
