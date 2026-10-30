import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/**
 * The web app's settings furniture (apps/web/app/(settings)/…/settings-header.tsx)
 * for the desktop: a readable centred column, a title once per page, and groups
 * separated by a rule rather than boxed.
 */

export function SettingsBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-2xl px-8 py-8", className)}>{children}</div>
}

export function SettingsTitle({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-heading text-2xl font-semibold tracking-tight">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  )
}

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
        <div className="mb-5">
          <h3 className="font-heading text-sm font-medium">{title}</h3>
          {description ? <p className="mt-1 text-xs/relaxed text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}

/** A setting: label and explanation on the left, its control on the right. */
export function SettingsRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string
  description?: React.ReactNode
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-8 py-3">
      <div className="min-w-0">
        <Label htmlFor={htmlFor}>{label}</Label>
        {description ? <p className="mt-1 text-xs/relaxed text-muted-foreground">{description}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
