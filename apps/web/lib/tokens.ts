import { createHash, randomBytes, randomInt } from "node:crypto"

/**
 * Secret material for invitations and desktop device links.
 *
 * Only the hash is ever persisted. The raw value travels once, inside the
 * emailed link, and cannot be recovered afterwards — so a database leak yields
 * nothing usable.
 */

/** URL-safe random string. 32 bytes of entropy, base64url, no padding. */
function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url")
}

/** Invitation token; travels only inside the emailed link. */
export function generateInviteToken(): { raw: string; hash: string } {
  const raw = randomToken(32)
  return { raw, hash: hashSecret(raw) }
}

/**
 * A desktop device link: the secret device code the app polls with, and the
 * short code the person reads off the app and approves in the browser.
 *
 * The user code is not a secret — it is shown on screen and typed into a page
 * that requires a signed-in session — so it trades entropy for legibility: no
 * vowels (no accidental words), no 0/O or 1/I.
 */
export function generateDeviceCodes(): { deviceCode: string; deviceCodeHash: string; userCode: string } {
  const alphabet = "BCDFGHJKLMNPQRSTVWXZ23456789"
  let userCode = ""
  for (let i = 0; i < 8; i++) userCode += alphabet[randomInt(alphabet.length)]
  const deviceCode = randomToken(32)
  return {
    deviceCode,
    deviceCodeHash: hashSecret(deviceCode),
    userCode: `${userCode.slice(0, 4)}-${userCode.slice(4)}`,
  }
}

/** Accepts the code however it was typed: lower case, spaces, missing dash. */
export function normalizeUserCode(input: string): string {
  const compact = input.toUpperCase().replace(/[^A-Z0-9]/g, "")
  return compact.length === 8 ? `${compact.slice(0, 4)}-${compact.slice(4)}` : compact
}

/**
 * SHA-256, hex. These are high-entropy random strings rather than passwords, so
 * a slow KDF buys nothing: there is no smaller search space to brute force.
 */
export function hashSecret(raw: string): string {
  return createHash("sha256").update(raw).digest("hex")
}
