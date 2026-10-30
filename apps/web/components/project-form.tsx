"use client"

import { useActionState, useState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SaveStatus } from "@/components/save-status"
import type { ProjectFormState } from "@/app/(app)/[workspace]/projects/actions"

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  )
}

/**
 * Creates a project, and edits one.
 *
 * The two halves behave differently on purpose. Editing saves as you go, when
 * the field loses focus, because there is a project on the other end to save
 * to. Creating cannot: there is nothing to write until the name is decided, so
 * it keeps its button.
 */
export function ProjectForm({
  action,
  workspaceSlug,
  projectId,
  defaults,
  submitLabel,
}: {
  action: (state: ProjectFormState, formData: FormData) => Promise<ProjectFormState>
  workspaceSlug: string
  projectId?: string
  defaults?: { name: string }
  submitLabel: string
}) {
  const [state, formAction, pending] = useActionState<ProjectFormState, FormData>(action, {
    status: "idle",
  })

  const [name, setName] = useState(defaults?.name ?? "")
  const editing = Boolean(projectId)

  // Measured against the server's value, so a failed save stays dirty and the
  // next blur retries it.
  const dirty = name !== (defaults?.name ?? "")

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      {projectId ? <input type="hidden" name="projectId" value={projectId} /> : null}

      <Label htmlFor="name">Project name</Label>
      <Input
        id="name"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={(event) => {
          if (editing && dirty && name.trim()) event.currentTarget.form?.requestSubmit()
        }}
        placeholder="Marketing site"
        required
      />
      {state.fieldErrors?.name ? (
        <p className="text-destructive text-sm">{state.fieldErrors.name}</p>
      ) : null}

      {editing ? (
        <SaveStatus
          pending={pending}
          saved={state.status === "saved" && !dirty}
          error={state.status === "error" ? state.message : undefined}
        />
      ) : (
        <div className="pt-2">
          <SubmitButton label={submitLabel} />
        </div>
      )}
    </form>
  )
}
