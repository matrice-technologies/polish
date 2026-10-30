import { Check, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * What a field says about itself once there is no Save button to press.
 *
 * Settings save on their own — a text field when it loses focus, a select the
 * moment it changes — so this is the only thing telling anyone the change was
 * taken. It holds "Saved" until the next edit rather than fading: a message
 * that disappears on a timer is one you can miss entirely by looking away.
 */
export function SaveStatus({
  pending,
  saved,
  error,
  className,
}: {
  pending: boolean
  saved: boolean
  error?: string
  className?: string
}) {
  if (error) {
    return <p className={cn("text-destructive text-xs", className)}>{error}</p>
  }

  if (pending) {
    return (
      <p className={cn("text-muted-foreground flex items-center gap-1 text-xs", className)}>
        <Loader2 className="size-3 animate-spin" />
        Saving…
      </p>
    )
  }

  if (saved) {
    return (
      <p className={cn("text-muted-foreground flex items-center gap-1 text-xs", className)}>
        <Check className="size-3" />
        Saved
      </p>
    )
  }

  return null
}
