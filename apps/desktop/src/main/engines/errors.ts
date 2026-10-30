/** A failure worth showing as-is: the message is written for the person, not a log. */
export class PolishError extends Error {}

/** Strips the reasoning some local models (DeepSeek R1, Qwen…) print before answering. */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim()
}
