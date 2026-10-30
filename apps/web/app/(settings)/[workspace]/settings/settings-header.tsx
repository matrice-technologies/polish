import { Info } from "lucide-react"

/**
 * The bar at the top of a settings section. h-14 with a bottom border, the same
 * box as the sidebar's own header, so the two rules meet as one line.
 */
export function SettingsHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-6 backdrop-blur">
      <span className="text-muted-foreground flex shrink-0 items-center">{icon}</span>
      <h1 className="font-heading text-sm font-medium">{title}</h1>
    </div>
  )
}

/**
 * The column a settings section is read in: centred, and still bounded so a
 * line of body text does not run the width of a desktop window — but 3xl
 * rather than 2xl, which left more gutter than content on a wide screen.
 *
 * Every settings page renders inside this, so the width is set once here rather
 * than per page.
 */
export function SettingsBody({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-3xl px-6 py-10">{children}</div>
}

/** Title and standfirst, once per section. */
export function SettingsTitle({
  title,
  description,
}: {
  title: string
  description?: React.ReactNode
}) {
  return (
    <div className="mb-8">
      <h2 className="font-heading text-2xl font-semibold">{title}</h2>
      {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
    </div>
  )
}

/**
 * A group of related fields. Sits directly on the page background — the border
 * above is all that separates one group from the next, so nothing here reads as
 * a panel floating on a surface.
 */
export function SettingsGroup({
  title,
  description,
  children,
}: {
  title?: string
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mt-10 border-t pt-8 first:mt-0 first:border-0 first:pt-0">
      {title ? (
        <div className="mb-4">
          <h3 className="font-heading text-base font-semibold">{title}</h3>
          {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

/** A standing remark about the whole section, not about one field. */
export function SettingsNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/40 text-muted-foreground mb-8 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-xs/relaxed">
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}
