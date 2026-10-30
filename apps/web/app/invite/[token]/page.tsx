import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

import { Logo } from "@/components/logo"
import { hashSecret } from "@/lib/tokens"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { APP_NAME } from "@/lib/app"

export const metadata: Metadata = { title: "Invitation" }

/**
 * Accepts a workspace invitation.
 *
 * The raw token exists only in the emailed link; the database stores its hash.
 * Lookup therefore happens with the service role — an invitee is by definition
 * not yet a member, so RLS would hide the row from them.
 *
 * Membership is only granted to a signed-in user whose email matches the
 * invitation, so forwarding the link to someone else does not let them in.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const service = createServiceClient()
  const { data: invitation } = await service
    .from("workspace_invitations")
    .select("id, workspace_id, email, role, expires_at, accepted_at, workspaces(name, slug)")
    .eq("token_hash", hashSecret(token))
    .maybeSingle()

  const problem = (title: string, description: string) => (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="size-8" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" render={<Link href="/" />}>
              Go to {APP_NAME}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )

  if (!invitation || !invitation.workspaces) {
    return problem("Invitation not found", "This link is not valid. Ask for a new invitation.")
  }

  if (invitation.accepted_at) {
    return problem("Already accepted", "This invitation has been used already.")
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return problem("Invitation expired", "Invitations last 7 days. Ask for a fresh one.")
  }

  // Signed out: bounce through login and come back here afterwards.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`)
  }

  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return problem(
      "Wrong account",
      `This invitation was sent to ${invitation.email}, but you are signed in as ${user.email}. Sign out and sign back in with the invited address.`,
    )
  }

  // Service role again: the insert must succeed before the user is a member,
  // and the admin-only insert policy would refuse it.
  const { error: memberError } = await service
    .from("workspace_members")
    .insert({
      workspace_id: invitation.workspace_id,
      user_id: user.id,
      role: invitation.role,
    })

  // A duplicate simply means they were already added; carry on to the workspace.
  if (memberError && memberError.code !== "23505") {
    return problem("Could not join", "Something went wrong accepting this invitation.")
  }

  await service
    .from("workspace_invitations")
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq("id", invitation.id)

  redirect(`/${invitation.workspaces.slug}`)
}
