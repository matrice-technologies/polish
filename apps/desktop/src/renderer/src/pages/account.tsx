import { useState } from "react"
import { CloudOff, ExternalLink, Loader2, LogOut, RefreshCw } from "lucide-react"

import type { AppState } from "../../../common/types"
import { polish } from "../api"
import { Button, Input, PageHeader, Row } from "../components/ui"

export function AccountPage({ state }: { state: AppState }) {
  const { account } = state

  return (
    <div className="h-full overflow-y-auto">
      <PageHeader
        title="Account"
        description="Optional. Polish works fully without one; an account keeps your prompts and shortcuts in sync."
      />
      <div className="mx-auto max-w-2xl space-y-6 px-8 py-6">
        {account.state === "signed-out" ? (
          <div className="bg-card space-y-4 rounded-lg border p-5">
            <div className="flex items-start gap-3">
              <CloudOff className="text-muted-foreground mt-0.5 size-4" />
              <div>
                <p className="text-[13px] font-medium">Not signed in</p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Your prompts live on this computer only. Sign in to back them up and use them on every machine — your
                  existing prompts are kept and merged.
                </p>
              </div>
            </div>
            {account.error ? <p className="text-destructive text-xs">{account.error}</p> : null}
            <Button onClick={() => void polish.startLink()}>Sign in with the browser</Button>
          </div>
        ) : null}

        {account.state === "linking" ? (
          <div className="bg-card space-y-4 rounded-lg border p-5 text-center">
            <p className="text-muted-foreground text-xs">Approve this code in the browser window that just opened:</p>
            <p className="font-mono text-2xl font-semibold tracking-[0.2em] select-text">{account.userCode}</p>
            <p className="text-muted-foreground flex items-center justify-center gap-1.5 text-xs">
              <Loader2 className="size-3 animate-spin" /> Waiting for approval…
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => polish.openExternal(account.verificationUrl)}>
                <ExternalLink />
                Open the page again
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void polish.cancelLink()}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {account.state === "signed-in" ? (
          <div className="bg-card divide-y rounded-lg border px-5">
            <Row label="Signed in" description={account.email}>
              <Button variant="outline" size="sm" onClick={() => void polish.signOut()}>
                <LogOut />
                Sign out
              </Button>
            </Row>
            <Row
              label="Sync"
              description={
                account.error ? (
                  <span className="text-destructive">{account.error}</span>
                ) : account.lastSyncAt ? (
                  `Last synced ${new Date(account.lastSyncAt).toLocaleTimeString()}`
                ) : (
                  "Not synced yet"
                )
              }
            >
              <Button variant="outline" size="sm" disabled={account.syncing} onClick={() => void polish.syncNow()}>
                <RefreshCw className={account.syncing ? "animate-spin" : undefined} />
                Sync now
              </Button>
            </Row>
            <Row label="Manage on the web" description="Edit prompts and settings from any browser.">
              <Button variant="ghost" size="sm" onClick={() => polish.openExternal(state.device.webUrl)}>
                <ExternalLink />
                Open
              </Button>
            </Row>
          </div>
        ) : null}

        <ServerField webUrl={state.device.webUrl} disabled={account.state !== "signed-out"} />
      </div>
    </div>
  )
}

/** Which Polish server to sign in through — for self-hosting and development. */
function ServerField({ webUrl, disabled }: { webUrl: string; disabled: boolean }) {
  const [value, setValue] = useState(webUrl)
  const valid = /^https?:\/\/[^\s]+$/.test(value.trim())

  return (
    <details className="text-xs">
      <summary className="text-muted-foreground cursor-pointer">Server</summary>
      <div className="mt-3 flex gap-2">
        <Input value={value} disabled={disabled} onChange={(e) => setValue(e.target.value)} />
        <Button
          variant="outline"
          disabled={disabled || !valid || value.trim() === webUrl}
          onClick={() => void polish.updateDevice({ webUrl: value.trim().replace(/\/$/, "") })}
        >
          Save
        </Button>
      </div>
      {disabled ? <p className="text-muted-foreground mt-2">Sign out to change the server.</p> : null}
    </details>
  )
}
