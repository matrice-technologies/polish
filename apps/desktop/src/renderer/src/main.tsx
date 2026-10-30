import "./styles.css"

import { StrictMode, useState } from "react"
import { createRoot } from "react-dom/client"
import { Cloud, Settings, Sparkles, UserCircle } from "lucide-react"

import { useAppState } from "./api"
import { cn } from "./components/ui"
import { AccountPage } from "./pages/account"
import { PromptsPage } from "./pages/prompts"
import { SettingsPage } from "./pages/settings"

type Tab = "prompts" | "settings" | "account"

function App() {
  const state = useAppState()
  const [tab, setTab] = useState<Tab>("prompts")
  if (!state) return null

  const needsSetup = !state.ai.ready || state.accessibility === "missing"
  const items: { id: Tab; label: string; icon: typeof Sparkles; badge?: boolean }[] = [
    { id: "prompts", label: "Prompts", icon: Sparkles },
    { id: "settings", label: "Settings", icon: Settings, badge: needsSetup },
    { id: "account", label: "Account", icon: UserCircle },
  ]

  return (
    <div className="flex h-full">
      <nav className="bg-card flex w-48 shrink-0 flex-col border-r p-2">
        <div className="flex items-center gap-2 px-2.5 pt-2 pb-4">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <Sparkles className="size-3.5" />
          </div>
          <span className="text-sm font-semibold">Polish</span>
        </div>
        {items.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px]",
              tab === id ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
            {badge ? <span className="bg-destructive ml-auto size-1.5 rounded-full" /> : null}
          </button>
        ))}
        <div className="text-muted-foreground mt-auto flex items-center gap-1.5 px-2.5 py-2 text-xs">
          {state.account.state === "signed-in" ? (
            <>
              <Cloud className="size-3" />
              <span className="truncate">{state.account.email}</span>
            </>
          ) : (
            "Offline mode"
          )}
        </div>
      </nav>
      <main className="min-w-0 flex-1">
        {tab === "prompts" ? <PromptsPage state={state} /> : null}
        {tab === "settings" ? <SettingsPage state={state} /> : null}
        {tab === "account" ? <AccountPage state={state} /> : null}
      </main>
    </div>
  )
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
