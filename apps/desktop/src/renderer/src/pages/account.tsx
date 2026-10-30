import { useState } from "react"
import { CircleUser, CloudOff, ExternalLink, Loader2, LogOut, RefreshCw } from "lucide-react"
import type { AppState } from "../../../common/types"

import { PageHeader } from "@/components/page-header"
import { SettingsBody, SettingsGroup, SettingsRow, SettingsTitle } from "@/components/settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { polish } from "@/lib/polish"

export function AccountPage({ state }: { state: AppState }) {
  const { account } = state

  return (
    <div className="h-full overflow-y-auto">
      <PageHeader icon={<CircleUser />} title="Account" />
      <SettingsBody>
        <SettingsTitle
          title="Account"
          description="Optional. Polish works fully without one; an account keeps your prompts and shortcuts in sync."
        />

        {account.state === "signed-out" ? (
          <Card>
            <CardHeader>
              <div className="mb-1 flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <CloudOff className="size-4" />
              </div>
              <CardTitle>You&rsquo;re working offline</CardTitle>
              <CardDescription>
                Your prompts live on this computer only. Sign in to back them up and use them everywhere. What you have
                now is kept and merged.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-3">
              {account.error ? <p className="text-xs text-destructive">{account.error}</p> : null}
              <Button onClick={() => void polish.startLink()}>Sign in with the browser</Button>
            </CardFooter>
          </Card>
        ) : null}

        {account.state === "linking" ? (
          <Card className="text-center">
            <CardHeader>
              <CardTitle>Approve this code in your browser</CardTitle>
              <CardDescription>The page should have opened. Check the code matches, then approve it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p data-selectable className="font-mono text-3xl font-semibold tracking-[0.25em]">
                {account.userCode}
              </p>
              <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin text-primary" /> Waiting for approval…
              </p>
            </CardContent>
            <CardFooter className="justify-center gap-2">
              <Button variant="outline" size="sm" onClick={() => polish.openExternal(account.verificationUrl)}>
                <ExternalLink />
                Open the page again
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void polish.cancelLink()}>
                Cancel
              </Button>
            </CardFooter>
          </Card>
        ) : null}

        {account.state === "signed-in" ? (
          <SettingsGroup>
            <div className="divide-y">
              <SettingsRow label="Signed in" description={account.email}>
                <Button variant="outline" size="sm" onClick={() => void polish.signOut()}>
                  <LogOut />
                  Sign out
                </Button>
              </SettingsRow>
              <SettingsRow
                label="Sync"
                description={
                  account.error ? (
                    <span className="text-destructive">{account.error}</span>
                  ) : account.lastSyncAt ? (
                    `Last synced at ${new Date(account.lastSyncAt).toLocaleTimeString()}`
                  ) : (
                    "Not synced yet"
                  )
                }
              >
                <Button variant="outline" size="sm" disabled={account.syncing} onClick={() => void polish.syncNow()}>
                  <RefreshCw className={account.syncing ? "animate-spin" : undefined} />
                  Sync now
                </Button>
              </SettingsRow>
              <SettingsRow label="Manage on the web" description="Edit prompts and settings from any browser.">
                <Button variant="ghost" size="sm" onClick={() => polish.openExternal(state.webUrl)}>
                  <ExternalLink />
                  Open
                </Button>
              </SettingsRow>
            </div>
          </SettingsGroup>
        ) : null}

        <SettingsGroup title="Server" description="Where your account lives.">
          <ServerSettings state={state} disabled={account.state !== "signed-out"} />
        </SettingsGroup>
      </SettingsBody>
    </div>
  )
}

/**
 * The official server unless you say otherwise: a self-hosted Polish, or one
 * running on this computer for development.
 */
function ServerSettings({ state, disabled }: { state: AppState; disabled: boolean }) {
  const saved = state.device.customServer
  const [own, setOwn] = useState(saved !== null)
  const [value, setValue] = useState(saved ?? "")
  const server = value.trim().replace(/\/+$/, "")
  const valid = /^https?:\/\/\S+$/.test(server)

  function toggle(on: boolean) {
    setOwn(on)
    if (!on && saved !== null) void polish.updateDevice({ customServer: null })
  }

  const description =
    own && saved ? (
      <>
        Signing in through <span className="font-mono">{saved}</span>.
      </>
    ) : own ? (
      "Enter its address below, then save."
    ) : (
      <>
        Signing in through <span className="font-mono">{new URL(state.defaultWebUrl).host}</span>.
      </>
    )

  return (
    <div className="divide-y">
      <SettingsRow label="Use your own server" htmlFor="own-server" description={description}>
        <Switch id="own-server" checked={own} disabled={disabled} onCheckedChange={toggle} />
      </SettingsRow>
      {own ? (
        <div className="space-y-2 py-3">
          <div className="flex gap-2">
            <Input
              value={value}
              disabled={disabled}
              placeholder="http://localhost:3000"
              onChange={(e) => setValue(e.target.value)}
              className="font-mono"
            />
            <Button
              variant="outline"
              disabled={disabled || !valid || server === saved}
              onClick={() => void polish.updateDevice({ customServer: server })}
            >
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">The address of its web app, local ones included.</p>
        </div>
      ) : null}
      {disabled ? <p className="pt-3 text-xs text-muted-foreground">Sign out to change the server.</p> : null}
    </div>
  )
}
