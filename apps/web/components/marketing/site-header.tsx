import Link from "next/link"

import { Logo } from "@/components/logo"
import { AccountLink } from "@/components/marketing/account-link"
import { GITHUB_URL } from "@/lib/app"

const NAV = [
  { href: "/download", label: "Download" },
  { href: "/#features", label: "Features" },
  { href: "/#faq", label: "FAQ" },
  { href: GITHUB_URL, label: "GitHub" },
  { href: "/privacy", label: "Privacy" },
]

export function SiteHeader() {
  return (
    <header className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-6 px-6 sm:px-10">
      <Link href="/" className="flex items-center gap-2.5">
        <Logo className="size-8" />
        <span className="font-display text-lg font-bold">Polish</span>
      </Link>

      <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
        {NAV.map((item) => (
          <Link key={item.label} href={item.href} className="text-white/90 transition-colors hover:text-white hover:underline underline-offset-8">
            {item.label}
          </Link>
        ))}
      </nav>

      <AccountLink className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0a1440] transition-colors hover:bg-blue-50 hover:text-blue-700" />
    </header>
  )
}
