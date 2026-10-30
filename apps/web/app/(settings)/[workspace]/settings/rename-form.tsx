"use client"

import { useActionState, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SaveStatus } from "@/components/save-status"

import { renameWorkspace, type WorkspaceSettingsState } from "./actions"

export function RenameForm({
  workspaceSlug,
  defaultName,
}: {
  workspaceSlug: string
  defaultName: string
}) {
  const [state, formAction, pending] = useActionState<WorkspaceSettingsState, FormData>(
    renameWorkspace,
    { status: "idle" },
  )

  // Seeded from the server value, then owned here. renameWorkspace revalidates
  // this route, so a new `defaultName` arrives while the field is still mounted
  // — and Base UI warns when an uncontrolled FieldControl's default moves after
  // initialisation. Controlling it also keeps what was typed if the save fails.
  const [name, setName] = useState(defaultName)

  // Measured against the server's value, so a failed save stays dirty and the
  // next blur retries it. See the note in the account name form.
  const dirty = name.trim() !== defaultName

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />

      <Label htmlFor="workspace-name">Workspace name</Label>
      <Input
        id="workspace-name"
        name="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={(event) => {
          // An empty name is not a change worth sending — the action would
          // reject it and the field would sit there red for a blur.
          if (dirty && name.trim()) event.currentTarget.form?.requestSubmit()
        }}
        required
      />
      <SaveStatus
        pending={pending}
        saved={state.status === "saved" && !dirty}
        error={state.status === "error" ? state.message : undefined}
      />
    </form>
  )
}
