import { z } from "zod"

import { acceleratorSchema } from "./prompts.ts"

/**
 * Models offered in the desktop app. Opus is the default; Haiku is there for
 * people who would trade some quality for a faster round trip on every press.
 */
export const MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5", hint: "Best quality" },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5", hint: "Balanced" },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5", hint: "Fastest" },
] as const

export type ModelId = (typeof MODELS)[number]["id"]

export const DEFAULT_MODEL: ModelId = "claude-opus-5-5"

/**
 * Settings that follow the person from machine to machine once they sign in.
 * Anything device-specific (launch at login, the API key) stays on the device.
 *
 * Every field has a default so an older row, or one written by an older app,
 * still parses after a field is added.
 */
export const syncedSettingsSchema = z.object({
  model: z.enum(MODELS.map((m) => m.id) as [ModelId, ...ModelId[]]).default(DEFAULT_MODEL),
  /** Paste the result over the selection when done, rather than only copying it. */
  autoPaste: z.boolean().default(true),
  /** Put back whatever was on the clipboard before the polish borrowed it. */
  restoreClipboard: z.boolean().default(true),
  /** Show the small "Polishing…" indicator while a request is in flight. */
  showHud: z.boolean().default(true),
  /** Opens a picker listing every prompt, for the ones without their own shortcut. */
  pickerShortcut: acceleratorSchema.nullable().default("CommandOrControl+Shift+Space"),
})

export type SyncedSettings = z.infer<typeof syncedSettingsSchema>

export const DEFAULT_SETTINGS: SyncedSettings = syncedSettingsSchema.parse({})

/** Parses whatever is stored, falling back field by field rather than wholesale. */
export function parseSettings(value: unknown): SyncedSettings {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const result: Record<string, unknown> = {}
  const shape = syncedSettingsSchema.shape
  for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
    const parsed = shape[key].safeParse(input[key])
    result[key] = parsed.success ? parsed.data : DEFAULT_SETTINGS[key]
  }
  return result as SyncedSettings
}
