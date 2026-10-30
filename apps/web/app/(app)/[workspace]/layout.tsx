import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { EmptyProjectSwitcher, ProjectSwitcher } from "@/components/project-switcher"
import { listMemberships, requireMembership, requireUser } from "@/lib/auth"
import { listProjects } from "@/lib/queries"

/**
 * The shell every workspace page renders inside: sidebar on the left with the
 * workspace switcher pinned to its top, and a header whose first control is the
 * project switcher.
 *
 * The active project is derived client-side from the pathname: a layout only
 * receives its own params, never a child segment's, so `[project]` is not
 * visible here.
 */
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workspace: string }>
}) {
  const { workspace: slug } = await params

  const user = await requireUser()
  const membership = await requireMembership(slug)
  const [memberships, projects] = await Promise.all([
    listMemberships(),
    listProjects(membership.workspaceId),
  ])

  return (
    <SidebarProvider>
      <AppSidebar
        workspaces={memberships.map((m) => ({
          id: m.workspaceId,
          name: m.workspaceName,
          slug: m.workspaceSlug,
          logoUrl: m.workspaceLogoUrl,
          role: m.role,
        }))}
        workspaceSlug={slug}
        projects={projects}
        user={{
          email: user.email ?? "",
          fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
          avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
        }}
      />

      <SidebarInset>
        {/* No collapse button: the sidebar rail and ⌘B still toggle it. */}
        <header className="bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-2 backdrop-blur">
          {projects.length > 0 ? (
            <ProjectSwitcher workspaceSlug={slug} projects={projects} />
          ) : (
            <EmptyProjectSwitcher workspaceSlug={slug} />
          )}
        </header>

        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
