/**
 * Keeping personal data out of the error tracker.
 *
 * Sentry is a processor outside our DSR export and erasure paths: an address
 * that reaches it is not in the export a customer is entitled to, and is not
 * deleted when they ask to be forgotten. Both server and edge configs already
 * declare `sendDefaultPii: false` — this is the other half of that stance, for
 * the fields WE pass deliberately.
 *
 * Tags are the sharpest edge, because Sentry indexes them for search: a raw
 * address in a tag is a searchable directory of our customers, retained for
 * Sentry's retention window and available to anyone with dashboard access.
 *
 * The operationally useful signal survives redaction. When email delivery
 * fails, what an on-call engineer needs is "is one domain bouncing?" and "is it
 * the same recipient every time?" — the domain answers the first, and a stable
 * hash answers the second, without either being personal data we have handed
 * to a third party.
 */

import { createHash } from "node:crypto"

/** Anything shaped like an address, anywhere in a string. */
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

/**
 * A stable, non-reversible handle for a recipient.
 *
 * Truncated to 12 hex characters: enough to correlate repeated failures for the
 * same address, far too short to brute-force back to one.
 */
export function emailFingerprint(email: string): string {
    return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 12)
}

/**
 * The part of an address that is a service, not a person.
 *
 * A whole domain failing is a real operational signal — an expired MX record, a
 * corporate mail server rejecting us, a typo'd domain in a bulk import — and
 * `gmail.com` identifies nobody.
 */
export function emailDomain(email: string): string {
    const at = email.lastIndexOf("@")
    return at > -1 ? email.slice(at + 1).toLowerCase() : "unknown"
}

/**
 * Replace every address in a string with its fingerprint.
 *
 * Upstream error messages are the leak nobody remembers: Brevo answers a bad
 * recipient with the address quoted back, so forwarding the provider's own
 * message verbatim ships the address even when every field we chose is clean.
 */
export function redactEmails(text: string): string {
    return text.replace(EMAIL_PATTERN, (match) => `<email:${emailFingerprint(match)}>`)
}
