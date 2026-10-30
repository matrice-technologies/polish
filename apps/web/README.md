# Polish — web

The account side of Polish: sign-in, the prompts editor, and the approval page
the desktop app's sign-in goes through. See the [root README](../../README.md)
for how it fits with the desktop app, and for deploying.

It started from Matrice's [nextjs-boilerplate](https://github.com/matrice-technologies/nextjs-boilerplate),
minus its workspaces, members and projects: in Polish an account is one
person, and that is all there is.

## What is in it

- **Auth** — magic link and Google through Supabase, session refresh in
  `proxy.ts`, `/auth/callback` completing a PKCE exchange. Signing in for the
  first time creates the account; there is no separate sign-up.
- **Prompts** — `/prompts`, the same prompts, shortcuts and synced settings as
  the desktop app, editable from any browser.
- **Settings** — `/settings` for your name, picture and email, and
  `/settings/appearance` for the theme.
- **Desktop sign-in** — `/desktop/link` and `/api/desktop/link`, the device flow
  described in the root README.
- **The website** — the landing page, download, privacy and terms, under
  `app/(marketing)`.
- **UI** — shadcn on Base UI, Tailwind v4, light and dark themes.

## Running it

From the repository root:

```bash
npm install
npm run db:start && npm run db:reset    # local Supabase (Docker)
npm run dev:web
```

`apps/web/.env.local` takes the URL and keys `npx supabase status` prints; see
`.env.example`.

## Database

`supabase/migrations`, in order:

| | |
| --- | --- |
| `…01_schema.sql` | baseline privileges for the public schema |
| `…03_storage.sql` | the public `avatars` bucket, writable only under your own user id |
| `…04_polish.sql` | `prompts`, `user_settings` and `device_links` |
| `…05_accounts_only.sql` | removes the boilerplate's workspace tables from databases created before they were dropped; a no-op on a new one |

After changing the schema, regenerate `lib/database.types.ts` with
`npm run db:types` (it is kept trimmed to the tables above).

### Things worth knowing before you change it

- **Grants and RLS are two separate layers.** A policy on a table the
  `authenticated` role has no privilege on is unreachable, and a grant with no
  policy exposes everything. Any new table needs both.
- **Every policy is "it is yours"**: rows are keyed on `user_id`, compared with
  `auth.uid()`.
- **The service role is only used by the desktop sign-in**, which runs before
  the app has a session of its own and checks a device code or the approving
  user's session itself.
- **Your name and picture live on the auth user** (`user_metadata`), the same
  fields Google fills in on sign-up, so there is no profiles table to keep in
  step.
