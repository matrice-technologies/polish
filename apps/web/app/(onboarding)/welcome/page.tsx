import type { Metadata } from "next"
import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/logo"
import { listMemberships, requireUser } from "@/lib/auth"

import { WorkspaceForm } from "./workspace-form"
import { APP_NAME } from "@/lib/app"

export const metadata: Metadata = { title: "Create your workspace" }

/** Derives a plausible workspace name so the field is rarely empty. */
function suggestName(email: string | undefined, fullName: string | undefined): string {
  if (fullName?.trim()) return `${fullName.trim().split(" ")[0]}'s workspace`

  const domain = email?.split("@")[1]
  const generic = new Set([
    "gmail.com",
    "outlook.com",
    "hotmail.com",
    "yahoo.com",
    "icloud.com",
    "proton.me",
    "protonmail.com",
  ])

  if (domain && !generic.has(domain)) {
    const company = domain.split(".")[0]
    return company.charAt(0).toUpperCase() + company.slice(1)
  }

  return ""
}

export default async function WelcomePage() {
  const user = await requireUser()

  /**
   * This page has two jobs, and it used to only admit to one.
   *
   * It is where a new account lands, and it is also where the workspace
   * switcher's "New workspace" goes. It used to redirect anyone who already had
   * a workspace back to their dashboard — on the theory that arriving here with
   * one meant a stray URL. But everyone who can see the switcher has a
   * workspace, so that guard made the only deliberate route to this page a
   * no-op: click, and nothing happens.
   *
   * So it stays put and changes what it says instead.
   */
  const memberships = await listMemberships()
  const returning = memberships.length > 0

  const suggestedName = suggestName(
    user.email,
    (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined),
  )

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="size-8" />
          <h1 className="text-xl font-semibold tracking-tight">
            {returning ? "New workspace" : `Welcome to ${APP_NAME}`}
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Name your workspace</CardTitle>
            <CardDescription>
              A workspace holds its own projects and teammates. Nothing is shared between
              workspaces, so this is the right move for a separate company or client — and the
              wrong one for another product you already have people for.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkspaceForm suggestedName={returning ? "" : suggestedName} />
          </CardContent>
        </Card>

        {/* A way out. Onboarding has nowhere to go back to; this arrival does. */}
        {returning ? (
          <p className="text-center">
            <Link
              href={`/${memberships[0].workspaceSlug}`}
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Never mind, back to {memberships[0].workspaceName}
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  )
}
