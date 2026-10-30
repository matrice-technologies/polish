import { app, BrowserWindow, nativeTheme, screen } from "electron"
import { join } from "node:path"

import { IPC, type HudStatus } from "../common/types"
import { appIcon } from "./icon"

/**
 * Three windows: the main one (prompts, settings, account), the HUD that says
 * "Polishing…" while a request is in flight, and the prompt picker.
 *
 * The HUD is never focusable. It appears over the app the person is typing in,
 * and taking focus from that app would send the paste into the HUD instead.
 */

function load(window: BrowserWindow, page: "index" | "hud" | "picker") {
  const devServer = process.env.ELECTRON_RENDERER_URL
  if (!app.isPackaged && devServer) void window.loadURL(`${devServer}/${page}.html`)
  else void window.loadFile(join(__dirname, `../renderer/${page}.html`))
}

const preload = () => join(__dirname, "../preload/index.js")

/* ---------------------------------------------------------------- main ---- */

let mainWindow: BrowserWindow | null = null
let quitting = false
app.on("before-quit", () => (quitting = true))

/** Height of the custom title bar, which the native window controls sit in. */
export const TITLE_BAR_HEIGHT = 48

/** Native minimise / maximise / close, drawn over our own title bar (Windows and Linux). */
function titleBarOverlay(): Electron.TitleBarOverlay {
  const dark = nativeTheme.shouldUseDarkColors
  return {
    color: "#00000000",
    symbolColor: dark ? "#fafafa" : "#0a0a0a",
    height: TITLE_BAR_HEIGHT,
  }
}

export function showMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
    return mainWindow
  }

  const isMac = process.platform === "darwin"
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 700,
    // Above the shadcn sidebar's mobile breakpoint, so it never collapses to a sheet.
    minWidth: 820,
    minHeight: 540,
    title: "Polish",
    icon: appIcon(),
    show: false,
    // No OS title bar: the app draws its own, with the native controls kept —
    // traffic lights on macOS, an overlay of the caption buttons elsewhere,
    // which keeps Windows 11's snap layouts working.
    titleBarStyle: "hidden",
    ...(isMac ? { trafficLightPosition: { x: 18, y: 17 } } : { titleBarOverlay: titleBarOverlay() }),
    // The backdrop's colour (the desktop's --sidebar), so there is no flash before it paints.
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#050505" : "#f5f5f5",
    webPreferences: { preload: preload(), sandbox: true },
  })
  const window = mainWindow
  if (!isMac) {
    const syncOverlay = () => !window.isDestroyed() && window.setTitleBarOverlay(titleBarOverlay())
    nativeTheme.on("updated", syncOverlay)
    window.on("closed", () => nativeTheme.off("updated", syncOverlay))
  }
  window.once("ready-to-show", () => window.show())
  // On macOS the dock icon comes and goes with the window: a tray app the
  // rest of the time, a normal app while you are setting it up.
  if (isMac) {
    window.on("show", () => void app.dock?.show())
    window.on("hide", () => app.dock?.hide())
  }
  // Closing hides: Polish lives in the tray, and the shortcuts must keep working.
  window.on("close", (event) => {
    if (quitting) return
    event.preventDefault()
    window.hide()
  })
  load(window, "index")
  return window
}

export function getMainWindow() {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null
}

/* ----------------------------------------------------------------- hud ---- */

let hudWindow: BrowserWindow | null = null
let hudTimer: NodeJS.Timeout | null = null

function ensureHud() {
  if (hudWindow && !hudWindow.isDestroyed()) return hudWindow
  hudWindow = new BrowserWindow({
    width: 320,
    height: 56,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    hasShadow: false,
    webPreferences: { preload: preload(), sandbox: true },
  })
  hudWindow.setAlwaysOnTop(true, "screen-saver")
  hudWindow.setIgnoreMouseEvents(true)
  hudWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  load(hudWindow, "hud")
  return hudWindow
}

/** Bottom-centre of whichever display the pointer is on. */
function placeOnPointerDisplay(window: BrowserWindow, offsetFromBottom: number | null) {
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const [width, height] = window.getSize()
  const x = Math.round(workArea.x + (workArea.width - width) / 2)
  const y =
    offsetFromBottom === null
      ? Math.round(workArea.y + (workArea.height - height) / 3)
      : workArea.y + workArea.height - height - offsetFromBottom
  window.setPosition(x, y)
}

export function showHud(status: HudStatus) {
  const hud = ensureHud()
  if (hudTimer) clearTimeout(hudTimer)
  const send = () => hud.webContents.send(IPC.hud, status)
  if (hud.webContents.isLoading()) hud.webContents.once("did-finish-load", send)
  else send()

  if (!hud.isVisible()) {
    placeOnPointerDisplay(hud, 48)
    hud.showInactive()
  }
  if (status.kind !== "working") {
    hudTimer = setTimeout(() => hud.hide(), status.kind === "error" ? 4000 : 1200)
  }
}

export function hideHud() {
  if (hudTimer) clearTimeout(hudTimer)
  hudWindow?.hide()
}

/* -------------------------------------------------------------- picker ---- */

let pickerWindow: BrowserWindow | null = null

export function getPickerWindow() {
  if (pickerWindow && !pickerWindow.isDestroyed()) return pickerWindow
  pickerWindow = new BrowserWindow({
    width: 440,
    height: 380,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: { preload: preload(), sandbox: true },
  })
  pickerWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  load(pickerWindow, "picker")
  return pickerWindow
}

export function showPicker() {
  const picker = getPickerWindow()
  placeOnPointerDisplay(picker, null)
  picker.show()
  picker.focus()
  picker.webContents.send(IPC.pickerOpen)
}

/** Preloaded at startup so the first shortcut press does not wait on a page load. */
export function warmUpWindows() {
  ensureHud()
  getPickerWindow()
}
