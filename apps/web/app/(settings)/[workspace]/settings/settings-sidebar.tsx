"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ArrowLeft, Building2, Palette, UserCircle, Users } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Settings navigation, in one list rather than tabs: personal and workspace
 * settings are the same errand from the reader's side, and splitting them
 * across two surfaces meant knowing which one a thing lived on before you
 * could go and find it.
 *
 * The classes below are lifted from `ui/sidebar.tsx` rather than approximated,
 * so this reads as the same furniture as the app's own sidebar — 16rem wide,
 * `px-2 py-1` groups, `h-7 px-2 py-1` rows on the sidebar-accent tokens. It cannot
 * use those components directly: they read `useSidebar`, and this tree has no
 * SidebarProvider above it — there is nothing here to collapse.
 *
 * Takes `admin` already resolved rather than the role — `isAtLeastAdmin` sits
 * in lib/auth beside the server-only Supabase client, which cannot cross into
 * this bundle.
 */
export function SettingsSidebar({
  workspaceSlug,
  admin,
}: {
  workspaceSlug: string
  admin: boolean
}) {
  const pathname = usePathname()
  const base = `/${workspaceSlug}/settings`

  const sections = [
    {
      title: "Personal",
      items: [
        { href: `${base}/account`, label: "Profile", icon: UserCircle, show: true },
        { href: `${base}/appearance`, label: "Appearance", icon: Palette, show: true },
      ],
    },
    {
      title: "Workspace",
      items: [
        { href: base, label: "General", icon: Building2, show: admin },
        { href: `${base}/members`, label: "Members", icon: Users, show: true },
      ],
    },
  ]

  return (
    <aside className="bg-sidebar text-sidebar-foreground flex w-64 shrink-0 flex-col border-r">
      {/* h-14 + border-b, the same box as the app sidebar's header and the
          content header beside it, so all three rules meet as one line. */}
      <div className="flex h-14 shrink-0 items-center gap-1 border-b p-2">
        <Link
          href={`/${workspaceSlug}`}
          aria-label="Back to workspace"
          className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex size-8 shrink-0 items-center justify-center rounded-[calc(var(--radius-sm)+2px)] transition-colors"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <span className="font-heading text-sm font-medium">Settings</span>
      </div>

      <nav className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-auto py-1">
        {sections.map((section) => {
          const items = section.items.filter((item) => item.show)
          if (!items.length) return null

          return (
            <div key={section.title} className="relative flex w-full min-w-0 flex-col px-2 py-1">
              <div className="text-sidebar-foreground/70 flex h-8 shrink-0 items-center rounded-md px-2 text-xs">
                {section.title}
              </div>

              <div className="flex w-full min-w-0 flex-col gap-px">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-7 w-full items-center gap-2 overflow-hidden rounded-[calc(var(--radius-sm)+2px)] px-2 py-1 text-left text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="truncate">{label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
