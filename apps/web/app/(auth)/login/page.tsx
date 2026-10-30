import type { Metadata } from "next"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/logo"

import { LoginForm } from "./login-form"
import { APP_NAME } from "@/lib/app"

export const metadata: Metadata = {
  title: "Sign in",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>
}) {
  const { next, error } = await searchParams

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="size-8" />
          <h1 className="text-xl font-semibold tracking-tight">{APP_NAME}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Use your email or Google account. New here? Signing in creates your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? (
              <p className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-sm">
                {error}
              </p>
            ) : null}
            <LoginForm next={next} />
          </CardContent>
        </Card>

        <p className="text-muted-foreground text-center text-xs">
          Sign in to keep your prompts and shortcuts in sync across machines.
        </p>
      </div>
    </main>
  )
}
