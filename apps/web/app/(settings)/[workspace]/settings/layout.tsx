import { isAtLeastAdmin, requireMembership } from "@/lib/auth"

import { SettingsSidebar } from "./settings-sidebar"

/**
 * Settings takes the whole window rather than sitting inside the workspace
 * shell — you are not in a project while you are in here, and the app sidebar
 * offered navigation that no longer applied.
 *
 * That is why this route lives under `(settings)` while the rest of the app
 * lives under `(app)`: both resolve to `/[workspace]/…`, but only one of them
 * gets `(app)/[workspace]/layout.tsx`. A layout nested inside that one could
 * add chrome but never take it away.
 *
 * Deliberately does not gate on role. The sections disagree about who may see
 * them — members is open to the whole workspace, general and tokens are
 * admin-only — so each page states its own rule and the sidebar only offers
 * what this role can actually reach.
 */
export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workspace: string }>
}) {
  const { workspace: slug } = await params
  const membership = await requireMembership(slug)

  return (
    <div className="bg-background flex h-svh">
      <SettingsSidebar workspaceSlug={slug} admin={isAtLeastAdmin(membership.role)} />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
