import Link from "next/link"

import { Logo } from "@/components/logo"
import { GITHUB_URL, RELEASES_URL } from "@/lib/app"

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/download", label: "Download" },
      { href: "/#features", label: "Features" },
      { href: "/login", label: "Log in" },
      { href: RELEASES_URL, label: "Release notes" },
    ],
  },
  {
    title: "Open source",
    links: [
      { href: GITHUB_URL, label: "GitHub" },
      { href: `${GITHUB_URL}/issues`, label: "Report an issue" },
      { href: `${GITHUB_URL}/blob/main/LICENSE`, label: "MIT License" },
      { href: `${GITHUB_URL}/security/advisories/new`, label: "Report a vulnerability" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/#faq", label: "FAQ" },
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-white/10 bg-[#050a24]/60">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-16 sm:px-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <p className="font-display text-3xl leading-tight font-extrabold text-blue-300 uppercase">
            Write it.
            <br />
            Polish it.
          </p>
          <p className="mt-4 max-w-xs text-sm/relaxed text-blue-100/70">
            A free, open-source desktop app that rewrites selected text in any app with a keyboard shortcut.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-semibold text-blue-300">{column.title}</p>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-white/85 hover:text-white hover:underline underline-offset-4">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-white/10 px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <Logo className="size-6" />
          <span className="font-display text-sm font-bold">Polish</span>
        </Link>
        <p className="text-xs text-blue-100/60">© 2026 Matrice Technologies · MIT licensed</p>
      </div>
    </footer>
  )
}
