import { useState } from "react"
import { Check, KeyRound } from "lucide-react"
import { MODELS, type SyncedSettings } from "@polish/shared"

import type { AppState } from "../../../common/types"
import { polish } from "../api"
import { ShortcutRecorder } from "../components/shortcut-recorder"
import { Button, Input, PageHeader, Row, Switch } from "../components/ui"

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
            ? "Everything except the API key and launch at login syncs to your account."
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

        <ApiKeyRow hasApiKey={state.hasApiKey} />

        <div className="divide-y border-t">
          <Row label="Model" htmlFor="model" description="Used for every prompt.">
            <select
              id="model"
              value={settings.model}
              onChange={(e) => void update({ model: e.target.value as SyncedSettings["model"] })}
              className="border-input bg-background h-8 rounded-md border px-2 text-[13px] outline-none"
            >
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.hint}
                </option>
              ))}
            </select>
          </Row>

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

/**
 * The key never leaves this machine: it is encrypted with the OS keychain and
 * is not part of what syncs. Shown as set/not set, never read back.
 */
function ApiKeyRow({ hasApiKey }: { hasApiKey: boolean }) {
  const [editing, setEditing] = useState(!hasApiKey)
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const result = await polish.setApiKey(value)
    if (result.ok) {
      setValue("")
      setEditing(false)
      setError(null)
    } else setError(result.message)
  }

  return (
    <div className="space-y-2 py-4">
      <div className="flex items-center gap-2">
        <KeyRound className="text-muted-foreground size-3.5" />
        <p className="text-[13px] font-medium">Anthropic API key</p>
        {hasApiKey && !editing ? (
          <span className="text-success flex items-center gap-1 text-xs">
            <Check className="size-3" /> Saved on this computer
          </span>
        ) : null}
      </div>
      {editing || !hasApiKey ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <Input
            type="password"
            value={value}
            placeholder="sk-ant-…"
            autoComplete="off"
            onChange={(e) => setValue(e.target.value)}
          />
          <Button type="submit" disabled={!value.trim()}>
            Save
          </Button>
          {hasApiKey ? (
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          ) : null}
        </form>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Replace
          </Button>
          <Button size="sm" variant="danger" onClick={() => void polish.setApiKey(null)}>
            Remove
          </Button>
        </div>
      )}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      <p className="text-muted-foreground text-xs leading-relaxed">
        Get one from{" "}
        <button
          type="button"
          className="text-primary underline-offset-2 hover:underline"
          onClick={() => polish.openExternal("https://console.anthropic.com/settings/keys")}
        >
          console.anthropic.com
        </button>
        . Text goes straight from this computer to Anthropic; it is never sent to the Polish server.
      </p>
    </div>
  )
}
