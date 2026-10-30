import { cn } from "@/lib/utils"

/** A cursor over a bordered frame: pointing at the page is the core gesture. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-primary", className)}
      aria-hidden="true"
    >
      <path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="m11 11 8 3-3.5 1.5L14 19z" fill="currentColor" />
    </svg>
  )
}
