import "./styles.css"

import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import { CircleUser, Cloud, CloudOff, Settings, Sparkles } from "lucide-react"
import { providerInfo } from "../../common/providers"
import type { AppState } from "../../common/types"

import { Logo } from "@/components/logo"
import { TitleBarSlot } from "@/components/page-header"
import { UpdateBanner } from "@/components/update-banner"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useDarkClass } from "@/hooks/use-system-theme"
import { polish, useAppState } from "@/lib/polish"
import { cn } from "@/lib/utils"
import { AccountPage } from "@/pages/account"
import { PromptsPage } from "@/pages/prompts"
import { SettingsPage } from "@/pages/settings"

export type Page = "prompts" | "settings" | "account"

const isMac = polish.env.platform === "mac"

/**
 * The window has no OS title bar. The top 48px are a drag strip: the sidebar
 * header on the left, the current page's title and actions beside it, and the
 * native window controls drawn over the right end (Windows, Linux) — macOS
 * puts its traffic lights in the sidebar header instead.
 */
function App() {
  useDarkClass()
  const state = useAppState()
  const [page, setPage] = useState<Page>("prompts")
  const [titleBar, setTitleBar] = useState<HTMLElement | null>(null)
  if (!state) return null

  return (
    <TooltipProvider>
      <SidebarProvider className="h-svh min-h-0">
        <AppSidebar state={state} page={page} onNavigate={setPage} />
        <TitleBarSlot.Provider value={titleBar}>
          <SidebarInset className="min-h-0 overflow-hidden shadow-sm ring-1 ring-border md:peer-data-[variant=inset]:mt-12 dark:ring-white/15">
            {page === "prompts" ? <PromptsPage state={state} /> : null}
            {page === "settings" ? <SettingsPage state={state} /> : null}
            {page === "account" ? <AccountPage state={state} /> : null}
          </SidebarInset>
        </TitleBarSlot.Provider>
        <div
          ref={setTitleBar}
          className={cn(
            "drag fixed top-0 right-0 left-(--sidebar-width) flex h-12 items-center px-3",
            // Room for the caption buttons the OS draws over this corner.
            !isMac && "pr-38",
          )}
        />
      </SidebarProvider>
      <Toaster position="bottom-right" />
    </TooltipProvider>
  )
}

function AppSidebar({
  state,
  page,
  onNavigate,
}: {
  state: AppState
  page: Page
  onNavigate: (page: Page) => void
}) {
  const needsSetup = !state.ai.ready || state.accessibility === "missing"
  const items: { id: Page; label: string; icon: typeof Sparkles; badge?: React.ReactNode }[] = [
    { id: "prompts", label: "Prompts", icon: Sparkles, badge: state.prompts.length },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      badge: needsSetup ? <span className="size-1.5 rounded-full bg-destructive" aria-label="Needs setup" /> : null,
    },
    { id: "account", label: "Account", icon: CircleUser },
  ]

  return (
    // Inset: the sidebar sits on the window backdrop and the page is a raised
    // panel beside it. No padding, so its header lines up with the drag strip.
    <Sidebar variant="inset" className="p-0">
      <SidebarHeader className={cn("drag h-12 flex-row items-center gap-2 px-4", isMac && "pl-20")}>
        <Logo className="size-5" />
        <span className="font-heading text-sm font-semibold tracking-tight">Polish</span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {items.map(({ id, label, icon: Icon, badge }) => (
              <SidebarMenuItem key={id}>
                <SidebarMenuButton isActive={page === id} onClick={() => onNavigate(id)}>
                  <Icon />
                  <span>{label}</span>
                </SidebarMenuButton>
                {badge ? <SidebarMenuBadge>{badge}</SidebarMenuBadge> : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-1 pb-3">
        <UpdateBanner update={state.update} />
        <SidebarGroupLabel>Status</SidebarGroupLabel>
        <StatusRow
          tone={state.ai.ready ? "ok" : "warn"}
          label={providerInfo(state.ai.settings.provider).label}
          detail={state.ai.ready ? "Ready" : "Needs setup"}
          onClick={() => onNavigate("settings")}
        />
        <label className="flex h-8 cursor-pointer items-center justify-between gap-2 rounded-md px-2 text-xs/relaxed text-sidebar-foreground hover:bg-sidebar-accent">
          <span>{state.shortcutsPaused ? "Shortcuts paused" : "Shortcuts on"}</span>
          <Switch size="sm" checked={!state.shortcutsPaused} onCheckedChange={(on) => polish.setPaused(!on)} />
        </label>
        <button
          type="button"
          onClick={() => onNavigate("account")}
          className="flex h-8 items-center gap-2 rounded-md px-2 text-left text-xs/relaxed text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {state.account.state === "signed-in" ? (
            <>
              <Cloud className="size-3.5 shrink-0 text-primary" />
              <span className="truncate">{state.account.email}</span>
            </>
          ) : (
            <>
              <CloudOff className="size-3.5 shrink-0 text-muted-foreground" />
              <span>Offline · not syncing</span>
            </>
          )}
        </button>
      </SidebarFooter>
    </Sidebar>
  )
}

function StatusRow({
  tone,
  label,
  detail,
  onClick,
}: {
  tone: "ok" | "warn"
  label: string
  detail: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 items-center gap-2 rounded-md px-2 text-left text-xs/relaxed text-sidebar-foreground hover:bg-sidebar-accent"
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", tone === "ok" ? "bg-emerald-500" : "bg-amber-500")} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-muted-foreground">{detail}</span>
    </button>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
