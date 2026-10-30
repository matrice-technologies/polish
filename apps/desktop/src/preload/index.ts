import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron"

import { IPC, type AppState, type HudStatus, type PolishApi } from "../common/types"

/** The only door between the renderer and the main process. */
function subscribe<T extends unknown[]>(channel: string, listener: (...args: T) => void) {
  const handler = (_event: IpcRendererEvent, ...args: T) => listener(...args)
  ipcRenderer.on(channel, handler as never)
  return () => void ipcRenderer.removeListener(channel, handler as never)
}

const api: PolishApi = {
  env: {
    platform: process.platform === "darwin" ? "mac" : process.platform === "win32" ? "windows" : "linux",
  },
  getState: () => ipcRenderer.invoke(IPC.getState),
  onState: (listener) => subscribe<[AppState]>(IPC.state, listener),

  savePrompt: (input) => ipcRenderer.invoke(IPC.savePrompt, input),
  deletePrompt: (id) => ipcRenderer.invoke(IPC.deletePrompt, id),
  movePrompt: (id, direction) => ipcRenderer.invoke(IPC.movePrompt, id, direction),
  updateSettings: (patch) => ipcRenderer.invoke(IPC.updateSettings, patch),
  updateDevice: (patch) => ipcRenderer.invoke(IPC.updateDevice, patch),
  updateAi: (patch) => ipcRenderer.invoke(IPC.updateAi, patch),
  setProviderKey: (provider, key) => ipcRenderer.invoke(IPC.setProviderKey, provider, key),
  listModels: (provider) => ipcRenderer.invoke(IPC.listModels, provider),
  testProvider: () => ipcRenderer.invoke(IPC.testProvider),
  refreshCli: () => ipcRenderer.invoke(IPC.refreshCli),
  cliLogin: () => ipcRenderer.send(IPC.cliLogin),
  cliCancelLogin: () => ipcRenderer.send(IPC.cliCancelLogin),
  tryPrompt: (id, text) => ipcRenderer.invoke(IPC.tryPrompt, id, text),
  setRecording: (recording) => ipcRenderer.send(IPC.setRecording, recording),
  setPaused: (paused) => ipcRenderer.send(IPC.setPaused, paused),
  requestAccessibility: () => ipcRenderer.send(IPC.requestAccessibility),

  startLink: () => ipcRenderer.invoke(IPC.startLink),
  cancelLink: () => ipcRenderer.invoke(IPC.cancelLink),
  signOut: () => ipcRenderer.invoke(IPC.signOut),
  syncNow: () => ipcRenderer.invoke(IPC.syncNow),
  openExternal: (url) => ipcRenderer.send(IPC.openExternal, url),

  getPickerItems: () => ipcRenderer.invoke(IPC.pickerItems),
  onPickerOpen: (listener) => subscribe(IPC.pickerOpen, listener),
  pick: (id) => ipcRenderer.send(IPC.pick, id),
  cancelPick: () => ipcRenderer.send(IPC.cancelPick),

  onHud: (listener) => subscribe<[HudStatus]>(IPC.hud, listener),
}

contextBridge.exposeInMainWorld("polish", api)
