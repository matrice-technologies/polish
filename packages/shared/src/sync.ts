import type { Prompt } from "./prompts.ts"

/**
 * Merges the device's prompts with the account's. Each prompt is resolved on
 * its own, last write wins by `updatedAt` — tombstones included, so a delete
 * made on one machine beats an older edit on another and a newer edit beats
 * an older delete.
 *
 * Returns the merged list and the local prompts the server is missing or has
 * an older copy of, which the caller should upload.
 */
export function mergePrompts(local: Prompt[], remote: Prompt[]): { prompts: Prompt[]; push: Prompt[] } {
  const byId = new Map<string, Prompt>()
  const remoteById = new Map(remote.map((p) => [p.id, p]))

  for (const prompt of remote) byId.set(prompt.id, prompt)

  const push: Prompt[] = []
  for (const prompt of local) {
    const theirs = remoteById.get(prompt.id)
    if (!theirs || isNewer(prompt, theirs)) {
      byId.set(prompt.id, prompt)
      push.push(prompt)
    }
  }

  return { prompts: [...byId.values()], push }
}

function isNewer(a: Prompt, b: Prompt): boolean {
  return Date.parse(a.updatedAt) > Date.parse(b.updatedAt)
}

/** Live prompts that share a shortcut with another, or with the picker. */
export function shortcutConflicts(prompts: Prompt[], pickerShortcut: string | null): Map<string, string> {
  const conflicts = new Map<string, string>()
  const owners = new Map<string, string>()
  if (pickerShortcut) owners.set(pickerShortcut, "the prompt picker")

  for (const prompt of prompts) {
    if (prompt.deletedAt || !prompt.shortcut) continue
    const owner = owners.get(prompt.shortcut)
    if (owner) {
      conflicts.set(prompt.id, `Also used by ${owner}`)
    } else {
      owners.set(prompt.shortcut, `“${prompt.name}”`)
    }
  }
  return conflicts
}
