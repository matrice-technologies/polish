import { app, globalShortcut, Menu, shell, Tray } from "electron"
import { formatAccelerator, livePrompts } from "@polish/shared"

import { initAccount, onAccountChange, scheduleSync, sync } from "./account"
import { getProviderKey } from "./engines"
import { onCliStatusChange, refreshCliStatus } from "./engines/claude-cli"
import { trayIcon } from "./icon"
import { appState, broadcastState, registerIpc } from "./ipc"
import { openPicker, polishWithShortcut } from "./polish"
import { watchAccessibility } from "./selection"
import { applyShortcuts, isPaused, onShortcutsToggled, setPaused } from "./shortcuts"
import { store } from "./store"
import { checkForUpdates, installUpdate, onUpdateStatusChange, startUpdater, updateStatus } from "./updater"
import { getMainWindow, showMainWindow, warmUpWindows } from "./windows"

/**
 * Polish lives in the tray. The window is only for setting prompts up; the
 * work happens through global shortcuts while some other app has focus.
 */

/**
 * Electron's security checklist: the windows only ever show Polish's own pages.
 * Nothing in them may navigate elsewhere or open new windows; a web link goes
 * to the browser instead.
 */
app.on("web-contents-created", (_event, contents) => {
  contents.on("will-navigate", (event, url) => {
    if (url !== contents.getURL()) event.preventDefault()
  })
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) void shell.openExternal(url)
    return { action: "deny" }
  })
})

// A development build keeps its own data folder, so it never rewrites the
// settings of a copy installed on the same machine (and can run beside it).
if (!app.isPackaged) app.setPath("userData", `${app.getPath("userData")} Dev`)

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on("second-instance", () => showMainWindow())
  void app.whenReady().then(start)
}

let tray: Tray | null = null
const SYNC_EVERY_MS = 5 * 60 * 1000

async function start() {
  if (process.platform === "win32") app.setAppUserModelId("com.matricetechnologies.polish")
  // A tray app has no dock presence on macOS until its window is open.
  if (process.platform === "darwin") app.dock?.hide()

  store.load()
  registerIpc()

  store.on("change", (source) => {
    applyShortcuts()
    refreshTray()
    broadcastState()
    if (source === "user") scheduleSync()
  })
  const refreshAll = () => {
    refreshTray()
    broadcastState()
  }
  onAccountChange(refreshAll)
  onShortcutsToggled(refreshAll)
  onCliStatusChange(refreshAll)
  onUpdateStatusChange(refreshAll)
  watchAccessibility(refreshAll)

  applyShortcuts()
  tray = new Tray(trayIcon())
  tray.setToolTip("Polish")
  tray.on("click", () => showMainWindow())
  refreshTray()

  warmUpWindows()
  startUpdater()
  void pickProvider()
  await initAccount()
  setInterval(() => void sync(), SYNC_EVERY_MS)

  // Coming back to the window is a good moment to pick up edits made on the web.
  app.on("browser-window-focus", (_event, window) => {
    if (window === getMainWindow()) scheduleSync(0)
  })

  // First run, or launched by hand rather than at login: show the window.
  if (!app.getLoginItemSettings().wasOpenedAtLogin) showMainWindow()
}

/**
 * Finds Claude Code, and on a machine where no provider was ever chosen,
 * starts on the subscription if Claude Code is installed and no Anthropic key
 * is saved: the setup that costs nothing extra.
 */
async function pickProvider() {
  const cli = await refreshCliStatus(store.state.device.ai.claudePath)
  if (!store.aiUnset) return
  store.aiUnset = false
  if (cli.state !== "missing" && !getProviderKey("anthropic")) {
    store.update("sync", { device: { ...store.state.device, ai: { ...store.state.device.ai, provider: "claude-cli" } } })
  }
}

function refreshTray() {
  if (!tray) return
  const { platform, shortcutErrors } = appState()
  const prompts = livePrompts(store.state.prompts)
  const paused = isPaused()

  tray.setContextMenu(
    Menu.buildFromTemplate([
      ...updateMenuItems(),
      { label: "Open Polish", click: () => showMainWindow() },
      {
        label: "Prompt picker",
        accelerator: store.state.settings.pickerShortcut ?? undefined,
        registerAccelerator: false,
        click: () => void openPicker(),
      },
      { type: "separator" },
      ...prompts.map((prompt) => ({
        label: prompt.shortcut && !shortcutErrors[prompt.id]
          ? `${prompt.name}    ${formatAccelerator(prompt.shortcut, platform)}`
          : prompt.name,
        // From the tray, focus is on the menu, not the text: run it on what
        // is selected once the menu has closed and focus has gone back.
        click: () => setTimeout(() => void polishWithShortcut(prompt.id), 200),
      })),
      { type: "separator" },
      { label: "Pause shortcuts", type: "checkbox", checked: paused, click: () => setPaused(!paused) },
      { type: "separator" },
      {
        label: "Check for updates…",
        enabled: app.isPackaged,
        click: () => {
          showMainWindow()
          void checkForUpdates()
        },
      },
      { label: `Polish ${app.getVersion()}`, enabled: false },
      { label: "Quit Polish", role: "quit" },
    ]),
  )
  tray.setToolTip(paused ? "Polish — shortcuts paused" : "Polish")
}

/** "Restart to update" leads the tray menu once an update has downloaded. */
function updateMenuItems(): Electron.MenuItemConstructorOptions[] {
  const update = updateStatus()
  if (update.state !== "ready") return []
  return [{ label: `Restart to update to ${update.version}`, click: () => installUpdate() }, { type: "separator" }]
}

app.on("window-all-closed", () => {
  // Stay alive in the tray; quitting is explicit.
})

app.on("activate", () => showMainWindow())

app.on("will-quit", () => {
  globalShortcut.unregisterAll()
  store.flush()
})
