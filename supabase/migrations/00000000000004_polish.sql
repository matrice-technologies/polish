-- Polish: prompts, synced settings, and linking the desktop app to an account.
--
-- Prompts and settings belong to a person: they are the shortcuts on one
-- person's keyboard. The desktop app writes them directly through PostgREST
-- with the user's own session, so RLS is the whole access story — each policy
-- is "it is yours".
--
-- Both apps sync last-write-wins on `updated_at`, which the *client* sets: the
-- desktop app may have made the edit hours ago while offline, and stamping it
-- with the server's clock on upload would let a stale edit beat a newer one.
-- That is why there is no set_updated_at trigger on these tables.

/* -------------------------------------------------------------------------- */
/*  Prompts                                                                    */
/* -------------------------------------------------------------------------- */

create table public.prompts (
  -- Minted by whichever app created the prompt, so the key is (user, id): the
  -- built-in prompts have the same id on every install, for every person.
  id uuid not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  instructions text not null check (char_length(instructions) between 1 and 20000),
  -- Electron accelerator syntax, e.g. "CommandOrControl+Shift+1". Duplicates are
  -- allowed here and reported in the apps: a uniqueness constraint would make
  -- swapping two shortcuts depend on the order the rows happen to sync in.
  shortcut text check (shortcut is null or char_length(shortcut) <= 64),
  position integer not null default 0,
  updated_at timestamptz not null default now(),
  -- A tombstone, so a delete made on one device reaches the others.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index prompts_user_updated_idx on public.prompts (user_id, updated_at);

alter table public.prompts enable row level security;

create policy "prompts: owner reads" on public.prompts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "prompts: owner inserts" on public.prompts
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "prompts: owner updates" on public.prompts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- No delete policy or grant: the apps delete by tombstone. The revoke undoes
-- the blanket grant some Supabase instances give every new public table (see
-- the first migration).
revoke all on public.prompts from anon, authenticated;
grant select, insert, update on public.prompts to authenticated;
grant all on public.prompts to service_role;

/* -------------------------------------------------------------------------- */
/*  Synced settings                                                            */
/* -------------------------------------------------------------------------- */

-- One row per person. The shape lives in @polish/shared (syncedSettingsSchema),
-- which parses field by field, so a column per setting would only add a
-- migration to every new toggle.
create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "user_settings: owner reads" on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_settings: owner inserts" on public.user_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "user_settings: owner updates" on public.user_settings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.user_settings from anon, authenticated;
grant select, insert, update on public.user_settings to authenticated;
grant all on public.user_settings to service_role;

/* -------------------------------------------------------------------------- */
/*  Desktop device links                                                       */
/* -------------------------------------------------------------------------- */

-- The desktop app signs in with a device flow: it asks for a short user code,
-- the person approves that code in the browser where they are already signed
-- in, and the app — polling with a secret device code only it holds — is then
-- handed a one-time token it exchanges for its own Supabase session.
--
-- Service role only. Enabling RLS with no policies and granting nothing means
-- neither anon nor authenticated can touch it; the route handlers and the
-- approval action own their authorization.
create table public.device_links (
  id uuid primary key default gen_random_uuid(),
  -- SHA-256 of the device code. The raw value only ever lives in the app.
  device_code_hash text not null unique,
  -- What the person sees and approves, e.g. "KXRT-9MPD".
  user_code text not null unique,
  device_name text check (device_name is null or char_length(device_name) <= 120),
  user_id uuid references auth.users (id) on delete cascade,
  approved_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now()
);

create index device_links_expires_idx on public.device_links (expires_at);

alter table public.device_links enable row level security;
revoke all on public.device_links from anon, authenticated;
grant all on public.device_links to service_role;
