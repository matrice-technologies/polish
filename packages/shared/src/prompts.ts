import { z } from "zod"

import { canonicalAccelerator, isValidAccelerator } from "./accelerator.ts"

/* ---------------------------------------------------------- shortcuts ---- */

export const acceleratorSchema = z
  .string()
  .trim()
  .refine(isValidAccelerator, "Not a usable shortcut")
  .transform((value) => canonicalAccelerator(value)!)

/* ------------------------------------------------------------ prompts ---- */

export const PROMPT_NAME_MAX = 80
export const PROMPT_INSTRUCTIONS_MAX = 20_000

/** The fields a person edits. */
export const promptInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the prompt a name")
    .max(PROMPT_NAME_MAX, `Keep the name under ${PROMPT_NAME_MAX} characters`),
  instructions: z
    .string()
    .trim()
    .min(1, "Say what the prompt should do to the text")
    .max(PROMPT_INSTRUCTIONS_MAX, "Those instructions are too long"),
  shortcut: acceleratorSchema.nullable(),
})

export type PromptInput = z.infer<typeof promptInputSchema>

/**
 * A prompt as both apps hold it. Ids are minted by whichever app creates the
 * prompt, so a prompt written offline already has its permanent identity when
 * it is first synced. Deletion leaves a tombstone (`deletedAt`) so the delete
 * itself can sync; the row is never physically removed by the apps.
 */
export const promptSchema = promptInputSchema.extend({
  id: z.uuid(),
  position: z.number().int(),
  updatedAt: z.iso.datetime({ offset: true }),
  deletedAt: z.iso.datetime({ offset: true }).nullable(),
})

export type Prompt = z.infer<typeof promptSchema>

/** The `public.prompts` row, minus `user_id`, which RLS and the default supply. */
export interface PromptRow {
  id: string
  name: string
  instructions: string
  shortcut: string | null
  position: number
  updated_at: string
  deleted_at: string | null
}

export function promptToRow(prompt: Prompt): PromptRow {
  return {
    id: prompt.id,
    name: prompt.name,
    instructions: prompt.instructions,
    shortcut: prompt.shortcut,
    position: prompt.position,
    updated_at: prompt.updatedAt,
    deleted_at: prompt.deletedAt,
  }
}

export function promptFromRow(row: PromptRow): Prompt {
  return {
    id: row.id,
    name: row.name,
    instructions: row.instructions,
    shortcut: row.shortcut,
    position: row.position,
    // Postgres hands timestamps back as "2026-10-30 12:00:00+00"; normalise so
    // comparisons against locally minted ISO strings are by instant, not text.
    updatedAt: new Date(row.updated_at).toISOString(),
    deletedAt: row.deleted_at ? new Date(row.deleted_at).toISOString() : null,
  }
}

export function livePrompts(prompts: Prompt[]): Prompt[] {
  return prompts
    .filter((p) => !p.deletedAt)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
}

/**
 * Prompts every install starts with. The ids are fixed, not random: a person
 * who uses Polish offline on two machines and then signs in on both would
 * otherwise end up with every default twice.
 */
const EPOCH = "2026-01-01T00:00:00.000Z"

export const DEFAULT_PROMPTS: Prompt[] = [
  {
    id: "5f0b8d0e-6a43-4d3e-9a51-0b6c2a7e0001",
    name: "Polish",
    instructions:
      "Fix spelling, grammar and punctuation, and smooth out awkward phrasing. Keep my voice, my wording where it already works, and the original meaning. Do not add anything new.",
    shortcut: "CommandOrControl+Shift+1",
    position: 0,
    updatedAt: EPOCH,
    deletedAt: null,
  },
  {
    id: "5f0b8d0e-6a43-4d3e-9a51-0b6c2a7e0002",
    name: "Shorter",
    instructions:
      "Make this noticeably shorter and more direct. Keep every fact and request; cut filler, hedging and repetition.",
    shortcut: "CommandOrControl+Shift+2",
    position: 1,
    updatedAt: EPOCH,
    deletedAt: null,
  },
  {
    id: "5f0b8d0e-6a43-4d3e-9a51-0b6c2a7e0003",
    name: "Professional",
    instructions:
      "Rewrite this in a clear, friendly, professional tone suitable for a work email or message. Keep it about the same length.",
    shortcut: "CommandOrControl+Shift+3",
    position: 2,
    updatedAt: EPOCH,
    deletedAt: null,
  },
  {
    id: "5f0b8d0e-6a43-4d3e-9a51-0b6c2a7e0004",
    name: "Translate to English",
    instructions:
      "Translate this into natural, idiomatic English. If it is already English, polish it instead.",
    shortcut: null,
    position: 3,
    updatedAt: EPOCH,
    deletedAt: null,
  },
]
