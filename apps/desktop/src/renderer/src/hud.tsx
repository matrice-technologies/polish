import "./styles.css"

import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { AlertCircle, Check, Loader2 } from "lucide-react"
import type { HudStatus } from "../../common/types"

import { useDarkClass } from "@/hooks/use-system-theme"
import { polish } from "@/lib/polish"
import { cn } from "@/lib/utils"

/** "Polishing…": a pill at the bottom of the screen, never focusable. */
function Hud() {
  useDarkClass()
  const [status, setStatus] = useState<HudStatus | null>(null)
  useEffect(() => polish.onHud(setStatus), [])
  if (!status) return null

  const Icon = status.kind === "working" ? Loader2 : status.kind === "done" ? Check : AlertCircle

  return (
    <div className="flex h-full items-center justify-center p-2">
      <div
        key={status.kind}
        className="flex max-w-full animate-in items-center gap-2 rounded-full border bg-popover/95 py-1.5 pr-4 pl-1.5 text-xs font-medium text-popover-foreground shadow-lg backdrop-blur fade-in-0 zoom-in-95"
      >
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full",
            status.kind === "working" && "bg-primary/10 text-primary",
            status.kind === "done" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
            status.kind === "error" && "bg-destructive/10 text-destructive",
          )}
        >
          <Icon className={cn("size-3.5", status.kind === "working" && "animate-spin")} />
        </span>
        <span className="truncate">{status.label}</span>
      </div>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<Hud />)
