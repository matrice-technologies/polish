"use client"

import { useSyncExternalStore } from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

/**
 * Hard-coded rather than drawn from the theme tokens, because each card has to
 * show its own scheme while the page around it stays in whichever one is
 * active. `bg-card` on the light card would render dark in dark mode, which is
 * precisely the thing these previews exist to distinguish.
 */
const PALETTE = {
  light: {
    page: "#ffffff",
    panel: "#f7f7f7",
    line: "#e8e8e8",
    block: "#e4e4e4",
    strong: "#cdcdcd",
  },
  dark: {
    page: "#0d0d0d",
    panel: "#171717",
    line: "#262626",
    block: "#242424",
    strong: "#3a3a3a",
  },
} as const

const ACCENT = "#3b82f6"

/** A miniature of the app: sidebar, a header, and rows with one thing selected. */
function ThemePreview({ scheme }: { scheme: "light" | "dark" }) {
  const c = PALETTE[scheme]

  return (
    <div className="flex h-full w-full" style={{ background: c.page }}>
      <div
        className="flex w-[28%] shrink-0 flex-col gap-1.5 p-2"
        style={{ background: c.panel, borderRight: `1px solid ${c.line}` }}
      >
        <div className="h-1.5 w-2/3 rounded-full" style={{ background: c.strong }} />
        <div className="mt-1.5 h-1 w-full rounded-full" style={{ background: c.block }} />
        <div className="h-1 w-5/6 rounded-full" style={{ background: c.block }} />
        <div className="h-1 w-3/4 rounded-full" style={{ background: c.block }} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-2">
        <div className="h-1.5 w-1/3 rounded-full" style={{ background: c.strong }} />
        {[0, 1, 2, 3].map((row) => (
          <div key={row} className="flex items-center gap-1.5">
            {row === 1 ? (
              <div className="h-2 w-8 shrink-0 rounded-sm" style={{ background: ACCENT }} />
            ) : (
              <div className="h-1 w-8 shrink-0 rounded-full" style={{ background: c.block }} />
            )}
            <div className="h-1 flex-1 rounded-full" style={{ background: c.block }} />
            <div className="h-1 w-6 shrink-0 rounded-full" style={{ background: c.block }} />
          </div>
        ))}
      </div>
    </div>
  )
}

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

const subscribeToNothing = () => () => {}

/**
 * False on the server and through hydration, true afterwards. next-themes reads
 * the choice from localStorage, which the server cannot see, so reading it
 * during the first render makes the two passes disagree.
 */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  )
}

export function ThemeChooser() {
  const { theme, setTheme } = useTheme()
  const hydrated = useHydrated()
  const selected = hydrated ? theme : undefined

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = selected === value

        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setTheme(value)}
            className={cn(
              "group focus-visible:ring-ring/40 overflow-hidden rounded-lg border text-left transition-colors focus-visible:ring-2 focus-visible:outline-none",
              active ? "border-blue-500 ring-1 ring-blue-500" : "hover:border-foreground/25"
            )}
          >
            <div className="h-24 w-full overflow-hidden">
              {value === "system" ? (
                /* Both at once, which is what "follow the system" means: the
                   same app, whichever way the machine is set. */
                <div className="flex h-full w-full">
                  <div className="h-full w-1/2 overflow-hidden">
                    <ThemePreview scheme="light" />
                  </div>
                  <div className="h-full w-1/2 overflow-hidden border-l border-black/10">
                    <ThemePreview scheme="dark" />
                  </div>
                </div>
              ) : (
                <ThemePreview scheme={value} />
              )}
            </div>

            <div
              className={cn(
                "flex items-center justify-center gap-1.5 border-t py-2 text-xs font-medium",
                active ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </div>
          </button>
        )
      })}
    </div>
  )
}
