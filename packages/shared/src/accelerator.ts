/**
 * Shortcuts are stored in Electron's accelerator syntax ("CommandOrControl+Shift+1")
 * because that is what the desktop app hands to `globalShortcut`. The web app
 * only records and displays them, so both sides share this one parser.
 *
 * A key is recorded the way the OS will register it, never by `.key`: on
 * AZERTY the key under "1" types "&" without Shift, yet it is still "1".
 * macOS registers by key position, so there it comes from `KeyboardEvent.code`.
 * Windows and Linux register by the layout's key code — on AZERTY the key at
 * the US "Q" position is "A" — so there it comes from `KeyboardEvent.keyCode`.
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

/**
 * `KeyboardEvent.keyCode` → accelerator key. On Windows it is the virtual-key
 * code, the very one Electron registers each accelerator key as.
 */
const KEY_CODE_TO_KEY: Record<number, string> = {
  8: "Backspace",
  9: "Tab",
  13: "Enter",
  27: "Escape",
  32: "Space",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "Left",
  38: "Up",
  39: "Right",
  40: "Down",
  45: "Insert",
  46: "Delete",
  186: ";",
  187: "=",
  188: ",",
  189: "-",
  190: ".",
  191: "/",
  192: "`",
  219: "[",
  220: "\\",
  221: "]",
  222: "'",
}

function keyFromKeyCode(keyCode: number): string | undefined {
  if (keyCode >= 65 && keyCode <= 90) return String.fromCharCode(keyCode)
  if (keyCode >= 48 && keyCode <= 57) return String(keyCode - 48)
  if (keyCode >= 96 && keyCode <= 105) return `num${keyCode - 96}`
  if (keyCode >= 112 && keyCode <= 135) return `F${keyCode - 111}`
  return KEY_CODE_TO_KEY[keyCode]
}

function keyFromCode(code: string): string | undefined {
  const letter = /^Key([A-Z])$/.exec(code)
  const digit = /^Digit([0-9])$/.exec(code)
  const numpad = /^Numpad([0-9])$/.exec(code)
  const fn = /^F([1-9]|1[0-9]|2[0-4])$/.exec(code)
  return CODE_TO_KEY[code] ?? letter?.[1] ?? digit?.[1] ?? (numpad ? `num${numpad[1]}` : undefined) ?? fn?.[0]
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
  /** The layout's key code; 0 or missing when unknown, 229 while an IME composes. */
  keyCode?: number
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

  const byKeyCode = platform !== "mac" && stroke.keyCode && stroke.keyCode !== 229
  const key = byKeyCode ? keyFromKeyCode(stroke.keyCode!) : keyFromCode(stroke.code)
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

/**
 * The `KeyboardEvent.code` of the key an accelerator ends on, the inverse of
 * what the recorder does: "Q" → "KeyQ", "1" → "Digit1". Lets the desktop app
 * find the key's place on the keyboard (macOS hot keys) and what it is
 * labelled on the person's layout.
 */
export function codeForKey(key: string): string | null {
  if (/^[A-Z]$/.test(key)) return `Key${key}`
  if (/^[0-9]$/.test(key)) return `Digit${key}`
  if (/^num[0-9]$/.test(key)) return `Numpad${key.slice(3)}`
  if (/^F\d+$/.test(key)) return key
  if (key === "Plus") return "Equal"
  return Object.entries(CODE_TO_KEY).find(([, k]) => k === key)?.[0] ?? null
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

/** Each key of a shortcut as it should appear on a keycap: ["Ctrl", "Shift", "1"] or ["⌘", "⇧", "1"]. */
export function acceleratorKeys(accelerator: string, platform: Platform): string[] {
  const parsed = parseAccelerator(accelerator)
  if (!parsed) return [accelerator]
  const key = parsed.key.startsWith("num") ? `Num ${parsed.key.slice(3)}` : parsed.key
  const labels = platform === "mac" ? MAC_SYMBOLS : PC_LABELS
  return [...parsed.modifiers.map((m) => labels[m]), key]
}

/** Human-readable form: "⌘⇧1" on macOS, "Ctrl+Shift+1" elsewhere. */
export function formatAccelerator(accelerator: string, platform: Platform): string {
  return acceleratorKeys(accelerator, platform).join(platform === "mac" ? "" : "+")
}
