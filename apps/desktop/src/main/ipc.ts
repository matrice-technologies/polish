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

import { IPC, type AppState, type DeviceSettings, type PickerItem, type Result } from "../common/types"
import { accountStatus, cancelLink, signOut, startLink, sync } from "./account"
import { PolishError } from "./llm"
import { API_KEY_SECRET, cancelPicker, choosePickerPrompt, tryPrompt } from "./polish"
import { deleteSecret, getSecret, setSecret } from "./secrets"
import { accessibilityStatus, requestAccessibility } from "./selection"
import { isPaused, setPaused, setRecording, shortcutErrors } from "./shortcuts"
import { store } from "./store"

const platform: Platform = process.platform === "darwin" ? "mac" : process.platform === "win32" ? "windows" : "linux"

export function appState(): AppState {
  return {
    platform,
    version: app.getVersion(),
    prompts: livePrompts(store.state.prompts),
    settings: store.state.settings,
    device: store.state.device,
    hasApiKey: Boolean(getSecret(API_KEY_SECRET)),
    shortcutErrors: shortcutErrors(),
    shortcutsPaused: isPaused(),
    account: accountStatus(),
    accessibility: accessibilityStatus(),
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
    const device = { ...store.state.device, ...patch }
    if (patch.launchAtLogin !== undefined) app.setLoginItemSettings({ openAtLogin: patch.launchAtLogin })
    store.update("sync", { device })
  })

  ipcMain.handle(IPC.setApiKey, (_event, key: string | null): Result => {
    const trimmed = key?.trim()
    if (!trimmed) {
      deleteSecret(API_KEY_SECRET)
    } else {
      if (!trimmed.startsWith("sk-ant-")) return { ok: false, message: "Anthropic API keys start with sk-ant-." }
      setSecret(API_KEY_SECRET, trimmed)
    }
    broadcastState()
    return { ok: true, value: undefined }
  })

  ipcMain.handle(IPC.tryPrompt, async (_event, id: string, text: string): Promise<Result<string>> => {
    try {
      return { ok: true, value: await tryPrompt(id, text) }
    } catch (error) {
      return { ok: false, message: error instanceof PolishError ? error.message : String(error) }
    }
  })

  ipcMain.on(IPC.setRecording, (_event, recording: boolean) => setRecording(recording))
  ipcMain.on(IPC.setPaused, (_event, paused: boolean) => setPaused(paused))
  ipcMain.on(IPC.requestAccessibility, () => requestAccessibility())

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
