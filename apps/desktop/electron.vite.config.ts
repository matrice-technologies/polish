import { resolve } from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "electron-vite"

/**
 * Main and preload bundle everything except `dependencies` (externalised by
 * default and shipped in node_modules by electron-builder) — so the workspace
 * package @polish/shared and zod, both devDependencies, are inlined.
 */
export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    plugins: [react(), tailwindcss()],
    // Same alias as the web app, so shadcn components move between them unchanged.
    resolve: { alias: { "@": resolve(__dirname, "src/renderer/src") } },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/renderer/index.html"),
          hud: resolve(__dirname, "src/renderer/hud.html"),
          picker: resolve(__dirname, "src/renderer/picker.html"),
        },
      },
    },
  },
})
