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

function initialState(): LocalState {
  return {
    prompts: DEFAULT_PROMPTS,
    settings: DEFAULT_SETTINGS,
    settingsUpdatedAt: new Date(0).toISOString(),
    device: { launchAtLogin: false, webUrl: DEFAULT_WEB_URL },
    connection: null,
  }
}

class Store extends EventEmitter<{ change: [ChangeSource] }> {
  state: LocalState = initialState()
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
        device: { ...base.device, ...raw.device },
        connection: raw.connection ?? null,
      }
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
