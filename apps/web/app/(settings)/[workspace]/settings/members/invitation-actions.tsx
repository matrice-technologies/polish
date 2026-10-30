"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/copy-button"

import { resendInvitation, revokeInvitation, type InviteFormState } from "./actions"

function ResendButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="ghost" size="sm" disabled={pending}>
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
      Resend
    </Button>
  )
}

/**
 * Per-row controls for a pending invitation.
 *
 * Resending is the only way back to a working link: the raw token is not stored,
 * so an email that bounced — or a link the admin closed the page on — leaves the
 * invitation stranded otherwise. A resend mints a new token and invalidates the
 * previous link.
 */
export function InvitationActions({
  workspaceSlug,
  invitationId,
}: {
  workspaceSlug: string
  invitationId: string
}) {
  const [state, resendAction] = useActionState<InviteFormState, FormData>(resendInvitation, {
    status: "idle",
  })

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-1">
        <form action={resendAction}>
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="invitationId" value={invitationId} />
          <ResendButton />
        </form>

        <form action={revokeInvitation}>
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
          <input type="hidden" name="invitationId" value={invitationId} />
          <Button type="submit" variant="ghost" size="sm">
            Revoke
          </Button>
        </form>
      </div>

      {state.message ? (
        <div className="flex items-center gap-1.5">
          <span
            className={
              state.status === "error" ? "text-destructive text-xs" : "text-muted-foreground text-xs"
            }
          >
            {state.message}
          </span>
          {state.manualLink ? <CopyButton value={state.manualLink} /> : null}
        </div>
      ) : null}
    </div>
  )
}
