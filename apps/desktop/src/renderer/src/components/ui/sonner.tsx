import { Toaster as Sonner, type ToasterProps } from "sonner"

import { useSystemTheme } from "@/hooks/use-system-theme"

/** The web app's toaster, with the theme taken from the OS instead of next-themes. */
function Toaster(props: ToasterProps) {
  const theme = useSystemTheme()
  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
