"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * The starter template shipped a global "press d to toggle dark mode" hotkey.
 * It has been removed: an unmodified single-letter shortcut fires anywhere that
 * is not a text field — with a menu item or button focused, `d` would flip the
 * entire UI. It also crashed on events with no `key`, which password managers
 * and autofill synthesise around sign-in forms.
 *
 * The theme is switched from the account menu in the sidebar instead.
 */
function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

export { ThemeProvider }
