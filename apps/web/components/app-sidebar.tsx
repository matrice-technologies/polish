"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, LayoutGrid, LogOut, Moon, Settings, Sparkles, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { WorkspaceSwitcher, type WorkspaceOption } from "@/components/workspace-switcher"
import { useCurrentProjectSlug } from "@/hooks/use-current-project"
import { signOut } from "@/app/(auth)/login/actions"
import type { ProjectListItem } from "@/lib/queries"
import { cn } from "@/lib/utils"

function initials(name: string, email: string) {
  const source = name.trim() || email
  const parts = source.split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase()
}

export function AppSidebar({
  workspaces,
  workspaceSlug,
  projects,
  user,
}: {
  workspaces: WorkspaceOption[]
  workspaceSlug: string
  projects: ProjectListItem[]
  user: { email: string; fullName: string | null; avatarUrl: string | null }
}) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()
  const currentProjectSlug = useCurrentProjectSlug(workspaceSlug, projects)
  const projectBase = currentProjectSlug ? `/${workspaceSlug}/${currentProjectSlug}` : null

  return (
    <Sidebar collapsible="icon">
      {/* h-14 + border-b is exactly the content header's box, and both are
          border-box, so the two rules meet as one line across the viewport.
          justify-center then leaves the switcher the same 9.5px above and
          below that the project switcher gets in that header. */}
      <SidebarHeader className="h-14 shrink-0 justify-center border-b">
        <WorkspaceSwitcher workspaces={workspaces} currentSlug={workspaceSlug} />
      </SidebarHeader>

      <SidebarContent>
        {projectBase ? (
          <SidebarGroup>
            <SidebarGroupLabel>Project</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === projectBase}
                  tooltip="Overview"
                  render={<Link href={projectBase} />}
                >
                  <LayoutDashboard />
                  <span>Overview</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === `${projectBase}/settings`}
                  tooltip="Project settings"
                  render={<Link href={`${projectBase}/settings`} />}
                >
                  <Settings />
                  <span>Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        ) : null}

        <SidebarGroup>
          <SidebarGroupLabel>Polish</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === `/${workspaceSlug}/prompts`}
                tooltip="Prompts"
                render={<Link href={`/${workspaceSlug}/prompts`} />}
              >
                <Sparkles />
                <span>Prompts</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === `/${workspaceSlug}`}
                tooltip="Projects"
                render={<Link href={`/${workspaceSlug}`} />}
              >
                <LayoutGrid />
                <span>Projects</span>
              </SidebarMenuButton>
              {projects.length ? (
                /* A tinted pill rather than a solid fill. The peer- rules
                   repeat the colour because SidebarMenuBadge otherwise hands
                   the text to the row's accent foreground on hover, which
                   would flicker the count from blue to plain. */
                <SidebarMenuBadge className="rounded-full bg-blue-500/10 text-blue-600 peer-hover/menu-button:text-blue-600 peer-data-active/menu-button:text-blue-600 dark:bg-blue-400/15 dark:text-blue-400 dark:peer-hover/menu-button:text-blue-400 dark:peer-data-active/menu-button:text-blue-400">
                  {projects.length}
                </SidebarMenuBadge>
              ) : null}
            </SidebarMenuItem>
            {/* Members, API tokens and workspace settings are all sections of
                /settings now, reached from the workspace switcher above. */}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
                <Avatar className="size-8 rounded-md">
                  {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
                  <AvatarFallback className="text-xs">
                    {initials(user.fullName ?? "", user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("grid flex-1 text-left leading-tight")}>
                  <span className="truncate text-sm">{user.fullName ?? "Account"}</span>
                  <span className="text-muted-foreground truncate text-xs">{user.email}</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-56">
                {/* Base UI requires a Group around a GroupLabel; Radix does not. */}
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <span className="block text-sm font-medium">
                      {user.fullName ?? "Signed in"}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {user.email}
                    </span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                {/* Icon and label are chosen with CSS rather than by reading the
                    resolved theme during render, so the server and client markup
                    match and there is no flash of the wrong label. */}
                <DropdownMenuItem
                  closeOnClick={false}
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                >
                  <Sun className="size-4 dark:hidden" />
                  <Moon className="hidden size-4 dark:block" />
                  <span className="dark:hidden">Dark mode</span>
                  <span className="hidden dark:inline">Light mode</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={signOut}>
                  {/* MenuItem assumes a non-button element, so it has to be told
                      this really is one — otherwise it layers on role and
                      aria-disabled that a native <button> already provides. */}
                  <DropdownMenuItem
                    nativeButton
                    render={<button type="submit" className="w-full cursor-pointer" />}
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
