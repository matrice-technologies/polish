# Polish

Select text in any app, press a shortcut, get it back polished.

Polish is a tray app. Each prompt ("Polish", "Shorter", "Professional", …) has
its own global shortcut. Pressing one copies the selection from whatever app
has focus, sends it to Claude with that prompt's instructions, and pastes the
result over the selection, then puts your clipboard back the way it was.
Prompts without a shortcut are one keystroke away in the picker
(`Ctrl+Shift+Space` / `⌘⇧Space` by default).

It works entirely offline from the Polish server: no account, no sign-in. Text
goes from your computer straight to the model provider you pick:

- **Your Claude subscription** (Pro or Max), through Claude Code installed on
  the same machine. No API key.
- **An API key** for Anthropic, OpenAI, Google Gemini or xAI Grok.
- **Any OpenAI-compatible endpoint**: Ollama or LM Studio for fully local
  models, OpenRouter, Groq, Mistral, DeepSeek…

Signing in is optional and only adds sync, so your prompts, shortcuts and
settings follow you between machines and can be edited from the web. The
provider and its keys stay per-device.

## Layout

| | |
| --- | --- |
| `apps/desktop` | Electron app: tray, global shortcuts, copy → Claude → paste, picker, HUD |
| `apps/web` | Next.js app from [`nextjs-boilerplate`](https://github.com/matrice-technologies/nextjs-boilerplate): auth, prompts editor, desktop sign-in |
| `packages/shared` | What both apps must agree on: prompt and settings schemas, shortcut parsing, the sync merge, the system prompt |
| `supabase` | Migrations: the boilerplate's three, plus `…04_polish.sql` |

npm workspaces; run everything from the root.

## Running it

```bash
npm install
npm run dev:desktop        # the Electron app, offline mode
```

Pick a provider under **Settings → AI provider** (if Claude Code is installed
and signed in, Polish starts on your subscription by itself), select some text
anywhere, and press `Ctrl+Shift+1`. On macOS, allow Polish under System Settings → Privacy &
Security → Accessibility first; without it the OS silently drops the copy and
paste keystrokes.

For the account side:

```bash
npm run db:start && npm run db:reset    # local Supabase (Docker)
cp apps/web/.env.example apps/web/.env.local   # fill in the keys db:start printed
npm run dev:web                          # http://localhost:3000
```

`npm run dev:web` binds 3000, or the next free port; pass `-- --port 3001` to
pick one. Local Supabase accepts sign-in redirects from ports 3000 to 3010, and
magic-link emails land in Mailpit at http://127.0.0.1:54324. The desktop app
signs in through `http://localhost:3000` by default (`MAIN_VITE_WEB_URL` at
build time, or Account → Server in the app).

## How the pieces fit

**The polish itself** (`apps/desktop/src/main/polish.ts`, `selection.ts`). The
only way to read a selection from every app is the clipboard, so Polish
snapshots the clipboard, writes a sentinel, releases the modifiers your
shortcut is still holding (or Ctrl+C would arrive as Ctrl+Shift+C), sends
copy, and waits for the sentinel to change. The result is written back the
same way with paste, and the snapshot is restored half a second later, once
the target app has read the paste. Keystrokes are posted with `uiohook-napi`.

**The model call** (`apps/desktop/src/main/engines/`,
`packages/shared/src/polish.ts`). The prompt's instructions sit inside a fixed
frame that says the user message is the selection, verbatim, to be rewritten
and never answered, and that the reply replaces the selection, so it must be
the text alone. That frame is the system prompt for every provider:

- `claude-cli.ts`: the subscription. Runs the person's own `claude` in print
  mode (`-p --output-format json`) with the system prompt from a file, no
  tools, no setting sources (so their hooks don't run), no MCP servers, no
  saved session, in an empty working directory (so no CLAUDE.md is read), and
  with `ANTHROPIC_API_KEY` removed from its environment so it bills the plan,
  not the API. About two seconds per rewrite. `claude auth status --json` tells
  Polish whether it is installed and signed in; signing in opens
  `claude auth login` in a terminal window and Polish polls until it's done.
  Models are Claude Code's aliases (`opus`, `sonnet`, `haiku`), which follow
  whatever the installed Claude Code knows.
- `anthropic.ts`: the Anthropic SDK. Claude Opus 5.5 by default at low effort,
  with `fallbacks: "default"` so a request a model's safety classifiers decline
  is retried server-side instead of failing.
- `openai-compatible.ts`: one client for OpenAI, Gemini and xAI (both publish
  OpenAI-compatible endpoints) and custom base URLs. Model lists come from each
  provider's `/models`, so they don't go stale.

Keys are encrypted with the OS keychain (`safeStorage`), one per provider, and
never sync.

If you ship Polish to other people, check Anthropic's terms on offering
claude.ai login in a third-party product before relying on subscription mode.

**Offline-first sync** (`account.ts`, `packages/shared/src/sync.ts`). The local
JSON file is the source of truth. Prompts are merged one by one, newest
`updated_at` wins, deletes are tombstones so they sync too. Timestamps are
set by whichever app made the edit, not by the server, so an edit made offline
hours ago can't overwrite a newer one. Built-in prompts have fixed ids, so two
machines that started offline don't each upload a copy.

**Desktop sign-in** is a device flow
(`apps/web/app/api/desktop/link`, `apps/web/app/desktop/link`):

1. The app asks `POST /api/desktop/link` for a secret device code and a short
   user code, then opens `/desktop/link?code=…` in the browser.
2. You approve the code there, signed in as usual (magic link or Google).
3. The app, polling `POST /api/desktop/link/poll` with its device code, gets a
   one-time magic-link token hash, and exchanges it with Supabase
   (`verifyOtp`) for its own session.

From then on the app talks to Supabase directly under RLS. The web app is not
involved in syncing.

## Design

Both apps are one design system: shadcn on Base UI ("base-mira", the
boilerplate's style), Tailwind v4, Inter and Geist Mono, with Polish blue as
the only hue. The tokens live once, in `packages/shared/src/theme.css`, and
both apps import it, so they can't drift. The desktop renderer has its own
`components.json` and the same `@/` alias as the web app, so a component added
with `npx shadcn add` (or copied from `apps/web/components/ui`) works
unchanged in both.

The desktop window has no OS title bar. The top strip is the drag area, holding
the app name and the current page's title and actions, and the native caption
buttons are overlaid on it (Windows, Linux) or the traffic lights inset into it
(macOS), so Windows 11 snap layouts still work.

The logo, a P whose bar trails a flame, is drawn in
`apps/desktop/resources/icon.svg` (tile) and `glyph.svg` (bare mark).
`npm run icons --workspace @polish/desktop` renders the app, installer and
tray icons from them. The web app's `components/logo.tsx` and `app/icon.svg`
use the same paths.

## Database

`supabase/migrations/00000000000004_polish.sql` adds:

- `prompts`: keyed `(user_id, id)`, tombstoned, no delete grant
- `user_settings`: one JSON row per person, parsed field by field by
  `@polish/shared`
- `device_links`: service-role only (RLS on, no policies, no grants)

`apps/web/lib/database.types.ts` was extended by hand for these tables;
regenerate it with `npm run db:types` once a local database is up.

## Building the desktop app

```bash
npm run dist --workspace @polish/desktop
```

electron-builder writes an NSIS installer, a DMG or an AppImage to
`apps/desktop/release/`. Builds are unsigned.

## Not done yet

- Wayland: global shortcuts and synthetic keystrokes need X11 (or XWayland).
- Code signing and auto-update for the desktop app.
- Deploying `apps/web`: the boilerplate's Coolify routine still applies, but
  Nixpacks needs pointing at the workspace (`npm run build --workspace
  @polish/web` from the root).
