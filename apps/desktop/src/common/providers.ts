/**
 * The ways Polish can reach a model. One is chosen per device: it depends on
 * which keys this machine holds and whether Claude Code is installed here, so
 * it is not part of what syncs.
 *
 * Every API-key provider except Anthropic speaks the OpenAI chat-completions
 * dialect (Gemini and xAI both publish OpenAI-compatible endpoints), so they
 * share one client and differ only in base URL. Their model lists are fetched
 * from the provider rather than hardcoded here, so they never go stale.
 */

export type ProviderId = "claude-cli" | "anthropic" | "openai" | "gemini" | "xai" | "openai-compatible"

export interface ProviderInfo {
  id: ProviderId
  label: string
  hint: string
  /** "none": no key at all; "optional": a local server may not need one. */
  key: "required" | "optional" | "none"
  keyPlaceholder?: string
  keyUrl?: string
  /** For OpenAI-dialect providers; the custom one takes the person's own. */
  baseUrl?: string
  /** Fixed choices; providers without them list models from their API. */
  models?: { id: string; label: string }[]
  defaultModel?: string
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "claude-cli",
    label: "Claude subscription",
    hint: "Your Pro or Max plan, through Claude Code on this computer",
    key: "none",
    // Claude Code aliases: each resolves to the newest model of that tier the
    // installed Claude Code knows about, so updating it brings newer models.
    models: [
      { id: "opus", label: "Opus" },
      { id: "sonnet", label: "Sonnet" },
      { id: "haiku", label: "Haiku" },
    ],
    defaultModel: "opus",
  },
  {
    id: "anthropic",
    label: "Anthropic API",
    hint: "Pay per use with an Anthropic API key",
    key: "required",
    keyPlaceholder: "sk-ant-…",
    keyUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-opus-5-5", label: "Claude Opus 5.5 — best quality" },
      { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 — balanced" },
      { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 — fastest" },
    ],
    defaultModel: "claude-opus-5-5",
  },
  {
    id: "openai",
    label: "OpenAI",
    hint: "GPT models with an OpenAI API key",
    key: "required",
    keyPlaceholder: "sk-…",
    keyUrl: "https://platform.openai.com/api-keys",
    baseUrl: "https://api.openai.com/v1",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    hint: "Gemini models with a Google AI Studio key",
    key: "required",
    keyPlaceholder: "AIza…",
    keyUrl: "https://aistudio.google.com/apikey",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
  },
  {
    id: "xai",
    label: "xAI Grok",
    hint: "Grok models with an xAI API key",
    key: "required",
    keyPlaceholder: "xai-…",
    keyUrl: "https://console.x.ai",
    baseUrl: "https://api.x.ai/v1",
  },
  {
    id: "openai-compatible",
    label: "Other (OpenAI-compatible)",
    hint: "Ollama, LM Studio, OpenRouter, Groq, Mistral, DeepSeek…",
    key: "optional",
    keyPlaceholder: "Leave empty for local servers",
  },
]

export function providerInfo(id: ProviderId): ProviderInfo {
  return PROVIDERS.find((p) => p.id === id) ?? PROVIDERS[0]
}

export const PROVIDER_IDS = PROVIDERS.map((p) => p.id)

/** Device-local AI settings. */
export interface AiSettings {
  provider: ProviderId
  /** The chosen model for each provider, so switching back keeps it. */
  models: Partial<Record<ProviderId, string>>
  /** Base URL for the OpenAI-compatible provider, e.g. http://localhost:11434/v1. */
  customBaseUrl: string
  /** Where Claude Code lives, when it is not found on its own. */
  claudePath: string | null
}

export type CliStatus =
  | { state: "checking" }
  | { state: "missing" }
  | { state: "logged-out"; path: string; version: string }
  | { state: "logging-in"; path: string; version: string }
  | {
      state: "ready"
      path: string
      version: string
      email: string | null
      /** e.g. "max", "pro"; null when signed in some other way. */
      subscription: string | null
      /** True when Claude Code is signed in to a Console account rather than a plan. */
      apiBilling: boolean
    }

export interface AiStatus {
  settings: AiSettings
  /** Which providers have a key saved on this machine. */
  keys: Partial<Record<ProviderId, boolean>>
  cli: CliStatus
  /** Whether the selected provider can be used right now, and if not why. */
  ready: boolean
  problem: string | null
}
