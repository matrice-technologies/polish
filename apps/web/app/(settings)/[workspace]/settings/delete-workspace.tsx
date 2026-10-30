"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { deleteWorkspace } from "./actions"

/**
 * The danger zone: a claim on the left, the button on the right.
 *
 * The confirmation moved into a dialog rather than sitting open on the page —
 * a text box permanently inviting you to type the workspace name is a strange
 * thing to scroll past — but it is still a confirmation you have to type. This
 * cascades to every project, report and screenshot in the workspace, so a
 * single click was never going to be enough.
 */
export function DeleteWorkspace({
  workspaceSlug,
  workspaceName,
  error,
}: {
  workspaceSlug: string
  workspaceName: string
  error?: string
}) {
  const [confirmation, setConfirmation] = useState("")
  const matches = confirmation === workspaceName

  return (
    <div className="border-destructive/40 flex flex-wrap items-center justify-between gap-4 rounded-lg border p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">Delete workspace</p>
        <p className="text-muted-foreground text-xs">
          Once deleted, this workspace and everything in it cannot be recovered.
        </p>
        {error === "confirm" ? (
          <p className="text-destructive mt-1 text-xs">
            That did not match the workspace name. Nothing was deleted.
          </p>
        ) : null}
        {error === "owner" ? (
          <p className="text-destructive mt-1 text-xs">Only the owner can delete a workspace.</p>
        ) : null}
      </div>

      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" size="lg" />}>
          <Trash2 className="size-4" />
          Delete workspace
        </AlertDialogTrigger>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {workspaceName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes every project, report, screenshot and member. It cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form action={deleteWorkspace} className="space-y-4">
            <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
            <div className="space-y-2">
              <Label htmlFor="confirm">
                Type <span className="font-mono">{workspaceName}</span> to confirm
              </Label>
              <Input
                id="confirm"
                name="confirm"
                autoComplete="off"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel size="lg" onClick={() => setConfirmation("")}>
                Cancel
              </AlertDialogCancel>
              {/* Disabled until the name matches. The action checks it again
                  server-side; this only saves a round trip. */}
              <Button type="submit" variant="destructive" size="lg" disabled={!matches}>
                Delete this workspace
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
