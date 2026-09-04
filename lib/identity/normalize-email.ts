/**
 * The ONE way an email address becomes an identity key.
 *
 * `User.email` is unique and every relationship an agent builds hangs off it.
 * Auth (`app/auth/actions.ts`, `app/auth/callback/route.ts`) has always
 * lowercased before it looked a row up; the agent paths never did. So an
 * agent typing `John@X.gr` created a phantom row under that spelling, the
 * customer later signed up as `john@x.gr`, auth found no row, created a second
 * one — and the relationship the agent built never activated, because it
 * pointed at the phantom. Two users, one person, forever.
 *
 * Every writer and every lookup keyed on an email goes through this function;
 * `tests/unit/email-normalization-single-path.test.ts` enumerates the sites
 * from the filesystem and fails on one that does not.
 *
 * Normalisation is deliberately conservative: trim, lowercase, Unicode NFC.
 * No dot-stripping or plus-tag removal — those are provider-specific and
 * would merge addresses their owners consider distinct.
 */
export function normalizeEmail(raw: string | null | undefined): string {
    if (typeof raw !== "string") return ""
    return raw.trim().normalize("NFC").toLowerCase()
}
