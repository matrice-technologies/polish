import type { Metadata } from "next"

import { requireUser } from "@/lib/auth"
import { getSyncedSettings, listPrompts } from "@/lib/polish"

import { PromptsView } from "./prompts-view"

export const metadata: Metadata = { title: "Prompts" }

/**
 * The account side of the desktop app: the same prompts, shortcuts and
 * settings, editable from any browser.
 */
export default async function PromptsPage() {
  await requireUser()

  const [prompts, settings] = await Promise.all([listPrompts(), getSyncedSettings()])

  return <PromptsView prompts={prompts} settings={settings} />
}
