import assert from "node:assert/strict"
import { test } from "node:test"

import {
  acceleratorFromKeyStroke,
  canonicalAccelerator,
  DEFAULT_PROMPTS,
  DEFAULT_SETTINGS,
  formatAccelerator,
  mergePrompts,
  parseSettings,
  preserveSurroundingWhitespace,
  shortcutConflicts,
  type Prompt,
} from "../src/index.ts"

const stroke = (code: string, mods: Partial<Record<"ctrlKey" | "metaKey" | "altKey" | "shiftKey", boolean>> = {}) => ({
  code,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
})

test("canonicalises accelerators and rejects bare keys", () => {
  assert.equal(canonicalAccelerator("shift+ctrl+a"), "Control+Shift+A")
  assert.equal(canonicalAccelerator("CmdOrCtrl+Shift+1"), "CommandOrControl+Shift+1")
  assert.equal(canonicalAccelerator("F8"), "F8")
  assert.equal(canonicalAccelerator("A"), null)
  assert.equal(canonicalAccelerator("Shift+A"), null)
  assert.equal(canonicalAccelerator("Ctrl+"), null)
  assert.equal(canonicalAccelerator("Ctrl+Ctrl+A"), null)
})

test("records keystrokes by physical key, Ctrl and ⌘ both as CommandOrControl", () => {
  assert.deepEqual(acceleratorFromKeyStroke(stroke("Digit1", { ctrlKey: true, shiftKey: true }), "windows"), {
    status: "done",
    accelerator: "CommandOrControl+Shift+1",
  })
  assert.deepEqual(acceleratorFromKeyStroke(stroke("Digit1", { metaKey: true, shiftKey: true }), "mac"), {
    status: "done",
    accelerator: "CommandOrControl+Shift+1",
  })
  assert.deepEqual(acceleratorFromKeyStroke(stroke("ShiftLeft", { shiftKey: true }), "windows"), { status: "pending" })
  assert.equal(acceleratorFromKeyStroke(stroke("KeyA"), "windows").status, "invalid")
})

test("formats per platform", () => {
  assert.equal(formatAccelerator("CommandOrControl+Shift+Space", "windows"), "Ctrl+Shift+Space")
  assert.equal(formatAccelerator("CommandOrControl+Shift+Space", "mac"), "⌘⇧Space")
})

const at = (prompt: Prompt, updatedAt: string, patch: Partial<Prompt> = {}): Prompt => ({ ...prompt, updatedAt, ...patch })

test("merge: newer side wins per prompt, tombstones included", () => {
  const [a, b, c] = DEFAULT_PROMPTS
  const local = [
    at(a, "2026-02-01T00:00:00.000Z", { name: "Local A" }),
    at(b, "2026-01-01T00:00:00.000Z"),
    at(c, "2026-03-01T00:00:00.000Z", { deletedAt: "2026-03-01T00:00:00.000Z" }),
  ]
  const remote = [
    at(a, "2026-01-15T00:00:00.000Z", { name: "Remote A" }),
    at(b, "2026-02-01T00:00:00.000Z", { name: "Remote B" }),
    at(c, "2026-02-01T00:00:00.000Z"),
  ]
  const { prompts, push } = mergePrompts(local, remote)
  const byId = new Map(prompts.map((p) => [p.id, p]))

  assert.equal(byId.get(a.id)!.name, "Local A")
  assert.equal(byId.get(b.id)!.name, "Remote B")
  assert.ok(byId.get(c.id)!.deletedAt)
  assert.deepEqual(push.map((p) => p.id).sort(), [a.id, c.id].sort())
})

test("merge: identical defaults on both sides do not duplicate or push", () => {
  const { prompts, push } = mergePrompts(DEFAULT_PROMPTS, DEFAULT_PROMPTS)
  assert.equal(prompts.length, DEFAULT_PROMPTS.length)
  assert.equal(push.length, 0)
})

test("shortcut conflicts include the picker", () => {
  const [a, b] = DEFAULT_PROMPTS
  const conflicts = shortcutConflicts([a, { ...b, shortcut: a.shortcut }], null)
  assert.ok(conflicts.has(b.id))
  assert.ok(shortcutConflicts([{ ...a, shortcut: "CommandOrControl+Shift+Space" }], "CommandOrControl+Shift+Space").has(a.id))
})

test("settings fall back field by field", () => {
  const parsed = parseSettings({ autoPaste: false, model: "gpt-nope", pickerShortcut: "A" })
  assert.equal(parsed.autoPaste, false)
  assert.equal(parsed.model, DEFAULT_SETTINGS.model)
  assert.equal(parsed.pickerShortcut, DEFAULT_SETTINGS.pickerShortcut)
})

test("keeps the selection's surrounding whitespace", () => {
  assert.equal(preserveSurroundingWhitespace("  helo world\n", "Hello, world."), "  Hello, world.\n")
})
