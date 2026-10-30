import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ProjectForm } from "@/components/project-form"
import { isAtLeastAdmin, requireMembership } from "@/lib/auth"
import { getProject } from "@/lib/queries"

import { deleteProject, updateProject } from "../../projects/actions"
import { ProjectLogoForm } from "./logo-form"

export const metadata: Metadata = { title: "Project settings" }

export default async function ProjectSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string; project: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { workspace: workspaceSlug, project: projectSlug } = await params
  const { error } = await searchParams

  const membership = await requireMembership(workspaceSlug)
  if (!isAtLeastAdmin(membership.role)) redirect(`/${workspaceSlug}/${projectSlug}`)

  const project = await getProject(membership.workspaceId, projectSlug)
  if (!project) notFound()

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8">
        <h1 className="font-heading text-lg font-semibold">Project settings</h1>
        <p className="text-muted-foreground text-sm">
          {project.name} · <span className="font-mono">/{project.slug}</span>
        </p>
      </div>

      <div className="space-y-6">
        <ProjectLogoForm
          workspaceSlug={workspaceSlug}
          projectId={project.id}
          projectName={project.name}
          logoUrl={project.logoUrl}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <ProjectForm
            action={updateProject}
            workspaceSlug={workspaceSlug}
            projectId={project.id}
            defaults={{ name: project.name }}
            submitLabel="Save"
          />

          <div className="space-y-2">
            <Label htmlFor="project-slug">Slug</Label>
            {/* Read-only: it is in every URL anyone has bookmarked. */}
            <Input id="project-slug" value={project.slug} readOnly className="font-mono" />
            <p className="text-muted-foreground text-xs">Fixed, so existing links keep working.</p>
          </div>
        </div>
      </div>

      <section className="mt-10 border-t pt-8">
        <h2 className="font-heading mb-4 text-base font-semibold">Danger zone</h2>

        <div className="border-destructive/40 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">Delete project</p>
            <p className="text-muted-foreground text-xs">
              Once deleted, this project and everything in it cannot be recovered.
            </p>
            {error === "confirm" ? (
              <p className="text-destructive mt-1 text-xs">
                That did not match the project name. Nothing was deleted.
              </p>
            ) : null}
          </div>

          <form action={deleteProject} className="flex items-end gap-2">
            <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
            <input type="hidden" name="projectId" value={project.id} />
            <Button type="submit" variant="destructive" size="lg">
              Delete project
            </Button>
          </form>
        </div>
      </section>
    </div>
  )
}
