import type { Metadata } from "next"
import { Palette } from "lucide-react"

import {
  SettingsBody,
  SettingsGroup,
  SettingsHeader,
  SettingsTitle,
} from "../settings-header"
import { ThemeChooser } from "./theme-chooser"
import { APP_NAME } from "@/lib/app"

export const metadata: Metadata = { title: "Appearance" }

export default function AppearancePage() {
  return (
    <>
      <SettingsHeader icon={<Palette className="size-4" />} title="Appearance" />
      <SettingsBody>
        <SettingsTitle title="Appearance" description={`Customise the look and feel of ${APP_NAME}.`} />

        <SettingsGroup
          title="Theme"
          description="Kept in this browser rather than on your account, so it can differ between the machines you sign in from."
        >
          <ThemeChooser />
        </SettingsGroup>
      </SettingsBody>
    </>
  )
}
