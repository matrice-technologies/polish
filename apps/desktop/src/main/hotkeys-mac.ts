import { app } from "electron"
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { createInterface } from "node:readline"
import { acceleratorFromKeyStroke, codeForKey, parseAccelerator, type RecordResult } from "@polish/shared"

/**
 * Global shortcuts on macOS, through native/hotkeys.swift.
 *
 * Electron's globalShortcut finds a key by the character it types. On a French
 * keyboard the number row types & é " … and needs Shift for digits, so "1"
 * matches no key and ⌘⇧1 never fires, and the recorder's "Q" (a position) is
 * registered on the key labelled Q rather than the one pressed. The helper
 * registers Carbon hot keys by virtual key code, the key's place on the
 * keyboard, which is what the recorder stores.
 *
 * Shortcuts fall back to globalShortcut when the helper is missing (a dev
 * machine without Xcode's tools) or has died.
 */

export interface NativeHotkey {
  id: string
  accelerator: string
  run: () => void
}

/** `KeyboardEvent.code` → macOS virtual key code (Carbon's kVK_*). */
const MAC_KEYCODES: Record<string, number> = {
  KeyA: 0, KeyS: 1, KeyD: 2, KeyF: 3, KeyH: 4, KeyG: 5, KeyZ: 6, KeyX: 7, KeyC: 8, KeyV: 9,
  KeyB: 11, KeyQ: 12, KeyW: 13, KeyE: 14, KeyR: 15, KeyY: 16, KeyT: 17,
  Digit1: 18, Digit2: 19, Digit3: 20, Digit4: 21, Digit6: 22, Digit5: 23, Equal: 24, Digit9: 25,
  Digit7: 26, Minus: 27, Digit8: 28, Digit0: 29, BracketRight: 30, KeyO: 31, KeyU: 32,
  BracketLeft: 33, KeyI: 34, KeyP: 35, Enter: 36, KeyL: 37, KeyJ: 38, Quote: 39, KeyK: 40,
  Semicolon: 41, Backslash: 42, Comma: 43, Slash: 44, KeyN: 45, KeyM: 46, Period: 47,
  Tab: 48, Space: 49, Backquote: 50, Backspace: 51, Escape: 53, NumpadEnter: 76,
  Numpad0: 82, Numpad1: 83, Numpad2: 84, Numpad3: 85, Numpad4: 86, Numpad5: 87, Numpad6: 88,
  Numpad7: 89, Numpad8: 91, Numpad9: 92,
  F1: 122, F2: 120, F3: 99, F4: 118, F5: 96, F6: 97, F7: 98, F8: 100, F9: 101, F10: 109,
  F11: 103, F12: 111, F13: 105, F14: 107, F15: 113, F16: 106, F17: 64, F18: 79, F19: 80, F20: 90,
  Insert: 114, Home: 115, PageUp: 116, Delete: 117, End: 119, PageDown: 121,
  ArrowLeft: 123, ArrowRight: 124, ArrowDown: 125, ArrowUp: 126,
}
const CODES_BY_KEYCODE = new Map(Object.entries(MAC_KEYCODES).map(([code, keycode]) => [keycode, code]))

// Carbon's modifier masks (cmdKey, shiftKey, optionKey, controlKey).
const MODIFIER_MASKS: Record<string, number> = {
  CommandOrControl: 0x100,
  Super: 0x100,
  Shift: 0x200,
  Alt: 0x800,
  Control: 0x1000,
}

function toCarbon(accelerator: string): { key: number; modifiers: number } | null {
  const parsed = parseAccelerator(accelerator)
  const code = parsed && codeForKey(parsed.key)
  const key = code ? MAC_KEYCODES[code] : undefined
  if (!parsed || key === undefined) return null
  return { key, modifiers: parsed.modifiers.reduce((mask, m) => mask | MODIFIER_MASKS[m], 0) }
}

/* -------------------------------------------------------------- helper ---- */

let helper: ChildProcessWithoutNullStreams | null = null
let broken = false
let quitting = false
app.on("will-quit", () => (quitting = true))
let onBroken: () => void = () => {}
let handlers = new Map<string, () => void>()
/** One "registered" reply comes back per "set", in order. */
const replies: Array<(failed: string[]) => void> = []
let onRecorded: ((result: RecordResult) => void) | null = null

function helperPath() {
  // resources/** ships outside the asar, so the OS can execute it.
  return app.isPackaged
    ? join(process.resourcesPath, "app.asar.unpacked", "resources", "bin", "polish-hotkeys")
    : join(app.getAppPath(), "resources", "bin", "polish-hotkeys")
}

/** Whether shortcuts go through the helper. False off macOS, or once it has failed. */
export function nativeHotkeysAvailable(): boolean {
  return process.platform === "darwin" && !broken && (helper !== null || existsSync(helperPath()))
}

/** Told when the helper dies, so shortcuts can be registered again another way. */
export function onNativeHotkeysBroken(fn: () => void) {
  onBroken = fn
}

function start(): ChildProcessWithoutNullStreams {
  if (helper) return helper
  const child = spawn(helperPath(), [], { stdio: ["pipe", "pipe", "pipe"] })
  child.stderr.on("data", (chunk) => console.error("polish-hotkeys:", String(chunk).trim()))
  createInterface({ input: child.stdout }).on("line", (line) => handleLine(line))
  const fail = (reason: unknown) => {
    if (helper !== child || quitting) return
    helper = null
    broken = true
    console.error("polish-hotkeys stopped, falling back to globalShortcut:", reason)
    for (const reply of replies.splice(0)) reply([...handlers.keys()])
    handlers = new Map()
    onBroken()
  }
  child.on("error", fail)
  child.on("exit", (code, signal) => fail(signal ?? code))
  helper = child
  return child
}

function send(message: object) {
  start().stdin.write(`${JSON.stringify(message)}\n`)
}

function handleLine(line: string) {
  let message: { type?: string; id?: string; failed?: string[]; key?: number } & Record<string, unknown>
  try {
    message = JSON.parse(line)
  } catch {
    return
  }
  if (message.type === "pressed" && message.id) handlers.get(message.id)?.()
  else if (message.type === "registered") replies.shift()?.(message.failed ?? [])
  else if (message.type === "recorded") recorded(message)
}

/* ------------------------------------------------------------ hot keys ---- */

/** Replaces every registered shortcut; resolves with the ids the OS refused. */
export function setNativeHotkeys(hotkeys: NativeHotkey[]): Promise<string[]> {
  const unusable: string[] = []
  const wanted: Array<{ id: string; key: number; modifiers: number }> = []
  for (const hotkey of hotkeys) {
    const carbon = toCarbon(hotkey.accelerator)
    if (carbon) wanted.push({ id: hotkey.id, ...carbon })
    else unusable.push(hotkey.id)
  }
  handlers = new Map(hotkeys.map((h) => [h.id, h.run]))
  return new Promise((resolve) => {
    replies.push((failed) => resolve([...unusable, ...failed]))
    send({ type: "set", hotkeys: wanted })
  })
}

/* ----------------------------------------------------------- recording ---- */

/**
 * While a shortcut field records, every key pressed is reported by position,
 * including chords Chromium never hands the page (⌘⇧& on a French keyboard).
 */
export function recordNativeKeys(listener: ((result: RecordResult) => void) | null) {
  if (!nativeHotkeysAvailable()) return
  onRecorded = listener
  send({ type: "record", on: listener !== null })
}

function recorded(message: Record<string, unknown>) {
  const code = CODES_BY_KEYCODE.get(Number(message.key))
  if (!code || !onRecorded) return
  // The field cancels on a bare Escape itself.
  const modifiers = message.command || message.control || message.option || message.shift
  if (code === "Escape" && !modifiers) return
  onRecorded(
    acceleratorFromKeyStroke(
      {
        code,
        metaKey: Boolean(message.command),
        ctrlKey: Boolean(message.control),
        altKey: Boolean(message.option),
        shiftKey: Boolean(message.shift),
      },
      "mac",
    ),
  )
}
