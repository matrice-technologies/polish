import { EntityIcon } from "@/components/entity-icon"

/**
 * A project's mark. The same generated-or-uploaded treatment a workspace gets,
 * named separately so the call sites read as what they are.
 */
export function ProjectIcon({
  name,
  logoUrl,
  className,
}: {
  name: string
  logoUrl?: string | null
  className?: string
}) {
  return <EntityIcon name={name} logoUrl={logoUrl} className={className} />
}
