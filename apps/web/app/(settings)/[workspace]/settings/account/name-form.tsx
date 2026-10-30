"use client"

import { useActionState, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SaveStatus } from "@/components/save-status"

import { updateAccountName, type AccountSettingsState } from "./actions"

export function NameForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState<AccountSettingsState, FormData>(
    updateAccountName,
    { status: "idle" },
  )

  const [name, setName] = useState(defaultName)

  /**
   * Dirty is measured against the server's value, not against a copy taken when
   * the field was last submitted. That is what makes a failed save retryable:
   * the action revalidates on success so `defaultName` catches up and the field
   * goes clean, while a failure leaves it behind and the next blur tries again.
   */
  const dirty = name !== defaultName

  return (
    <form action={formAction} className="space-y-2">
      <Label htmlFor="account-name">Display name</Label>
      <Input
        id="account-name"
        name="fullName"
        value={name}
        onChange={(event) => setName(event.target.value)}
        // On blur rather than on every keystroke: this writes to the auth user
        // and revalidates the whole layout, which is not a per-character cost.
        onBlur={(event) => {
          if (dirty) event.currentTarget.form?.requestSubmit()
        }}
        placeholder="Your name"
      />
      <SaveStatus
        pending={pending}
        saved={state.status === "saved" && !dirty}
        error={state.status === "error" ? state.message : undefined}
      />
    </form>
  )
}
