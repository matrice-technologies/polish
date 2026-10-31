import { clipboard, ClipboardItem, shell, systemPreferences } from "electron"
import { randomUUID } from "node:crypto"
import { parseAccelerator } from "@polish/shared"
import { uIOhook, UiohookKey } from "uiohook-napi"

/**
 * Reading the selection out of whatever app has focus, and writing back into
 * it, the only way that works in every app: through the clipboard, by pressing
 * copy and paste on the person's behalf. uiohook-napi posts the key events at
 * the OS level (SendInput, CGEvent, XTest).
 *
 * The clipboard is borrowed, so its contents are snapshotted first and can be
 * put back afterwards.
 */

const isMac = process.platform === "darwin"
/** The platform's copy/paste modifier. */
const COMMAND = isMac ? UiohookKey.Meta : UiohookKey.Ctrl

/** Every representation that was on the clipboard (text, HTML, RTF, images…). */
export type ClipboardSnapshot = ClipboardItem[]

/**
 * What can be read of the clipboard. An item with no readable format — an
 * empty clipboard after a restart, or only formats Chromium doesn't know —
 * is dropped: a ClipboardItem needs at least one, and there is nothing of it
 * to put back anyway. Reading must never stop the copy itself.
 */
export async function snapshotClipboard(): Promise<ClipboardSnapshot> {
  try {
    // Materialise every payload now: items from read() may resolve lazily
    // against the live clipboard, which is about to be overwritten.
    const items = await clipboard.read()
    const snapshot = await Promise.all(
      items.map(async (item) => {
        const entries = await Promise.all(
          item.types.map(async (type) => {
            try {
              return [[type, await item.getType(type)] as const]
            } catch {
              return []
            }
          }),
        )
        const formats = entries.flat()
        return formats.length ? new ClipboardItem(Object.fromEntries(formats)) : null
      }),
    )
    return snapshot.filter((item) => item !== null)
  } catch (error) {
    console.error("Could not read the clipboard", error)
    return []
  }
}

export async function restoreClipboard(snapshot: ClipboardSnapshot) {
  try {
    if (snapshot.length) await clipboard.write(snapshot)
    else clipboard.clear()
  } catch (error) {
    console.error("Could not restore the clipboard", error)
  }
}

const MODIFIER_KEYS: Record<string, number[]> = {
  CommandOrControl: isMac ? [UiohookKey.Meta, UiohookKey.MetaRight] : [UiohookKey.Ctrl, UiohookKey.CtrlRight],
  Control: [UiohookKey.Ctrl, UiohookKey.CtrlRight],
  Alt: [UiohookKey.Alt, UiohookKey.AltRight],
  Shift: [UiohookKey.Shift, UiohookKey.ShiftRight],
  Super: [UiohookKey.Meta, UiohookKey.MetaRight],
}

/**
 * The shortcut fires while its modifiers are still held, so pressing Ctrl+C
 * right away would really send Ctrl+Shift+C — which opens devtools in a
 * browser. Release exactly the modifiers the shortcut used, as far as the OS is
 * concerned; when the person lets go for real, the extra key-up is harmless.
 * Only those: a stray Win/⌘ key-up on its own can open the Start menu.
 */
function releaseModifiers(accelerator: string | null) {
  const parsed = accelerator ? parseAccelerator(accelerator) : null
  for (const modifier of parsed?.modifiers ?? []) {
    for (const key of MODIFIER_KEYS[modifier]) uIOhook.keyToggle(key, "up")
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor<T>(read: () => Promise<T | null>, timeoutMs: number): Promise<T | null> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const value = await read()
    if (value !== null) return value
    await sleep(15)
  }
  return null
}

/**
 * Copies the current selection and returns it, with the clipboard as it was
 * before. A sentinel is written first so "nothing was selected" (the clipboard
 * never changes) can be told apart from "the same text was already copied".
 */
export async function captureSelection(
  accelerator: string | null,
): Promise<{ text: string | null; previous: ClipboardSnapshot }> {
  const previous = await snapshotClipboard()
  const sentinel = `polish:${randomUUID()}`
  await clipboard.writeText(sentinel)

  releaseModifiers(accelerator)
  await sleep(30)
  uIOhook.keyTap(UiohookKey.C, [COMMAND])

  const text = await waitFor(async () => {
    const current = await clipboard.readText()
    return current !== sentinel ? current : null
  }, 700)

  if (text === null || text === "") {
    await restoreClipboard(previous)
    return { text: null, previous }
  }
  return { text, previous }
}

/** Pastes whatever is on the clipboard into the focused app. */
export async function pasteClipboard(accelerator: string | null) {
  releaseModifiers(accelerator)
  await sleep(30)
  uIOhook.keyTap(UiohookKey.V, [COMMAND])
}

/**
 * macOS refuses synthetic key events from apps without the Accessibility
 * permission — silently, so copy would simply never happen.
 */
export function accessibilityStatus(): "granted" | "missing" | "not-needed" {
  if (!isMac) return "not-needed"
  return systemPreferences.isTrustedAccessibilityClient(false) ? "granted" : "missing"
}

/**
 * Adds Polish to the Accessibility list and opens that pane. macOS shows its
 * own prompt only the first time an app asks, so asking alone would do
 * nothing on every later click.
 */
export function requestAccessibility() {
  if (!isMac || systemPreferences.isTrustedAccessibilityClient(true)) return
  void shell.openExternal("x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")
}

/**
 * Nothing announces the person flipping the switch in System Settings, so
 * the status is checked every couple of seconds until it is granted.
 */
export function watchAccessibility(onChange: () => void) {
  if (!isMac) return
  let last = accessibilityStatus()
  const timer = setInterval(() => {
    const now = accessibilityStatus()
    if (now === last) return
    last = now
    onChange()
  }, 2000)
  timer.unref()
}
