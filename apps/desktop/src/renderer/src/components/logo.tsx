import { cn } from "@/lib/utils"

/**
 * The Polish mark: a P whose bar trails a single flame — the rewrite, done
 * fast. The tile takes the primary colour; the same paths are in
 * resources/icon.svg, which the app and tray icons are rendered from. Same file as
 * apps/web/components/logo.tsx.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" className={cn("text-primary", className)} aria-hidden="true">
      <rect width="96" height="96" rx="22" fill="currentColor" />
      <path
        d="M56.5 23.5L56.5 53H53C44 50 37 44 31 38C25 32 19 24 17 15C21 19 24 21 29 20C39 18 45 23.5 56.5 23.5Z"
        fill="#fff"
      />
      <path
        d="M52 28V76M52 28H64A14 14 0 0 1 64 56H52"
        fill="none"
        stroke="#fff"
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
