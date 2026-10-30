import { app } from "electron"
import { execFile, spawn } from "node:child_process"
import { randomUUID } from "node:crypto"
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { delimiter, join } from "node:path"

import type { CliStatus } from "../../common/providers"
import { PolishError } from "./errors"

/**
 * Claude through the person's own subscription: Polish runs the Claude Code
 * CLI installed on this machine in print mode, so requests are billed to
 * whatever that CLI is signed in to — normally their Pro or Max plan.
 *
 * Each call is a bare one-shot: its own system prompt (from a file, so no
 * quoting trouble on Windows), no tools, no settings sources (so none of the
 * person's hooks run), no MCP servers, no saved session, and an empty working
 * directory so no project CLAUDE.md is read. That keeps a rewrite at a couple
 * of hundred input tokens and about two seconds.
 */

const isWin = process.platform === "win32"

let status: CliStatus = { state: "checking" }
let onChange: () => void = () => {}
let loginPoll: NodeJS.Timeout | null = null

export function cliStatus(): CliStatus {
  return status
}

export function onCliStatusChange(fn: () => void) {
  onChange = fn
}

function setStatus(next: CliStatus) {
  status = next
  onChange()
}

/* --------------------------------------------------------------- locate ---- */

/**
 * Where Claude Code usually lives. GUI apps on macOS do not inherit the shell's
 * PATH, so the usual install locations are checked by name before PATH is.
 * Native builds (.exe) come before npm's .cmd shim, which needs a shell.
 */
function candidates(): string[] {
  const home = homedir()
  const fixed = isWin
    ? [join(home, ".local", "bin", "claude.exe"), join(process.env.APPDATA ?? "", "npm", "claude.cmd")]
    : [
        join(home, ".local", "bin", "claude"),
        join(home, ".claude", "local", "claude"),
        "/opt/homebrew/bin/claude",
        "/usr/local/bin/claude",
        "/usr/bin/claude",
      ]
  const names = isWin ? ["claude.exe", "claude.cmd"] : ["claude"]
  const onPath = (process.env.PATH ?? "")
    .split(delimiter)
    .filter(Boolean)
    .flatMap((dir) => names.map((name) => join(dir, name)))
  const all = [...fixed, ...onPath]
  return isWin ? [...all.filter((p) => p.endsWith(".exe")), ...all.filter((p) => !p.endsWith(".exe"))] : all
}

/** Last resort on macOS/Linux: ask the login shell, which has the person's PATH. */
function fromLoginShell(): Promise<string | null> {
  if (isWin) return Promise.resolve(null)
  return new Promise((resolve) => {
    execFile(process.env.SHELL || "/bin/zsh", ["-lc", "command -v claude"], { timeout: 5000 }, (error, stdout) => {
      const found = stdout.trim().split("\n").pop()
      resolve(!error && found && existsSync(found) ? found : null)
    })
  })
}

async function locate(override: string | null): Promise<string | null> {
  if (override) return existsSync(override) ? override : null
  return candidates().find((p) => existsSync(p)) ?? (await fromLoginShell())
}

/* ------------------------------------------------------------------ run ---- */

/**
 * The environment Claude Code runs in. An API key in the environment would
 * make it bill the API instead of the subscription, and CLAUDECODE marks a
 * nested session, which Claude Code refuses to start.
 */
function cliEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  delete env.ANTHROPIC_API_KEY
  delete env.ANTHROPIC_AUTH_TOKEN
  delete env.CLAUDECODE
  return env
}

/** npm's claude.cmd can only be started through cmd.exe, which needs each argument quoted. */
function quoteForCmd(arg: string) {
  return `"${arg.replace(/"/g, '""')}"`
}

function run(
  path: string,
  args: string[],
  { input, timeoutMs, cwd }: { input?: string; timeoutMs: number; cwd?: string },
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const viaShell = isWin && path.toLowerCase().endsWith(".cmd")
    const child = viaShell
      ? spawn(quoteForCmd(path), args.map(quoteForCmd), { shell: true, env: cliEnv(), cwd, windowsHide: true })
      : spawn(path, args, { env: cliEnv(), cwd, windowsHide: true })

    let stdout = ""
    let stderr = ""
    const timer = setTimeout(() => {
      child.kill()
      reject(new PolishError("Claude took too long to answer."))
    }, timeoutMs)

    child.stdout.on("data", (chunk) => (stdout += chunk))
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      resolve({ stdout, stderr, code })
    })
    child.stdin.end(input ?? "")
  })
}

function parseJson<T>(text: string): T | null {
  // Anything printed before the JSON (an update notice) is skipped.
  const start = text.indexOf("{")
  if (start < 0) return null
  try {
    return JSON.parse(text.slice(start)) as T
  } catch {
    return null
  }
}

/* --------------------------------------------------------------- status ---- */

interface AuthStatus {
  loggedIn: boolean
  authMethod?: string
  email?: string
  subscriptionType?: string
}

/** Finds Claude Code and asks it who it is signed in as. */
export async function refreshCliStatus(override: string | null): Promise<CliStatus> {
  if (status.state !== "logging-in") setStatus({ state: "checking" })
  const path = await locate(override)
  if (!path) {
    setStatus({ state: "missing" })
    return status
  }

  try {
    const versionRun = await run(path, ["--version"], { timeoutMs: 15_000 })
    const version = /\d+\.\d+\.\d+/.exec(versionRun.stdout)?.[0] ?? "unknown"
    const auth = parseJson<AuthStatus>((await run(path, ["auth", "status", "--json"], { timeoutMs: 15_000 })).stdout)

    if (!auth?.loggedIn) {
      // Stay in "logging-in" while the login terminal is open.
      setStatus({ state: status.state === "logging-in" ? "logging-in" : "logged-out", path, version })
    } else {
      stopLoginPoll()
      setStatus({
        state: "ready",
        path,
        version,
        email: auth.email ?? null,
        subscription: auth.subscriptionType ?? null,
        apiBilling: auth.authMethod !== "claude.ai",
      })
    }
  } catch {
    setStatus({ state: "missing" })
  }
  return status
}

/* ---------------------------------------------------------------- login ---- */

/**
 * Signing in needs a browser round trip and sometimes a pasted code, so it runs
 * in a real terminal the person can see, and Polish polls until it is done.
 */
export function startCliLogin() {
  if (status.state !== "logged-out" && status.state !== "ready") return
  const { path, version } = status
  openTerminal(path, ["auth", "login"])
  setStatus({ state: "logging-in", path, version })

  stopLoginPoll()
  const deadline = Date.now() + 10 * 60 * 1000
  loginPoll = setInterval(() => {
    if (Date.now() > deadline) {
      stopLoginPoll()
      setStatus({ state: "logged-out", path, version })
      return
    }
    void refreshCliStatus(path)
  }, 3000)
}

export function cancelCliLogin() {
  if (status.state !== "logging-in") return
  stopLoginPoll()
  setStatus({ state: "logged-out", path: status.path, version: status.version })
}

function stopLoginPoll() {
  if (loginPoll) clearInterval(loginPoll)
  loginPoll = null
}

function openTerminal(path: string, args: string[]) {
  if (isWin) {
    // `start` opens a new console window; /k keeps it open so any error stays readable.
    const command = `start "Log in to Claude" cmd /k ""${path}" ${args.join(" ")}"`
    spawn("cmd.exe", ["/d", "/s", "/c", `"${command}"`], {
      windowsVerbatimArguments: true,
      detached: true,
      stdio: "ignore",
    }).unref()
  } else if (process.platform === "darwin") {
    const line = [path, ...args].map((a) => `'${a.replace(/'/g, `'\\''`)}'`).join(" ")
    const script = `tell application "Terminal"\n  activate\n  do script "${line.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"\nend tell`
    spawn("osascript", ["-e", script], { detached: true, stdio: "ignore" }).unref()
  } else {
    // Whichever terminal this desktop has; the first that starts wins.
    const terminals: [string, string[]][] = [
      ["x-terminal-emulator", ["-e", path, ...args]],
      ["gnome-terminal", ["--", path, ...args]],
      ["konsole", ["-e", path, ...args]],
      ["xterm", ["-e", path, ...args]],
    ]
    const tryNext = (i: number) => {
      if (i >= terminals.length) return
      const [cmd, cmdArgs] = terminals[i]
      const child = spawn(cmd, cmdArgs, { detached: true, stdio: "ignore" })
      child.on("error", () => tryNext(i + 1))
      child.unref()
    }
    tryNext(0)
  }
}

/* -------------------------------------------------------------- rewrite ---- */

interface CliResult {
  is_error: boolean
  result?: string
  api_error_status?: number | null
}

export async function cliRewrite({ model, system, text }: { model: string; system: string; text: string }): Promise<string> {
  if (status.state === "missing" || status.state === "checking") {
    throw new PolishError("Claude Code isn't installed on this computer. See Settings → AI provider.")
  }
  if (status.state !== "ready") {
    throw new PolishError("Claude Code isn't signed in. Log in from Settings → AI provider.")
  }

  const base = join(app.getPath("userData"), "claude-cli")
  const workdir = join(base, "work")
  mkdirSync(workdir, { recursive: true })
  const systemFile = join(base, `system-${randomUUID()}.txt`)
  writeFileSync(systemFile, system)

  const args = [
    "-p",
    "--output-format",
    "json",
    "--model",
    model,
    "--system-prompt-file",
    systemFile,
    "--tools",
    "",
    "--setting-sources",
    "",
    "--strict-mcp-config",
    "--no-session-persistence",
    "--disable-slash-commands",
  ]
  // A rewrite needs little thinking; Haiku-tier models may not take the flag.
  if (model !== "haiku") args.push("--effort", "low")

  try {
    const { stdout, stderr, code } = await run(status.path, args, { input: text, timeoutMs: 120_000, cwd: workdir })
    const result = parseJson<CliResult>(stdout)
    if (!result) {
      const detail = (stderr || stdout).trim().split("\n").pop()
      throw new PolishError(`Claude Code failed${code ? ` (exit ${code})` : ""}${detail ? `: ${detail}` : "."}`)
    }
    if (result.is_error) {
      const message = result.result ?? "Claude Code reported an error."
      if (/not logged in|\/login/i.test(message)) {
        void refreshCliStatus(status.path)
        throw new PolishError("Claude Code isn't signed in. Log in from Settings → AI provider.")
      }
      if (result.api_error_status === 429 || /limit/i.test(message)) {
        throw new PolishError(`Claude usage limit reached: ${message}`)
      }
      throw new PolishError(message)
    }
    const output = result.result?.trim()
    if (!output) throw new PolishError("Claude returned nothing for this text.")
    return output
  } catch (error) {
    if (error instanceof PolishError) throw error
    throw new PolishError(`Couldn't run Claude Code: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    rmSync(systemFile, { force: true })
  }
}
