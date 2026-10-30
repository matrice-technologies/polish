import type { Metadata } from "next"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/logo"
import { requireUser } from "@/lib/auth"
import { normalizeUserCode } from "@/lib/tokens"

import { ApproveForm } from "./approve-form"

export const metadata: Metadata = { title: "Sign in the desktop app" }

/**
 * Where the desktop app sends the browser to approve its sign-in. `proxy.ts`
 * bounces signed-out visitors through /login and back here, code intact.
 */
export default async function DesktopLinkPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const user = await requireUser()
  const { code } = await searchParams

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="size-8" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign in the desktop app</CardTitle>
            <CardDescription>Your prompts, shortcuts and settings will sync to it.</CardDescription>
          </CardHeader>
          <CardContent>
            <ApproveForm code={code ? normalizeUserCode(code) : ""} email={user.email ?? ""} />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
