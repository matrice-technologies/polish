# Polish

Select text in any app, press a shortcut, get it back polished.

Polish is a tray app. Each prompt ("Polish", "Shorter", "Professional", …) has
its own global shortcut. Pressing one copies the selection from whatever app
has focus, sends it to Claude with that prompt's instructions, and pastes the
result over the selection, then puts your clipboard back the way it was.
Prompts without a shortcut are one keystroke away in the picker
(`Ctrl+Shift+Space` / `⌘⇧Space` by default).

It works entirely offline from the Polish server: no account, no sign-in, just
your own Anthropic API key. Signing in is optional and only adds sync, so your
prompts, shortcuts and settings follow you between machines and can be edited
from the web.

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

Add an Anthropic API key under **Settings**, select some text anywhere, and
press `Ctrl+Shift+1`. On macOS, allow Polish under System Settings → Privacy &
Security → Accessibility first; without it the OS silently drops the copy and
paste keystrokes.

For the account side:

```bash
npm run db:start && npm run db:reset    # local Supabase (Docker)
cp apps/web/.env.example apps/web/.env.local   # fill in the keys db:start printed
npm run dev:web                          # http://localhost:3000
```

The desktop app signs in through `http://localhost:3000` by default
(`MAIN_VITE_WEB_URL` at build time, or Account → Server in the app).

## How the pieces fit

**The polish itself** (`apps/desktop/src/main/polish.ts`, `selection.ts`). The
only way to read a selection from every app is the clipboard, so Polish
snapshots the clipboard, writes a sentinel, releases the modifiers your
shortcut is still holding (or Ctrl+C would arrive as Ctrl+Shift+C), sends
copy, and waits for the sentinel to change. The result is written back the
same way with paste, and the snapshot is restored half a second later, once
the target app has read the paste. Keystrokes are posted with `uiohook-napi`.

**The model call** (`llm.ts`, `packages/shared/src/polish.ts`). The prompt's
instructions sit inside a fixed frame that says the user message is the
selection, verbatim, to be rewritten and never answered, and that the reply
replaces the selection, so it must be the text alone. Claude Opus 5.5 by
default at low effort (Sonnet 5.5 and Haiku 5.5 are in settings), with
`fallbacks: "default"` so a request a model's safety classifiers decline is
retried server-side on the recommended fallback instead of failing. The API key
is encrypted with the OS keychain (`safeStorage`) and never syncs.

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
