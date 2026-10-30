"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { acceleratorFromKeyStroke, formatAccelerator } from "@polish/shared"

import { Button } from "@/components/ui/button"
import { usePlatform } from "@/hooks/use-platform"
import { cn } from "@/lib/utils"

/**
 * Click, press the chord, done. Escape abandons the recording; the × clears the
 * shortcut. The value is an Electron accelerator, which is what the desktop app
 * registers — this only records and shows it.
 */
export function ShortcutRecorder({
  id,
  value,
  onChange,
  placeholder = "No shortcut",
}: {
  id?: string
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
}) {
  const platform = usePlatform()
  const [recording, setRecording] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <button
          id={id}
          type="button"
          onClick={() => {
            setRecording(true)
            setHint(null)
          }}
          onBlur={() => setRecording(false)}
          onKeyDown={(event) => {
            if (!recording) return
            event.preventDefault()
            if (event.key === "Escape") {
              setRecording(false)
              return
            }
            const result = acceleratorFromKeyStroke(event.nativeEvent, platform)
            if (result.status === "invalid") setHint(result.reason)
            if (result.status === "done") {
              onChange(result.accelerator)
              setRecording(false)
              setHint(null)
            }
          }}
          className={cn(
            "border-input bg-input/20 dark:bg-input/30 flex h-7 min-w-40 items-center rounded-md border px-2 font-mono text-xs outline-none",
            "focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-2",
            recording && "border-ring ring-ring/30 ring-2",
          )}
        >
          {recording ? (
            <span className="text-muted-foreground">Press a shortcut…</span>
          ) : value ? (
            formatAccelerator(value, platform)
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </button>
        {value && !recording ? (
          <Button type="button" variant="ghost" size="icon" aria-label="Clear shortcut" onClick={() => onChange(null)}>
            <X />
          </Button>
        ) : null}
      </div>
      {hint ? <p className="text-destructive text-xs">{hint}</p> : null}
    </div>
  )
}
