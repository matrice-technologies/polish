import { useSyncExternalStore } from "react"
import { acceleratorKeys, codeForKey, parseAccelerator, type Platform } from "@polish/shared"

import { cn } from "@/lib/utils"

/** shadcn's Kbd: one key, styled as a small keycap. */
export function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex h-5 min-w-5 items-center justify-center gap-1 rounded-sm border bg-muted px-1 font-sans text-[11px] font-medium text-muted-foreground select-none",
        className,
      )}
      {...props}
    />
  )
}

/* ------------------------------------------------------ keyboard layout ---- */

/**
 * What each key is labelled on this keyboard ("KeyQ" → "a" on AZERTY), from
 * Chromium's Keyboard Map API. On macOS shortcuts are stored and registered by
 * position, so the key under the American "1" shows as "&" on a French Mac.
 * Read again whenever the window gets focus, in case the layout changed.
 */
type KeyboardWithLayout = { getLayoutMap(): Promise<ReadonlyMap<string, string>> }
let layout: ReadonlyMap<string, string> | null = null
const layoutListeners = new Set<() => void>()

function loadLayout() {
  const keyboard = (navigator as Navigator & { keyboard?: KeyboardWithLayout }).keyboard
  keyboard
    ?.getLayoutMap()
    .then((map) => {
      layout = map
      for (const listener of layoutListeners) listener()
    })
    .catch(() => {})
}
loadLayout()
window.addEventListener("focus", loadLayout)

function useKeyboardLayout() {
  return useSyncExternalStore(
    (listener) => {
      layoutListeners.add(listener)
      return () => void layoutListeners.delete(listener)
    },
    () => layout,
  )
}

/** The accelerator's keycaps, with its last key as labelled on this keyboard. */
function keycaps(accelerator: string, platform: Platform, map: ReadonlyMap<string, string> | null) {
  const keys = acceleratorKeys(accelerator, platform)
  const parsed = parseAccelerator(accelerator)
  const code = parsed && codeForKey(parsed.key)
  const label = platform === "mac" && code && !code.startsWith("Numpad") ? map?.get(code) : undefined
  if (label && label.trim().length === 1) keys[keys.length - 1] = label.toUpperCase()
  return keys
}

/** A whole shortcut as a row of keycaps. */
export function Shortcut({
  accelerator,
  platform,
  className,
}: {
  accelerator: string
  platform: Platform
  className?: string
}) {
  const map = useKeyboardLayout()
  return (
    <span data-slot="kbd-group" className={cn("inline-flex items-center gap-0.5", className)}>
      {keycaps(accelerator, platform, map).map((key, i) => (
        <Kbd key={i}>{key}</Kbd>
      ))}
    </span>
  )
}
