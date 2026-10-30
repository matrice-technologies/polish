import { app, safeStorage } from "electron"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

/**
 * Small secrets — the Anthropic API key and the Supabase session — encrypted
 * with the OS keychain through `safeStorage` (DPAPI on Windows, Keychain on
 * macOS, libsecret on Linux) and kept in one file under userData.
 *
 * Where no keychain is available (a bare Linux session) safeStorage cannot
 * encrypt; the values are then stored as plain base64 rather than not at all,
 * which is what every other app on that machine is doing too.
 */
const file = () => join(app.getPath("userData"), "secrets.json")

let cache: Record<string, string> | null = null

function load(): Record<string, string> {
  if (cache) return cache
  try {
    cache = existsSync(file()) ? JSON.parse(readFileSync(file(), "utf8")) : {}
  } catch {
    cache = {}
  }
  return cache!
}

function persist() {
  writeFileSync(file(), JSON.stringify(cache ?? {}), { mode: 0o600 })
}

export function getSecret(key: string): string | null {
  const stored = load()[key]
  if (!stored) return null
  try {
    const [scheme, data] = stored.split(":", 2)
    const buffer = Buffer.from(data, "base64")
    return scheme === "enc" ? safeStorage.decryptString(buffer) : buffer.toString("utf8")
  } catch {
    // Encrypted under a keychain entry that no longer exists (profile copied
    // to another machine, keychain reset). Unrecoverable, so forget it.
    deleteSecret(key)
    return null
  }
}

export function setSecret(key: string, value: string) {
  const encrypted = safeStorage.isEncryptionAvailable()
  const data = encrypted ? safeStorage.encryptString(value) : Buffer.from(value, "utf8")
  load()[key] = `${encrypted ? "enc" : "raw"}:${data.toString("base64")}`
  persist()
}

export function deleteSecret(key: string) {
  const all = load()
  if (!(key in all)) return
  delete all[key]
  persist()
}

/** The storage adapter supabase-js persists its session through. */
export const sessionStorage = {
  getItem: (key: string) => getSecret(`supabase:${key}`),
  setItem: (key: string, value: string) => setSecret(`supabase:${key}`, value),
  removeItem: (key: string) => deleteSecret(`supabase:${key}`),
}
