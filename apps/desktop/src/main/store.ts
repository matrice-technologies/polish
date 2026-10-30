import { app } from "electron"
import { EventEmitter } from "node:events"
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import {
  DEFAULT_PROMPTS,
  DEFAULT_SETTINGS,
  parseSettings,
  promptSchema,
  type Prompt,
  type SyncedSettings,
} from "@polish/shared"

import { PROVIDER_IDS, type AiSettings } from "../common/providers"
import type { DeviceSettings } from "../common/types"

/**
 * Everything the app knows, on disk as one JSON file under userData. This is
 * the source of truth: the app works the same with or without an account, and
 * syncing only ever merges into it.
 */
export interface LocalState {
  /** All prompts, tombstones included, so deletes can sync. */
  prompts: Prompt[]
  settings: SyncedSettings
  settingsUpdatedAt: string
  device: DeviceSettings
  /** Where the signed-in account lives, remembered so the session can resume. */
  connection: { supabaseUrl: string; supabaseAnonKey: string; email: string } | null
}

/** "user" changes are new edits to upload; "sync" changes came from the account. */
export type ChangeSource = "user" | "sync"

const DEFAULT_WEB_URL = import.meta.env.MAIN_VITE_WEB_URL || "http://localhost:3000"

const DEFAULT_AI: AiSettings = {
  provider: "anthropic",
  models: {},
  customBaseUrl: "http://localhost:11434/v1",
  claudePath: null,
}

function initialState(): LocalState {
  return {
    prompts: DEFAULT_PROMPTS,
    settings: DEFAULT_SETTINGS,
    settingsUpdatedAt: new Date(0).toISOString(),
    device: { launchAtLogin: false, webUrl: DEFAULT_WEB_URL, ai: DEFAULT_AI },
    connection: null,
  }
}

/**
 * AI settings as stored, with anything unknown dropped. Before providers
 * existed the Anthropic model was a synced setting, so it is carried over.
 */
function parseAi(raw: unknown, legacyModel: unknown): AiSettings {
  const ai = (raw && typeof raw === "object" ? raw : {}) as Partial<AiSettings>
  const models = Object.fromEntries(
    Object.entries(ai.models ?? {}).filter(
      ([id, model]) => (PROVIDER_IDS as string[]).includes(id) && typeof model === "string",
    ),
  )
  if (!models.anthropic && typeof legacyModel === "string") models.anthropic = legacyModel
  return {
    provider: ai.provider && PROVIDER_IDS.includes(ai.provider) ? ai.provider : DEFAULT_AI.provider,
    models,
    customBaseUrl: typeof ai.customBaseUrl === "string" ? ai.customBaseUrl : DEFAULT_AI.customBaseUrl,
    claudePath: typeof ai.claudePath === "string" ? ai.claudePath : null,
  }
}

class Store extends EventEmitter<{ change: [ChangeSource] }> {
  state: LocalState = initialState()
  /** True until a provider has been chosen on this machine, so startup can pick a sensible one. */
  aiUnset = true
  private writeTimer: NodeJS.Timeout | null = null

  private get file() {
    return join(app.getPath("userData"), "polish.json")
  }

  load() {
    if (!existsSync(this.file)) return
    try {
      const raw = JSON.parse(readFileSync(this.file, "utf8"))
      const base = initialState()
      // Parse item by item: one malformed prompt should not cost all the others.
      const prompts = Array.isArray(raw.prompts)
        ? raw.prompts.flatMap((p: unknown) => {
            const parsed = promptSchema.safeParse(p)
            return parsed.success ? [parsed.data] : []
          })
        : base.prompts
      this.state = {
        prompts,
        settings: parseSettings(raw.settings),
        settingsUpdatedAt: typeof raw.settingsUpdatedAt === "string" ? raw.settingsUpdatedAt : base.settingsUpdatedAt,
        device: { ...base.device, ...raw.device, ai: parseAi(raw.device?.ai, raw.settings?.model) },
        connection: raw.connection ?? null,
      }
      this.aiUnset = !raw.device?.ai
    } catch (error) {
      console.error("Could not read polish.json, starting fresh", error)
    }
  }

  update(source: ChangeSource, patch: Partial<LocalState>) {
    this.state = { ...this.state, ...patch }
    this.scheduleWrite()
    this.emit("change", source)
  }

  /** Written on a short delay so a burst of edits is one write; flushed on quit. */
  private scheduleWrite() {
    if (this.writeTimer) clearTimeout(this.writeTimer)
    this.writeTimer = setTimeout(() => this.flush(), 300)
  }

  flush() {
    if (this.writeTimer) clearTimeout(this.writeTimer)
    this.writeTimer = null
    // Write then rename, so a crash mid-write leaves the previous file intact.
    const tmp = `${this.file}.tmp`
    writeFileSync(tmp, JSON.stringify(this.state, null, 2))
    renameSync(tmp, this.file)
  }
}

export const store = new Store()
