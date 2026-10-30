import { createContext, useContext } from "react"
import { createPortal } from "react-dom"

import { cn } from "@/lib/utils"

/** The title-bar strip the current page's header is rendered into. */
export const TitleBarSlot = createContext<HTMLElement | null>(null)

/**
 * A page's title and actions, shown in the window's title bar rather than as a
 * second bar inside the content panel. The strip is the drag area for the
 * window; anything interactive in it opts out.
 */
export function PageHeader({
  icon,
  title,
  children,
  className,
}: {
  icon?: React.ReactNode
  title: string
  children?: React.ReactNode
  className?: string
}) {
  const slot = useContext(TitleBarSlot)
  if (!slot) return null
  return createPortal(
    <div className={cn("flex h-full min-w-0 flex-1 items-center gap-2", className)}>
      {icon ? <span className="flex shrink-0 items-center text-muted-foreground [&_svg]:size-4">{icon}</span> : null}
      <h1 className="truncate font-heading text-sm font-medium">{title}</h1>
      {children ? <div className="no-drag ml-auto flex items-center gap-2">{children}</div> : null}
    </div>,
    slot,
  )
}
