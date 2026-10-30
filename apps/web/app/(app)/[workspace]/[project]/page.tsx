import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProjectIcon } from "@/components/project-icon"
import { requireMembership } from "@/lib/auth"
import { getProject } from "@/lib/queries"

export const metadata: Metadata = { title: "Overview" }

/**
 * The project's home. Deliberately close to empty — this is where whatever you
 * are building goes, and everything around it (the shell, the switchers, the
 * settings) is already wired up.
 */
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ workspace: string; project: string }>
}) {
  const { workspace: workspaceSlug, project: projectSlug } = await params

  const membership = await requireMembership(workspaceSlug)
  const project = await getProject(membership.workspaceId, projectSlug)
  if (!project) notFound()

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-8 flex items-center gap-3">
        <ProjectIcon name={project.name} logoUrl={project.logoUrl} className="size-10" />
        <div className="min-w-0 flex-1">
          <h1 className="font-heading truncate text-lg font-semibold">{project.name}</h1>
          <p className="text-muted-foreground truncate font-mono text-xs">
            /{workspaceSlug}/{project.slug}
          </p>
        </div>
        <Button
          variant="outline"
          size="lg"
          render={<Link href={`/${workspaceSlug}/${projectSlug}/settings`} />}
        >
          <Settings className="size-4" />
          Settings
        </Button>
      </div>

      <div className="rounded-lg border border-dashed py-20 text-center">
        <p className="text-sm font-medium">Your project goes here</p>
        <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
          Auth, workspaces, members, projects and settings are done. Build the rest on top.
        </p>
      </div>
    </div>
  )
}
