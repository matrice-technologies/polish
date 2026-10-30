"use client"

import { useActionState, useRef } from "react"
import { useFormStatus } from "react-dom"
import { ImageUp, Loader2, Trash2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

import {
  removeAccountAvatar,
  updateAccountAvatar,
  type AccountSettingsState,
} from "./actions"

function UploadButton({ onPick }: { onPick: () => void }) {
  const { pending } = useFormStatus()
  return (
    <Button type="button" size="lg" onClick={onPick} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
      Upload new image
    </Button>
  )
}

function RemoveButton() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      size="icon-lg"
      variant="ghost"
      disabled={pending}
      aria-label="Remove profile picture"
    >
      <Trash2 className="text-destructive size-4" />
    </Button>
  )
}

export function AvatarForm({
  avatarUrl,
  initials,
}: {
  avatarUrl: string | null
  initials: string
}) {
  const [state, formAction] = useActionState<AccountSettingsState, FormData>(updateAccountAvatar, {
    status: "idle",
  })
  const fileInput = useRef<HTMLInputElement>(null)
  const uploadForm = useRef<HTMLFormElement>(null)

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
        <AvatarFallback className="text-base">{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 space-y-2">
        <div>
          <p className="text-sm font-medium">Profile picture</p>
          <p className="text-muted-foreground text-xs">
            PNG, JPEG, WebP or GIF, under 10 MB.
          </p>
        </div>

        <div className="flex items-center gap-1">
          <form ref={uploadForm} action={formAction}>
            {/* The real input stays hidden and the button stands in for it:
                a bare file input cannot be styled to match anything else here.
                Picking a file submits straight away — there is nothing else to
                fill in, so a separate Save would only be a second click. */}
            <input
              ref={fileInput}
              type="file"
              name="avatar"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={() => uploadForm.current?.requestSubmit()}
            />
            <UploadButton onPick={() => fileInput.current?.click()} />
          </form>

          {avatarUrl ? (
            <form action={removeAccountAvatar}>
              <RemoveButton />
            </form>
          ) : null}
        </div>

        {state.status === "error" && state.message ? (
          <p className="text-destructive text-xs">{state.message}</p>
        ) : null}
      </div>
    </div>
  )
}
