"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { Download } from "lucide-react"

import { GITHUB_URL } from "@/lib/app"
import { cn } from "@/lib/utils"

export interface DownloadLinks {
  version: string
  windows: string | null
  macArm64: string | null
  macX64: string | null
}

export type Os = "windows" | "mac" | "other"

function detect(): Os {
  const ua = navigator.userAgent
  if (/Windows/.test(ua)) return "windows"
  if (/Mac OS X|Macintosh/.test(ua) && !/iPhone|iPad/.test(ua)) return "mac"
  return "other"
}

/** The visitor's OS; the server renders the neutral version and hydration picks. */
export function useOs(): Os {
  return useSyncExternalStore(
    () => () => {},
    detect,
    () => "other",
  )
}

const bigButton =
  "inline-flex h-14 items-center justify-center gap-3 rounded-2xl px-7 text-lg font-semibold transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-8px_rgb(59_130_246/0.6)] active:translate-y-0"

/**
 * Discord-style calls to action: a white "Download for <your OS>" and a blue
 * "View on GitHub", with every other platform as a quiet link beneath. On a
 * Mac, Apple Silicon is the default: browsers don't reliably say which chip
 * they run on, and it is what every Mac sold since 2023 has.
 */
export function DownloadButtons({
  links,
  className,
  align = "center",
}: {
  links: DownloadLinks | null
  className?: string
  align?: "center" | "start"
}) {
  const os = useOs()

  const primary =
    os === "mac" && links?.macArm64
      ? { href: links.macArm64, label: "Download for Mac" }
      : links?.windows
        ? { href: links.windows, label: "Download for Windows" }
        : null

  const others = links
    ? ([
        links.windows && { href: links.windows, label: "Windows" },
        links.macArm64 && { href: links.macArm64, label: "macOS (Apple Silicon)" },
        links.macX64 && { href: links.macX64, label: "macOS (Intel)" },
      ].filter(Boolean) as { href: string; label: string }[])
    : []

  return (
    <div className={cn("flex flex-col gap-4", align === "center" ? "items-center" : "items-start", className)}>
      <div className={cn("flex flex-wrap gap-4", align === "center" && "justify-center")}>
        {primary ? (
          <a href={primary.href} className={cn(bigButton, "bg-white text-[#0a1440] hover:text-blue-700")}>
            <Download className="size-5" />
            {primary.label}
          </a>
        ) : (
          <Link href="/download" className={cn(bigButton, "bg-white text-[#0a1440] hover:text-blue-700")}>
            <Download className="size-5" />
            Download
          </Link>
        )}
        <a href={GITHUB_URL} className={cn(bigButton, "bg-blue-600 text-white hover:bg-blue-500")}>
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
            <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
          </svg>
          View on GitHub
        </a>
      </div>
      {links ? (
        <p className="text-sm text-blue-100/70">
          Version {links.version} for{" "}
          {others.map((o, i) => (
            <span key={o.href}>
              {i > 0 ? (i === others.length - 1 ? " and " : ", ") : null}
              <a href={o.href} className="font-medium text-white underline-offset-4 hover:underline">
                {o.label}
              </a>
            </span>
          ))}
          . Free and open source.
        </p>
      ) : (
        <p className="text-sm text-blue-100/70">The first release is on its way. Check back shortly.</p>
      )}
    </div>
  )
}
