import { useState } from "react"
import type { SyncedSettings } from "@polish/shared"

import type { AppState } from "../../../common/types"
import { polish } from "../api"
import { AiProviderSection } from "../components/ai-provider"
import { ShortcutRecorder } from "../components/shortcut-recorder"
import { Button, PageHeader, Row, Switch } from "../components/ui"

export function SettingsPage({ state }: { state: AppState }) {
  const { settings, device } = state
  const [error, setError] = useState<string | null>(null)

  async function update(patch: Partial<SyncedSettings>) {
    const result = await polish.updateSettings(patch)
    setError(result.ok ? null : result.message)
  }

  return (
    <div className="h-full overflow-y-auto">
      <PageHeader
        title="Settings"
        description={
          state.account.state === "signed-in"
            ? "Prompts and the settings below the AI provider sync to your account."
            : "Stored on this computer. Sign in to sync them across machines."
        }
      />
      <div className="mx-auto max-w-2xl px-8 py-4">
        {state.accessibility === "missing" ? (
          <div className="border-destructive/40 bg-destructive/10 my-3 flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
            <p className="text-xs leading-relaxed">
              macOS needs to allow Polish to press copy and paste for you (System Settings → Privacy &amp; Security →
              Accessibility).
            </p>
            <Button size="sm" variant="outline" onClick={() => polish.requestAccessibility()}>
              Allow
            </Button>
          </div>
        ) : null}

        <AiProviderSection state={state} />

        <div className="divide-y border-t">
          <Row label="Prompt picker" description="Lists every prompt, for the ones without a shortcut of their own.">
            <ShortcutRecorder
              platform={state.platform}
              value={settings.pickerShortcut}
              onChange={(pickerShortcut) => void update({ pickerShortcut })}
              error={state.shortcutErrors.picker}
            />
          </Row>

          <Row
            label="Paste the result"
            htmlFor="autoPaste"
            description="Replace the selection with the polished text. Off: the result is only copied."
          >
            <Switch id="autoPaste" checked={settings.autoPaste} onChange={(autoPaste) => void update({ autoPaste })} />
          </Row>

          <Row
            label="Restore the clipboard"
            htmlFor="restoreClipboard"
            description="Put back whatever you had copied before, once the result is pasted."
          >
            <Switch
              id="restoreClipboard"
              checked={settings.restoreClipboard}
              onChange={(restoreClipboard) => void update({ restoreClipboard })}
            />
          </Row>

          <Row label="Show progress" htmlFor="showHud" description="A small indicator at the bottom of the screen while Polish works.">
            <Switch id="showHud" checked={settings.showHud} onChange={(showHud) => void update({ showHud })} />
          </Row>

          <Row label="Pause shortcuts" htmlFor="paused" description="Stop listening for shortcuts until you turn this off.">
            <Switch id="paused" checked={state.shortcutsPaused} onChange={(paused) => polish.setPaused(paused)} />
          </Row>

          <Row label="Launch at login" htmlFor="launchAtLogin" description="Start Polish in the tray when you sign in to this computer.">
            <Switch
              id="launchAtLogin"
              checked={device.launchAtLogin}
              onChange={(launchAtLogin) => void polish.updateDevice({ launchAtLogin })}
            />
          </Row>
        </div>

        {error ? <p className="text-destructive mt-2 text-xs">{error}</p> : null}
        <p className="text-muted-foreground mt-6 text-xs">Polish {state.version}</p>
      </div>
    </div>
  )
}
