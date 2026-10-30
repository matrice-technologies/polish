"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CopyButton } from "@/components/copy-button"

import { inviteMember, type InviteFormState } from "./actions"

const ROLE_LABELS = { member: "Member", admin: "Admin" }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
      Send invite
    </Button>
  )
}

export function InviteForm({ workspaceSlug }: { workspaceSlug: string }) {
  const [state, formAction] = useActionState<InviteFormState, FormData>(inviteMember, {
    status: "idle",
  })

  return (
    <div className="space-y-3">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="workspaceSlug" value={workspaceSlug} />

        <div className="flex min-w-48 flex-1 flex-col gap-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            placeholder="teammate@company.com"
            required
          />
        </div>

        <div className="flex w-40 flex-col gap-2">
          <Label htmlFor="invite-role">Role</Label>
          <Select name="role" defaultValue="member" items={ROLE_LABELS}>
            <SelectTrigger id="invite-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <SubmitButton />
      </form>

      {state.message ? (
        <p
          className={
            state.status === "error" ? "text-destructive text-sm" : "text-muted-foreground text-sm"
          }
        >
          {state.message}
        </p>
      ) : null}

      {state.manualLink ? (
        <div className="flex items-center gap-2">
          <code className="bg-muted/40 flex-1 overflow-x-auto rounded border px-2 py-1.5 font-mono text-xs">
            {state.manualLink}
          </code>
          <CopyButton value={state.manualLink} />
        </div>
      ) : null}
    </div>
  )
}
