import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { acceleratorFromKeyStroke, formatAccelerator, type Platform } from "@polish/shared"

import { polish } from "../api"
import { cn } from "./ui"

/**
 * Click, press the chord. While recording, the app's global shortcuts are
 * suspended so the chord reaches this field instead of firing a prompt.
 */
export function ShortcutRecorder({
  id,
  value,
  onChange,
  platform,
  placeholder = "No shortcut",
  error,
}: {
  id?: string
  value: string | null
  onChange: (value: string | null) => void
  platform: Platform
  placeholder?: string
  error?: string
}) {
  const [recording, setRecording] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    polish.setRecording(recording)
  }, [recording])
  useEffect(() => () => polish.setRecording(false), [])

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
            if (event.key === "Escape") return setRecording(false)
            const result = acceleratorFromKeyStroke(event.nativeEvent, platform)
            if (result.status === "invalid") setHint(result.reason)
            if (result.status === "done") {
              onChange(result.accelerator)
              setRecording(false)
              setHint(null)
            }
          }}
          className={cn(
            "border-input flex h-8 min-w-44 items-center rounded-md border px-2.5 font-mono text-xs outline-none",
            "focus-visible:border-primary focus-visible:ring-primary/30 focus-visible:ring-2",
            recording && "border-primary ring-primary/30 ring-2",
            error && !recording && "border-destructive",
          )}
        >
          {recording ? (
            <span className="text-muted-foreground font-sans">Press a shortcut…</span>
          ) : value ? (
            formatAccelerator(value, platform)
          ) : (
            <span className="text-muted-foreground font-sans">{placeholder}</span>
          )}
        </button>
        {value && !recording ? (
          <button
            type="button"
            aria-label="Clear shortcut"
            onClick={() => onChange(null)}
            className="hover:bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-md"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      {hint ? <p className="text-destructive text-xs">{hint}</p> : null}
      {!hint && error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  )
}
