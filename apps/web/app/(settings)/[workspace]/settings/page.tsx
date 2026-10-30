import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Building2 } from "lucide-react"

import { CopyButton } from "@/components/copy-button"
import { Label } from "@/components/ui/label"
import { isAtLeastAdmin, requireMembership } from "@/lib/auth"

import { DeleteWorkspace } from "./delete-workspace"
import { LogoForm } from "./logo-form"
import { RenameForm } from "./rename-form"
import { SettingsBody, SettingsGroup, SettingsHeader, SettingsTitle } from "./settings-header"

export const metadata: Metadata = { title: "Workspace settings" }

export default async function WorkspaceSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspace: string }>
  searchParams: Promise<{ error?: string }>
}) {
  const { workspace: slug } = await params
  const { error } = await searchParams

  const membership = await requireMembership(slug)
  if (!isAtLeastAdmin(membership.role)) redirect(`/${slug}`)

  return (
    <>
      <SettingsHeader icon={<Building2 className="size-4" />} title="General" />
      <SettingsBody>
        <SettingsTitle title="General" description="How this workspace looks and what it is called." />

        <SettingsGroup>
          <div className="space-y-6">
            <LogoForm
              workspaceSlug={slug}
              workspaceName={membership.workspaceName}
              logoUrl={membership.workspaceLogoUrl}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <RenameForm workspaceSlug={slug} defaultName={membership.workspaceName} />

              <div className="space-y-2">
                <Label htmlFor="workspace-slug">Slug</Label>
                {/* Read-only: it is in every URL anyone has bookmarked, and in
                    the widget snippet already pasted into a customer's site. */}
                <div className="relative">
                  <p
                    id="workspace-slug"
                    className="border-input bg-input/20 dark:bg-input/30 flex h-7 items-center rounded-md border pr-9 pl-2 font-mono text-xs"
                  >
                    {membership.workspaceSlug}
                  </p>
                  <CopyButton
                    value={membership.workspaceSlug}
                    label=""
                    variant="ghost"
                    className="absolute top-0 right-0 h-7 px-2"
                  />
                </div>
                <p className="text-muted-foreground text-xs">
                  Fixed, so existing links keep working.
                </p>
              </div>
            </div>
          </div>
        </SettingsGroup>

        {membership.role === "owner" ? (
          <SettingsGroup title="Danger zone">
            <DeleteWorkspace
              workspaceSlug={slug}
              workspaceName={membership.workspaceName}
              error={error}
            />
          </SettingsGroup>
        ) : null}
      </SettingsBody>
    </>
  )
}
