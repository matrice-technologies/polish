import type { Metadata } from "next"
import { LogOut, UserCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { requireMembership, requireUser } from "@/lib/auth"
import { signOut } from "@/app/(auth)/login/actions"

import {
  SettingsBody,
  SettingsGroup,
  SettingsHeader,
  SettingsNote,
  SettingsTitle,
} from "../settings-header"
import { AvatarForm } from "./avatar-form"
import { NameForm } from "./name-form"

export const metadata: Metadata = { title: "Profile" }

function initials(name: string, email: string) {
  const source = name.trim() || email
  const parts = source.split(/[\s@.]+/).filter(Boolean)
  return (parts[0]?.[0] ?? "?").concat(parts[1]?.[0] ?? "").toUpperCase()
}

/**
 * The signed-in person's own settings, as opposed to the workspace's. Nothing
 * here reads the slug beyond confirming the visitor belongs to it.
 */
export default async function AccountPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace: slug } = await params

  const user = await requireUser()
  await requireMembership(slug)

  const fullName = (user.user_metadata?.full_name as string | undefined) ?? ""
  const avatarUrl = (user.user_metadata?.avatar_url as string | undefined) ?? null

  return (
    <>
      <SettingsHeader icon={<UserCircle className="size-4" />} title="Profile" />
      <SettingsBody>
        <SettingsTitle title="Profile" description="Manage your personal details." />

        <SettingsNote>Changes to your profile apply to all of your workspaces.</SettingsNote>

        <SettingsGroup>
          <div className="space-y-6">
            <AvatarForm avatarUrl={avatarUrl} initials={initials(fullName, user.email ?? "")} />
            <NameForm defaultName={fullName} />

            <div className="space-y-2">
              <Label htmlFor="account-email">Primary email address</Label>
              <p
                id="account-email"
                className="border-input bg-input/20 dark:bg-input/30 flex h-7 items-center rounded-md border px-2 font-mono text-xs"
              >
                {user.email}
              </p>
              <p className="text-muted-foreground text-xs">
                What you sign in with. Changing it is not supported yet — magic links and Google
                both key off this address.
              </p>
            </div>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Session" description="Signs this browser out. Others stay signed in.">
          <form action={signOut}>
            <Button type="submit" variant="outline" size="lg">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </SettingsGroup>
      </SettingsBody>
    </>
  )
}
