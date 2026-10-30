"use client"

import Link from "next/link"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useOs, type DownloadLinks } from "@/components/download-buttons"

/**
 * The way from the account to the app it exists for: a direct download for the
 * visitor's OS, and the download page for the rest. Sits at the foot of the
 * sidebar, out of the way once the app is installed, and hides when the sidebar
 * collapses to icons.
 */
export function DesktopDownloadCard({ links }: { links: DownloadLinks | null }) {
  const os = useOs()

  const direct =
    os === "mac" && links?.macArm64
      ? { href: links.macArm64, label: "Download for Mac" }
      : os === "windows" && links?.windows
        ? { href: links.windows, label: "Download for Windows" }
        : null

  return (
    <div className="bg-background ring-foreground/10 rounded-lg p-3 ring-1 group-data-[collapsible=icon]:hidden">
      <p className="text-sm font-medium">Get the desktop app</p>
      <p className="text-muted-foreground mt-0.5 text-xs/relaxed">
        Polish rewrites text from your keyboard, in any app.
        {links ? ` Version ${links.version}.` : null}
      </p>
      {direct ? (
        <Button size="lg" className="mt-3 w-full" render={<a href={direct.href} />}>
          <Download />
          {direct.label}
        </Button>
      ) : (
        <Button size="lg" className="mt-3 w-full" render={<Link href="/download" />}>
          <Download />
          Download
        </Button>
      )}
      {direct ? (
        <Link
          href="/download"
          className="text-muted-foreground hover:text-foreground mt-2 block text-center text-xs underline-offset-4 hover:underline"
        >
          Other platforms
        </Link>
      ) : null}
    </div>
  )
}
