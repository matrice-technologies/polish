"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { InviteForm } from "./invite-form"

/**
 * The invite form, behind a button in the toolbar rather than open on the page.
 *
 * Inviting is occasional; the list is what the page is for. Keeping the form
 * permanently expanded pushed the members themselves below the fold.
 */
export function InviteDialog({ workspaceSlug }: { workspaceSlug: string }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" className="shrink-0" />}>
        <UserPlus className="size-4" />
        Invite team members
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite team members</DialogTitle>
          <DialogDescription>
            They receive a link that expires in 7 days and only works for their address.
          </DialogDescription>
        </DialogHeader>

        {/* Left open after sending: the form reports back a manual link when
            mail cannot be delivered, and closing would take that away before
            it could be copied. */}
        <InviteForm workspaceSlug={workspaceSlug} />
      </DialogContent>
    </Dialog>
  )
}
