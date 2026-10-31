import { app, BrowserWindow, ipcMain, shell } from "electron"
import { randomUUID } from "node:crypto"
import {
  livePrompts,
  promptInputSchema,
  syncedSettingsSchema,
  type Platform,
  type Prompt,
  type PromptInput,
  type SyncedSettings,
} from "@polish/shared"

import { providerInfo, type AiSettings, type ProviderId } from "../common/providers"
import { IPC, type AppState, type DeviceSettings, type PickerItem, type Result } from "../common/types"
import { accountStatus, cancelLink, signOut, startLink, sync } from "./account"
import { aiStatus, listModels, PolishError, rewriteText, setProviderKey } from "./engines"
import { cancelCliLogin, refreshCliStatus, startCliLogin } from "./engines/claude-cli"
import { cancelPicker, choosePickerPrompt, tryPrompt } from "./polish"
import { accessibilityStatus, requestAccessibility } from "./selection"
import { isPaused, setPaused, setRecording, shortcutErrors } from "./shortcuts"
import { DEFAULT_WEB_URL, store, webUrl } from "./store"
import { checkForUpdates, installUpdate, updateStatus } from "./updater"

const platform: Platform = process.platform === "darwin" ? "mac" : process.platform === "win32" ? "windows" : "linux"

export function appState(): AppState {
  return {
    platform,
    version: app.getVersion(),
    prompts: livePrompts(store.state.prompts),
    settings: store.state.settings,
    device: store.state.device,
    webUrl: webUrl(),
    defaultWebUrl: DEFAULT_WEB_URL,
    ai: aiStatus(),
    shortcutErrors: shortcutErrors(),
    shortcutsPaused: isPaused(),
    account: accountStatus(),
    accessibility: accessibilityStatus(),
    update: updateStatus(),
  }
}

/** Pushes fresh state to every window; each one decides what it shows. */
export function broadcastState() {
  const state = appState()
  for (const window of BrowserWindow.getAllWindows()) window.webContents.send(IPC.state, state)
}

const now = () => new Date().toISOString()

export function registerIpc() {
  ipcMain.handle(IPC.getState, () => appState())

  ipcMain.handle(IPC.savePrompt, (_event, input: PromptInput & { id?: string }): Result<Prompt> => {
    const parsed = promptInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }

    const prompts = store.state.prompts
    const existing = input.id ? prompts.find((p) => p.id === input.id && !p.deletedAt) : undefined
    const prompt: Prompt = existing
      ? { ...existing, ...parsed.data, updatedAt: now() }
      : {
          ...parsed.data,
          id: randomUUID(),
          position: Math.max(-1, ...livePrompts(prompts).map((p) => p.position)) + 1,
          updatedAt: now(),
          deletedAt: null,
        }

    store.update("user", {
      prompts: existing ? prompts.map((p) => (p.id === prompt.id ? prompt : p)) : [...prompts, prompt],
    })
    return { ok: true, value: prompt }
  })

  ipcMain.handle(IPC.deletePrompt, (_event, id: string) => {
    const stamp = now()
    store.update("user", {
      prompts: store.state.prompts.map((p) => (p.id === id ? { ...p, deletedAt: stamp, updatedAt: stamp } : p)),
    })
  })

  ipcMain.handle(IPC.movePrompt, (_event, id: string, direction: -1 | 1) => {
    const live = livePrompts(store.state.prompts)
    const index = live.findIndex((p) => p.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= live.length) return
    ;[live[index], live[target]] = [live[target], live[index]]
    // Renumber everything: positions may have collided after a merge.
    const stamp = now()
    const positions = new Map(live.map((p, i) => [p.id, i]))
    store.update("user", {
      prompts: store.state.prompts.map((p) =>
        positions.has(p.id) && positions.get(p.id) !== p.position
          ? { ...p, position: positions.get(p.id)!, updatedAt: stamp }
          : p,
      ),
    })
  })

  ipcMain.handle(IPC.updateSettings, (_event, patch: Partial<SyncedSettings>): Result => {
    const parsed = syncedSettingsSchema.safeParse({ ...store.state.settings, ...patch })
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message }
    store.update("user", { settings: parsed.data, settingsUpdatedAt: now() })
    return { ok: true, value: undefined }
  })

  ipcMain.handle(IPC.updateDevice, (_event, patch: Partial<DeviceSettings>) => {
    // A server is an http(s) URL typed by hand; anything else means the default.
    if (patch.customServer !== undefined) {
      const server = patch.customServer?.trim().replace(/\/+$/, "") ?? ""
      patch = { ...patch, customServer: /^https?:\/\/\S+$/.test(server) ? server : null }
    }
    const device = { ...store.state.device, ...patch }
    if (patch.launchAtLogin !== undefined) app.setLoginItemSettings({ openAtLogin: patch.launchAtLogin })
    store.update("sync", { device })
  })

  ipcMain.handle(IPC.updateAi, async (_event, patch: Partial<AiSettings>) => {
    const ai = { ...store.state.device.ai, ...patch, models: { ...store.state.device.ai.models, ...patch.models } }
    store.aiUnset = false
    store.update("sync", { device: { ...store.state.device, ai } })
    if (patch.claudePath !== undefined || patch.provider === "claude-cli") await refreshCliStatus(ai.claudePath)
  })

  ipcMain.handle(IPC.setProviderKey, (_event, provider: ProviderId, key: string | null): Result => {
    const trimmed = key?.trim() || null
    if (trimmed && provider === "anthropic" && !trimmed.startsWith("sk-ant-")) {
      return { ok: false, message: "Anthropic API keys start with sk-ant-." }
    }
    if (trimmed && /\s/.test(trimmed)) return { ok: false, message: "That doesn't look like an API key." }
    setProviderKey(provider, trimmed)
    broadcastState()
    return { ok: true, value: undefined }
  })

  ipcMain.handle(IPC.listModels, async (_event, provider: ProviderId): Promise<Result<string[]>> => {
    try {
      return { ok: true, value: await listModels(provider) }
    } catch (error) {
      return { ok: false, message: error instanceof PolishError ? error.message : String(error) }
    }
  })

  ipcMain.handle(IPC.testProvider, async (): Promise<Result<{ output: string; ms: number }>> => {
    const started = Date.now()
    try {
      const output = await rewriteText({
        instructions: "Fix spelling and grammar.",
        text: "helo, this are a quick test of polish",
      })
      return { ok: true, value: { output, ms: Date.now() - started } }
    } catch (error) {
      return { ok: false, message: error instanceof PolishError ? error.message : String(error) }
    }
  })

  ipcMain.handle(IPC.refreshCli, async () => {
    await refreshCliStatus(store.state.device.ai.claudePath)
  })
  ipcMain.on(IPC.cliLogin, () => startCliLogin())
  ipcMain.on(IPC.cliCancelLogin, () => cancelCliLogin())

  ipcMain.handle(IPC.tryPrompt, async (_event, id: string, text: string): Promise<Result<string>> => {
    try {
      return { ok: true, value: await tryPrompt(id, text) }
    } catch (error) {
      return { ok: false, message: error instanceof PolishError ? error.message : String(error) }
    }
  })

  ipcMain.on(IPC.setRecording, (event, recording: boolean) => setRecording(recording, event.sender))
  ipcMain.on(IPC.setPaused, (_event, paused: boolean) => setPaused(paused))
  ipcMain.on(IPC.requestAccessibility, () => requestAccessibility())
  ipcMain.handle(IPC.checkForUpdates, () => checkForUpdates())
  ipcMain.on(IPC.installUpdate, () => installUpdate())

  ipcMain.handle(IPC.startLink, () => startLink())
  ipcMain.handle(IPC.cancelLink, () => cancelLink())
  ipcMain.handle(IPC.signOut, () => signOut())
  ipcMain.handle(IPC.syncNow, () => sync())
  ipcMain.on(IPC.openExternal, (_event, url: string) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
  })

  ipcMain.handle(IPC.pickerItems, (): PickerItem[] =>
    livePrompts(store.state.prompts).map((p) => ({ id: p.id, name: p.name, shortcut: p.shortcut })),
  )
  ipcMain.on(IPC.pick, (_event, id: string) => void choosePickerPrompt(id))
  ipcMain.on(IPC.cancelPick, () => void cancelPicker())
}
