import "server-only"

import type { WorkspaceRole } from "@/lib/schema"
import { createClient } from "@/lib/supabase/server"

/**
 * Read helpers shared by the layout shell and the pages inside it. Everything
 * here runs as the signed-in user, so RLS — not these queries — is what decides
 * visibility. A missing row and a forbidden row are indistinguishable on purpose.
 */

/* ------------------------------------------------------------ projects ---- */

export interface ProjectListItem {
  id: string
  name: string
  slug: string
  /** An uploaded logo, or null when the generated mark stands in. */
  logoUrl: string | null
}

export async function listProjects(workspaceId: string): Promise<ProjectListItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, slug, logo_url")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    logoUrl: row.logo_url,
  }))
}

export async function getProject(
  workspaceId: string,
  slug: string,
): Promise<ProjectListItem | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, slug, logo_url")
    .eq("workspace_id", workspaceId)
    .eq("slug", slug)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    logoUrl: data.logo_url,
  }
}

/* ------------------------------------------------------------- members ---- */

export interface MemberRow {
  userId: string
  email: string | null
  fullName: string | null
  avatarUrl: string | null
  role: WorkspaceRole
  joinedAt: string
}

export async function listMembers(workspaceId: string): Promise<MemberRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("workspace_members")
    .select("user_id, role, created_at, profiles!inner(email, full_name, avatar_url)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => ({
    userId: row.user_id,
    email: row.profiles.email,
    fullName: row.profiles.full_name,
    avatarUrl: row.profiles.avatar_url,
    role: row.role,
    joinedAt: row.created_at,
  }))
}

export interface InvitationRow {
  id: string
  email: string
  role: WorkspaceRole
  expiresAt: string
  createdAt: string
}

export async function listPendingInvitations(workspaceId: string): Promise<InvitationRow[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("workspace_invitations")
    .select("id, email, role, expires_at, created_at")
    .eq("workspace_id", workspaceId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  }))
}
