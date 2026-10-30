import "server-only"

import { IMAGE_EXTENSIONS, MAX_IMAGE_BYTES } from "@/lib/schema"
import { createClient } from "@/lib/supabase/server"

/**
 * Image uploads, shared by every avatar and logo in the app.
 *
 * The three call sites differ only in which bucket and which folder, so the
 * validation, the rollback and the delete live here once. Both buckets are
 * public: these are faces and marks shown to everyone who can see the thing
 * they belong to, and a signed URL per render would be a round trip for
 * something that is not a secret.
 *
 * Write access is enforced by storage policies keyed on the first path
 * segment — the owner's user id, or the workspace id — so the folder name is
 * load-bearing, not decoration.
 */

export const AVATAR_BUCKET = "avatars"
export const LOGO_BUCKET = "workspace-logos"

export type UploadResult = { url: string; key: string } | { error: string }

export async function uploadImage(
  file: FormDataEntryValue | null,
  folder: string,
  bucket: string = LOGO_BUCKET,
): Promise<UploadResult> {
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload." }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: `That image is over ${Math.round(MAX_IMAGE_BYTES / 1024 / 1024)} MB.` }
  }

  const extension = IMAGE_EXTENSIONS[file.type]
  if (!extension) return { error: "PNG, JPEG, WebP or GIF only." }

  const supabase = await createClient()

  // A fresh key every time rather than overwriting one: the URL is what the
  // browser caches, so reusing the key would leave the old image on screen.
  const key = `${folder}/${crypto.randomUUID()}.${extension}`
  const { error } = await supabase.storage
    .from(bucket)
    .upload(key, file, { contentType: file.type })

  if (error) return { error: error.message }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(key)

  return { url: publicUrl, key }
}

/**
 * Deletes the object a public URL points at.
 *
 * Silently ignores anything that is not one of our own storage URLs — an
 * avatar that came from Google's CDN on OAuth sign-in is not ours to remove,
 * and neither is whatever a crafted value might name.
 */
export async function removeImage(url: string | null): Promise<void> {
  if (!url) return

  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/)
  if (!match) return

  const [, bucket, key] = match
  if (bucket !== AVATAR_BUCKET && bucket !== LOGO_BUCKET) return

  const supabase = await createClient()
  await supabase.storage.from(bucket).remove([decodeURIComponent(key.split("?")[0])])
}
