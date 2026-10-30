import type { Platform, Prompt, PromptInput, SyncedSettings } from "@polish/shared"

import type { AiSettings, AiStatus, ProviderId } from "./providers"

/** Shared by main, preload and renderer: the IPC surface and what crosses it. */

export type Result<T = void> = { ok: true; value: T } | { ok: false; message: string }

/** Settings that belong to this machine and never sync. */
export interface DeviceSettings {
  launchAtLogin: boolean
  /** The Polish web app this install signs in through. */
  webUrl: string
  /** Which model provider this machine uses, and how to reach it. */
  ai: AiSettings
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
  ai: AiStatus
  /** Why a shortcut is not active, keyed by prompt id, or "picker". */
  shortcutErrors: Record<string, string>
  shortcutsPaused: boolean
  account: AccountStatus
  /** macOS only: synthetic copy/paste needs the Accessibility permission. */
  accessibility: "granted" | "missing" | "not-needed"
  update: UpdateStatus
}

export type HudStatus =
  | { kind: "working"; label: string }
  | { kind: "done"; label: string }
  | { kind: "error"; label: string }

/** Where the self-updater is; see src/main/updater.ts. */
export type UpdateStatus =
  | { state: "unsupported"; reason: string }
  | { state: "idle"; lastCheck: string | null }
  | { state: "checking" }
  | { state: "downloading"; version: string; percent: number }
  | { state: "ready"; version: string }
  | { state: "error"; message: string; lastCheck: string }

export interface PickerItem {
  id: string
  name: string
  shortcut: string | null
}

export interface PolishEnv {
  platform: "mac" | "windows" | "linux"
}

export interface PolishApi {
  /** Known before the first render, so the title bar can lay itself out. */
  env: PolishEnv
  getState(): Promise<AppState>
  onState(listener: (state: AppState) => void): () => void

  savePrompt(input: PromptInput & { id?: string }): Promise<Result<Prompt>>
  deletePrompt(id: string): Promise<void>
  movePrompt(id: string, direction: -1 | 1): Promise<void>
  updateSettings(patch: Partial<SyncedSettings>): Promise<Result>
  updateDevice(patch: Partial<DeviceSettings>): Promise<void>
  updateAi(patch: Partial<AiSettings>): Promise<void>
  setProviderKey(provider: ProviderId, key: string | null): Promise<Result>
  listModels(provider: ProviderId): Promise<Result<string[]>>
  /** Rewrites a sample sentence with the selected provider, to prove it works. */
  testProvider(): Promise<Result<{ output: string; ms: number }>>
  refreshCli(): Promise<void>
  cliLogin(): void
  cliCancelLogin(): void
  /** Runs a prompt on text typed into the app, without touching the clipboard. */
  tryPrompt(id: string, text: string): Promise<Result<string>>
  /** Suspends global shortcuts while a shortcut field is recording. */
  setRecording(recording: boolean): void
  setPaused(paused: boolean): void
  requestAccessibility(): void
  checkForUpdates(): Promise<void>
  /** Quits, installs the downloaded update, and relaunches. */
  installUpdate(): void

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
  updateAi: "ai:update",
  setProviderKey: "ai:set-key",
  listModels: "ai:models",
  testProvider: "ai:test",
  refreshCli: "cli:refresh",
  cliLogin: "cli:login",
  cliCancelLogin: "cli:cancel-login",
  tryPrompt: "prompt:try",
  setRecording: "shortcuts:recording",
  setPaused: "shortcuts:paused",
  requestAccessibility: "accessibility:request",
  checkForUpdates: "update:check",
  installUpdate: "update:install",
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
