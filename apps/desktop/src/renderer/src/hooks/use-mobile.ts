import * as React from "react"

const MOBILE_BREAKPOINT = 768
const QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

/**
 * Tracks whether the viewport is phone-sized.
 *
 * `useSyncExternalStore` rather than an effect that calls setState: matchMedia
 * is an external store, and subscribing to it directly avoids the extra render
 * pass — and the lint error — that a setState-in-effect version produces. It
 * also gives a defined value on the very first client render instead of
 * flipping from undefined a tick later.
 */
function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

/** The server has no viewport; assume desktop, matching the sidebar's default. */
function getServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
