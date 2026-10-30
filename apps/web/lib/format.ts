/** Formatting helpers shared by the dashboard. Safe on both server and client. */

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
]

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

/** "3 hours ago". Rendered on the server, so no locale surprises. */
export function formatRelative(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime()

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (Math.abs(elapsed) >= ms) {
      return relative.format(-Math.round(elapsed / ms), unit)
    }
  }
  return "just now"
}

const absolute = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
})

export function formatAbsolute(iso: string): string {
  return absolute.format(new Date(iso))
}

/** Milliseconds since navigation start, as the widget records them. */
export function formatOffset(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
