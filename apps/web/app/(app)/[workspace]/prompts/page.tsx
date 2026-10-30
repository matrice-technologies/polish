import type { Metadata } from "next"

import { requireMembership } from "@/lib/auth"
import { getSyncedSettings, listPrompts } from "@/lib/polish"

import { PromptsView } from "./prompts-view"

export const metadata: Metadata = { title: "Prompts" }

/**
 * The account side of the desktop app: the same prompts, shortcuts and
 * settings, editable from any browser. They are personal — the workspace in the
 * URL is only the shell this renders inside.
 */
export default async function PromptsPage({ params }: { params: Promise<{ workspace: string }> }) {
  const { workspace: slug } = await params
  await requireMembership(slug)

  const [prompts, settings] = await Promise.all([listPrompts(), getSyncedSettings()])

  return <PromptsView prompts={prompts} settings={settings} />
}
