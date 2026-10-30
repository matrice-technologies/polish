/**
 * Limits on what the avatar upload accepts. Prompt and settings shapes live in
 * @polish/shared, where the desktop app validates against the same rules.
 */

/** 10 MiB, mirroring the avatars bucket's file_size_limit and next.config.ts. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
}
