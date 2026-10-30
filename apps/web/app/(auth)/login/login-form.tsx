"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { CheckCircle2, Loader2, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { GoogleIcon } from "@/components/google-icon"

import { signInWithGoogle, signInWithMagicLink, type AuthFormState } from "./actions"

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
      {children}
    </Button>
  )
}

function GoogleButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="outline" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon className="size-4" />}
      Continue with Google
    </Button>
  )
}

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(signInWithMagicLink, {
    status: "idle",
  })

  // A rejected send returns the address in `state.email`, which as a
  // defaultValue would move under the mounted field and trip Base UI's
  // uncontrolled-FieldControl warning. Controlling it holds the address across
  // the round trip on its own, which is what the default was there to do.
  const [email, setEmail] = useState("")

  if (state.status === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-full">
          <CheckCircle2 className="size-5" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">Check your inbox</p>
          <p className="text-muted-foreground text-sm">
            We sent a sign-in link to <span className="text-foreground">{state.email}</span>. It
            expires in an hour.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="next" value={next ?? ""} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        {state.status === "error" && state.message ? (
          <p className="text-destructive text-sm">{state.message}</p>
        ) : null}
        <SubmitButton>Send magic link</SubmitButton>
      </form>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs uppercase">or</span>
        <Separator className="flex-1" />
      </div>

      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next ?? ""} />
        <GoogleButton />
      </form>
    </div>
  )
}
