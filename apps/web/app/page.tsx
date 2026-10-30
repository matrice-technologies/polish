import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DownloadButtons } from "@/components/download-buttons"
import { Logo } from "@/components/logo"
import { APP_DESCRIPTION, APP_NAME } from "@/lib/app"
import { listMemberships } from "@/lib/auth"
import { latestRelease } from "@/lib/releases"
import { createClient } from "@/lib/supabase/server"

/**
 * Two pages behind one route. A signed-in visitor is routed onward — new users
 * to onboarding, everyone else to their prompts — and a signed-out one gets
 * the landing page. `proxy.ts` lets `/` through unauthenticated for that reason.
 */
export default async function Page() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const memberships = await listMemberships()
    if (memberships.length === 0) redirect("/welcome")
    redirect(`/${memberships[0].workspaceSlug}/prompts`)
  }

  const release = await latestRelease()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
      <Logo className="size-12" />
      <h1 className="font-heading mt-6 text-3xl font-semibold tracking-tight text-balance">{APP_NAME}</h1>
      <p className="text-muted-foreground mt-3 max-w-md text-sm/relaxed text-pretty">
        {APP_DESCRIPTION} For Windows and macOS, with your Claude plan or any API key.
      </p>

      <DownloadButtons links={release} className="mt-8" />

      <div className="mt-10 flex flex-col items-center gap-2 border-t pt-6">
        <p className="text-muted-foreground text-xs">Already using Polish? Sign in to sync your prompts.</p>
        <Button variant="outline" size="sm" render={<Link href="/login" />}>
          Sign in
          <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </main>
  )
}
