"use client"

import { useState } from "react"
import { MoreVertical, Search, ShieldCheck, UserRound } from "lucide-react"
import { WORKSPACE_ROLES, type WorkspaceRole } from "@/lib/schema"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { MemberRow } from "@/lib/queries"
import { cn } from "@/lib/utils"

import { removeMember, updateMemberRole } from "./actions"

function initials(name: string | null, email: string | null) {
  const source = (name ?? "").trim() || (email ?? "?")
  const parts = source.split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase()
}

/** Tinted pill per role, so seniority is legible without reading the word. */
const ROLE_STYLES: Record<WorkspaceRole, string> = {
  owner: "bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400",
  admin: "bg-violet-500/10 text-violet-700 dark:bg-violet-400/15 dark:text-violet-400",
  member: "bg-muted text-muted-foreground",
}

export function MembersList({
  workspaceSlug,
  members,
  currentUserId,
  admin,
  inviteSlot,
}: {
  workspaceSlug: string
  members: MemberRow[]
  currentUserId: string
  admin: boolean
  inviteSlot: React.ReactNode
}) {
  const [query, setQuery] = useState("")

  const needle = query.trim().toLowerCase()
  const shown = needle
    ? members.filter((member) =>
        `${member.fullName ?? ""} ${member.email ?? ""}`.toLowerCase().includes(needle)
      )
    : members

  const owners = members.filter((member) => member.role === "owner").length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name or email"
            aria-label="Search members"
            className="h-9 pl-8"
          />
        </div>
        {inviteSlot}
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <span className="flex items-center gap-1.5">
                  <UserRound className="size-3.5" />
                  User
                </span>
              </TableHead>
              <TableHead>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5" />
                  Role
                </span>
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground py-8 text-center">
                  No one matches “{query}”.
                </TableCell>
              </TableRow>
            ) : null}

            {shown.map((member) => {
              const isSelf = member.userId === currentUserId
              // The database refuses to strand a workspace; mirror that here so
              // the control is not offered when it would fail.
              const isLastOwner = member.role === "owner" && owners === 1
              const canChangeRole = admin && !isLastOwner
              const canRemove = (admin || isSelf) && !isLastOwner

              return (
                <TableRow key={member.userId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        {member.avatarUrl ? <AvatarImage src={member.avatarUrl} alt="" /> : null}
                        <AvatarFallback className="text-xs">
                          {initials(member.fullName, member.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                        <span className="truncate text-sm font-medium">
                          {member.fullName ?? member.email}
                          {isSelf ? (
                            <span className="text-muted-foreground font-normal"> (You)</span>
                          ) : null}
                        </span>
                        {member.fullName ? (
                          <span className="text-muted-foreground truncate text-xs">
                            {member.email}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={cn("font-normal capitalize", ROLE_STYLES[member.role])}
                    >
                      {member.role}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-right">
                    {canChangeRole || canRemove ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={<Button variant="ghost" size="icon-sm" />}
                          aria-label={`Actions for ${member.fullName ?? member.email}`}
                        >
                          <MoreVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          {canChangeRole
                            ? WORKSPACE_ROLES.filter((role) => role !== member.role).map((role) => (
                                <form key={role} action={updateMemberRole}>
                                  <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
                                  <input type="hidden" name="userId" value={member.userId} />
                                  <input type="hidden" name="role" value={role} />
                                  {/* MenuItem assumes a non-button element, so
                                      it has to be told this really is one. */}
                                  <DropdownMenuItem
                                    nativeButton
                                    render={
                                      <button type="submit" className="w-full cursor-pointer" />
                                    }
                                  >
                                    <span className="capitalize">Make {role}</span>
                                  </DropdownMenuItem>
                                </form>
                              ))
                            : null}

                          {canChangeRole && canRemove ? <DropdownMenuSeparator /> : null}

                          {canRemove ? (
                            <form action={removeMember}>
                              <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
                              <input type="hidden" name="userId" value={member.userId} />
                              <DropdownMenuItem
                                nativeButton
                                variant="destructive"
                                render={<button type="submit" className="w-full cursor-pointer" />}
                              >
                                {isSelf ? "Leave workspace" : "Remove from workspace"}
                              </DropdownMenuItem>
                            </form>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
