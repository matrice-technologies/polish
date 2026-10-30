import { useCallback, useEffect, useId, useState } from "react"
import { Check, Copy, ExternalLink, KeyRound, Loader2, LogIn, Play, RefreshCw, Terminal } from "lucide-react"

import { PROVIDERS, providerInfo, type CliStatus, type ProviderId } from "../../../common/providers"
import type { AppState } from "../../../common/types"
import { polish } from "../api"
import { Button, cn, Input } from "./ui"

/**
 * Choosing where rewrites go: the Claude subscription through Claude Code, or
 * any provider with an API key. All of it is per-device.
 */
export function AiProviderSection({ state }: { state: AppState }) {
  const { ai, platform } = state
  const selected = ai.settings.provider
  const info = providerInfo(selected)

  const usable = (id: ProviderId) =>
    id === "claude-cli"
      ? ai.cli.state === "ready"
      : providerInfo(id).key !== "required" || Boolean(ai.keys[id])

  return (
    <section className="space-y-4 py-4">
      <div>
        <p className="text-[13px] font-medium">AI provider</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          Where your text is sent to be rewritten. Set per computer; keys stay on this one and never sync.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => void polish.updateAi({ provider: provider.id })}
            className={cn(
              "rounded-lg border px-3 py-2.5 text-left transition-colors",
              selected === provider.id ? "border-primary bg-primary/5 ring-primary/30 ring-1" : "hover:bg-muted/60",
            )}
          >
            <span className="flex items-center gap-1.5 text-[13px] font-medium">
              {provider.label}
              {usable(provider.id) ? (
                <span
                  className="bg-success size-1.5 rounded-full"
                  title={provider.id === "claude-cli" ? "Signed in" : provider.key === "required" ? "Key saved" : "Available"}
                />
              ) : null}
            </span>
            <span className="text-muted-foreground block text-xs leading-snug">{provider.hint}</span>
          </button>
        ))}
      </div>

      <div className="bg-card space-y-4 rounded-lg border p-4">
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

        <TestRow ready={ai.ready} problem={ai.problem} provider={selected} />
      </div>
    </section>
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
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <Loader2 className="size-3.5 animate-spin" /> Looking for Claude Code…
        </p>
      ) : null}

      {cli.state === "missing" ? (
        <>
          <p className="text-xs leading-relaxed">
            Polish uses your Claude plan through <span className="font-medium">Claude Code</span>, which isn&rsquo;t
            installed on this computer. Install it from a {platform === "windows" ? "PowerShell" : "terminal"} window,
            then sign in:
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
          <p className="text-xs leading-relaxed">
            Found Claude Code {cli.version}, but it isn&rsquo;t signed in. Sign in with the Claude account that has your
            Pro or Max plan — a terminal window opens for it, and Polish picks it up as soon as you&rsquo;re done.
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
        <>
          <p className="flex items-center gap-2 text-xs">
            <Loader2 className="size-3.5 animate-spin" />
            Finish signing in in the terminal window (and the browser page it opens). Waiting…
          </p>
          <Button size="sm" variant="ghost" onClick={() => polish.cliCancelLogin()}>
            Cancel
          </Button>
        </>
      ) : null}

      {cli.state === "ready" ? (
        <div className="space-y-1">
          <p className="flex items-center gap-1.5 text-xs">
            <Check className="text-success size-3.5" />
            Signed in{cli.email ? ` as ${cli.email}` : ""}
            {cli.subscription ? ` · ${cli.subscription[0].toUpperCase()}${cli.subscription.slice(1)} plan` : ""}
          </p>
          {cli.apiBilling ? (
            <p className="text-destructive text-xs">
              Claude Code is signed in to an API account, so this bills per use rather than your plan. Run{" "}
              <code className="font-mono">claude auth login</code> to switch.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">Rewrites count against your plan&rsquo;s usage limits. No API key needed.</p>
          )}
          <p className="text-muted-foreground text-xs">
            Claude Code {cli.version}. Each rewrite starts it once, so expect two or three seconds.
          </p>
        </div>
      ) : null}

      <ClaudePathField claudePath={claudePath} found={"path" in cli ? cli.path : null} />
    </div>
  )
}

function CommandLine({ command }: { command: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="bg-muted flex items-center gap-2 rounded-md px-3 py-2">
      <Terminal className="text-muted-foreground size-3.5 shrink-0" />
      <code className="flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap select-text">{command}</code>
      <button
        type="button"
        aria-label="Copy command"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => {
          void navigator.clipboard.writeText(command)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}

function ClaudePathField({ claudePath, found }: { claudePath: string | null; found: string | null }) {
  const [value, setValue] = useState(claudePath ?? "")
  return (
    <details className="text-xs">
      <summary className="text-muted-foreground cursor-pointer">
        {found ? `Using ${found}` : "Installed somewhere unusual?"}
      </summary>
      <div className="mt-2 flex gap-2">
        <Input
          value={value}
          placeholder="Full path to the claude executable"
          onChange={(e) => setValue(e.target.value)}
        />
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

/** Shown as set or not set, never read back: the key only goes from here into the keychain. */
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
    } else setError(result.message)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <KeyRound className="text-muted-foreground size-3.5" />
        <p className="text-[13px] font-medium">
          {info.label} API key{info.key === "optional" ? " (optional)" : ""}
        </p>
        {hasKey && !editing ? (
          <span className="text-success flex items-center gap-1 text-xs">
            <Check className="size-3" /> Saved on this computer
          </span>
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
          <Button size="sm" variant="danger" onClick={() => void polish.setProviderKey(provider, null)}>
            Remove
          </Button>
        </div>
      )}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
      {info.keyUrl ? (
        <p className="text-muted-foreground text-xs">
          Get one from{" "}
          <button
            type="button"
            className="text-primary underline-offset-2 hover:underline"
            onClick={() => polish.openExternal(info.keyUrl!)}
          >
            {new URL(info.keyUrl).host}
          </button>
          . Text goes straight from this computer to {info.label}; it never passes through the Polish server.
        </p>
      ) : null}
    </div>
  )
}

function BaseUrlField({ value: saved }: { value: string }) {
  const [value, setValue] = useState(saved)
  const valid = /^https?:\/\/\S+$/.test(value.trim())
  return (
    <div className="space-y-1.5">
      <p className="text-[13px] font-medium">Base URL</p>
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="http://localhost:11434/v1" />
        <Button
          variant="outline"
          disabled={!valid || value.trim() === saved}
          onClick={() => void polish.updateAi({ customBaseUrl: value.trim().replace(/\/$/, "") })}
        >
          Save
        </Button>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        The endpoint that serves <code className="font-mono">/chat/completions</code>. Ollama:{" "}
        <code className="font-mono">http://localhost:11434/v1</code> · LM Studio:{" "}
        <code className="font-mono">http://localhost:1234/v1</code> · OpenRouter:{" "}
        <code className="font-mono">https://openrouter.ai/api/v1</code>
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

  // Fetch the provider's list as soon as there is a key to fetch it with.
  useEffect(() => {
    if (!info.models && canList) void load()
  }, [info.models, canList, baseUrl, load])

  const save = (model: string) => void polish.updateAi({ models: { [provider]: model.trim() } })

  if (info.models) {
    return (
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] font-medium">Model</p>
        <select
          value={value}
          onChange={(e) => save(e.target.value)}
          className="border-input bg-background h-8 rounded-md border px-2 text-[13px] outline-none"
        >
          {info.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[13px] font-medium">Model</p>
      <div className="flex gap-2">
        <Input
          list={listId}
          value={draft}
          placeholder={canList ? "Pick or type a model id" : "Add a key to list models"}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => draft.trim() !== value && save(draft)}
          onKeyDown={(e) => e.key === "Enter" && save(draft)}
        />
        <datalist id={listId}>
          {models?.map((m) => <option key={m} value={m} />)}
        </datalist>
        <Button variant="outline" disabled={!canList || loading} onClick={() => void load()} aria-label="Reload models">
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        </Button>
      </div>
      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : models ? (
        <p className="text-muted-foreground text-xs">{models.length} models available from {info.label}.</p>
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
        ? { ok: true, text: `“${outcome.value.output}” — ${(outcome.value.ms / 1000).toFixed(1)}s` }
        : { ok: false, text: outcome.message },
    )
  }

  return (
    <div className="flex items-start justify-between gap-4 border-t pt-3">
      <p className={cn("text-xs leading-relaxed", result ? (result.ok ? "" : "text-destructive") : "text-muted-foreground")}>
        {result ? result.text : ready ? "Ready. Try it on a sample sentence." : problem}
      </p>
      <Button size="sm" variant="outline" disabled={!ready || running} onClick={() => void run()}>
        {running ? <Loader2 className="animate-spin" /> : <Play />}
        Test
      </Button>
    </div>
  )
}
