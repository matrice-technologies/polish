"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { siteOrigin } from "@/lib/site-url"

const emailSchema = z.email("Enter a valid email address")

export interface AuthFormState {
  status: "idle" | "sent" | "error"
  message?: string
  email?: string
}


export async function signInWithMagicLink(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rawEmail = String(formData.get("email") ?? "").trim()
  const next = String(formData.get("next") ?? "")

  const parsed = emailSchema.safeParse(rawEmail)
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message, email: rawEmail }
  }

  const supabase = await createClient()
  const origin = await siteOrigin()

  // GoTrue's default email template routes through /auth/v1/verify, which comes
  // back as a PKCE `code` — so magic links land on the same callback as OAuth.
  // Note this ties a link to the browser that requested it: the code verifier is
  // a cookie there, so opening the mail on another device cannot complete.
  const callback = new URL("/auth/callback", origin)
  if (next) callback.searchParams.set("next", next)

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: callback.toString(),
      // Magic link doubles as sign-up: there is no separate registration step.
      shouldCreateUser: true,
    },
  })

  if (error) {
    return { status: "error", message: error.message, email: parsed.data }
  }

  return { status: "sent", email: parsed.data }
}

export async function signInWithGoogle(formData: FormData) {
  const next = String(formData.get("next") ?? "")

  const supabase = await createClient()
  const origin = await siteOrigin()

  const callback = new URL("/auth/callback", origin)
  if (next) callback.searchParams.set("next", next)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callback.toString(),
      queryParams: {
        // Ask for a refresh token and let the user pick an account.
        access_type: "offline",
        prompt: "consent",
      },
    },
  })

  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Google sign-in unavailable")}`)
  }

  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
