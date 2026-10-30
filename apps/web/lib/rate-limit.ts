import "server-only"

import type { NextRequest } from "next/server"

/**
 * A fixed-window counter per key, in memory. Enough for the unauthenticated
 * desktop-link endpoints on a single app instance; if the app ever runs as
 * several replicas this belongs in the database or Redis instead.
 */
const windows = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const current = windows.get(key)
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    sweep(now)
    return { ok: true, retryAfter: 0 }
  }
  current.count++
  return { ok: current.count <= limit, retryAfter: Math.ceil((current.resetAt - now) / 1000) }
}

/** Drops finished windows now and then, so the map can't grow without bound. */
function sweep(now: number) {
  if (windows.size < 10_000) return
  for (const [key, value] of windows) if (value.resetAt <= now) windows.delete(key)
}

/** The caller's address as Traefik passes it on; "unknown" groups the rest. */
export function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown"
  )
}
