import { globalShortcut, type WebContents } from "electron"
import { livePrompts, shortcutConflicts } from "@polish/shared"

import { IPC } from "../common/types"
import {
  nativeHotkeysAvailable,
  onNativeHotkeysBroken,
  recordNativeKeys,
  setNativeHotkeys,
  type NativeHotkey,
} from "./hotkeys-mac"
import { openPicker, polishWithShortcut } from "./polish"
import { store } from "./store"

/**
 * Global shortcuts mirror the store: every change unregisters everything and
 * registers what is there now. Cheap, and it cannot drift.
 *
 * On macOS they go through a native helper that registers keys by position
 * (see hotkeys-mac.ts); elsewhere through Electron's globalShortcut.
 *
 * Paused while a shortcut field in the app is recording — otherwise pressing
 * the chord you are trying to assign would fire the prompt that already has it
 * — and when the person pauses Polish from the tray.
 */
let recording = false
let paused = false
let errors: Record<string, string> = {}
let onToggle: () => void = () => {}
/** Replies from the helper arrive later; only the latest apply may set errors. */
let generation = 0

const TAKEN = "Another app already uses this shortcut."

onNativeHotkeysBroken(() => applyShortcuts())

/** Told when recording or pausing changes, which no store change announces. */
export function onShortcutsToggled(fn: () => void) {
  onToggle = fn
}

export function shortcutErrors() {
  return errors
}

export function isPaused() {
  return paused
}

/** `sender` is the window whose shortcut field is recording, told the keys pressed (macOS). */
export function setRecording(value: boolean, sender?: WebContents) {
  recording = value
  recordNativeKeys(
    value && sender ? (result) => !sender.isDestroyed() && sender.send(IPC.recorded, result) : null,
  )
  applyShortcuts()
  onToggle()
}

export function setPaused(value: boolean) {
  paused = value
  applyShortcuts()
  onToggle()
}

export function applyShortcuts() {
  const { prompts, settings } = store.state
  const live = livePrompts(prompts)
  const conflicts: Record<string, string> = Object.fromEntries(shortcutConflicts(live, settings.pickerShortcut))

  const wanted: NativeHotkey[] = []
  if (!recording && !paused) {
    if (settings.pickerShortcut) {
      wanted.push({ id: "picker", accelerator: settings.pickerShortcut, run: () => void openPicker() })
    }
    for (const prompt of live) {
      if (!prompt.shortcut || conflicts[prompt.id]) continue
      wanted.push({ id: prompt.id, accelerator: prompt.shortcut, run: () => void polishWithShortcut(prompt.id) })
    }
  }

  const current = ++generation
  errors = conflicts
  if (nativeHotkeysAvailable()) {
    globalShortcut.unregisterAll()
    void setNativeHotkeys(wanted).then((failed) => {
      if (current !== generation || failed.length === 0) return
      errors = { ...conflicts, ...Object.fromEntries(failed.map((id) => [id, TAKEN])) }
      onToggle()
    })
  } else {
    globalShortcut.unregisterAll()
    for (const hotkey of wanted) {
      if (!register(hotkey.accelerator, hotkey.run)) errors[hotkey.id] = TAKEN
    }
  }
}

function register(accelerator: string, handler: () => void): boolean {
  try {
    return globalShortcut.register(accelerator, handler)
  } catch {
    return false
  }
}
