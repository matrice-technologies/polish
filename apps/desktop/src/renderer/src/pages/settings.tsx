import { Settings, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import type { SyncedSettings } from "@polish/shared"
import type { AppState } from "../../../common/types"

import { AiProviderSection } from "@/components/ai-provider"
import { PageHeader } from "@/components/page-header"
import { SettingsBody, SettingsGroup, SettingsRow, SettingsTitle } from "@/components/settings"
import { ShortcutRecorder } from "@/components/shortcut-recorder"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { polish } from "@/lib/polish"

export function SettingsPage({ state }: { state: AppState }) {
  const { settings, device } = state

  async function update(patch: Partial<SyncedSettings>) {
    const result = await polish.updateSettings(patch)
    if (!result.ok) toast.error(result.message)
  }

  return (
    <div className="h-full overflow-y-auto">
      <PageHeader icon={<Settings />} title="Settings" />
      <SettingsBody>
        <SettingsTitle
          title="Settings"
          description={
            state.account.state === "signed-in"
              ? "Behaviour syncs to your account. The AI provider and its keys stay on this computer."
              : "Stored on this computer. Sign in to sync your prompts and behaviour across machines."
          }
        />

        {state.accessibility === "missing" ? (
          <div className="mb-8 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <ShieldAlert className="size-4 shrink-0 text-destructive" />
            <p className="flex-1 text-xs/relaxed">
              macOS needs to let Polish press copy and paste for you: System Settings → Privacy &amp; Security →
              Accessibility.
            </p>
            <Button size="sm" variant="outline" onClick={() => polish.requestAccessibility()}>
              Allow
            </Button>
          </div>
        ) : null}

        <SettingsGroup title="AI provider" description="Where your text goes to be rewritten. Chosen per computer.">
          <AiProviderSection state={state} />
        </SettingsGroup>

        <SettingsGroup title="Behaviour">
          <div className="divide-y">
            <SettingsRow label="Prompt picker" description="Lists every prompt, for the ones without a shortcut.">
              <ShortcutRecorder
                platform={state.platform}
                value={settings.pickerShortcut}
                onChange={(pickerShortcut) => void update({ pickerShortcut })}
                error={state.shortcutErrors.picker}
              />
            </SettingsRow>
            <SettingsRow
              label="Paste the result"
              htmlFor="autoPaste"
              description="Replace the selection with the polished text. Off: it's only copied."
            >
              <Switch id="autoPaste" checked={settings.autoPaste} onCheckedChange={(autoPaste) => void update({ autoPaste })} />
            </SettingsRow>
            <SettingsRow
              label="Restore the clipboard"
              htmlFor="restoreClipboard"
              description="Put back what you had copied before, once the result is pasted."
            >
              <Switch
                id="restoreClipboard"
                checked={settings.restoreClipboard}
                onCheckedChange={(restoreClipboard) => void update({ restoreClipboard })}
              />
            </SettingsRow>
            <SettingsRow label="Show progress" htmlFor="showHud" description="A small pill at the bottom of the screen while Polish works.">
              <Switch id="showHud" checked={settings.showHud} onCheckedChange={(showHud) => void update({ showHud })} />
            </SettingsRow>
          </div>
        </SettingsGroup>

        <SettingsGroup title="This computer">
          <div className="divide-y">
            <SettingsRow label="Pause shortcuts" htmlFor="paused" description="Stop listening for shortcuts until you turn this off.">
              <Switch id="paused" checked={state.shortcutsPaused} onCheckedChange={(paused) => polish.setPaused(paused)} />
            </SettingsRow>
            <SettingsRow label="Launch at login" htmlFor="launchAtLogin" description="Start Polish in the tray when you sign in.">
              <Switch
                id="launchAtLogin"
                checked={device.launchAtLogin}
                onCheckedChange={(launchAtLogin) => void polish.updateDevice({ launchAtLogin })}
              />
            </SettingsRow>
          </div>
        </SettingsGroup>

        <p className="mt-10 text-xs text-muted-foreground">Polish {state.version}</p>
      </SettingsBody>
    </div>
  )
}
