import { PolishError, stripThinking } from "./errors"

/**
 * One client for every provider that speaks OpenAI's chat-completions dialect:
 * OpenAI itself, Gemini and xAI through their compatibility endpoints, and
 * anything self-hosted or aggregated (Ollama, LM Studio, OpenRouter, Groq…).
 *
 * Deliberately minimal: no temperature or token limits, which reasoning models
 * reject or name differently, and which a rewrite of a few sentences does not need.
 */

const REQUEST_TIMEOUT_MS = 120_000

function headers(apiKey: string | null) {
  return {
    "content-type": "application/json",
    ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
  }
}

async function failure(response: Response, providerLabel: string): Promise<PolishError> {
  type ErrorBody = { error?: { message?: string } | string; message?: string }
  let detail = ""
  try {
    const parsed = (await response.json()) as ErrorBody | ErrorBody[]
    // Gemini wraps chat errors in an array.
    const body = Array.isArray(parsed) ? (parsed[0] ?? {}) : parsed
    detail = typeof body.error === "string" ? body.error : (body.error?.message ?? body.message ?? "")
  } catch {
    // Not JSON; the status says enough.
  }
  // Gemini and xAI answer a bad key with 400, not 401.
  const badKey = response.status === 400 && /api.?key/i.test(detail)
  if (response.status === 401 || response.status === 403 || badKey) {
    return new PolishError(`${providerLabel} rejected the API key. Check it in Settings.`)
  }
  if (response.status === 404) return new PolishError(detail || `${providerLabel} doesn't know that model.`)
  if (response.status === 429) return new PolishError(`Rate limited by ${providerLabel}. ${detail}`.trim())
  return new PolishError(`${providerLabel} answered ${response.status}${detail ? `: ${detail}` : "."}`)
}

function networkError(error: unknown, providerLabel: string, baseUrl: string): PolishError {
  if (error instanceof Error && error.name === "TimeoutError") return new PolishError(`${providerLabel} took too long to answer.`)
  return new PolishError(`Couldn't reach ${providerLabel} at ${baseUrl}.`)
}

export async function chatRewrite({
  baseUrl,
  apiKey,
  model,
  system,
  text,
  providerLabel,
}: {
  baseUrl: string
  apiKey: string | null
  model: string
  system: string
  text: string
  providerLabel: string
}): Promise<string> {
  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: headers(apiKey),
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: text },
        ],
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch (error) {
    throw networkError(error, providerLabel, baseUrl)
  }
  if (!response.ok) throw await failure(response, providerLabel)

  const body = (await response.json()) as {
    choices?: { message?: { content?: string | null; refusal?: string | null }; finish_reason?: string }[]
  }
  const choice = body.choices?.[0]
  if (choice?.message?.refusal) throw new PolishError(`${providerLabel} declined: ${choice.message.refusal}`)
  if (choice?.finish_reason === "length") {
    throw new PolishError("The result was too long and got cut off. Try a shorter selection.")
  }
  const output = stripThinking(choice?.message?.content ?? "")
  if (!output) throw new PolishError(`${providerLabel} returned nothing for this text.`)
  return output
}

/** Model ids that cannot do chat: embeddings, speech, images, moderation… */
const NOT_CHAT = /embed|whisper|tts|transcribe|speech|audio|realtime|dall-e|image|imagen|veo|moderation|aqa|search-preview|computer-use/i

/** The provider's own list of models, so new ones show up without an app update. */
export async function listModels({
  baseUrl,
  apiKey,
  providerLabel,
}: {
  baseUrl: string
  apiKey: string | null
  providerLabel: string
}): Promise<string[]> {
  let response: Response
  try {
    response = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
      headers: headers(apiKey),
      signal: AbortSignal.timeout(20_000),
    })
  } catch (error) {
    throw networkError(error, providerLabel, baseUrl)
  }
  if (!response.ok) throw await failure(response, providerLabel)

  const body = (await response.json()) as { data?: { id: string }[] }
  return [...new Set((body.data ?? []).map((m) => m.id.replace(/^models\//, "")))]
    .filter((id) => !NOT_CHAT.test(id))
    .sort((a, b) => a.localeCompare(b))
}
