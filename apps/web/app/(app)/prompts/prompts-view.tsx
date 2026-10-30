"use client"

import { useState, useTransition } from "react"
import { Keyboard, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  shortcutConflicts,
  type Prompt,
  type SyncedSettings,
} from "@polish/shared"

import { Button } from "@/components/ui/button"
import { Shortcut } from "@/components/kbd"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ShortcutRecorder } from "@/components/shortcut-recorder"
import { usePlatform } from "@/hooks/use-platform"

import { deletePrompt, savePrompt, saveSettings } from "./actions"

type Draft = Pick<Prompt, "id" | "name" | "instructions" | "shortcut" | "position">

export function PromptsView({ prompts, settings }: { prompts: Prompt[]; settings: SyncedSettings }) {
  const platform = usePlatform()
  const [editing, setEditing] = useState<{ draft: Draft; isNew: boolean } | null>(null)
  const conflicts = shortcutConflicts(prompts, settings.pickerShortcut)

  function startNew() {
    setEditing({
      isNew: true,
      draft: {
        id: crypto.randomUUID(),
        name: "",
        instructions: "",
        shortcut: null,
        position: prompts.reduce((max, p) => Math.max(max, p.position), -1) + 1,
      },
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-lg font-semibold">Prompts</h1>
          <p className="text-muted-foreground text-sm">
            Select text in any app, press a prompt&rsquo;s shortcut, and Polish rewrites it in place. Changes here reach
            the desktop app the next time it syncs.
          </p>
        </div>
        <Button size="lg" onClick={startNew}>
          <Plus className="size-4" />
          New prompt
        </Button>
      </div>

      <div className="divide-y rounded-lg border">
        {prompts.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            onClick={() => setEditing({ isNew: false, draft: prompt })}
            className="hover:bg-muted/40 flex w-full items-start gap-4 px-4 py-3 text-left transition-colors"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{prompt.name}</p>
              <p className="text-muted-foreground line-clamp-2 text-xs/relaxed">{prompt.instructions}</p>
              {conflicts.get(prompt.id) ? (
                <p className="text-destructive mt-1 text-xs">Shortcut clash — {conflicts.get(prompt.id)}</p>
              ) : null}
            </div>
            {prompt.shortcut ? (
              <Shortcut accelerator={prompt.shortcut} platform={platform} className="shrink-0" />
            ) : (
              <span className="text-muted-foreground shrink-0 text-xs">Picker only</span>
            )}
          </button>
        ))}
        {prompts.length === 0 ? (
          <p className="text-muted-foreground px-4 py-10 text-center text-sm">No prompts. Create one to get started.</p>
        ) : null}
      </div>

      <SettingsForm settings={settings} />

      {editing ? (
        <PromptDialog
          key={editing.draft.id}
          initial={editing.draft}
          isNew={editing.isNew}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  )
}

function PromptDialog({ initial, isNew, onClose }: { initial: Draft; isNew: boolean; onClose: () => void }) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<{ ok: true } | { ok: false; message: string }>) {
    startTransition(async () => {
      const result = await action()
      if (result.ok) onClose()
      else setError(result.message)
    })
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "New prompt" : "Edit prompt"}</DialogTitle>
          <DialogDescription>Say what should happen to the selected text. Polish handles the rest.</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            setError(null)
            run(() => savePrompt(draft))
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="prompt-name">Name</Label>
            <Input
              id="prompt-name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Polish"
              autoFocus={isNew}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt-shortcut">Shortcut</Label>
            <ShortcutRecorder
              id="prompt-shortcut"
              value={draft.shortcut}
              onChange={(shortcut) => setDraft({ ...draft, shortcut })}
              placeholder="None — use the picker"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt-instructions">Instructions</Label>
            <Textarea
              id="prompt-instructions"
              value={draft.instructions}
              onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
              rows={7}
              placeholder="Fix spelling and grammar. Keep my tone."
            />
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <DialogFooter className="sm:justify-between">
            {isNew ? (
              <span />
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                disabled={pending}
                onClick={() => run(() => deletePrompt(initial))}
              >
                <Trash2 className="size-4" />
                Delete
              </Button>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Settings that follow the person to every machine. Each control saves the
 * moment it changes, like the rest of the app's settings.
 */
function SettingsForm({ settings }: { settings: SyncedSettings }) {
  const [value, setValue] = useState(settings)
  const [pending, startTransition] = useTransition()

  function update(patch: Partial<SyncedSettings>) {
    const next = { ...value, ...patch }
    setValue(next)
    startTransition(async () => {
      const result = await saveSettings(next)
      if (!result.ok) {
        toast.error(result.message)
        setValue(value)
      }
    })
  }

  const toggles: { key: "autoPaste" | "restoreClipboard" | "showHud"; label: string; description: string }[] = [
    {
      key: "autoPaste",
      label: "Paste the result",
      description: "Replace the selection with the polished text. Off: only copy it to the clipboard.",
    },
    {
      key: "restoreClipboard",
      label: "Restore the clipboard",
      description: "Put back what you had copied before, once the result is pasted.",
    },
    { key: "showHud", label: "Show progress", description: "A small indicator while Polish is working." },
  ]

  return (
    <section className="mt-10 border-t pt-8">
      <div className="mb-4 flex items-center gap-2">
        <Keyboard className="text-muted-foreground size-4" />
        <h2 className="font-heading text-sm font-semibold">Desktop settings</h2>
        {pending ? <Loader2 className="text-muted-foreground size-3 animate-spin" /> : null}
      </div>
      <p className="text-muted-foreground -mt-2 mb-5 text-xs">
        These follow you to every computer. The AI provider (your Claude plan or an API key) is chosen in the desktop
        app on each machine.
      </p>

      <div className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <Label htmlFor="setting-picker">Prompt picker</Label>
            <p className="text-muted-foreground text-xs">Opens a list of every prompt, for the ones without a shortcut.</p>
          </div>
          <ShortcutRecorder
            id="setting-picker"
            value={value.pickerShortcut}
            onChange={(pickerShortcut) => update({ pickerShortcut })}
          />
        </div>

        {toggles.map((toggle) => (
          <div key={toggle.key} className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor={`setting-${toggle.key}`}>{toggle.label}</Label>
              <p className="text-muted-foreground text-xs">{toggle.description}</p>
            </div>
            <Switch
              id={`setting-${toggle.key}`}
              checked={value[toggle.key]}
              onCheckedChange={(checked) => update({ [toggle.key]: checked })}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
