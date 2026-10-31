import { useEffect, useRef, useState } from "react"
import { Keyboard, X } from "lucide-react"
import { acceleratorFromKeyStroke, type Platform, type RecordResult } from "@polish/shared"

import { Button } from "@/components/ui/button"
import { Shortcut } from "@/components/kbd"
import { polish } from "@/lib/polish"
import { cn } from "@/lib/utils"

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
  className,
}: {
  id?: string
  value: string | null
  onChange: (value: string | null) => void
  platform: Platform
  placeholder?: string
  error?: string
  className?: string
}) {
  const [recording, setRecording] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    polish.setRecording(recording)
  }, [recording])
  useEffect(() => () => polish.setRecording(false), [])

  function take(result: RecordResult) {
    if (result.status === "invalid") setHint(result.reason)
    if (result.status === "done") {
      onChange(result.accelerator)
      setRecording(false)
      setHint(null)
    }
  }

  // On macOS the main process also reports each key by position: the page
  // never sees some chords (⌘⇧& on a French keyboard).
  const latestTake = useRef(take)
  latestTake.current = take
  useEffect(() => (recording ? polish.onRecorded((result) => latestTake.current(result)) : undefined), [recording])

  const message = hint ?? (!recording ? error : undefined)

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1">
        <button
          id={id}
          type="button"
          aria-invalid={Boolean(message) || undefined}
          onClick={() => {
            setRecording(true)
            setHint(null)
          }}
          onBlur={() => setRecording(false)}
          onKeyDown={(event) => {
            if (!recording) return
            event.preventDefault()
            if (event.key === "Escape") return setRecording(false)
            take(acceleratorFromKeyStroke(event.nativeEvent, platform))
          }}
          className={cn(
            // The boilerplate Input's box (mira: h-7, xs text), so it sits in a form unnoticed.
            "flex h-7 min-w-44 items-center gap-2 rounded-md border border-input bg-input/20 px-2 text-xs/relaxed transition-colors outline-none dark:bg-input/30",
            "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
            "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
            recording && "border-ring ring-2 ring-ring/30",
          )}
        >
          <Keyboard className="size-3.5 shrink-0 text-muted-foreground" />
          {recording ? (
            <span className="text-muted-foreground">Press a shortcut…</span>
          ) : value ? (
            <Shortcut accelerator={value} platform={platform} />
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
      {message ? <p className="text-xs text-destructive">{message}</p> : null}
    </div>
  )
}
