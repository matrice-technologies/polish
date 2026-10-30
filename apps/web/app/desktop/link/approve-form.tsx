"use client"

import { useActionState } from "react"
import { CheckCircle2, Loader2, MonitorCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { approveDeviceLink, type ApproveState } from "./actions"

export function ApproveForm({ code, email }: { code: string; email: string }) {
  const [state, formAction, pending] = useActionState<ApproveState, FormData>(approveDeviceLink, {
    status: "idle",
  })

  if (state.status === "approved") {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <CheckCircle2 className="size-8 text-emerald-500" />
        <p className="text-sm font-medium">{state.deviceName ?? "The desktop app"} is signed in.</p>
        <p className="text-muted-foreground text-sm">You can close this tab and go back to Polish.</p>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="link-code">Code shown in the app</Label>
        <Input
          id="link-code"
          name="code"
          defaultValue={code}
          placeholder="KXRT-9MPD"
          autoComplete="off"
          className="font-mono tracking-widest uppercase"
        />
      </div>
      <p className="text-muted-foreground text-xs">
        Only approve if you just started signing in from Polish and the code matches. The app will be signed in as{" "}
        <span className="text-foreground font-medium">{email}</span>.
      </p>
      {state.status === "error" ? <p className="text-destructive text-sm">{state.message}</p> : null}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <MonitorCheck className="size-4" />}
        Sign in the desktop app
      </Button>
    </form>
  )
}
