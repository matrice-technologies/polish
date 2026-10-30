import type { Platform, Prompt, PromptInput, SyncedSettings } from "@polish/shared"

/** Shared by main, preload and renderer: the IPC surface and what crosses it. */

export type Result<T = void> = { ok: true; value: T } | { ok: false; message: string }

/** Settings that belong to this machine and never sync. */
export interface DeviceSettings {
  launchAtLogin: boolean
  /** The Polish web app this install signs in through. */
  webUrl: string
}

export type AccountStatus =
  | { state: "signed-out"; error?: string }
  | { state: "linking"; userCode: string; verificationUrl: string }
  | { state: "signed-in"; email: string; syncing: boolean; lastSyncAt: string | null; error?: string }

export interface AppState {
  platform: Platform
  version: string
  prompts: Prompt[]
  settings: SyncedSettings
  device: DeviceSettings
  hasApiKey: boolean
  /** Why a shortcut is not active, keyed by prompt id, or "picker". */
  shortcutErrors: Record<string, string>
  shortcutsPaused: boolean
  account: AccountStatus
  /** macOS only: synthetic copy/paste needs the Accessibility permission. */
  accessibility: "granted" | "missing" | "not-needed"
}

export type HudStatus =
  | { kind: "working"; label: string }
  | { kind: "done"; label: string }
  | { kind: "error"; label: string }

export interface PickerItem {
  id: string
  name: string
  shortcut: string | null
}

export interface PolishApi {
  getState(): Promise<AppState>
  onState(listener: (state: AppState) => void): () => void

  savePrompt(input: PromptInput & { id?: string }): Promise<Result<Prompt>>
  deletePrompt(id: string): Promise<void>
  movePrompt(id: string, direction: -1 | 1): Promise<void>
  updateSettings(patch: Partial<SyncedSettings>): Promise<Result>
  updateDevice(patch: Partial<DeviceSettings>): Promise<void>
  setApiKey(key: string | null): Promise<Result>
  /** Runs a prompt on text typed into the app, without touching the clipboard. */
  tryPrompt(id: string, text: string): Promise<Result<string>>
  /** Suspends global shortcuts while a shortcut field is recording. */
  setRecording(recording: boolean): void
  setPaused(paused: boolean): void
  requestAccessibility(): void

  startLink(): Promise<void>
  cancelLink(): Promise<void>
  signOut(): Promise<void>
  syncNow(): Promise<void>
  openExternal(url: string): void

  // Picker window
  getPickerItems(): Promise<PickerItem[]>
  onPickerOpen(listener: () => void): () => void
  pick(id: string): void
  cancelPick(): void

  // HUD window
  onHud(listener: (status: HudStatus) => void): () => void
}

export const IPC = {
  getState: "state:get",
  state: "state:changed",
  savePrompt: "prompt:save",
  deletePrompt: "prompt:delete",
  movePrompt: "prompt:move",
  updateSettings: "settings:update",
  updateDevice: "device:update",
  setApiKey: "apikey:set",
  tryPrompt: "prompt:try",
  setRecording: "shortcuts:recording",
  setPaused: "shortcuts:paused",
  requestAccessibility: "accessibility:request",
  startLink: "account:link",
  cancelLink: "account:cancel-link",
  signOut: "account:sign-out",
  syncNow: "account:sync",
  openExternal: "shell:open",
  pickerItems: "picker:items",
  pickerOpen: "picker:open",
  pick: "picker:pick",
  cancelPick: "picker:cancel",
  hud: "hud:status",
} as const
