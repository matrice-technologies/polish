-- Accounts only: no workspaces, members, invitations, projects or profiles.
--
-- The first migrations once came from a team-dashboard boilerplate and created
-- all of those. Polish never needed them: prompts and settings belong to a
-- person, and a name and picture live on the auth user itself. This removes them
-- from databases set up back then. On a database created since, every
-- statement finds nothing to drop.

-- Logo storage. Policies first: they call the workspace helpers dropped below.
drop policy if exists "admins upload logo" on storage.objects;
drop policy if exists "admins replace logo" on storage.objects;
drop policy if exists "admins delete logo" on storage.objects;
drop function if exists public.logo_object_workspace(text);

-- Storage may refuse direct deletes from its tables; the bucket is then left
-- behind, empty and unwritable, which is harmless.
do $$
begin
  delete from storage.buckets
   where id = 'workspace-logos'
     and not exists (select 1 from storage.objects where bucket_id = 'workspace-logos');
exception when others then
  raise notice 'workspace-logos bucket left in place: %', sqlerrm;
end
$$;

-- Profiles mirrored names so members could see each other; nothing reads them
-- now. First, because a profiles policy reads workspace_members.
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop table if exists public.profiles;

-- Returns a workspaces row, so it must go before that table.
drop function if exists public.create_workspace(text, text);

-- Tables, children first. Dropping them takes their policies and triggers
-- along, which frees the trigger functions below.
drop table if exists public.workspace_invitations;
drop table if exists public.projects;
drop table if exists public.workspace_members;
drop table if exists public.workspaces;

drop function if exists public.is_workspace_member(uuid);
drop function if exists public.is_workspace_admin(uuid);
drop function if exists public.is_workspace_owner(uuid);
drop function if exists public.project_workspace(uuid);
drop function if exists public.add_workspace_creator_as_owner();
drop function if exists public.prevent_last_owner_removal();
drop type if exists public.workspace_role;
drop function if exists public.set_updated_at();
