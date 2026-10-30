import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react"

/** The handful of controls the app needs, styled once. */

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger"
  size?: "sm" | "md"
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors outline-none",
        "focus-visible:ring-primary/40 focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3.5",
        size === "sm" ? "h-7 px-2 text-xs" : "h-8 px-3 text-xs",
        variant === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
        variant === "outline" && "border-input hover:bg-muted border",
        variant === "ghost" && "hover:bg-muted",
        variant === "danger" && "text-destructive hover:bg-destructive/10",
        className,
      )}
      {...props}
    />
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "border-input placeholder:text-muted-foreground h-8 w-full rounded-md border bg-transparent px-2.5 text-[13px] outline-none",
        "focus-visible:border-primary focus-visible:ring-primary/30 focus-visible:ring-2",
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "border-input placeholder:text-muted-foreground w-full resize-none rounded-md border bg-transparent px-2.5 py-2 text-[13px] leading-relaxed outline-none",
        "focus-visible:border-primary focus-visible:ring-primary/30 focus-visible:ring-2",
        className,
      )}
      {...props}
    />
  )
}

export function Switch({
  checked,
  onChange,
  id,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full transition-colors outline-none",
        "focus-visible:ring-primary/40 focus-visible:ring-2",
        checked ? "bg-primary" : "bg-input",
      )}
    >
      <span
        className={cn(
          "block size-3.5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  )
}

export function Label({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-medium">
      {children}
    </label>
  )
}

/** A setting: label and explanation on the left, the control on the right. */
export function Row({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string
  description?: ReactNode
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <div className="min-w-0">
        <Label htmlFor={htmlFor}>{label}</Label>
        {description ? <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="border-input bg-muted rounded border px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap">
      {children}
    </kbd>
  )
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b px-6 py-4">
      <div>
        <h1 className="text-base font-semibold">{title}</h1>
        {description ? <p className="text-muted-foreground mt-0.5 text-xs">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
