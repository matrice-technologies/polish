import { z } from "zod"

/**
 * Domain constants and the shapes that guard every write.
 *
 * Validation lives here rather than beside each action so the same rule is
 * enforced wherever a thing is created — a name that is too short is rejected
 * identically by the onboarding form and by settings.
 */

/* --------------------------------------------------------------- roles ---- */

export const WORKSPACE_ROLES = ["owner", "admin", "member"] as const
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
}

/* ---------------------------------------------------------- workspaces ---- */

const nameSchema = (thing: string) =>
  z
    .string()
    .trim()
    .min(2, `${thing} name must be at least 2 characters`)
    .max(60, `${thing} name must be 60 characters or fewer`)

export const createWorkspaceSchema = z.object({
  name: nameSchema("Workspace"),
})

export const inviteMemberSchema = z.object({
  email: z.email("Enter a valid email address").max(320),
  // Owners are promoted deliberately, never invited straight into the seat.
  role: z.enum(["admin", "member"]),
})

export const updateMemberRoleSchema = z.object({
  role: z.enum(WORKSPACE_ROLES),
})

/* ------------------------------------------------------------ projects ---- */

export const createProjectSchema = z.object({
  name: nameSchema("Project"),
})

export const updateProjectSchema = createProjectSchema

/* ------------------------------------------------------------- uploads ---- */

/** Shared by the workspace, project and avatar upload actions. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
}
