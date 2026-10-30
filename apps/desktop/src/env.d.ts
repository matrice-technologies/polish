/// <reference types="electron-vite/node" />

interface ImportMetaEnv {
  /** Default web app the desktop app signs in through; editable in the app. */
  readonly MAIN_VITE_WEB_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
