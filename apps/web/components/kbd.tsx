import { acceleratorKeys, type Platform } from "@polish/shared"

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
  return (
    <span data-slot="kbd-group" className={cn("inline-flex items-center gap-0.5", className)}>
      {acceleratorKeys(accelerator, platform).map((key, i) => (
        <Kbd key={i}>{key}</Kbd>
      ))}
    </span>
  )
}
