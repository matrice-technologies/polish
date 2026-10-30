import { useEffect, useSyncExternalStore } from "react"

const QUERY = "(prefers-color-scheme: dark)"

function subscribe(onChange: () => void) {
  const query = window.matchMedia(QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

/** Light or dark, following the OS — the desktop app has no theme switch of its own. */
export function useSystemTheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, () => (window.matchMedia(QUERY).matches ? "dark" : "light"))
}

/** Puts the shadcn `.dark` class on <html> while the OS is in dark mode. */
export function useDarkClass() {
  const theme = useSystemTheme()
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])
}
