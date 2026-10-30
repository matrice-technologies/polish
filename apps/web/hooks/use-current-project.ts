"use client"

import { usePathname } from "next/navigation"

import type { ProjectListItem } from "@/lib/queries"

/**
 * Resolves the project from the URL for chrome that lives above the
 * `[project]` segment — a layout only receives its own params, so the shell
 * cannot be told which project is open.
 *
 * Matching against the known project list rather than a reserved-word blocklist
 * means a project can safely be called "settings" or "members" without
 * shadowing a workspace page.
 */
export function useCurrentProjectSlug(
  workspaceSlug: string,
  projects: Pick<ProjectListItem, "slug">[],
): string | undefined {
  const pathname = usePathname()

  const segments = pathname.split("/").filter(Boolean)
  if (segments[0] !== workspaceSlug) return undefined

  const candidate = segments[1]
  return projects.some((p) => p.slug === candidate) ? candidate : undefined
}
