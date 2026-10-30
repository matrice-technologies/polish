import Anthropic from "@anthropic-ai/sdk"
import { buildSystemPrompt, type ModelId } from "@polish/shared"

export class PolishError extends Error {}

/**
 * One rewrite: the prompt's instructions as the system prompt, the selection
 * as the user message, the text that comes back as the result.
 *
 * Effort is low: this is a rewrite of a few sentences that someone is waiting
 * on with their hands on the keyboard, and the round trip is the product.
 *
 * `fallbacks: "default"` lets the API re-run a request a model's safety
 * classifiers decline on the model Anthropic recommends for that case, rather
 * than handing back a refusal — on a model without fallbacks it is a no-op.
 */
export async function rewrite({
  apiKey,
  model,
  instructions,
  text,
  signal,
}: {
  apiKey: string
  model: ModelId
  instructions: string
  text: string
  signal?: AbortSignal
}): Promise<string> {
  const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 1 })

  let response: Anthropic.Beta.BetaMessage
  try {
    response = await client.beta.messages.create(
      {
        model,
        max_tokens: 16000,
        system: buildSystemPrompt(instructions),
        messages: [{ role: "user", content: text }],
        output_config: { effort: "low" },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      },
      { signal },
    )
  } catch (error) {
    throw new PolishError(describeError(error))
  }

  if (response.stop_reason === "refusal") {
    throw new PolishError("Claude declined to rewrite this text.")
  }
  if (response.stop_reason === "max_tokens") {
    throw new PolishError("The result was too long and got cut off. Try a shorter selection.")
  }

  const result = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim()

  if (!result) throw new PolishError("Claude returned nothing for this text.")
  return result
}

function describeError(error: unknown): string {
  if (error instanceof Anthropic.APIUserAbortError) return "Cancelled."
  if (error instanceof Anthropic.AuthenticationError) return "Your Anthropic API key was rejected. Check it in Settings."
  if (error instanceof Anthropic.PermissionDeniedError) return "Your API key isn't allowed to use this model."
  if (error instanceof Anthropic.NotFoundError) return "That model isn't available to your API key."
  if (error instanceof Anthropic.RateLimitError) return "Rate limited by Anthropic. Wait a moment and try again."
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "Anthropic took too long to answer."
  if (error instanceof Anthropic.APIConnectionError) return "Couldn't reach Anthropic. Check your connection."
  if (error instanceof Anthropic.InternalServerError) return "Anthropic had a problem. Try again in a moment."
  if (error instanceof Anthropic.APIError) return error.message
  return error instanceof Error ? error.message : String(error)
}
