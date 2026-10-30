import "./styles.css"

import { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import { AlertCircle, Check, Loader2 } from "lucide-react"

import type { HudStatus } from "../../common/types"
import { polish } from "./api"
import { cn } from "./components/ui"

/** "Polishing…" — a pill at the bottom of the screen, never focusable. */
function Hud() {
  const [status, setStatus] = useState<HudStatus | null>(null)
  useEffect(() => polish.onHud(setStatus), [])
  if (!status) return null

  const Icon = status.kind === "working" ? Loader2 : status.kind === "done" ? Check : AlertCircle

  return (
    <div className="flex h-full items-center justify-center">
      <div
        className={cn(
          "flex max-w-full items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium text-white shadow-lg",
          status.kind === "error" ? "bg-red-600/95" : "bg-zinc-900/95",
        )}
      >
        <Icon className={cn("size-3.5 shrink-0", status.kind === "working" && "animate-spin")} />
        <span className="truncate">{status.label}</span>
      </div>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(<Hud />)
