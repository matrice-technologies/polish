import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProjectForm } from "@/components/project-form"
import { isAtLeastAdmin, requireMembership } from "@/lib/auth"
import { createProject } from "../actions"

export const metadata: Metadata = { title: "New project" }

export default async function NewProjectPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace: slug } = await params
  const membership = await requireMembership(slug)

  if (!isAtLeastAdmin(membership.role)) redirect(`/${slug}`)

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6">
        <h1 className="text-lg font-semibold">New project</h1>
        <p className="text-muted-foreground text-sm">
          A project is a workspace you share with your team. You can rename it later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
          <CardDescription>You can change all of this later.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm action={createProject} workspaceSlug={slug} submitLabel="Create project" />
        </CardContent>
      </Card>
    </div>
  )
}
