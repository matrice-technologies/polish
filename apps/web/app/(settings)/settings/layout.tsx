import { requireUser } from "@/lib/auth"

import { SettingsSidebar } from "./settings-sidebar"

/**
 * Settings takes the whole window rather than sitting inside the app shell,
 * with its own sidebar and a way back to the prompts. That is why it lives
 * under `(settings)` instead of `(app)`: a layout nested inside the shell could
 * add chrome but never take it away.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireUser()

  return (
    <div className="bg-background flex h-svh">
      <SettingsSidebar />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
