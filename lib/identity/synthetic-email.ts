/**
 * The synthetic address a customer WITHOUT an email carries.
 *
 * `User.email` is non-null and unique, and every relationship an agent
 * builds hangs off it. Owner decision D3 allows a customer with no email —
 * their ΑΦΜ plus a Greek mobile are the identity — so such a record gets a
 * deterministic, NON-DELIVERABLE address under the reserved `.invalid` TLD
 * (RFC 2606) and `User.contactEmailMissing = true`.
 *
 * Deterministic on purpose: two agents adding the same no-email customer
 * converge on ONE user row (a customer may have several agents at once).
 *
 * Nothing may ever be sent to this domain — `sendEmail` refuses it at the
 * one transport (lib/email/email-service.ts), the invite flow refuses the
 * customer, and `tests/unit/no-email-sender-refusal.test.ts` pins both.
 */
export const SYNTHETIC_NO_EMAIL_DOMAIN = "customers.policywallet.invalid"

const LOCAL_PREFIX = "noemail+"

/** `noemail+<afm>@customers.policywallet.invalid` for a normalised ΑΦΜ. */
export function syntheticNoEmailAddress(afm: string): string {
    const digits = String(afm ?? "").replace(/\D/g, "")
    if (!digits) throw new Error("syntheticNoEmailAddress needs a normalised ΑΦΜ")
    return `${LOCAL_PREFIX}${digits}@${SYNTHETIC_NO_EMAIL_DOMAIN}`
}

/** True for any address on the synthetic domain, whatever its case or spacing. */
export function isSyntheticNoEmailAddress(email: string | null | undefined): boolean {
    if (typeof email !== "string") return false
    const at = email.trim().toLowerCase().lastIndexOf("@")
    if (at < 0) return false
    return email.trim().toLowerCase().slice(at + 1) === SYNTHETIC_NO_EMAIL_DOMAIN
}
