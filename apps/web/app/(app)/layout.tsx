import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { requireUser } from "@/lib/auth"
import { latestRelease } from "@/lib/releases"

/** The signed-in shell: the sidebar on the left, the page beside it. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, release] = await Promise.all([requireUser(), latestRelease()])

  return (
    <SidebarProvider>
      <AppSidebar
        release={release}
        user={{
          email: user.email ?? "",
          fullName: (user.user_metadata?.full_name as string | undefined) ?? null,
          avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? null,
        }}
      />

      <SidebarInset>
        {/* The trigger is how a phone opens the sidebar; on desktop the rail and ⌘B do too. */}
        <header className="bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-2 backdrop-blur">
          <SidebarTrigger />
        </header>

        <div className="flex-1">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
