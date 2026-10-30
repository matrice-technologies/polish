/**
 * Shortcuts are stored in Electron's accelerator syntax ("CommandOrControl+Shift+1")
 * because that is what the desktop app hands to `globalShortcut`. The web app
 * only records and displays them, so both sides share this one parser.
 *
 * Keys are taken from `KeyboardEvent.code`, the physical key, not `.key`: the
 * OS registers global shortcuts by key position, so on AZERTY the key under
 * "1" is still "1" even though typing it without Shift gives "&".
 */

export type Platform = "mac" | "windows" | "linux"

const MODIFIER_ORDER = ["CommandOrControl", "Control", "Alt", "Shift", "Super"] as const
type Modifier = (typeof MODIFIER_ORDER)[number]

const MODIFIER_ALIASES: Record<string, Modifier> = {
  commandorcontrol: "CommandOrControl",
  cmdorctrl: "CommandOrControl",
  command: "CommandOrControl",
  cmd: "CommandOrControl",
  control: "Control",
  ctrl: "Control",
  alt: "Alt",
  option: "Alt",
  shift: "Shift",
  super: "Super",
  meta: "Super",
}

const NAMED_KEYS = [
  "Space",
  "Tab",
  "Backspace",
  "Delete",
  "Insert",
  "Enter",
  "Up",
  "Down",
  "Left",
  "Right",
  "Home",
  "End",
  "PageUp",
  "PageDown",
  "Escape",
  "Plus",
] as const

const PUNCTUATION = ["`", "-", "=", "[", "]", "\\", ";", "'", ",", ".", "/"] as const

/** `KeyboardEvent.code` → accelerator key, for every key a shortcut may end on. */
const CODE_TO_KEY: Record<string, string> = {
  Space: "Space",
  Tab: "Tab",
  Backspace: "Backspace",
  Delete: "Delete",
  Insert: "Insert",
  Enter: "Enter",
  NumpadEnter: "Enter",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
  Escape: "Escape",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
}

function normalizeKey(raw: string): string | null {
  if (/^[a-z]$/i.test(raw)) return raw.toUpperCase()
  if (/^[0-9]$/.test(raw)) return raw
  const fn = /^f([1-9]|1[0-9]|2[0-4])$/i.exec(raw)
  if (fn) return `F${fn[1]}`
  const num = /^num([0-9])$/i.exec(raw)
  if (num) return `num${num[1]}`
  if ((PUNCTUATION as readonly string[]).includes(raw)) return raw
  const named = NAMED_KEYS.find((k) => k.toLowerCase() === raw.toLowerCase())
  if (named) return named
  if (raw.toLowerCase() === "return") return "Enter"
  if (raw.toLowerCase() === "esc") return "Escape"
  return null
}

export interface ParsedAccelerator {
  modifiers: Modifier[]
  key: string
}

/** Parses and canonicalises an accelerator, or returns null when it is not one we accept. */
export function parseAccelerator(accelerator: string): ParsedAccelerator | null {
  const parts = accelerator.split("+")
  // "Plus" is how a literal + is written, so a bare "+" segment is malformed.
  if (parts.some((p) => p.trim() === "")) return null

  const keyPart = parts.pop()!.trim()
  const key = normalizeKey(keyPart)
  if (!key) return null

  const modifiers = new Set<Modifier>()
  for (const part of parts) {
    const modifier = MODIFIER_ALIASES[part.trim().toLowerCase()]
    if (!modifier || modifiers.has(modifier)) return null
    modifiers.add(modifier)
  }

  // A global shortcut with no real modifier would swallow that key in every
  // app on the machine. Shift alone does not count: Shift+A is just "A".
  const hasRealModifier = [...modifiers].some((m) => m !== "Shift")
  if (!hasRealModifier && !/^F\d+$/.test(key)) return null

  return {
    modifiers: MODIFIER_ORDER.filter((m) => modifiers.has(m)),
    key,
  }
}

export function isValidAccelerator(accelerator: string): boolean {
  return parseAccelerator(accelerator) !== null
}

export function canonicalAccelerator(accelerator: string): string | null {
  const parsed = parseAccelerator(accelerator)
  return parsed ? [...parsed.modifiers, parsed.key].join("+") : null
}

/** The subset of a KeyboardEvent this needs, so it can be called from any UI. */
export interface KeyStroke {
  code: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}

export type RecordResult =
  | { status: "pending" } // only modifiers so far
  | { status: "invalid"; reason: string }
  | { status: "done"; accelerator: string }

/**
 * Turns a keydown into an accelerator for a shortcut recorder. Ctrl on Windows
 * and Linux and ⌘ on macOS both become `CommandOrControl`, so a shortcut set on
 * one machine means the same chord on the other.
 */
export function acceleratorFromKeyStroke(stroke: KeyStroke, platform: Platform): RecordResult {
  const modifierCodes = /^(Control|Meta|Alt|Shift|OS)(Left|Right)?$/
  if (modifierCodes.test(stroke.code)) return { status: "pending" }

  let key: string | undefined = CODE_TO_KEY[stroke.code]
  if (!key) {
    const letter = /^Key([A-Z])$/.exec(stroke.code)
    const digit = /^Digit([0-9])$/.exec(stroke.code)
    const numpad = /^Numpad([0-9])$/.exec(stroke.code)
    const fn = /^F([1-9]|1[0-9]|2[0-4])$/.exec(stroke.code)
    key = letter?.[1] ?? digit?.[1] ?? (numpad ? `num${numpad[1]}` : undefined) ?? fn?.[0]
  }
  if (!key) return { status: "invalid", reason: "That key can't be used in a shortcut." }

  const modifiers: Modifier[] = []
  if (platform === "mac") {
    if (stroke.metaKey) modifiers.push("CommandOrControl")
    if (stroke.ctrlKey) modifiers.push("Control")
  } else {
    if (stroke.ctrlKey) modifiers.push("CommandOrControl")
    if (stroke.metaKey) modifiers.push("Super")
  }
  if (stroke.altKey) modifiers.push("Alt")
  if (stroke.shiftKey) modifiers.push("Shift")

  const accelerator = canonicalAccelerator([...modifiers, key].join("+"))
  if (!accelerator) {
    return {
      status: "invalid",
      reason: `Add ${platform === "mac" ? "⌘, ⌃ or ⌥" : "Ctrl or Alt"} — a bare key would fire in every app.`,
    }
  }
  return { status: "done", accelerator }
}

const MAC_SYMBOLS: Record<Modifier, string> = {
  CommandOrControl: "⌘",
  Control: "⌃",
  Alt: "⌥",
  Shift: "⇧",
  Super: "⌘",
}

const PC_LABELS: Record<Modifier, string> = {
  CommandOrControl: "Ctrl",
  Control: "Ctrl",
  Alt: "Alt",
  Shift: "Shift",
  Super: "Win",
}

/** Human-readable form: "⌘⇧1" on macOS, "Ctrl+Shift+1" elsewhere. */
export function formatAccelerator(accelerator: string, platform: Platform): string {
  const parsed = parseAccelerator(accelerator)
  if (!parsed) return accelerator
  const key = parsed.key.startsWith("num") ? `Num ${parsed.key.slice(3)}` : parsed.key
  if (platform === "mac") {
    return parsed.modifiers.map((m) => MAC_SYMBOLS[m]).join("") + key
  }
  return [...parsed.modifiers.map((m) => PC_LABELS[m]), key].join("+")
}
