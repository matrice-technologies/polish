-- Image storage: account avatars, and logos for workspaces and projects.
--
-- Both buckets are public. These are faces and marks shown to everyone who can
-- already see the thing they belong to, and minting a signed URL per render
-- would be a round trip for something that is not a secret.
--
-- Write access is keyed on the first path segment of the object name — the
-- owner's user id, or the workspace id — so the folder name is load-bearing,
-- not decoration. `lib/storage.ts` is the only thing that writes these keys.

/* -------------------------------------------------------------------------- */
/*  Buckets                                                                    */
/* -------------------------------------------------------------------------- */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  10485760, -- 10 MiB, mirroring MAX_IMAGE_BYTES in lib/schema.ts
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'workspace-logos',
  'workspace-logos',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

/* -------------------------------------------------------------------------- */
/*  Avatars — keyed {user_id}/…                                                */
/* -------------------------------------------------------------------------- */

-- Reads need no policy: a public bucket is served without consulting RLS.
create policy "users upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users replace own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "users delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

/* -------------------------------------------------------------------------- */
/*  Logos — keyed {workspace_id}/… for a workspace,                            */
/*          {workspace_id}/{project_id}/… for a project                        */
/* -------------------------------------------------------------------------- */

-- Both shapes start with the workspace id, so one helper and one set of
-- policies cover workspace logos and project logos alike.
create or replace function public.logo_object_workspace(object_name text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select w.id
    from public.workspaces w
   where object_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
     and w.id = split_part(object_name, '/', 1)::uuid;
$$;

-- Only admins may change a workspace's face, matching who may rename it.
create policy "admins upload logo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'workspace-logos'
    and public.is_workspace_admin(public.logo_object_workspace(name))
  );

create policy "admins replace logo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'workspace-logos'
    and public.is_workspace_admin(public.logo_object_workspace(name))
  )
  with check (
    bucket_id = 'workspace-logos'
    and public.is_workspace_admin(public.logo_object_workspace(name))
  );

create policy "admins delete logo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'workspace-logos'
    and public.is_workspace_admin(public.logo_object_workspace(name))
  );
