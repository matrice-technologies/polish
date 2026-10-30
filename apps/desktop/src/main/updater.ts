import { app, Notification } from "electron"
import { autoUpdater } from "electron-updater"

import type { UpdateStatus } from "../common/types"

/**
 * Updates the way VS Code does them: check quietly at launch and every few
 * hours, download in the background, then offer "Restart to update". An update
 * nobody restarts for is installed when the app next quits.
 *
 * Releases come from GitHub Releases in matrice-technologies/polish-releases
 * (see electron-builder.yml). On macOS this only works for a signed build —
 * Squirrel.Mac refuses an update it cannot verify.
 */

const CHECK_EVERY_MS = 4 * 60 * 60 * 1000
const FIRST_CHECK_AFTER_MS = 15 * 1000

let status: UpdateStatus = app.isPackaged
  ? { state: "idle", lastCheck: null }
  : { state: "unsupported", reason: "Updates are checked in installed builds." }
let onChange: () => void = () => {}
let manual = false
let notified: string | null = null

export function updateStatus(): UpdateStatus {
  return status
}

export function onUpdateStatusChange(fn: () => void) {
  onChange = fn
}

function set(next: UpdateStatus) {
  status = next
  onChange()
}

export function startUpdater() {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = {
    info: () => {},
    warn: (message: unknown) => console.warn("[updater]", message),
    error: (message: unknown) => console.error("[updater]", message),
    debug: () => {},
  }

  autoUpdater.on("checking-for-update", () => set({ state: "checking" }))
  autoUpdater.on("update-not-available", () => set({ state: "idle", lastCheck: new Date().toISOString() }))
  autoUpdater.on("update-available", (info) => set({ state: "downloading", version: info.version, percent: 0 }))
  autoUpdater.on("download-progress", (progress) => {
    if (status.state === "downloading") set({ ...status, percent: Math.round(progress.percent) })
  })
  autoUpdater.on("update-downloaded", (info) => {
    set({ state: "ready", version: info.version })
    // Once per version, and only as a nudge: the app shows it too.
    if (notified !== info.version && Notification.isSupported()) {
      notified = info.version
      const notification = new Notification({
        title: `Polish ${info.version} is ready`,
        body: "Restart Polish to update. It will also update the next time it quits.",
        silent: true,
      })
      notification.on("click", () => installUpdate())
      notification.show()
    }
  })
  autoUpdater.on("error", (error) => {
    // A background check that fails (offline, rate-limited) is not worth a
    // red banner; it is retried later. A check the person asked for is.
    const message = describe(error)
    if (manual) set({ state: "error", message, lastCheck: new Date().toISOString() })
    else set({ state: "idle", lastCheck: status.state === "idle" ? status.lastCheck : null })
    manual = false
  })

  setTimeout(() => void check(false), FIRST_CHECK_AFTER_MS)
  setInterval(() => void check(false), CHECK_EVERY_MS)
}

async function check(byHand: boolean) {
  if (!app.isPackaged) return
  // Already downloaded, or mid-download: nothing to check.
  if (status.state === "ready" || status.state === "downloading") return
  manual = byHand
  try {
    await autoUpdater.checkForUpdates()
  } catch {
    // Reported through the "error" event.
  }
}

export function checkForUpdates() {
  return check(true)
}

/** Quits, installs and relaunches. */
export function installUpdate() {
  if (status.state !== "ready") return
  // isSilent: no installer UI on Windows; isForceRunAfter: relaunch afterwards.
  setImmediate(() => autoUpdater.quitAndInstall(true, true))
}

function describe(error: Error): string {
  const text = error?.message ?? String(error)
  if (/code signature|not signed|signature/i.test(text)) {
    return "This build isn't signed, so macOS won't let it update itself. Download the latest version from the website."
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|network|net::/i.test(text)) return "Couldn't reach the update server."
  if (/404|No published versions/i.test(text)) return "No release has been published yet."
  return text.split("\n")[0].slice(0, 160)
}
