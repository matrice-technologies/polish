import { app, clipboard, Notification } from "electron"
import { livePrompts, preserveSurroundingWhitespace, type Prompt } from "@polish/shared"

import { aiStatus, PolishError, rewriteText } from "./engines"
import {
  accessibilityStatus,
  captureSelection,
  pasteClipboard,
  requestAccessibility,
  restoreClipboard,
  type ClipboardSnapshot,
} from "./selection"
import { store } from "./store"
import { getPickerWindow, hideHud, showHud, showMainWindow, showPicker } from "./windows"

/**
 * The whole point of the app, start to finish: copy the selection, rewrite it,
 * paste the result over it, give the clipboard back.
 *
 * One at a time. A second press while a request is in flight is ignored rather
 * than queued — queuing would paste into wherever focus has moved since.
 */
let busy = false

function setStatus(kind: "working" | "done" | "error", label: string) {
  if (kind === "error") {
    // The HUD is easy to miss; errors also go to a notification when it is off.
    if (!store.state.settings.showHud && Notification.isSupported()) {
      new Notification({ title: "Polish", body: label, silent: true }).show()
    }
  }
  if (store.state.settings.showHud) showHud({ kind, label })
  else if (kind !== "error") hideHud()
}

/** Whether a provider is set up; if not, says what is missing and opens the app. */
function aiReadyOrPrompt(): boolean {
  const { ready, problem } = aiStatus()
  if (!ready) {
    setStatus("error", `${problem ?? "Set up an AI provider."} Open Settings → AI provider.`)
    showMainWindow()
  }
  return ready
}

/**
 * Without Accessibility, macOS drops the copy keystroke without a word and
 * the person would only hear "Select some text first." Say what is wrong.
 */
function accessibilityOrPrompt(): boolean {
  if (accessibilityStatus() !== "missing") return true
  setStatus("error", "Polish needs Accessibility to copy and paste. Allow it in System Settings.")
  requestAccessibility()
  return false
}

/** Run by a prompt's own shortcut: the selection is still in the focused app. */
export async function polishWithShortcut(promptId: string) {
  const prompt = findPrompt(promptId)
  if (!prompt || busy || !accessibilityOrPrompt() || !aiReadyOrPrompt()) return
  busy = true
  try {
    const { text, previous } = await captureSelection(prompt.shortcut)
    if (text === null) {
      setStatus("error", "Select some text first.")
      return
    }
    await polishAndPaste(prompt, text, previous, prompt.shortcut)
  } catch (error) {
    unexpected(error)
  } finally {
    busy = false
  }
}

/** A press must always answer: an error nobody sees looks like a dead shortcut. */
function unexpected(error: unknown) {
  console.error(error)
  setStatus("error", "Something went wrong. Try again.")
}

/* ------------------------------------------------------------- picker ---- */

/**
 * The picker copies first and asks second: once the picker window opens it has
 * focus, and there is no selection left to copy.
 */
let pending: { text: string; previous: ClipboardSnapshot } | null = null

export async function openPicker() {
  if (busy || !accessibilityOrPrompt() || !aiReadyOrPrompt()) return
  busy = true
  let opened = false
  try {
    const { text, previous } = await captureSelection(store.state.settings.pickerShortcut)
    if (text === null) {
      setStatus("error", "Select some text first.")
      return
    }
    pending = { text, previous }
    showPicker()
    opened = true
  } catch (error) {
    unexpected(error)
  } finally {
    // Once open, the picker holds `busy` until a prompt is chosen or it is dismissed.
    if (!opened) busy = false
  }
}

export async function choosePickerPrompt(promptId: string) {
  const prompt = findPrompt(promptId)
  const captured = pending
  pending = null
  await closePicker()
  if (!prompt || !captured) {
    busy = false
    return
  }
  try {
    // Nothing is held down by now, so there are no modifiers to release.
    await polishAndPaste(prompt, captured.text, captured.previous, null)
  } finally {
    busy = false
  }
}

export async function cancelPicker() {
  // Hiding the picker after a choice blurs it, which reports a cancel too;
  // by then the choice has taken `pending`, so there is nothing to undo.
  const captured = pending
  if (!captured) return
  pending = null
  await closePicker()
  await restoreClipboard(captured.previous)
  busy = false
}

/** Hides the picker and gives focus back to the app the text came from. */
async function closePicker() {
  const picker = getPickerWindow()
  if (!picker.isVisible()) return
  picker.hide()
  // macOS does not hand focus back to the previous app on its own.
  if (process.platform === "darwin") app.hide()
  await new Promise((resolve) => setTimeout(resolve, 120))
}

/* ------------------------------------------------------------- shared ---- */

async function polishAndPaste(prompt: Prompt, text: string, previous: ClipboardSnapshot, accelerator: string | null) {
  const { settings } = store.state

  setStatus("working", `${prompt.name}…`)
  try {
    const result = await rewriteText({ instructions: prompt.instructions, text })
    const output = preserveSurroundingWhitespace(text, result)
    await clipboard.writeText(output)

    if (settings.autoPaste) {
      await pasteClipboard(accelerator)
      if (settings.restoreClipboard) {
        // The target app reads the clipboard asynchronously after the keystroke;
        // swapping it back too soon would paste the old contents instead.
        setTimeout(() => void restoreClipboard(previous), 500)
      }
      setStatus("done", "Done")
    } else {
      setStatus("done", "Copied — paste it wherever you like")
    }
  } catch (error) {
    await restoreClipboard(previous)
    setStatus("error", error instanceof PolishError ? error.message : "Something went wrong.")
    if (!(error instanceof PolishError)) console.error(error)
  }
}

/** For the "Try it" box in the app: no clipboard, no keystrokes. */
export async function tryPrompt(promptId: string, text: string): Promise<string> {
  const prompt = findPrompt(promptId)
  if (!prompt) throw new PolishError("That prompt no longer exists.")
  const result = await rewriteText({ instructions: prompt.instructions, text })
  return preserveSurroundingWhitespace(text, result)
}

function findPrompt(id: string): Prompt | undefined {
  return livePrompts(store.state.prompts).find((p) => p.id === id)
}
