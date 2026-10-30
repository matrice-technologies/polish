"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronsUpDown, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProjectIcon } from "@/components/project-icon"
import { useCurrentProjectSlug } from "@/hooks/use-current-project"
import type { ProjectListItem } from "@/lib/queries"

/**
 * First element in the header. Searchable because a workspace can accumulate
 * many projects, unlike workspaces which stay few.
 */
export function ProjectSwitcher({
  workspaceSlug,
  projects,
}: {
  workspaceSlug: string
  projects: ProjectListItem[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const currentSlug = useCurrentProjectSlug(workspaceSlug, projects)

  const current = projects.find((p) => p.slug === currentSlug)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          /* lg for its padding and icon scale, then h-9 on top: the tallest
             built-in size is h-8, which still left the control looking thin in
             a 56px header. At 36px it sits with an even 10px above and below,
             centred by the header rather than by margins of its own. */
          <Button
            variant="ghost"
            size="lg"
            aria-label="Switch project"
            className="h-9 max-w-[16rem] gap-2 px-2.5"
          />
        }
      >
        {/* size-5 is the most the h-9 button can hold without growing. */}
        <ProjectIcon name={current?.name ?? "All projects"} logoUrl={current?.logoUrl} className="size-5" />
        <span className="truncate">{current ? current.name : "All projects"}</span>
        <ChevronsUpDown className="text-muted-foreground size-3.5 shrink-0" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Find Project..." />
          <CommandList>
            <CommandEmpty>No project found.</CommandEmpty>
            <CommandGroup>
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`${project.name} ${project.slug}`}
                  onSelect={() => {
                    setOpen(false)
                    router.push(`/${workspaceSlug}/${project.slug}`)
                  }}
                  className="gap-2"
                  /* CommandItem already renders a trailing tick pinned right
                     and reveals it on data-checked. Adding a second one put the
                     visible tick to the left of that reserved slot. */
                  data-checked={project.slug === currentSlug ? "true" : undefined}
                >
                  {/* size-6 box matching a workspace row and the dashed "New
                      project" button, so every label starts at the same x. */}
                  <div className="flex size-6 items-center justify-center">
                    <ProjectIcon name={project.name} logoUrl={project.logoUrl} className="size-5" />
                  </div>
                  <span className="flex-1 truncate">{project.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="new project"
                onSelect={() => {
                  setOpen(false)
                  router.push(`/${workspaceSlug}/projects/new`)
                }}
                className="gap-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border border-dashed">
                  <Plus className="size-3.5" />
                </div>
                <span className="text-muted-foreground">New project</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** Shown when a workspace has no projects at all. */
export function EmptyProjectSwitcher({ workspaceSlug }: { workspaceSlug: string }) {
  return (
    /* Same box as the populated switcher, so the header keeps its height
       whether or not the workspace has any projects yet. */
    <Button
      variant="ghost"
      size="lg"
      className="h-9 gap-2 px-2.5"
      render={<Link href={`/${workspaceSlug}/projects/new`} />}
    >
      <Plus className="size-4" />
      New project
    </Button>
  )
}
