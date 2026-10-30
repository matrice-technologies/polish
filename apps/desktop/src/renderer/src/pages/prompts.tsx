import { useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, Loader2, Play, Plus, Search, Sparkles, Trash2 } from "lucide-react"
import { toast } from "sonner"
import type { Prompt } from "@polish/shared"
import type { AppState } from "../../../common/types"

import { Shortcut } from "@/components/kbd"
import { PageHeader } from "@/components/page-header"
import { ShortcutRecorder } from "@/components/shortcut-recorder"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { polish } from "@/lib/polish"
import { cn } from "@/lib/utils"

type Draft = { id?: string; name: string; instructions: string; shortcut: string | null }

export function PromptsPage({ state }: { state: AppState }) {
  const { prompts, platform, shortcutErrors } = state
  const [selectedId, setSelectedId] = useState<string | "new" | null>(prompts[0]?.id ?? null)
  const [query, setQuery] = useState("")

  // Keep a selection when the list changes underneath (a delete, a sync).
  useEffect(() => {
    if (selectedId === "new") return
    if (!selectedId || !prompts.some((p) => p.id === selectedId)) setSelectedId(prompts[0]?.id ?? null)
  }, [prompts, selectedId])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? prompts.filter((p) => `${p.name} ${p.instructions}`.toLowerCase().includes(q)) : prompts
  }, [prompts, query])

  const selected = selectedId === "new" ? null : prompts.find((p) => p.id === selectedId)

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader icon={<Sparkles />} title="Prompts">
        <Button size="sm" onClick={() => setSelectedId("new")}>
          <Plus />
          New prompt
        </Button>
      </PageHeader>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-72 shrink-0 flex-col border-r">
          <div className="p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search prompts" className="pl-7" />
            </div>
          </div>
          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
            {visible.map((prompt) => {
              const index = prompts.indexOf(prompt)
              return (
                <div
                  key={prompt.id}
                  className={cn(
                    "group/item relative flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors",
                    selectedId === prompt.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/60",
                  )}
                >
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(prompt.id)}>
                    <p className="truncate text-xs/relaxed font-medium">{prompt.name}</p>
                    <div className="mt-1 flex items-center gap-1.5">
                      {prompt.shortcut ? (
                        <Shortcut
                          accelerator={prompt.shortcut}
                          platform={platform}
                          className={cn(shortcutErrors[prompt.id] && "[&_kbd]:border-destructive/50 [&_kbd]:text-destructive")}
                        />
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Picker only</span>
                      )}
                    </div>
                  </button>
                  {!query ? (
                    <div className="hidden flex-col group-hover/item:flex">
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
                  ) : null}
                </div>
              )
            })}
            {visible.length === 0 ? (
              <p className="px-3 py-8 text-center text-xs text-muted-foreground">
                {query ? "No prompt matches that search." : "No prompts yet."}
              </p>
            ) : null}
          </div>
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto">
          {selectedId === "new" ? (
            <PromptEditor
              key="new"
              initial={{ name: "", instructions: "", shortcut: null }}
              state={state}
              onSaved={(prompt) => setSelectedId(prompt.id)}
              onCancel={() => setSelectedId(prompts[0]?.id ?? null)}
            />
          ) : selected ? (
            <PromptEditor key={selected.id} initial={selected} state={state} onSaved={() => {}} />
          ) : (
            <EmptyState onCreate={() => setSelectedId("new")} />
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Sparkles className="size-5" />
      </div>
      <div>
        <p className="text-sm font-medium">Create your first prompt</p>
        <p className="mt-1 text-xs text-muted-foreground">Say what should happen to selected text, give it a shortcut.</p>
      </div>
      <Button size="sm" onClick={onCreate}>
        <Plus />
        New prompt
      </Button>
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
    if (result.ok) {
      onSaved(result.value)
      toast.success(isNew ? "Prompt created" : "Prompt saved")
    } else setError(result.message)
  }

  return (
    <form
      className="mx-auto max-w-2xl space-y-6 px-8 py-8"
      onSubmit={(e) => {
        e.preventDefault()
        if (dirty) void save()
      }}
    >
      <div>
        <h2 className="font-heading text-2xl font-semibold tracking-tight">{isNew ? "New prompt" : draft.name || "Untitled"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select text anywhere, press the shortcut, and it&rsquo;s rewritten in place.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
        <div className="space-y-2">
          <Label htmlFor="prompt-name">Name</Label>
          <Input
            id="prompt-name"
            value={draft.name}
            autoFocus={isNew}
            placeholder="Polish"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prompt-shortcut">Shortcut</Label>
          <ShortcutRecorder
            id="prompt-shortcut"
            platform={state.platform}
            value={draft.shortcut}
            onChange={(shortcut) => setDraft({ ...draft, shortcut })}
            placeholder="Picker only"
            error={!dirty && initial.id ? state.shortcutErrors[initial.id] : undefined}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt-instructions">Instructions</Label>
        <Textarea
          id="prompt-instructions"
          rows={8}
          value={draft.instructions}
          placeholder="Fix spelling and grammar. Keep my tone."
          onChange={(e) => setDraft({ ...draft, instructions: e.target.value })}
          className="min-h-40 resize-none"
        />
        <p className="text-xs/relaxed text-muted-foreground">
          Say what should happen to the selected text. Polish already asks for the rewritten text only, in the
          original language and formatting.
        </p>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex items-center justify-between gap-2">
        {isNew ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => initial.id && void polish.deletePrompt(initial.id)}
          >
            <Trash2 />
            Delete
          </Button>
        )}
        <Button type="submit" disabled={!dirty}>
          {isNew ? "Create prompt" : "Save changes"}
        </Button>
      </div>

      {!isNew && initial.id ? <TryIt promptId={initial.id} aiProblem={state.ai.problem} dirty={dirty} /> : null}
    </form>
  )
}

/** Runs the saved prompt on sample text, without the clipboard or keystrokes. */
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
    <Card>
      <CardHeader>
        <CardTitle>Try it</CardTitle>
        <CardDescription>
          {aiProblem
            ? `${aiProblem} See Settings.`
            : dirty
              ? "Runs the saved version of this prompt."
              : "Paste some text and run the prompt on it."}
        </CardDescription>
        <CardAction>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!text.trim() || running || Boolean(aiProblem)}
            onClick={() => void run()}
          >
            {running ? <Loader2 className="animate-spin" /> : <Play />}
            Run
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="hey can u send me the report asap thx"
          className="resize-none"
        />
        {result ? (
          <p
            data-selectable
            className={cn(
              "rounded-md px-3 py-2 text-xs/relaxed whitespace-pre-wrap",
              result.ok ? "bg-muted" : "bg-destructive/10 text-destructive",
            )}
          >
            {result.text}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
