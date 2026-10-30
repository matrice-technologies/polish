import { buildSystemPrompt } from "@polish/shared"

import { providerInfo, PROVIDER_IDS, type AiStatus, type ProviderId } from "../../common/providers"
import { deleteSecret, getSecret, setSecret } from "../secrets"
import { store } from "../store"
import { anthropicRewrite } from "./anthropic"
import { cliRewrite, cliStatus } from "./claude-cli"
import { PolishError } from "./errors"
import { chatRewrite, listModels as listOpenAiModels } from "./openai-compatible"

export { PolishError } from "./errors"

/** Keys live in the OS keychain, one per provider. Anthropic keeps its original name. */
const secretName = (provider: ProviderId) => (provider === "anthropic" ? "anthropic-api-key" : `api-key:${provider}`)

export function getProviderKey(provider: ProviderId): string | null {
  return getSecret(secretName(provider))
}

export function setProviderKey(provider: ProviderId, key: string | null) {
  if (key) setSecret(secretName(provider), key)
  else deleteSecret(secretName(provider))
}

export function selectedModel(provider: ProviderId): string | null {
  return store.state.device.ai.models[provider] || providerInfo(provider).defaultModel || null
}

function baseUrlFor(provider: ProviderId): string {
  return provider === "openai-compatible" ? store.state.device.ai.customBaseUrl : providerInfo(provider).baseUrl!
}

/** Why the selected provider can't be used yet, or null when it can. */
function problem(provider: ProviderId): string | null {
  const info = providerInfo(provider)
  if (provider === "claude-cli") {
    const cli = cliStatus()
    if (cli.state === "missing") return "Claude Code isn't installed on this computer."
    if (cli.state === "checking") return null
    if (cli.state !== "ready") return "Claude Code isn't signed in."
  }
  if (info.key === "required" && !getProviderKey(provider)) return `Add your ${info.label} API key.`
  if (provider === "openai-compatible" && !/^https?:\/\//.test(store.state.device.ai.customBaseUrl)) {
    return "Set the server's base URL."
  }
  if (!selectedModel(provider)) return "Choose a model."
  return null
}

export function aiStatus(): AiStatus {
  const settings = store.state.device.ai
  const issue = problem(settings.provider)
  return {
    settings,
    keys: Object.fromEntries(PROVIDER_IDS.map((id) => [id, Boolean(getProviderKey(id))])),
    cli: cliStatus(),
    ready: issue === null,
    problem: issue,
  }
}

/** Rewrites `text` with the prompt's instructions, through whichever provider is selected. */
export async function rewriteText({ instructions, text }: { instructions: string; text: string }): Promise<string> {
  const provider = store.state.device.ai.provider
  const issue = problem(provider)
  if (issue) throw new PolishError(`${issue} Open Settings → AI provider.`)

  const system = buildSystemPrompt(instructions)
  const model = selectedModel(provider)!
  const info = providerInfo(provider)

  switch (provider) {
    case "claude-cli":
      return cliRewrite({ model, system, text })
    case "anthropic":
      return anthropicRewrite({ apiKey: getProviderKey(provider)!, model, system, text })
    default:
      return chatRewrite({
        baseUrl: baseUrlFor(provider),
        apiKey: getProviderKey(provider),
        model,
        system,
        text,
        providerLabel: info.label,
      })
  }
}

/** Models to offer for a provider: fixed lists where there are some, the provider's own list otherwise. */
export async function listModels(provider: ProviderId): Promise<string[]> {
  const info = providerInfo(provider)
  if (info.models) return info.models.map((m) => m.id)
  if (info.key === "required" && !getProviderKey(provider)) throw new PolishError(`Add your ${info.label} API key first.`)
  return listOpenAiModels({ baseUrl: baseUrlFor(provider), apiKey: getProviderKey(provider), providerLabel: info.label })
}
