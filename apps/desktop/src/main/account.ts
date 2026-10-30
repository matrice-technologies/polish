import { shell } from "electron"
import { hostname } from "node:os"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import {
  mergePrompts,
  parseSettings,
  promptFromRow,
  promptToRow,
  type PromptRow,
} from "@polish/shared"

import type { AccountStatus } from "../common/types"
import { sessionStorage } from "./secrets"
import { store } from "./store"

/**
 * The optional account. Signed out, nothing here runs and the app is entirely
 * local. Signed in, the app holds its own Supabase session and syncs prompts
 * and settings straight to the database under RLS — the web app is only
 * involved in the sign-in itself.
 *
 * Sign-in is a device flow: ask the web app for a code, open the browser on
 * the approval page, poll until the person approves, then trade the one-time
 * token for a session.
 */

type Listener = () => void

let client: SupabaseClient | null = null
let status: AccountStatus = { state: "signed-out" }
let listener: Listener = () => {}
let linkAbort: AbortController | null = null
let syncTimer: NodeJS.Timeout | null = null
let syncing: Promise<void> | null = null

export function accountStatus(): AccountStatus {
  return status
}

export function onAccountChange(fn: Listener) {
  listener = fn
}

function setStatus(next: AccountStatus) {
  status = next
  listener()
}

function connect(supabaseUrl: string, supabaseAnonKey: string) {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
  client.auth.onAuthStateChange((event) => {
    // A refresh token revoked elsewhere (signed out from the web, password
    // reset) ends the session here too.
    if (event === "SIGNED_OUT" && status.state === "signed-in") void signOut()
  })
  return client
}

/** Resumes a saved session at startup. */
export async function initAccount() {
  const { connection } = store.state
  if (!connection) return

  const supabase = connect(connection.supabaseUrl, connection.supabaseAnonKey)
  const { data } = await supabase.auth.getSession()
  if (!data.session) {
    store.update("sync", { connection: null })
    client = null
    return
  }
  setStatus({ state: "signed-in", email: connection.email, syncing: false, lastSyncAt: null })
  void sync()
}

/* ------------------------------------------------------------ sign in ---- */

export async function startLink() {
  linkAbort?.abort()
  const abort = (linkAbort = new AbortController())
  const webUrl = store.state.device.webUrl.replace(/\/$/, "")

  try {
    const start = await fetch(`${webUrl}/api/desktop/link`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceName: `Polish on ${hostname()}` }),
      signal: abort.signal,
    })
    if (!start.ok) throw new Error(`The Polish server answered ${start.status}.`)
    const link = (await start.json()) as {
      deviceCode: string
      userCode: string
      verificationUrl: string
      interval: number
      expiresIn: number
    }

    setStatus({ state: "linking", userCode: link.userCode, verificationUrl: link.verificationUrl })
    void shell.openExternal(link.verificationUrl)

    const deadline = Date.now() + link.expiresIn * 1000
    while (!abort.signal.aborted && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, link.interval * 1000))
      if (abort.signal.aborted) return

      const poll = await fetch(`${webUrl}/api/desktop/link/poll`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deviceCode: link.deviceCode }),
        signal: abort.signal,
      })
      if (poll.status === 202) continue
      if (poll.status === 410) throw new Error("That sign-in expired. Try again.")
      if (!poll.ok) throw new Error(`The Polish server answered ${poll.status}.`)

      const approved = (await poll.json()) as {
        email: string
        tokenHash: string
        supabaseUrl: string
        supabaseAnonKey: string
      }
      await completeLink(approved)
      return
    }
    if (!abort.signal.aborted) throw new Error("That sign-in expired. Try again.")
  } catch (error) {
    if (abort.signal.aborted) return
    const message =
      error instanceof TypeError
        ? `Couldn't reach ${webUrl}. Check the server address under Account.`
        : error instanceof Error
          ? error.message
          : String(error)
    setStatus({ state: "signed-out", error: message })
  } finally {
    if (linkAbort === abort) linkAbort = null
  }
}

async function completeLink(approved: { email: string; tokenHash: string; supabaseUrl: string; supabaseAnonKey: string }) {
  const supabase = connect(approved.supabaseUrl, approved.supabaseAnonKey)
  const { error } = await supabase.auth.verifyOtp({ token_hash: approved.tokenHash, type: "magiclink" })
  if (error) throw new Error(`Sign-in failed: ${error.message}`)

  store.update("sync", {
    connection: {
      supabaseUrl: approved.supabaseUrl,
      supabaseAnonKey: approved.supabaseAnonKey,
      email: approved.email,
    },
  })
  setStatus({ state: "signed-in", email: approved.email, syncing: false, lastSyncAt: null })
  await sync()
}

export function cancelLink() {
  linkAbort?.abort()
  linkAbort = null
  setStatus({ state: "signed-out" })
}

/**
 * Signs this device out. Local prompts stay exactly as they are — signing out
 * just stops syncing them.
 */
export async function signOut() {
  if (syncTimer) clearTimeout(syncTimer)
  const supabase = client
  client = null
  store.update("sync", { connection: null })
  setStatus({ state: "signed-out" })
  await supabase?.auth.signOut({ scope: "local" }).catch(() => {})
}

/* ---------------------------------------------------------------- sync ---- */

/** Called after every local edit; a burst of edits becomes one sync. */
export function scheduleSync(delay = 1500) {
  if (!client) return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => void sync(), delay)
}

/**
 * Pull everything, merge with what is here, push what the server is missing.
 * Prompts merge one by one, newest edit wins; settings merge as one object.
 */
export function sync(): Promise<void> {
  syncing ??= runSync().finally(() => (syncing = null))
  return syncing
}

async function runSync() {
  const supabase = client
  if (!supabase || status.state !== "signed-in") return
  setStatus({ ...status, syncing: true, error: undefined })

  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user.user) throw new Error("Your session has ended. Sign in again.")

    const [promptsResult, settingsResult] = await Promise.all([
      supabase
        .from("prompts")
        .select("id, name, instructions, shortcut, position, updated_at, deleted_at")
        .eq("user_id", user.user.id),
      supabase.from("user_settings").select("settings, updated_at").eq("user_id", user.user.id).maybeSingle(),
    ])
    if (promptsResult.error) throw promptsResult.error
    if (settingsResult.error) throw settingsResult.error

    const remote = (promptsResult.data as PromptRow[]).map(promptFromRow)
    const { prompts, push } = mergePrompts(store.state.prompts, remote)

    if (push.length) {
      const { error } = await supabase
        .from("prompts")
        .upsert(push.map((p) => ({ ...promptToRow(p), user_id: user.user.id })), { onConflict: "user_id,id" })
      if (error) throw error
    }

    const remoteSettings = settingsResult.data
    const localNewer =
      !remoteSettings || Date.parse(store.state.settingsUpdatedAt) > Date.parse(remoteSettings.updated_at)

    if (localNewer) {
      const { error } = await supabase.from("user_settings").upsert(
        { user_id: user.user.id, settings: store.state.settings, updated_at: store.state.settingsUpdatedAt },
        { onConflict: "user_id" },
      )
      if (error) throw error
      store.update("sync", { prompts })
    } else {
      store.update("sync", {
        prompts,
        settings: parseSettings(remoteSettings.settings),
        settingsUpdatedAt: new Date(remoteSettings.updated_at).toISOString(),
      })
    }

    if (status.state === "signed-in") {
      setStatus({ ...status, syncing: false, lastSyncAt: new Date().toISOString(), error: undefined })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (status.state === "signed-in") setStatus({ ...status, syncing: false, error: message })
  }
}
