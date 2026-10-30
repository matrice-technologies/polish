import Link from "next/link"
import { FolderPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProjectIcon } from "@/components/project-icon"
import { isAtLeastAdmin, requireMembership } from "@/lib/auth"
import { listProjects } from "@/lib/queries"

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace: slug } = await params
  const membership = await requireMembership(slug)
  const projects = await listProjects(membership.workspaceId)
  const admin = isAtLeastAdmin(membership.role)

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-lg font-semibold">Projects</h1>
          <p className="text-muted-foreground text-sm">Everything {membership.workspaceName} is working on.</p>
        </div>
        {admin ? (
          <Button size="lg" render={<Link href={`/${slug}/projects/new`} />}>
            <FolderPlus className="size-4" />
            New project
          </Button>
        ) : null}
      </div>

      {projects.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/${slug}/${project.slug}`}
              className="bg-card ring-foreground/10 hover:ring-foreground/25 flex items-center gap-3 rounded-lg p-4 ring-1 transition-shadow"
            >
              <ProjectIcon name={project.name} logoUrl={project.logoUrl} className="size-9" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{project.name}</p>
                <p className="text-muted-foreground truncate font-mono text-xs">/{project.slug}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm font-medium">No projects yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {admin ? "Create one to get started." : "An admin can create the first one."}
          </p>
        </div>
      )}
    </div>
  )
}
