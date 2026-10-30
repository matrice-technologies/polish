-- Profile pictures.
--
-- The bucket is public: a face shown next to your own name is not a secret, and
-- minting a signed URL per render would be a round trip for nothing.
--
-- Write access is keyed on the first path segment of the object name, the
-- owner's user id, so the folder name is load-bearing, not decoration.
-- `lib/storage.ts` is the only thing that writes these keys.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  10485760, -- 10 MiB, mirroring MAX_IMAGE_BYTES in lib/schema.ts
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

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
