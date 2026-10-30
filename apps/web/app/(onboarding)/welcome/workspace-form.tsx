"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { ArrowRight, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { slugify } from "@/lib/slug"

import { createWorkspace, type WorkspaceFormState } from "./actions"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Create workspace
      {pending ? null : <ArrowRight className="size-4" />}
    </Button>
  )
}

export function WorkspaceForm({ suggestedName }: { suggestedName: string }) {
  const [state, formAction] = useActionState<WorkspaceFormState, FormData>(createWorkspace, {
    status: "idle",
  })
  const [name, setName] = useState(state.name ?? suggestedName)

  const preview = name.trim() ? slugify(name) : "your-workspace"

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Workspace name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Acme Inc"
          autoFocus
          required
        />
        <p className="text-muted-foreground text-xs">
          Your projects will live at <span className="font-mono">/{preview}</span>
        </p>
      </div>

      {state.status === "error" && state.message ? (
        <p className="text-destructive text-sm">{state.message}</p>
      ) : null}

      <SubmitButton />
    </form>
  )
}
