import { ArrowDownToLine, Loader2, RotateCw } from "lucide-react"
import type { UpdateStatus } from "../../../common/types"

import { Button } from "@/components/ui/button"
import { polish } from "@/lib/polish"

/**
 * The sidebar's update affordance: quiet while an update downloads, a clear
 * "Restart to update" once it's ready, nothing the rest of the time.
 */
export function UpdateBanner({ update }: { update: UpdateStatus }) {
  if (update.state === "downloading") {
    return (
      <div className="flex h-8 items-center gap-2 px-2 text-xs/relaxed text-muted-foreground">
        <Loader2 className="size-3.5 animate-spin" />
        <span className="flex-1 truncate">Downloading {update.version}</span>
        <span className="tabular-nums">{update.percent}%</span>
      </div>
    )
  }
  if (update.state === "ready") {
    return (
      <div className="mb-1 rounded-lg border bg-background p-2.5 shadow-xs">
        <p className="flex items-center gap-1.5 text-xs/relaxed font-medium">
          <ArrowDownToLine className="size-3.5 text-primary" />
          Polish {update.version} is ready
        </p>
        <Button size="sm" className="mt-2 w-full" onClick={() => polish.installUpdate()}>
          <RotateCw />
          Restart to update
        </Button>
      </div>
    )
  }
  return null
}
