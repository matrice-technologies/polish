"use client"

import { useActionState, useRef } from "react"
import { useFormStatus } from "react-dom"
import { ImageUp, Loader2, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ProjectIcon } from "@/components/project-icon"

import {
  removeProjectLogo,
  updateProjectLogo,
  type ProjectFormState,
} from "../../projects/actions"

function UploadButton({ onPick }: { onPick: () => void }) {
  const { pending } = useFormStatus()
  return (
    <Button type="button" size="lg" onClick={onPick} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
      Upload logo
    </Button>
  )
}

function RemoveButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="icon-lg" variant="ghost" disabled={pending} aria-label="Remove logo">
      <Trash2 className="text-destructive size-4" />
    </Button>
  )
}

export function ProjectLogoForm({
  workspaceSlug,
  projectId,
  projectName,
  logoUrl,
}: {
  workspaceSlug: string
  projectId: string
  projectName: string
  logoUrl: string | null
}) {
  const [state, formAction] = useActionState<ProjectFormState, FormData>(updateProjectLogo, {
    status: "idle",
  })
  const fileInput = useRef<HTMLInputElement>(null)
  const uploadForm = useRef<HTMLFormElement>(null)

  const hidden = (
    <>
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input type="hidden" name="projectId" value={projectId} />
    </>
  )

  return (
    <div className="flex items-start gap-4">
      {/* With no upload this is the generated mark, which is what the switcher
          shows too — so the preview is the real thing, not a placeholder. */}
      <ProjectIcon name={projectName} logoUrl={logoUrl} className="size-20 shrink-0 rounded-xl" />

      <div className="flex min-h-20 min-w-0 flex-col justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Project logo</p>
          <p className="text-muted-foreground text-xs">
            PNG, JPEG, WebP or GIF under 10 MB. Generated from the name if unset.
          </p>
        </div>

        <div>
          <div className="flex items-center gap-1">
            <form ref={uploadForm} action={formAction}>
              {hidden}
              {/* The real input stays hidden and the button stands in for it.
                  Picking a file submits straight away — there is nothing else
                  to fill in, so a separate Save would only be a second click. */}
              <input
                ref={fileInput}
                type="file"
                name="logo"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={() => uploadForm.current?.requestSubmit()}
              />
              <UploadButton onPick={() => fileInput.current?.click()} />
            </form>

            {logoUrl ? (
              <form action={removeProjectLogo}>
                {hidden}
                <RemoveButton />
              </form>
            ) : null}
          </div>

          {state.status === "error" && state.message ? (
            <p className="text-destructive mt-1 text-xs">{state.message}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
