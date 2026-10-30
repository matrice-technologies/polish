import "./marketing.css"

import { Unbounded } from "next/font/google"

import { SiteFooter } from "@/components/marketing/site-footer"
import { SiteHeader } from "@/components/marketing/site-header"
import { Starfield } from "@/components/marketing/starfield"
import { cn } from "@/lib/utils"

/** A wide, heavy display face for headlines, in the spirit of Discord's Ginto Nord. */
const display = Unbounded({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-display" })

/**
 * The public site: landing, download, privacy, terms. Always the night-sky
 * look, so it carries the shadcn `dark` tokens whatever the visitor's theme.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("marketing dark relative min-h-svh overflow-x-clip", display.variable)}>
      <Starfield />
      <div className="relative z-10 flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </div>
  )
}
