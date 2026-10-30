"use client"

import { useSyncExternalStore } from "react"
import type { Platform } from "@polish/shared"

function detect(): Platform {
  const ua = navigator.userAgent
  if (/Mac|iPhone|iPad/.test(ua)) return "mac"
  if (/Linux/.test(ua) && !/Android/.test(ua)) return "linux"
  return "windows"
}

const noop = () => () => {}

/**
 * The visitor's OS, for showing shortcuts as ⌘⇧1 or Ctrl+Shift+1. The server
 * cannot know it, so the first render says "windows" and hydration corrects it
 * rather than mismatching.
 */
export function usePlatform(): Platform {
  return useSyncExternalStore(noop, detect, () => "windows")
}
