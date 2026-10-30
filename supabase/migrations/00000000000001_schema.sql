-- Core schema: profiles, workspaces, membership, invitations, projects.
--
-- Everything an authenticated dashboard user touches is constrained by RLS
-- (next migration). Two paths deliberately run with the service role instead
-- and own their authorization entirely: accepting an invitation, which must
-- write a membership row for someone who is not yet a member, and anything the
-- app does on behalf of a user who has no session yet.

/* -------------------------------------------------------------------------- */
/*  Enums                                                                      */
/* -------------------------------------------------------------------------- */

create type public.workspace_role as enum ('owner', 'admin', 'member');

/* -------------------------------------------------------------------------- */
/*  Shared helpers                                                             */
/* -------------------------------------------------------------------------- */

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

/* -------------------------------------------------------------------------- */
/*  Profiles                                                                   */
/* -------------------------------------------------------------------------- */

-- auth.users is not directly readable by clients, so mirror the display fields
-- members need in order to see each other.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Populated on signup for both magic-link and Google users. Google supplies the
-- name/avatar in raw_user_meta_data; magic-link users start with just an email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/* -------------------------------------------------------------------------- */
/*  Workspaces                                                                 */
/* -------------------------------------------------------------------------- */

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  -- Optional. Without one the app generates a mark from the name.
  logo_url text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_id_idx on public.workspace_members (user_id);

-- Whoever creates a workspace is immediately its owner. Doing this in a trigger
-- rather than a second INSERT means there is no window in which a workspace
-- exists with no members — which RLS would render permanently unreachable.
create or replace function public.add_workspace_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.created_by is not null then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (new.id, new.created_by, 'owner')
    on conflict (workspace_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger workspaces_add_creator_as_owner
  after insert on public.workspaces
  for each row execute function public.add_workspace_creator_as_owner();

-- A workspace must never be left without an owner: the last owner cannot be
-- demoted or removed. Enforced here rather than in the app so that neither the
-- dashboard nor a stray service-role script can strand a workspace.
create or replace function public.prevent_last_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining_owners integer;
begin
  -- Deleting a whole workspace cascades to its members and would otherwise trip
  -- the guard on the way out, aborting the delete. The guard exists to stop a
  -- workspace being *stranded* ownerless; when the workspace itself is going
  -- away there is nothing to strand, and the parent row is already gone by the
  -- time the cascade reaches here, so its absence is the signal to stand down.
  if tg_op = 'DELETE'
     and not exists (select 1 from public.workspaces w where w.id = old.workspace_id) then
    return old;
  end if;

  if tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner' then
    select count(*) into remaining_owners
      from public.workspace_members
     where workspace_id = old.workspace_id
       and role = 'owner'
       and user_id <> old.user_id;
    if remaining_owners = 0 then
      raise exception 'Cannot demote the last owner of a workspace';
    end if;
  elsif tg_op = 'DELETE' and old.role = 'owner' then
    select count(*) into remaining_owners
      from public.workspace_members
     where workspace_id = old.workspace_id
       and role = 'owner'
       and user_id <> old.user_id;
    if remaining_owners = 0 then
      raise exception 'Cannot remove the last owner of a workspace';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger workspace_members_protect_last_owner
  before update or delete on public.workspace_members
  for each row execute function public.prevent_last_owner_removal();

/* -------------------------------------------------------------------------- */
/*  Invitations                                                                */
/* -------------------------------------------------------------------------- */

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (position('@' in email) > 1),
  role public.workspace_role not null default 'member',
  -- Only the SHA-256 of the invite token is stored; the raw value exists solely
  -- inside the emailed link, so a database leak cannot be used to join.
  token_hash text not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index workspace_invitations_workspace_idx on public.workspace_invitations (workspace_id);
create index workspace_invitations_email_idx on public.workspace_invitations (lower(email));

-- One live invite per address per workspace; re-inviting replaces the old row.
create unique index workspace_invitations_pending_unique
  on public.workspace_invitations (workspace_id, lower(email))
  where accepted_at is null;

/* -------------------------------------------------------------------------- */
/*  Projects                                                                   */
/* -------------------------------------------------------------------------- */

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 60),
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{1,59}$'),
  -- Optional, as on workspaces.
  logo_url text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Slugs are unique per workspace, not globally: two companies may both have a
-- "website", and the URL carries the workspace already.
create unique index projects_workspace_slug_unique on public.projects (workspace_id, slug);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();
