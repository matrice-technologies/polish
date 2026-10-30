"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import { Check, Loader2 } from "lucide-react"

import { Keycap } from "@/components/marketing/keycap"
import { usePlatform } from "@/hooks/use-platform"
import { cn } from "@/lib/utils"

/**
 * The product, acted out: rough text in some app gets selected, a shortcut is
 * pressed, the "Polishing…" pill appears, and the text comes back rewritten.
 * Three real prompts take turns. With reduced motion it simply shows the
 * finished first example.
 */

const SCENARIOS = [
  {
    app: "Mail",
    header: "To: Sam · Quarterly report",
    prompt: "Polish",
    key: "1",
    before: "hey sam, can u send me the report asap? i think their is a mistake in the numbers",
    after: "Hi Sam, could you send me the report as soon as possible? I think there's a mistake in the numbers.",
  },
  {
    app: "Slack",
    header: "# team-design",
    prompt: "Shorter",
    key: "2",
    before:
      "I just wanted to quickly reach out to let you all know that unfortunately I won't be able to make it to the meeting tomorrow afternoon.",
    after: "I can't make tomorrow afternoon's meeting, sorry!",
  },
  {
    app: "Docs",
    header: "Client follow-up",
    prompt: "Professional",
    key: "3",
    before: "yo, cant do the call today, ill send u the files later, they basically look fine",
    after: "Unfortunately I can't make today's call. I'll send you the files later today; they look good overall.",
  },
]

type Phase = "rough" | "select" | "keys" | "working" | "done" | "leaving"
const TIMING: Record<Phase, number> = { rough: 1300, select: 900, keys: 750, working: 1300, done: 3200, leaving: 500 }
const NEXT: Record<Phase, Phase> = {
  rough: "select",
  select: "keys",
  keys: "working",
  working: "done",
  done: "leaving",
  leaving: "rough",
}

const REDUCE = "(prefers-reduced-motion: reduce)"
function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(REDUCE)
      query.addEventListener("change", onChange)
      return () => query.removeEventListener("change", onChange)
    },
    () => window.matchMedia(REDUCE).matches,
    () => false,
  )
}

export function HeroDemo({ className }: { className?: string }) {
  const platform = usePlatform()
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>("rough")

  useEffect(() => {
    if (reduced) return
    const timer = setTimeout(() => {
      if (phase === "leaving") setIndex((i) => (i + 1) % SCENARIOS.length)
      setPhase(NEXT[phase])
    }, TIMING[phase])
    return () => clearTimeout(timer)
  }, [phase, reduced])

  const shown = reduced ? "done" : phase
  const scenario = SCENARIOS[reduced ? 0 : index]
  const selected = shown === "select" || shown === "keys" || shown === "working"
  const polished = shown === "done" || shown === "leaving"
  const mod = platform === "mac" ? "⌘" : "Ctrl"
  const shift = platform === "mac" ? "⇧" : "Shift"

  return (
    <div className={cn("relative", className)}>
      {/* The app window the text lives in. */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-[#0d1640]/90 backdrop-blur transition-[border-color,box-shadow] duration-700 ease-out",
          shown === "done"
            ? "border-blue-300/30 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.7),0_0_60px_-10px_rgb(59_130_246/0.45)]"
            : "border-white/15 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.7),0_0_0_1px_rgb(59_130_246/0.15)]",
        )}
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="size-3 rounded-full bg-white/15" />
          <span className="size-3 rounded-full bg-white/15" />
          <span className="size-3 rounded-full bg-white/15" />
          <span className="ml-3 rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-blue-100">{scenario.app}</span>
          <span className="truncate text-xs text-blue-100/60">{scenario.header}</span>
        </div>

        <div className="relative min-h-52 px-6 pt-6 pb-20 sm:min-h-48">
          {/* Both versions share one grid cell, so swapping them never moves anything. */}
          <div className="grid text-lg/relaxed sm:text-xl/relaxed">
            <p
              key={`before-${index}`}
              aria-hidden={polished}
              className={cn(
                "polish-fade-in text-blue-100/80 transition-[opacity,filter,transform] duration-300 ease-out [grid-area:1/1]",
                polished && "-translate-y-1 opacity-0 blur-[3px]",
              )}
            >
              <span
                className={cn(
                  "box-decoration-clone rounded bg-gradient-to-r from-blue-500/45 to-blue-500/45 bg-no-repeat transition-[background-size] ease-out",
                  selected ? "bg-[length:100%_100%] duration-700" : "bg-[length:0%_100%] duration-0",
                )}
              >
                {scenario.before}
              </span>
              {shown === "rough" ? <span className="ml-0.5 inline-block h-5 w-0.5 animate-pulse bg-blue-200 align-middle" /> : null}
            </p>
            {polished ? (
              // The rewrite arrives word by word: each one fades in and sharpens.
              <p
                key={`after-${index}`}
                className={cn(
                  "text-white transition-[opacity,filter] duration-500 ease-out [grid-area:1/1]",
                  shown === "leaving" && "opacity-0 blur-[3px]",
                )}
              >
                {scenario.after.split(" ").map((word, i) => (
                  <span key={i}>
                    <span className="polish-word" style={{ "--word-delay": `${120 + i * 45}ms` } as React.CSSProperties}>
                      {word}
                    </span>{" "}
                  </span>
                ))}
              </p>
            ) : null}
          </div>

          {/* The HUD pill Polish shows while it works. */}
          <div
            className={cn(
              "absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-[#050a24]/90 py-1.5 pr-4 pl-1.5 text-sm font-medium text-white shadow-lg transition-all duration-300",
              shown === "working" || shown === "done" ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
            )}
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full",
                shown === "working" ? "bg-blue-500/20 text-blue-300" : "bg-emerald-500/20 text-emerald-300",
              )}
            >
              {shown === "working" ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            </span>
            {/* "Done" stays while the pill fades out, as the next example begins. */}
            {shown === "working" ? `${scenario.prompt}…` : "Done"}
          </div>
        </div>
      </div>

      {/* The shortcut being pressed, and which prompt it runs. */}
      <div
        className={cn(
          "absolute -bottom-7 left-6 flex items-center gap-2 transition-all duration-300 sm:left-10",
          shown === "keys" || shown === "working" ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        <Keycap pressed={shown === "keys"} key={`mod-${index}-${shown}`}>
          {mod}
        </Keycap>
        <Keycap pressed={shown === "keys"} key={`shift-${index}-${shown}`}>
          {shift}
        </Keycap>
        <Keycap pressed={shown === "keys"} key={`key-${index}-${shown}`}>
          {scenario.key}
        </Keycap>
        <span className="ml-2 rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white shadow-lg">{scenario.prompt}</span>
      </div>
    </div>
  )
}
