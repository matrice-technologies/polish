import { useCallback, useEffect, useId, useState } from "react"
import { Check, Copy, ExternalLink, KeyRound, Loader2, LogIn, Play, RefreshCw, Terminal } from "lucide-react"
import { toast } from "sonner"
import { PROVIDERS, providerInfo, type CliStatus, type ProviderId } from "../../../common/providers"
import type { AppState } from "../../../common/types"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { polish } from "@/lib/polish"
import { cn } from "@/lib/utils"

/**
 * Choosing where rewrites go: the Claude subscription through Claude Code, or
 * any provider with an API key. All of it is per-device.
 */
export function AiProviderSection({ state }: { state: AppState }) {
  const { ai, platform } = state
  const selected = ai.settings.provider
  const info = providerInfo(selected)

  const usable = (id: ProviderId) =>
    id === "claude-cli" ? ai.cli.state === "ready" : providerInfo(id).key !== "required" || Boolean(ai.keys[id])

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="AI provider" className="grid grid-cols-2 gap-2">
        {PROVIDERS.map((provider) => {
          const active = selected === provider.id
          return (
            <button
              key={provider.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => void polish.updateAi({ provider: provider.id })}
              className={cn(
                "group/provider relative rounded-lg border bg-card px-3 py-2.5 text-left transition-all outline-none",
                "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
                active ? "border-primary ring-2 ring-primary/20" : "hover:border-foreground/20 hover:bg-accent/40",
              )}
            >
              <span className="flex items-center gap-1.5 pr-5 text-xs/relaxed font-medium">
                {provider.label}
                {usable(provider.id) ? (
                  <span
                    className="size-1.5 rounded-full bg-emerald-500"
                    title={provider.id === "claude-cli" ? "Signed in" : provider.key === "required" ? "Key saved" : "Available"}
                  />
                ) : null}
              </span>
              <span className="block text-[11px] leading-snug text-muted-foreground">{provider.hint}</span>
              <span
                className={cn(
                  "absolute top-2.5 right-2.5 flex size-3.5 items-center justify-center rounded-full border transition-colors",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-input",
                )}
              >
                {active ? <Check className="size-2.5" strokeWidth={3} /> : null}
              </span>
            </button>
          )
        })}
      </div>

      <Card>
        <CardContent className="space-y-4">
          {selected === "claude-cli" ? (
            <ClaudeCliPanel cli={ai.cli} platform={platform} claudePath={ai.settings.claudePath} />
          ) : (
            <KeyField provider={selected} hasKey={Boolean(ai.keys[selected])} />
          )}

          {selected === "openai-compatible" ? <BaseUrlField value={ai.settings.customBaseUrl} /> : null}

          <ModelField
            key={selected}
            provider={selected}
            value={ai.settings.models[selected] ?? info.defaultModel ?? ""}
            canList={selected !== "claude-cli" && (info.key !== "required" || Boolean(ai.keys[selected]))}
            baseUrl={ai.settings.customBaseUrl}
          />

          <Separator />
          <TestRow ready={ai.ready} problem={ai.problem} provider={selected} />
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------ claude code ---- */

const INSTALL = {
  windows: "irm https://claude.ai/install.ps1 | iex",
  mac: "curl -fsSL https://claude.ai/install.sh | bash",
  linux: "curl -fsSL https://claude.ai/install.sh | bash",
}

function ClaudeCliPanel({
  cli,
  platform,
  claudePath,
}: {
  cli: CliStatus
  platform: AppState["platform"]
  claudePath: string | null
}) {
  return (
    <div className="space-y-3">
      {cli.state === "checking" ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Looking for Claude Code…
        </p>
      ) : null}

      {cli.state === "missing" ? (
        <>
          <p className="text-xs/relaxed">
            Polish uses your Claude plan through <span className="font-medium">Claude Code</span>, which isn&rsquo;t
            installed on this computer. Install it from {platform === "windows" ? "PowerShell" : "a terminal"}, then
            sign in:
          </p>
          <CommandLine command={INSTALL[platform]} />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void polish.refreshCli()}>
              <RefreshCw /> Check again
            </Button>
            <Button size="sm" variant="ghost" onClick={() => polish.openExternal("https://code.claude.com/docs/en/setup")}>
              <ExternalLink /> Install guide
            </Button>
          </div>
        </>
      ) : null}

      {cli.state === "logged-out" ? (
        <>
          <p className="text-xs/relaxed">
            Found Claude Code {cli.version}, but it isn&rsquo;t signed in. Sign in with the account that has your Pro or
            Max plan. A terminal opens for it, and Polish picks it up as soon as you&rsquo;re done.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => polish.cliLogin()}>
              <LogIn /> Sign in to Claude
            </Button>
            <Button size="sm" variant="outline" onClick={() => void polish.refreshCli()}>
              <RefreshCw /> Check again
            </Button>
          </div>
        </>
      ) : null}

      {cli.state === "logging-in" ? (
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs/relaxed">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            Finish signing in in the terminal window and the browser page it opens.
          </p>
          <Button size="sm" variant="ghost" onClick={() => polish.cliCancelLogin()}>
            Cancel
          </Button>
        </div>
      ) : null}

      {cli.state === "ready" ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs/relaxed font-medium">
              <Check className="size-3.5 text-emerald-500" />
              Signed in{cli.email ? ` as ${cli.email}` : ""}
            </span>
            {cli.subscription ? (
              <Badge variant="secondary" className="capitalize">
                {cli.subscription} plan
              </Badge>
            ) : null}
          </div>
          {cli.apiBilling ? (
            <p className="text-xs/relaxed text-destructive">
              Claude Code is signed in to an API account, so this bills per use rather than your plan. Run{" "}
              <code className="font-mono">claude auth login</code> to switch.
            </p>
          ) : (
            <p className="text-xs/relaxed text-muted-foreground">
              Rewrites count against your plan&rsquo;s usage. No API key needed. Claude Code {cli.version}; expect two to
              three seconds per rewrite.
            </p>
          )}
        </div>
      ) : null}

      <ClaudePathField claudePath={claudePath} found={"path" in cli ? cli.path : null} />
    </div>
  )
}

function CommandLine({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2">
      <Terminal className="size-3.5 shrink-0 text-muted-foreground" />
      <code data-selectable className="flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap">
        {command}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Copy command"
        onClick={() => {
          void navigator.clipboard.writeText(command)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  )
}

function ClaudePathField({ claudePath, found }: { claudePath: string | null; found: string | null }) {
  const [value, setValue] = useState(claudePath ?? "")
  return (
    <details className="group/path text-xs">
      <summary className="cursor-pointer list-none text-muted-foreground hover:text-foreground">
        {found ? (
          <>
            Using <span className="font-mono">{found}</span>
          </>
        ) : (
          "Installed somewhere unusual?"
        )}
      </summary>
      <div className="mt-2 flex gap-2">
        <Input value={value} placeholder="Full path to the claude executable" onChange={(e) => setValue(e.target.value)} />
        <Button
          variant="outline"
          disabled={value.trim() === (claudePath ?? "")}
          onClick={() => void polish.updateAi({ claudePath: value.trim() || null })}
        >
          Save
        </Button>
      </div>
    </details>
  )
}

/* ---------------------------------------------------------------- api keys ---- */

/** Shown as set or not, never read back: the key only goes from here into the keychain. */
function KeyField({ provider, hasKey }: { provider: ProviderId; hasKey: boolean }) {
  const info = providerInfo(provider)
  const [editing, setEditing] = useState(!hasKey)
  const [value, setValue] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setEditing(!hasKey)
    setValue("")
    setError(null)
  }, [provider, hasKey])

  async function save() {
    const result = await polish.setProviderKey(provider, value)
    if (result.ok) {
      setValue("")
      setEditing(false)
      setError(null)
      toast.success(`${info.label} key saved`)
    } else setError(result.message)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <KeyRound className="size-3.5 text-muted-foreground" />
        <Label>
          {info.label} API key{info.key === "optional" ? " (optional)" : ""}
        </Label>
        {hasKey && !editing ? (
          <Badge variant="secondary" className="gap-1">
            <Check className="size-3 text-emerald-500" /> Saved on this computer
          </Badge>
        ) : null}
      </div>
      {editing ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <Input
            type="password"
            value={value}
            placeholder={info.keyPlaceholder}
            autoComplete="off"
            aria-invalid={Boolean(error) || undefined}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button type="submit" disabled={!value.trim()}>
            Save
          </Button>
          {hasKey ? (
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          ) : null}
        </form>
      ) : (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            Replace
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => void polish.setProviderKey(provider, null)}
          >
            Remove
          </Button>
        </div>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {info.keyUrl ? (
        <p className="text-xs/relaxed text-muted-foreground">
          Get one from{" "}
          <button
            type="button"
            className="text-primary underline-offset-4 hover:underline"
            onClick={() => polish.openExternal(info.keyUrl!)}
          >
            {new URL(info.keyUrl).host}
          </button>
          . Text goes straight from this computer to {info.label}, never through the Polish server.
        </p>
      ) : null}
    </div>
  )
}

function BaseUrlField({ value: saved }: { value: string }) {
  const [value, setValue] = useState(saved)
  const valid = /^https?:\/\/\S+$/.test(value.trim())
  return (
    <div className="space-y-2">
      <Label htmlFor="base-url">Base URL</Label>
      <div className="flex gap-2">
        <Input id="base-url" value={value} onChange={(e) => setValue(e.target.value)} placeholder="http://localhost:11434/v1" />
        <Button
          variant="outline"
          disabled={!valid || value.trim() === saved}
          onClick={() => void polish.updateAi({ customBaseUrl: value.trim().replace(/\/$/, "") })}
        >
          Save
        </Button>
      </div>
      <p className="text-xs/relaxed text-muted-foreground">
        Anything serving <code className="font-mono">/chat/completions</code>: Ollama{" "}
        <code className="font-mono">localhost:11434/v1</code>, LM Studio <code className="font-mono">localhost:1234/v1</code>,
        OpenRouter <code className="font-mono">openrouter.ai/api/v1</code>.
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ model ---- */

function ModelField({
  provider,
  value,
  canList,
  baseUrl,
}: {
  provider: ProviderId
  value: string
  canList: boolean
  baseUrl: string
}) {
  const info = providerInfo(provider)
  const listId = useId()
  const [draft, setDraft] = useState(value)
  const [models, setModels] = useState<string[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setDraft(value), [value])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await polish.listModels(provider)
    setLoading(false)
    if (result.ok) setModels(result.value)
    else setError(result.message)
  }, [provider])

  // Fetch the provider's own list as soon as there is a key to fetch it with.
  useEffect(() => {
    if (!info.models && canList) void load()
  }, [info.models, canList, baseUrl, load])

  const save = (model: string) => void polish.updateAi({ models: { [provider]: model.trim() } })

  if (info.models) {
    const labels = Object.fromEntries(info.models.map((m) => [m.id, m.label]))
    return (
      <div className="flex items-center justify-between gap-4">
        <Label>Model</Label>
        <Select value={value} items={labels} onValueChange={(model) => model && save(model as string)}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {info.models.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${listId}-model`}>Model</Label>
      <div className="flex gap-2">
        <Input
          id={`${listId}-model`}
          list={listId}
          value={draft}
          placeholder={canList ? "Pick or type a model id" : "Add a key to list models"}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft.trim() !== value && save(draft)}
          onKeyDown={(e) => e.key === "Enter" && save(draft)}
          className="font-mono"
        />
        <datalist id={listId}>{models?.map((m) => <option key={m} value={m} />)}</datalist>
        <Button variant="outline" size="icon" disabled={!canList || loading} onClick={() => void load()} aria-label="Reload models">
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : models ? (
        <p className="text-xs text-muted-foreground">
          {models.length} models available from {info.label}.
        </p>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------- test ---- */

function TestRow({ ready, problem, provider }: { ready: boolean; problem: string | null; provider: ProviderId }) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => setResult(null), [provider])

  async function run() {
    setRunning(true)
    setResult(null)
    const outcome = await polish.testProvider()
    setRunning(false)
    setResult(
      outcome.ok
        ? { ok: true, text: `“${outcome.value.output}” · ${(outcome.value.ms / 1000).toFixed(1)}s` }
        : { ok: false, text: outcome.message },
    )
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <p
        className={cn(
          "text-xs/relaxed",
          result ? (result.ok ? "text-foreground" : "text-destructive") : ready ? "text-muted-foreground" : "text-amber-600 dark:text-amber-500",
        )}
      >
        {result ? result.text : ready ? "Ready. Try it on a sample sentence." : problem}
      </p>
      <Button size="sm" variant="outline" disabled={!ready || running} onClick={() => void run()}>
        {running ? <Loader2 className="animate-spin" /> : <Play />}
        Test
      </Button>
    </div>
  )
}
