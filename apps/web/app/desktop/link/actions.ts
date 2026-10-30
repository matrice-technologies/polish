"use server"

import { requireUser } from "@/lib/auth"
import { createServiceClient } from "@/lib/supabase/server"
import { normalizeUserCode } from "@/lib/tokens"

export interface ApproveState {
  status: "idle" | "approved" | "error"
  message?: string
  deviceName?: string | null
}

/**
 * Ties a pending desktop link to the signed-in person. The app polling with
 * the matching device code then receives a session for this account.
 *
 * Service role, because device_links is unreachable to users by design; the
 * authorization is `requireUser` plus the code being live and unclaimed.
 */
export async function approveDeviceLink(_prev: ApproveState, formData: FormData): Promise<ApproveState> {
  const user = await requireUser()
  const code = normalizeUserCode(String(formData.get("code") ?? ""))
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(code)) {
    return { status: "error", message: "Codes look like KXRT-9MPD. Check the one in the app." }
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("device_links")
    .update({ user_id: user.id, approved_at: new Date().toISOString() })
    .eq("user_code", code)
    .is("approved_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("device_name")

  if (error) return { status: "error", message: "Something went wrong. Try again." }
  if (!data.length) {
    return {
      status: "error",
      message: "That code has expired or was already used. Start signing in again from the app.",
    }
  }

  return { status: "approved", deviceName: data[0].device_name }
}
