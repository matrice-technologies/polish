import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft, Keyboard, RefreshCw, ShieldCheck } from "lucide-react"

import { DownloadButtons } from "@/components/download-buttons"
import { Logo } from "@/components/logo"
import { latestRelease, RELEASES_PAGE } from "@/lib/releases"

export const metadata: Metadata = {
  title: "Download",
  description: "Polish for Windows and macOS: rewrite selected text in any app with a keyboard shortcut.",
}

export default async function DownloadPage() {
  const release = await latestRelease()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col px-6 py-10">
      <Link href="/" className="flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Polish
      </Link>

      <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <Logo className="size-14" />
        <h1 className="mt-6 font-heading text-3xl font-semibold tracking-tight text-balance">Download Polish</h1>
        <p className="mt-3 max-w-md text-sm/relaxed text-pretty text-muted-foreground">
          Select text in any app, press a shortcut, and it comes back rewritten. Free, and it works with your Claude plan
          or any API key.
        </p>
        <DownloadButtons links={release} className="mt-8" />
      </div>

      <div className="grid gap-6 border-t pt-8 text-left sm:grid-cols-3">
        <Feature icon={Keyboard} title="One shortcut away">
          Each prompt gets its own shortcut. Polish copies, rewrites, and pastes back.
        </Feature>
        <Feature icon={RefreshCw} title="Updates itself">
          New versions download in the background and install when you restart.
        </Feature>
        <Feature icon={ShieldCheck} title="Your text, your keys">
          Text goes from your computer straight to the model you choose.
        </Feature>
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Windows 10 and 11 · macOS 12 and later ·{" "}
        <a href={RELEASES_PAGE} className="underline-offset-4 hover:underline">
          Release notes
        </a>
      </p>
    </main>
  )
}

function Feature({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Keyboard
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Icon className="size-4 text-primary" />
      <p className="mt-2 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs/relaxed text-muted-foreground">{children}</p>
    </div>
  )
}
