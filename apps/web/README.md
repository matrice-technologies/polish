# Polish — web

The account side of Polish: sign-in, the prompts editor, and the approval page
the desktop app's sign-in goes through. See the [root README](../../README.md)
for how it fits with the desktop app.

Everything below is the [boilerplate](https://github.com/matrice-technologies/nextjs-boilerplate)
this app started from. In this monorepo the `supabase/` directory lives at the
repository root, and commands run from there (`npm run dev:web`,
`npm run db:types`).

---

A Next.js app with the parts every product needs already built: authentication,
workspaces, members and invitations, projects, and settings for all of them.

What is left after taking a working product and removing the product: the shell
everything else gets built on.

## What is in it

- **Auth** — magic link and Google OAuth through Supabase, session refresh in
  `proxy.ts`, `/auth/callback` completing a PKCE exchange.
- **Workspaces** — created at `/welcome`, switched from the sidebar, renamed and
  deleted in settings. Each has a logo, generated from its name until someone
  uploads one.
- **Members** — a roster with owner/admin/member roles, email invitations that
  expire, and the guard that stops a workspace being stranded ownerless.
- **Projects** — created, renamed, given a logo, deleted. `/[workspace]/[project]`
  is deliberately near-empty: that is where your product goes.
- **Settings** — a full-page section at `/[workspace]/settings` covering personal
  profile, appearance, workspace general and members.
- **UI** — shadcn on Base UI, Tailwind v4, light and dark themes.

## Running it

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project
npm run dev
```

See **Database** below for creating the schema those keys point at.

## Making it yours

1. `lib/app.ts` — the product name, used by page titles, the sign-in screen and
   invitation emails.
2. `components/logo.tsx` — the mark.
3. `lib/database.types.ts` — regenerate against your own Supabase project rather
   than editing by hand.
4. `app/globals.css` — the colour tokens.

## Database

The schema is self-contained in `supabase/migrations`, in three files meant to
be read in order:

| | |
| --- | --- |
| `…01_schema.sql` | tables, triggers, the last-owner guard |
| `…02_rls.sql` | membership helpers, `create_workspace`, policies, grants |
| `…03_storage.sql` | `avatars` and `workspace-logos` buckets and their policies |

### Pushing to a new project

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Or locally:

```bash
npx supabase start
npx supabase db reset
```

Then put the project's URL and keys in `.env.local`, and regenerate the types:

```bash
npx supabase gen types typescript --linked > apps/web/lib/database.types.ts
```

### Things worth knowing before you change it

- **Grants and RLS are two separate layers.** A policy on a table the
  `authenticated` role has no privilege on is unreachable, and a grant with no
  policy exposes everything. Any new table needs both.
- **Workspaces are created through `create_workspace()`, not a plain insert.**
  `INSERT … RETURNING` also applies the SELECT policy, and membership is granted
  by an AFTER INSERT trigger that has not fired yet — so a direct insert always
  fails with an RLS violation. The reasoning is written out above the function.
- **Two paths use the service role and own their authorization entirely**:
  verifying an invitation token for someone who is not yet a member, and adding
  them once it checks out. RLS grants them nothing.
- **Storage policies key on the first path segment** of the object name — the
  user id for avatars, the workspace id for logos. `lib/storage.ts` is the only
  thing that builds those keys, so keep them in step.

## Deploying

The routine is a Coolify server running both a Supabase instance and the
Next.js app, with the deployment driven by a Claude agent. The agent does the
work; you provide the credentials and confirm the steps it cannot do itself.

### Before asking the agent to deploy

Two things must be in place at the repo root, or the agent will stop and ask
for them:

1. **The Google OAuth client secret JSON** (the `client_secret_….json` file
   downloaded from the Google Cloud console). The agent reads it to configure
   Google sign-in in Supabase. The client must have been created with the
   redirect URI pointing at your Supabase instance — see step 1 of the agent
   routine below.
2. **A filled-in `.env.agent`** (copy `.env.agent.example`):

   | | |
   | --- | --- |
   | `COOLIFY_HOST` | URL of your Coolify server |
   | `COOLIFY_KEY` | API token, so the agent can create resources directly |
   | `COOLIFY_PROJECT_NAME` | the Coolify project everything is created under |
   | `APP_DOMAIN` | public domain of the Next.js app |
   | `SUPABASE_DOMAIN` | domain the Supabase instance will live at |
   | `BREVO_API_KEY` | Brevo HTTP API key, transferred as-is into the app env |
   | `SMTP_HOST` / `SMTP_PORT` | relay wired into Supabase auth for magic links |
   | `SMTP_USER` / `SMTP_PASS` | credentials for that relay |
   | `SMTP_ADMIN_EMAIL` | from-address — on auth emails and app-sent mail |
   | `SMTP_SENDER_NAME` | from-name — on auth emails and app-sent mail |

### What the agent then does

1. **Asks about the Google client, as a question:** *"Have you created the
   Google OAuth client JSON with the redirect URI
   `https://<SUPABASE_DOMAIN>/auth/v1/callback`?"* — the domain taken from
   `.env.agent` — then checks the JSON is actually present at the repo root.
   If it is missing, the agent does not go hunting for it; it tells you how
   to make one and waits:
   - create a new Google Cloud project, named the same as
     `COOLIFY_PROJECT_NAME`;
   - configure the OAuth consent screen: External, app name and support
     email, the `email` and `profile` scopes, then publish it;
   - create an OAuth client ID of type **Web application**, with
     `https://<SUPABASE_DOMAIN>/auth/v1/callback` as the authorized redirect
     URI;
   - download the client secret JSON and drop it at the repo root.
2. **Deploys Supabase on Coolify.** It sets `SUPABASE_DOMAIN` on the resource
   *before* deploying — configuring the domain afterwards causes issues — then
   waits for the instance to come up.
3. **Assembles `.env.local`.** The agent goes through `.env.example` and
   dispatches each variable from its source: the Supabase keys
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`) come from the deployment itself;
   `BREVO_API_KEY` is transferred straight from `.env.agent`, and the sender
   is too, renamed on the way — `SMTP_ADMIN_EMAIL` becomes
   `BREVO_SENDER_EMAIL` and `SMTP_SENDER_NAME` becomes `BREVO_SENDER_NAME`,
   so the values live in one place; `NEXT_PUBLIC_SITE_URL` is built from
   `APP_DOMAIN`. The finished `.env.local` is both the local dev config and,
   verbatim, the environment of the Next.js Coolify resource.
4. **Configures Supabase auth.** Google sign-in from the client secret JSON —
   the authorized redirect URLs must include the ones from that file *plus*
   `localhost:3000` through `localhost:3010`, so auth works locally whatever
   port Next binds — and SMTP from `.env.agent` so auth emails go out.
5. **Asks you to confirm the repo is connected to Coolify** through the GitHub
   App. That link cannot be made by the agent.
6. **Deploys the app as a Nixpacks resource** on Coolify, with the environment
   taken from `.env.local` — that is the whole configuration.
7. **Checks both resources are running.** That is the end of the routine: no
   smoke tests, no probing the app beyond the servers reporting healthy.
