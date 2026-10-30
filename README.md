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
| `apps/web` | Next.js app: sign-in, the prompts editor, settings, desktop sign-in, and the website |
| `packages/shared` | What both apps must agree on: prompt and settings schemas, shortcut parsing, the sync merge, the system prompt |
| `supabase` | Migrations: privileges, avatar storage, and Polish's tables |

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
signs in through production by default; for local development put
`MAIN_VITE_WEB_URL=http://localhost:3000` in `apps/desktop/.env.development`
(dev mode only), or change it in the app under Account → Server.

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

An account is one person; there are no teams or workspaces. Every row belongs to
its user, and RLS lets you read and write only your own.
`supabase/migrations/00000000000004_polish.sql` holds Polish's tables:

- `prompts`: keyed `(user_id, id)`, tombstoned, no delete grant
- `user_settings`: one JSON row per person, parsed field by field by
  `@polish/shared`
- `device_links`: service-role only (RLS on, no policies, no grants)

The other migrations set baseline privileges, add the `avatars` bucket, and
(`…05_accounts_only.sql`) remove the workspace tables that databases created
before Polish dropped them still have. Regenerate
`apps/web/lib/database.types.ts` with `npm run db:types` after a schema change.

## Releasing the desktop app

Polish is distributed as this repository's
[GitHub Releases](https://github.com/matrice-technologies/polish/releases), and
installed copies update themselves from them, the way VS Code does: check at launch and every four hours, download in the
background, then "Restart to update" in the sidebar, the tray menu and a
notification. An update you don't restart for installs when Polish quits.

To release:

1. Bump `version` in `apps/desktop/package.json`.
2. Push a matching tag: `git tag v0.2.0 && git push origin v0.2.0`.

`.github/workflows/release-desktop.yml` then builds Windows (one per-user x64
installer, which Arm PCs run under emulation) and macOS (Apple Silicon and Intel; DMG to install,
ZIP for updates) into a draft release, and publishes it once every platform
has uploaded. The download page at `/download` and the landing page pick up
the new version within five minutes.

Publishing uses the workflow's own `GITHUB_TOKEN`; no other secret is needed.

**Signing.** macOS: with an Apple Developer ID certificate and an Apple ID for
notarization in the secrets listed at the top of the workflow, builds are
signed and notarized. Without them they are ad-hoc signed, which means a
Gatekeeper warning on first open, and **no auto-update on macOS**, because
macOS refuses to update an app it can't verify. Windows: unsigned builds work and update, but
SmartScreen warns on first install until the app is signed (an EV
certificate, or Azure Trusted Signing).

Local builds: `npm run dist --workspace @polish/desktop` writes installers to
`apps/desktop/release/` without publishing.

## Deploying

The hosted instance runs at https://polish.matricetechnologies.com, with its
own Supabase at https://supabase.polish.matricetechnologies.com, both on a
[Coolify](https://coolify.io) server. To run your own:

1. Deploy Supabase (Coolify has a one-click template) and apply
   `supabase/migrations` to it (`npx supabase db push --db-url …`, or paste
   them into Studio's SQL editor in order).
2. Configure its auth: site URL and allowed redirects for your web app's
   domain, and SMTP so magic links are sent. For Google sign-in, create an
   OAuth client of type Web application whose redirect URI is
   `https://<your-supabase>/auth/v1/callback`, and pass its ID and secret to
   the auth container as `GOTRUE_EXTERNAL_GOOGLE_ENABLED`, `…_CLIENT_ID`,
   `…_SECRET` and `…_REDIRECT_URI`.
3. Deploy `apps/web` with the root `Dockerfile`. `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_SITE_URL` are
   **build-time** variables; `SUPABASE_SERVICE_ROLE_KEY` is runtime only.
4. Build the desktop app with `MAIN_VITE_WEB_URL` set to your web app, or
   point an installed copy at it under Account → Server.

## Contributing and security

Issues and pull requests are welcome. Please report security issues privately;
see [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Matrice Technologies

## Not done yet

- Wayland: global shortcuts and synthetic keystrokes need X11 (or XWayland).
- Code signing: Windows SmartScreen and macOS Gatekeeper warn until the
  release workflow is given a certificate (see Releasing).
