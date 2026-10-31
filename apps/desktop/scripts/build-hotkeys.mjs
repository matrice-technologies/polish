/**
 * Compiles native/hotkeys.swift into resources/bin/polish-hotkeys, a
 * universal (arm64 + x86_64) binary, so one build serves both Mac DMGs.
 * electron-builder ships resources/** unpacked and signs the binary with the
 * app. Elsewhere there is nothing to build: Windows and Linux keep Electron's
 * globalShortcut.
 *
 * Skipped when the binary is newer than the source, so `npm run dev` stays fast.
 */
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

if (process.platform !== "darwin") process.exit(0)

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const source = join(root, "native/hotkeys.swift")
const output = join(root, "resources/bin/polish-hotkeys")

if (existsSync(output) && statSync(output).mtimeMs > statSync(source).mtimeMs) process.exit(0)

const work = mkdtempSync(join(tmpdir(), "polish-hotkeys-"))
try {
  const slices = ["arm64", "x86_64"].map((arch) => {
    const slice = join(work, arch)
    execFileSync(
      "xcrun",
      ["swiftc", "-O", "-swift-version", "5", "-target", `${arch}-apple-macos11`, "-o", slice, source],
      { stdio: "inherit" },
    )
    return slice
  })
  mkdirSync(dirname(output), { recursive: true })
  execFileSync("lipo", ["-create", ...slices, "-output", output], { stdio: "inherit" })
  console.log("built", output)
} finally {
  rmSync(work, { recursive: true, force: true })
}
