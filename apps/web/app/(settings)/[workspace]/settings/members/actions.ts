"use server"

import { revalidatePath } from "next/cache"
import { inviteMemberSchema, updateMemberRoleSchema } from "@/lib/schema"

import { isAtLeastAdmin, requireMembership, requireUser } from "@/lib/auth"
import { invitationEmail, sendEmail } from "@/lib/email"
import { generateInviteToken } from "@/lib/tokens"
import { listMembers } from "@/lib/queries"
import { createClient } from "@/lib/supabase/server"
import { siteOrigin } from "@/lib/site-url"

export interface InviteFormState {
  status: "idle" | "sent" | "error"
  message?: string
  /** Set when the invite exists but the email could not be delivered. */
  manualLink?: string
}

/** Matches the `expires_at` default on workspace_invitations. */
const INVITE_TTL_DAYS = 7

function invitationExpiry(): string {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * Emails an invitation link and turns the outcome into form state.
 *
 * The raw token is never stored — only its hash — so if delivery fails the link
 * has to be surfaced here or it is gone for good. That is why a failure still
 * reports `sent`: the invitation itself is perfectly valid, and the admin can
 * pass the link along by hand.
 */
async function deliverInvitation({
  email,
  token,
  workspaceName,
  inviterName,
}: {
  email: string
  token: string
  workspaceName: string
  inviterName: string
}): Promise<InviteFormState> {
  const origin = await siteOrigin()
  const acceptUrl = `${origin}/invite/${token}`

  const result = await sendEmail({
    to: email,
    ...invitationEmail({ workspaceName, inviterName, acceptUrl }),
  })

  if (!result.sent) {
    return {
      status: "sent",
      message: `Invitation created, but the email could not be sent (${result.error}). Share this link instead:`,
      manualLink: acceptUrl,
    }
  }

  return { status: "sent", message: `Invitation sent to ${email}.` }
}

/** Display name for the person doing the inviting, for the email subject. */
function inviterNameOf(user: { user_metadata?: Record<string, unknown>; email?: string }): string {
  return (user.user_metadata?.full_name as string | undefined) || user.email || "A teammate"
}

export async function inviteMember(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "")
  const membership = await requireMembership(workspaceSlug)

  if (!isAtLeastAdmin(membership.role)) {
    return { status: "error", message: "Only admins and owners can invite people." }
  }

  const parsed = inviteMemberSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    role: String(formData.get("role") ?? "member"),
  })

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message }
  }

  const user = await requireUser()
  const supabase = await createClient()

  // Inviting someone who is already here would create a pending row that can
  // never do anything: accepting it hits the members primary key and drops out.
  // Say so instead of reporting a sent invitation that leads nowhere.
  const members = await listMembers(membership.workspaceId)
  if (members.some((member) => member.email?.toLowerCase() === parsed.data.email.toLowerCase())) {
    return { status: "error", message: `${parsed.data.email} is already in this workspace.` }
  }

  const token = generateInviteToken()

  // Replace any outstanding invitation for this address: the partial unique
  // index only permits one pending row per workspace and email.
  await supabase
    .from("workspace_invitations")
    .delete()
    .eq("workspace_id", membership.workspaceId)
    .is("accepted_at", null)
    .ilike("email", parsed.data.email)

  const { error } = await supabase.from("workspace_invitations").insert({
    workspace_id: membership.workspaceId,
    email: parsed.data.email,
    role: parsed.data.role,
    token_hash: token.hash,
    invited_by: user.id,
  })

  if (error) return { status: "error", message: error.message }

  const state = await deliverInvitation({
    email: parsed.data.email,
    token: token.raw,
    workspaceName: membership.workspaceName,
    inviterName: inviterNameOf(user),
  })

  revalidatePath(`/${workspaceSlug}/settings/members`)
  return state
}

/**
 * Issues a fresh link for an invitation that is already pending.
 *
 * The stored token cannot be read back, so this rotates it rather than resending
 * the original — which also means an expired invitation can be revived without
 * revoking and retyping the address. The old link stops working immediately.
 */
export async function resendInvitation(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "")
  const invitationId = String(formData.get("invitationId") ?? "")
  const membership = await requireMembership(workspaceSlug)

  if (!isAtLeastAdmin(membership.role)) {
    return { status: "error", message: "Only admins and owners can invite people." }
  }

  const user = await requireUser()
  const supabase = await createClient()
  const token = generateInviteToken()

  // Scoped to the workspace the caller is an admin of, and to invitations that
  // are still pending — a re-send must not resurrect one already accepted.
  const { data, error } = await supabase
    .from("workspace_invitations")
    .update({
      token_hash: token.hash,
      expires_at: invitationExpiry(),
      invited_by: user.id,
    })
    .eq("id", invitationId)
    .eq("workspace_id", membership.workspaceId)
    .is("accepted_at", null)
    .select("email")
    .maybeSingle()

  if (error) return { status: "error", message: error.message }
  if (!data) return { status: "error", message: "That invitation is no longer pending." }

  const state = await deliverInvitation({
    email: data.email,
    token: token.raw,
    workspaceName: membership.workspaceName,
    inviterName: inviterNameOf(user),
  })

  revalidatePath(`/${workspaceSlug}/settings/members`)
  return state
}

export async function revokeInvitation(formData: FormData) {
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "")
  const invitationId = String(formData.get("invitationId") ?? "")
  const membership = await requireMembership(workspaceSlug)

  if (!isAtLeastAdmin(membership.role)) return

  const supabase = await createClient()
  await supabase
    .from("workspace_invitations")
    .delete()
    .eq("id", invitationId)
    .eq("workspace_id", membership.workspaceId)

  revalidatePath(`/${workspaceSlug}/settings/members`)
}

export async function updateMemberRole(formData: FormData) {
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "")
  const userId = String(formData.get("userId") ?? "")
  const membership = await requireMembership(workspaceSlug)

  if (!isAtLeastAdmin(membership.role)) return

  const parsed = updateMemberRoleSchema.safeParse({ role: String(formData.get("role") ?? "") })
  if (!parsed.success) return

  const supabase = await createClient()

  // The last-owner trigger refuses a demotion that would strand the workspace,
  // so no check is needed here.
  await supabase
    .from("workspace_members")
    .update({ role: parsed.data.role })
    .eq("workspace_id", membership.workspaceId)
    .eq("user_id", userId)

  revalidatePath(`/${workspaceSlug}/settings/members`)
}

export async function removeMember(formData: FormData) {
  const workspaceSlug = String(formData.get("workspaceSlug") ?? "")
  const userId = String(formData.get("userId") ?? "")
  const membership = await requireMembership(workspaceSlug)

  const user = await requireUser()
  const removingSelf = user.id === userId

  if (!removingSelf && !isAtLeastAdmin(membership.role)) return

  const supabase = await createClient()
  await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", membership.workspaceId)
    .eq("user_id", userId)

  revalidatePath(`/${workspaceSlug}/settings/members`)
}
