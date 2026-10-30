/**
 * Slug helpers. Slugs are generated in the app rather than in SQL so that the
 * uniqueness retry loop can talk to the same constraint the database enforces.
 */

export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    // Strip diacritics so "Café" becomes "cafe" rather than "caf".
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)

  // The database requires a leading alphanumeric and at least two characters.
  return base.length >= 2 ? base : `ws-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Appends a short random suffix. Used to retry after a unique-violation rather
 * than pre-checking, which would still race.
 */
export function withSuffix(slug: string): string {
  return `${slug.slice(0, 48)}-${Math.random().toString(36).slice(2, 6)}`
}

/** Postgres unique-violation. */
export const UNIQUE_VIOLATION = "23505"
