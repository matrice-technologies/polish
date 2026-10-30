"use client"

import Link from "next/link"
import { Check, ChevronsUpDown, CircleUser, LogOut, Plus, Settings, UserPlus } from "lucide-react"
import type { WorkspaceRole } from "@/lib/schema"

import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar"
import { EntityIcon } from "@/components/entity-icon"
import { signOut } from "@/app/(auth)/login/actions"
import { cn } from "@/lib/utils"
import { APP_NAME } from "@/lib/app"

export interface WorkspaceOption {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  role: WorkspaceRole
}

/** Sits at the top of the sidebar; the anchor for everything below it. */
export function WorkspaceSwitcher({
  workspaces,
  currentSlug,
}: {
  workspaces: WorkspaceOption[]
  currentSlug: string
}) {
  const { state } = useSidebar()
  const current = workspaces.find((w) => w.slug === currentSlug) ?? workspaces[0]
  // Spelled out rather than imported: `isAtLeastAdmin` sits in lib/auth next to
  // the server-only Supabase client, which cannot cross into this bundle.
  const admin = current?.role === "owner" || current?.role === "admin"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              /* h-9 px-2.5 to match the project switcher in the header — the
                 two are the same control and should read as one. `lg` stays
                 underneath for its collapsed-rail padding override, which is
                 what lets the mark fill the icon rail below. */
              <SidebarMenuButton
                size="lg"
                className="h-9 px-2.5 data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground"
              />
            }
          >
            {/* size-5 fills the button's 20px content box exactly, so it is as
                large as it can be without making the row taller. size-8 once
                the sidebar collapses, where it is all that is left and has a
                32px rail to fill. */}
            <EntityIcon
              name={current?.name ?? APP_NAME}
              logoUrl={current?.logoUrl}
              className="size-5 group-data-[collapsible=icon]:size-8"
            />
            {/* One line: name, then the plan. min-w-0 is what lets the name
                truncate instead of shoving the badge out of the button. */}
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 text-left",
                state === "collapsed" && "hidden",
              )}
            >
              <span className="truncate font-medium">{current?.name ?? APP_NAME}</span>
              <Badge
                variant="secondary"
                className="bg-muted text-muted-foreground ring-foreground/10 shrink-0 font-normal ring-1"
              >
                Free plan
              </Badge>
            </div>
            <ChevronsUpDown
              className={cn(
                "text-muted-foreground size-3.5 shrink-0",
                state === "collapsed" && "hidden",
              )}
            />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" side="bottom" sideOffset={4} className="w-64">
            {/* Base UI requires a Group around a GroupLabel; Radix does not. */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Workspaces
              </DropdownMenuLabel>
              {workspaces.map((workspace) => (
                <DropdownMenuItem
                  key={workspace.id}
                  render={<Link href={`/${workspace.slug}`} />}
                  className="gap-2"
                >
                  {/* size-6, matching the dashed "New workspace" box below, so
                      the labels line up. */}
                  <EntityIcon name={workspace.name} logoUrl={workspace.logoUrl} className="size-6" />
                  <span className="flex-1 truncate">{workspace.name}</span>
                  {workspace.slug === currentSlug ? <Check className="size-4" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/welcome" />} className="gap-2">
              <div className="flex size-6 items-center justify-center rounded-sm border border-dashed">
                <Plus className="size-3.5" />
              </div>
              <span className="text-muted-foreground">New workspace</span>
            </DropdownMenuItem>

            {/* Both bounce a plain member straight back out, so they are only
                offered to someone who can actually open them. */}
            {admin ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  render={<Link href={`/${currentSlug}/settings`} />}
                  className="gap-2"
                >
                  <Settings className="size-4" />
                  Workspace settings
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={<Link href={`/${currentSlug}/settings/members`} />}
                  className="gap-2"
                >
                  <UserPlus className="size-4" />
                  Invite team member
                </DropdownMenuItem>
              </>
            ) : null}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              render={<Link href={`/${currentSlug}/settings/account`} />}
              className="gap-2"
            >
              <CircleUser className="size-4" />
              Account settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <form action={signOut}>
              {/* MenuItem assumes a non-button element, so it has to be told
                  this really is one — otherwise it layers on role and
                  aria-disabled that a native <button> already provides. */}
              <DropdownMenuItem
                nativeButton
                render={<button type="submit" className="w-full cursor-pointer" />}
                className="gap-2"
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
