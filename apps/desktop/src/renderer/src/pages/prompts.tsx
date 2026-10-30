import { useEffect, useState } from "react"
import { ArrowDown, ArrowUp, Loader2, Play, Plus, Trash2 } from "lucide-react"
import { formatAccelerator, type Prompt } from "@polish/shared"

import type { AppState } from "../../../common/types"
import { polish } from "../api"
import { ShortcutRecorder } from "../components/shortcut-recorder"
import { Button, cn, Input, Kbd, Label, Textarea } from "../components/ui"

type Draft = { id?: string; name: string; instructions: string; shortcut: string | null }

const blank: Draft = { name: "", instructions: "", shortcut: null }

export function PromptsPage({ state }: { state: AppState }) {
  const { prompts, platform, shortcutErrors } = state
  const [selectedId, setSelectedId] = useState<string | "new" | null>(prompts[0]?.id ?? null)

  // Keep a selection when the list changes underneath (a delete, a sync).
  useEffect(() => {
    if (selectedId === "new") return
    if (!selectedId || !prompts.some((p) => p.id === selectedId)) setSelectedId(prompts[0]?.id ?? null)
  }, [prompts, selectedId])

  const selected = selectedId === "new" ? null : prompts.find((p) => p.id === selectedId)

  return (
    <div className="flex h-full min-h-0">
      <div className="flex w-72 shrink-0 flex-col border-r">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h1 className="text-sm font-semibold">Prompts</h1>
          <Button size="sm" variant="outline" onClick={() => setSelectedId("new")}>
            <Plus />
            New
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {prompts.map((prompt, index) => (
            <div
              key={prompt.id}
              className={cn(
                "group flex items-center gap-2 rounded-md px-2.5 py-2",
                selectedId === prompt.id ? "bg-muted" : "hover:bg-muted/60",
              )}
            >
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(prompt.id)}>
                <p className="truncate text-[13px] font-medium">{prompt.name}</p>
                <p className={cn("truncate text-xs", shortcutErrors[prompt.id] ? "text-destructive" : "text-muted-foreground")}>
                  {prompt.shortcut ? formatAccelerator(prompt.shortcut, platform) : "Picker only"}
                </p>
              </button>
              <div className="hidden flex-col group-hover:flex">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => void polish.movePrompt(prompt.id, -1)}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowUp className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === prompts.length - 1}
                  onClick={() => void polish.movePrompt(prompt.id, 1)}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ArrowDown className="size-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
        {state.settings.pickerShortcut ? (
          <p className="text-muted-foreground border-t px-4 py-3 text-xs leading-relaxed">
            <Kbd>{formatAccelerator(state.settings.pickerShortcut, platform)}</Kbd> opens the picker with every prompt.
          </p>
        ) : null}
      </div>

      <div className="min-w-0 flex-1 overflow-y-auto">
        {selectedId === "new" ? (
          <PromptEditor
            key="new"
            initial={blank}
            state={state}
            onSaved={(prompt) => setSelectedId(prompt.id)}
            onCancel={() => setSelectedId(prompts[0]?.id ?? null)}
          />
        ) : selected ? (
          <PromptEditor key={selected.id} initial={selected} state={state} onSaved={() => {}} />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
            Create a prompt to get started.
          </div>
        )}
      </div>
    </div>
  )
}

function PromptEditor({
  initial,
  state,
  onSaved,
  onCancel,
}: {
  initial: Draft & Partial<Prompt>
  state: AppState
  onSaved: (prompt: Prompt) => void
  onCancel?: () => void
}) {
  const [draft, setDraft] = useState<Draft>({
    id: initial.id,
    name: initial.name,
    instructions: initial.instructions,
    shortcut: initial.shortcut,
  })
  const [error, setError] = useState<string | null>(null)
  const isNew = !initial.id
  const dirty =
    draft.name !== initial.name || draft.instructions !== initial.instructions || draft.shortcut !== initial.shortcut

  async function save() {
    setError(null)
    const result = await polish.savePrompt(draft)
    if (result.ok) onSaved(result.value)
    else setError(result.message)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-8 py-6">
      <div className="space-y-1.5">
        <Label htmlFor="prompt-name">Name</Label>
        <Input
          id="prompt-name"
          value={draft.name}
          autoFocus={isNew}
          placeholder="Polish"
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prompt-shortcut">Shortcut</Label>
        <ShortcutRecorder
          id="prompt-shortcut"
          platform={state.platform}
          value={draft.shortcut}
          onChange={(shortcut) => setDraft({ ...draft, shortcut })}
          placeholder="None — use the picker"
          error={!dirty && initial.id ? state.shortcutErrors[initial.id] : undefined}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prompt-instructions">Instructions</Label>
        <Textarea
          id="prompt-instructions"
          rows={8}
          value={draft.instructions}
          placeholder="Fix spelling and grammar. Keep my tone."
          onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
        />
        <p className="text-muted-foreground text-xs leading-relaxed">
          Say what should happen to the selected text. Polish already tells Claude to reply with only the rewritten
          text and keep the original language and formatting.
        </p>
      </div>

      {error ? <p className="text-destructive text-xs">{error}</p> : null}

      <div className="flex items-center justify-between gap-2">
        {isNew ? (
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button variant="danger" onClick={() => initial.id && void polish.deletePrompt(initial.id)}>
            <Trash2 />
            Delete
          </Button>
        )}
        <Button disabled={!dirty} onClick={() => void save()}>
          {isNew ? "Create prompt" : "Save"}
        </Button>
      </div>

      {!isNew && initial.id ? <TryIt promptId={initial.id} aiProblem={state.ai.problem} dirty={dirty} /> : null}
    </div>
  )
}

/** Run the saved prompt on some sample text without leaving the app. */
function TryIt({ promptId, aiProblem, dirty }: { promptId: string; aiProblem: string | null; dirty: boolean }) {
  const [text, setText] = useState("")
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [running, setRunning] = useState(false)

  async function run() {
    setRunning(true)
    setResult(null)
    const outcome = await polish.tryPrompt(promptId, text)
    setResult(outcome.ok ? { ok: true, text: outcome.value } : { ok: false, text: outcome.message })
    setRunning(false)
  }

  return (
    <div className="bg-card space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium">Try it</p>
        <Button size="sm" variant="outline" disabled={!text.trim() || running || Boolean(aiProblem)} onClick={() => void run()}>
          {running ? <Loader2 className="animate-spin" /> : <Play />}
          Run
        </Button>
      </div>
      <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste some text to test this prompt on…" />
      {aiProblem ? <p className="text-muted-foreground text-xs">{aiProblem} See Settings → AI provider.</p> : null}
      {dirty ? <p className="text-muted-foreground text-xs">Runs the saved version of the prompt.</p> : null}
      {result ? (
        <p
          className={cn(
            "rounded-md px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap select-text",
            result.ok ? "bg-muted" : "text-destructive bg-destructive/10",
          )}
        >
          {result.text}
        </p>
      ) : null}
    </div>
  )
}
