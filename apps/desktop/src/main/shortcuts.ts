import { globalShortcut } from "electron"
import { livePrompts, shortcutConflicts } from "@polish/shared"

import { openPicker, polishWithShortcut } from "./polish"
import { store } from "./store"

/**
 * Global shortcuts mirror the store: every change unregisters everything and
 * registers what is there now. Cheap, and it cannot drift.
 *
 * Paused while a shortcut field in the app is recording — otherwise pressing
 * the chord you are trying to assign would fire the prompt that already has it
 * — and when the person pauses Polish from the tray.
 */
let recording = false
let paused = false
let errors: Record<string, string> = {}
let onToggle: () => void = () => {}

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

export function setRecording(value: boolean) {
  recording = value
  applyShortcuts()
  onToggle()
}

export function setPaused(value: boolean) {
  paused = value
  applyShortcuts()
  onToggle()
}

export function applyShortcuts() {
  globalShortcut.unregisterAll()
  const { prompts, settings } = store.state
  const live = livePrompts(prompts)
  const next: Record<string, string> = Object.fromEntries(shortcutConflicts(live, settings.pickerShortcut))

  if (!recording && !paused) {
    if (settings.pickerShortcut && !register(settings.pickerShortcut, () => void openPicker())) {
      next.picker = "Another app already uses this shortcut."
    }
    for (const prompt of live) {
      if (!prompt.shortcut || next[prompt.id]) continue
      if (!register(prompt.shortcut, () => void polishWithShortcut(prompt.id))) {
        next[prompt.id] = "Another app already uses this shortcut."
      }
    }
  }

  errors = next
}

function register(accelerator: string, handler: () => void): boolean {
  try {
    return globalShortcut.register(accelerator, handler)
  } catch {
    return false
  }
}
