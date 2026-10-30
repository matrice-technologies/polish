import type { Metadata } from "next"
import { Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { isAtLeastAdmin, requireMembership, requireUser } from "@/lib/auth"
import { listMembers, listPendingInvitations } from "@/lib/queries"
import { formatRelative } from "@/lib/format"

import { SettingsBody, SettingsGroup, SettingsHeader, SettingsTitle } from "../settings-header"

import { InvitationActions } from "./invitation-actions"
import { InviteDialog } from "./invite-dialog"
import { MembersList } from "./members-list"

export const metadata: Metadata = { title: "Members" }

export default async function MembersPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace: slug } = await params

  const user = await requireUser()
  const membership = await requireMembership(slug)
  const admin = isAtLeastAdmin(membership.role)

  const [members, invitations] = await Promise.all([
    listMembers(membership.workspaceId),
    admin ? listPendingInvitations(membership.workspaceId) : Promise.resolve([]),
  ])

  return (
    <>
      <SettingsHeader icon={<Users className="size-4" />} title="Members" />
      <SettingsBody>
        <SettingsTitle
          title="Members"
          description="Manage who belongs to this workspace, set their access, and invite new people."
        />

        <SettingsGroup>
          <MembersList
            workspaceSlug={slug}
            members={members}
            currentUserId={user.id}
            admin={admin}
            // Passed in rather than rendered inside the list: the toolbar lays
            // it out, but only an admin gets one at all.
            inviteSlot={admin ? <InviteDialog workspaceSlug={slug} /> : null}
          />
        </SettingsGroup>

        {admin && invitations.length > 0 ? (
          <SettingsGroup
            title="Pending invitations"
            description="Sent but not yet accepted. They stop working after 7 days."
          >
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableBody>
                  {invitations.map((invitation) => (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal capitalize">
                          {invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        expires {formatRelative(invitation.expiresAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <InvitationActions workspaceSlug={slug} invitationId={invitation.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SettingsGroup>
        ) : null}
      </SettingsBody>
    </>
  )
}
