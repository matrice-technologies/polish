import "server-only"

import { APP_NAME } from "@/lib/app"

/**
 * Transactional email through Brevo's HTTP API.
 *
 * Auth emails (magic links) are sent by GoTrue over SMTP and never touch this;
 * this is only for mail the app itself originates, currently invitations.
 */

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email"

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  text: string
}

export interface SendEmailResult {
  sent: boolean
  /** Present when sending failed; the caller decides whether that is fatal. */
  error?: string
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  const senderName = process.env.BREVO_SENDER_NAME ?? APP_NAME

  if (!apiKey || !senderEmail) {
    // Not configured: log the intent rather than throwing, so an invitation
    // still gets created and its link can be copied from the dashboard.
    console.warn(`[email] BREVO_API_KEY or BREVO_SENDER_EMAIL missing — not sending "${subject}".`)
    return { sent: false, error: "Email is not configured" }
  }

  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: to }],
        subject,
        htmlContent: html,
        textContent: text,
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error(`[email] Brevo rejected "${subject}" (${response.status}): ${detail}`)
      return { sent: false, error: `Brevo returned ${response.status}` }
    }

    return { sent: true }
  } catch (error) {
    console.error("[email] Brevo request failed:", error)
    return { sent: false, error: "Could not reach Brevo" }
  }
}

export function invitationEmail({
  workspaceName,
  inviterName,
  acceptUrl,
}: {
  workspaceName: string
  inviterName: string
  acceptUrl: string
}): { subject: string; html: string; text: string } {
  const subject = `${inviterName} invited you to ${workspaceName} on ${APP_NAME}`

  const html = `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px">
      <h2 style="font-size:18px;margin:0 0 12px">Join ${escapeHtml(workspaceName)} on ${escapeHtml(APP_NAME)}</h2>
      <p style="color:#374151;font-size:14px;line-height:1.6;margin:0 0 20px">
        ${escapeHtml(inviterName)} invited you to collect and triage product feedback together.
      </p>
      <p style="margin:0 0 20px">
        <a href="${acceptUrl}"
           style="display:inline-block;padding:10px 18px;background:#111827;color:#fff;
                  border-radius:6px;text-decoration:none;font-size:14px">
          Accept invitation
        </a>
      </p>
      <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:0">
        This invitation expires in 7 days. If you were not expecting it, ignore this email.
      </p>
    </div>
  `.trim()

  const text = [
    `${inviterName} invited you to join ${workspaceName} on ${APP_NAME}.`,
    "",
    `Accept: ${acceptUrl}`,
    "",
    "This invitation expires in 7 days.",
  ].join("\n")

  return { subject, html, text }
}

/** Values are interpolated into HTML, so escape what came from a user. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
