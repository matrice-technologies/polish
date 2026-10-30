"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { Apple, Download, Monitor } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface DownloadLinks {
  version: string
  windows: string | null
  macArm64: string | null
  macX64: string | null
}

type Os = "windows" | "mac" | "other"

function detect(): Os {
  const ua = navigator.userAgent
  if (/Windows/.test(ua)) return "windows"
  if (/Mac OS X|Macintosh/.test(ua) && !/iPhone|iPad/.test(ua)) return "mac"
  return "other"
}

/** The visitor's OS; the server renders the neutral version and hydration picks. */
function useOs(): Os {
  return useSyncExternalStore(
    () => () => {},
    detect,
    () => "other",
  )
}

/**
 * The primary download for this visitor's OS, plus the other platforms beneath.
 * On a Mac, Apple Silicon is the default: browsers don't reliably say which
 * chip they run on, and it is what every Mac sold since 2023 has.
 */
export function DownloadButtons({ links, className }: { links: DownloadLinks | null; className?: string }) {
  const os = useOs()

  if (!links) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        The first release is on its way. Check back shortly.
      </p>
    )
  }

  const primary =
    os === "windows" && links.windows
      ? { href: links.windows, label: "Download for Windows", icon: Monitor }
      : os === "mac" && links.macArm64
        ? { href: links.macArm64, label: "Download for Mac", icon: Apple }
        : null

  const others = [
    links.windows && { href: links.windows, label: "Windows", hint: "64-bit" },
    links.macArm64 && { href: links.macArm64, label: "macOS", hint: "Apple Silicon" },
    links.macX64 && { href: links.macX64, label: "macOS", hint: "Intel" },
  ].filter(Boolean) as { href: string; label: string; hint: string }[]

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {primary ? (
        <Button size="lg" render={<a href={primary.href} />} className="h-10 px-4 text-sm">
          <primary.icon className="size-4" />
          {primary.label}
        </Button>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {others.map((o) => (
          <Button key={o.href} variant="outline" size="sm" render={<a href={o.href} />}>
            <Download className="size-3.5" />
            {o.label}
            <span className="text-muted-foreground">{o.hint}</span>
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Version {links.version} ·{" "}
        <Link href="/download" className="underline-offset-4 hover:underline">
          All downloads
        </Link>
      </p>
    </div>
  )
}
