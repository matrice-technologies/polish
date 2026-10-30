import type { Metadata } from "next"
import { Apple, Monitor, RefreshCw } from "lucide-react"

import { DownloadButtons } from "@/components/download-buttons"
import { Logo } from "@/components/logo"
import { RELEASES_URL } from "@/lib/app"
import { latestRelease } from "@/lib/releases"

export const metadata: Metadata = {
  title: "Download",
  description: "Polish for Windows and macOS: rewrite selected text in any app with a keyboard shortcut.",
}

export default async function DownloadPage() {
  const release = await latestRelease()

  const platforms = [
    {
      icon: Monitor,
      name: "Windows",
      detail: "Windows 10 and 11, 64-bit",
      files: [{ label: "Installer (.exe)", href: release?.windows }],
    },
    {
      icon: Apple,
      name: "macOS",
      detail: "macOS 12 and later",
      files: [
        { label: "Apple Silicon (.dmg)", href: release?.macArm64 },
        { label: "Intel (.dmg)", href: release?.macX64 },
      ],
    },
  ]

  return (
    <div className="mx-auto max-w-5xl px-6 pt-16 text-center">
      <Logo className="mx-auto size-16" />
      <h1 className="mt-8 font-display text-5xl leading-[0.95] font-extrabold uppercase sm:text-6xl">Get Polish</h1>
      <p className="mx-auto mt-6 max-w-xl text-lg/relaxed text-blue-100/85">
        Free for Windows and macOS. It updates itself, so this is the only download you&rsquo;ll need.
      </p>
      <DownloadButtons links={release} className="mt-10" />

      <div className="mt-20 grid grid-cols-1 gap-6 text-left md:grid-cols-2">
        {platforms.map((platform) => (
          <div key={platform.name} className="rounded-3xl border border-white/10 bg-white/[0.04] p-8">
            <platform.icon className="size-8 text-blue-300" />
            <h2 className="mt-5 font-display text-2xl font-extrabold uppercase">{platform.name}</h2>
            <p className="mt-1 text-sm text-blue-100/70">{platform.detail}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {platform.files.map((file) =>
                file.href ? (
                  <a
                    key={file.label}
                    href={file.href}
                    className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#0a1440] transition-colors hover:text-blue-700"
                  >
                    {file.label}
                  </a>
                ) : (
                  <span key={file.label} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-blue-100/50">
                    {file.label}: coming soon
                  </span>
                ),
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 flex items-center justify-center gap-2 text-sm text-blue-100/70">
        <RefreshCw className="size-4 text-blue-300" />
        {release ? `Latest version ${release.version}.` : null} Installed copies update themselves ·{" "}
        <a href={RELEASES_URL} className="text-white underline-offset-4 hover:underline">
          Release notes
        </a>
      </p>
    </div>
  )
}
