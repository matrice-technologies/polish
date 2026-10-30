"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, Moon, Settings, Sparkles, Sun } from "lucide-react"
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { DesktopDownloadCard } from "@/components/desktop-download-card"
import type { DownloadLinks } from "@/components/download-buttons"
import { Logo } from "@/components/logo"
import { signOut } from "@/app/(auth)/login/actions"
import { APP_NAME } from "@/lib/app"
import { cn } from "@/lib/utils"

function initials(name: string, email: string) {
  const source = name.trim() || email
  const parts = source.split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase()
}

export function AppSidebar({
  release,
  user,
}: {
  release: DownloadLinks | null
  user: { email: string; fullName: string | null; avatarUrl: string | null }
}) {
  const pathname = usePathname()
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Sidebar collapsible="icon">
      {/* h-14 + border-b is exactly the content header's box, and both are
          border-box, so the two rules meet as one line across the viewport. */}
      <SidebarHeader className="h-14 shrink-0 justify-center border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={APP_NAME} render={<Link href="/prompts" />}>
              <Logo className="size-4" />
              <span className="font-heading font-semibold">{APP_NAME}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname === "/prompts"}
                tooltip="Prompts"
                render={<Link href="/prompts" />}
              >
                <Sparkles />
                <span>Prompts</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={pathname.startsWith("/settings")}
                tooltip="Settings"
                render={<Link href="/settings" />}
              >
                <Settings />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <DesktopDownloadCard links={release} />
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
