-- Row level security.
--
-- Every policy resolves to one question: is the current user a member of the
-- workspace that owns this row, and with what role? The helpers below answer it
-- in one place. They are SECURITY DEFINER so that reading workspace_members
-- from inside a workspace_members policy does not recurse.

/* -------------------------------------------------------------------------- */
/*  Membership helpers                                                         */
/* -------------------------------------------------------------------------- */

create or replace function public.is_workspace_member(workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.workspace_members m
     where m.workspace_id = workspace
       and m.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_workspace_admin(workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.workspace_members m
     where m.workspace_id = workspace
       and m.user_id = (select auth.uid())
       and m.role in ('owner', 'admin')
  );
$$;

create or replace function public.is_workspace_owner(workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.workspace_members m
     where m.workspace_id = workspace
       and m.user_id = (select auth.uid())
       and m.role = 'owner'
  );
$$;

-- Workspace that owns a project. Used to hop the foreign key without
-- re-triggering RLS on the intermediate table.
create or replace function public.project_workspace(project uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.workspace_id from public.projects p where p.id = project;
$$;

/* -------------------------------------------------------------------------- */
/*  Creating a workspace                                                       */
/* -------------------------------------------------------------------------- */

-- `INSERT ... RETURNING` applies the SELECT policy to the new row as well, and
-- that policy requires membership. Membership is granted by an AFTER INSERT
-- trigger, which has not fired when RETURNING is evaluated — so a plain insert
-- always fails with "new row violates row-level security policy", even though
-- the WITH CHECK passed. Granting membership in a BEFORE trigger is not an
-- option either: the workspace row does not exist yet, so the foreign key would
-- fail.
--
-- Widening the SELECT policy to `created_by = auth.uid()` would fix it but
-- leaves a creator able to read the workspace forever, even after leaving it.
-- Creating through a SECURITY DEFINER function keeps the policy narrow: the
-- function owns the insert, so RLS does not apply to its RETURNING, and the
-- caller gets back only the row they just created.
create or replace function public.create_workspace(
  workspace_name text,
  workspace_slug text
)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  created public.workspaces;
begin
  if actor is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- The table's own CHECK constraints still validate name and slug shape; a
  -- unique violation on slug propagates as 23505 for the caller to retry.
  insert into public.workspaces (name, slug, created_by)
  values (btrim(workspace_name), workspace_slug, actor)
  returning * into created;

  -- The AFTER INSERT trigger has now made the caller its owner.
  return created;
end;
$$;

revoke all on function public.create_workspace(text, text) from public, anon;
grant execute on function public.create_workspace(text, text) to authenticated;

/* -------------------------------------------------------------------------- */
/*  Enable RLS everywhere                                                      */
/* -------------------------------------------------------------------------- */

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.projects enable row level security;

/* -------------------------------------------------------------------------- */
/*  Profiles                                                                   */
/* -------------------------------------------------------------------------- */

-- Yourself, and anyone you share a workspace with.
create policy "members read profiles"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
        from public.workspace_members mine
        join public.workspace_members theirs
          on theirs.workspace_id = mine.workspace_id
       where mine.user_id = (select auth.uid())
         and theirs.user_id = public.profiles.id
    )
  );

create policy "users update their own profile"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

/* -------------------------------------------------------------------------- */
/*  Workspaces                                                                 */
/* -------------------------------------------------------------------------- */

create policy "members read their workspaces"
  on public.workspaces for select
  to authenticated
  using (public.is_workspace_member(id));

-- Anyone signed in may create a workspace; the trigger makes them its owner.
create policy "authenticated users create workspaces"
  on public.workspaces for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "admins update their workspace"
  on public.workspaces for update
  to authenticated
  using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

create policy "owners delete their workspace"
  on public.workspaces for delete
  to authenticated
  using (public.is_workspace_owner(id));

/* -------------------------------------------------------------------------- */
/*  Membership                                                                 */
/* -------------------------------------------------------------------------- */

create policy "members read the roster"
  on public.workspace_members for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

-- Direct inserts are for admins. The ordinary path is accepting an invitation,
-- which runs server-side with the service role after the token is verified.
create policy "admins add members"
  on public.workspace_members for insert
  to authenticated
  with check (public.is_workspace_admin(workspace_id));

create policy "admins change roles"
  on public.workspace_members for update
  to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

-- Admins remove people; anyone may remove themselves (leaving the workspace).
-- The last-owner trigger still refuses to strand a workspace.
create policy "admins remove members, members may leave"
  on public.workspace_members for delete
  to authenticated
  using (
    public.is_workspace_admin(workspace_id)
    or user_id = (select auth.uid())
  );

/* -------------------------------------------------------------------------- */
/*  Invitations                                                                */
/* -------------------------------------------------------------------------- */

-- Invitees never read this table directly: they arrive with a raw token which
-- is verified server-side under the service role.
create policy "admins manage invitations"
  on public.workspace_invitations for all
  to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

/* -------------------------------------------------------------------------- */
/*  Projects                                                                   */
/* -------------------------------------------------------------------------- */

create policy "members read projects"
  on public.projects for select
  to authenticated
  using (public.is_workspace_member(workspace_id));

create policy "admins create projects"
  on public.projects for insert
  to authenticated
  with check (public.is_workspace_admin(workspace_id));

create policy "admins update projects"
  on public.projects for update
  to authenticated
  using (public.is_workspace_admin(workspace_id))
  with check (public.is_workspace_admin(workspace_id));

create policy "admins delete projects"
  on public.projects for delete
  to authenticated
  using (public.is_workspace_admin(workspace_id));

/* -------------------------------------------------------------------------- */
/*  Grants                                                                     */
/* -------------------------------------------------------------------------- */

-- RLS filters rows; grants decide whether a role may reach the table at all.
-- Both layers are needed — a policy on a table `authenticated` has no privilege
-- on is unreachable, and a grant with no policy exposes everything.
--
-- Some Supabase instances blanket-grant every privilege on new public tables to
-- anon and authenticated. Revoking first makes this authoritative regardless.
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant usage on schema public to anon, authenticated, service_role;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;
grant select, insert, update, delete on public.workspace_members to authenticated;
grant select, insert, update, delete on public.workspace_invitations to authenticated;
grant select, insert, update, delete on public.projects to authenticated;

-- The server uses this for the two paths RLS cannot express: verifying an
-- invitation token for someone who is not yet a member, and anything done
-- before a session exists.
grant all on all tables in schema public to service_role;
grant all on all routines in schema public to service_role;
grant all on all sequences in schema public to service_role;
