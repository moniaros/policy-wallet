/**
 * The last line of defence before an event leaves for Sentry.
 *
 * The call sites are where PII is supposed to be handled — `lib/observability/pii.ts`
 * gives them a fingerprint and a domain to log instead of an address. This is
 * the net under that, because "remember not to log the customer's email" is a
 * rule that holds until the next person adds a `captureException` in a hurry,
 * and the failure is silent: nothing breaks, an address is simply in a
 * third-party index for ever.
 *
 * Deliberately dependency-free. This runs in the edge runtime as well as Node,
 * where `node:crypto` does not exist, so it redacts to a constant marker rather
 * than a hash. Call sites that want a correlatable fingerprint compute it
 * themselves, where crypto is available and the value is actually useful.
 *
 * Scope is deliberately narrow — messages, tag values, and exception messages.
 * Stack traces and breadcrumbs are left alone: rewriting them would corrupt the
 * one thing an error report exists to preserve, and `sendDefaultPii: false`
 * already keeps headers, cookies and IPs out.
 */

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

/** Greek AFM/VAT: nine digits, optionally EL-prefixed. */
const GREEK_TAX_ID_PATTERN = /\b(?:EL)?\d{9}\b/gi

/** IBAN, Greek and otherwise. */
const IBAN_PATTERN = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g

/**
 * A document file name.
 *
 * The user's own file name is meant to be kept nowhere, and no code path puts
 * one in an event today — but this is the sink where the *next* one would
 * land, and unlike a database row a Sentry event cannot be migrated after the
 * fact. A file name is disclosive on its own: `LIFE_POLICY.pdf` names a life
 * component and `NIKOS_ETHNIKI_2026.pdf` names a person and an insurer.
 *
 * The storage UUID keys (`<uuid>.pdf`) match too. Redacting those costs
 * nothing — the key is in the message for correlation, and the event still
 * carries policyId/documentId, which are what anyone debugging actually uses.
 */
const FILE_NAME_PATTERN = /\b[\p{L}\p{N}_ .()[\]-]{1,120}\.(?:pdf|jpe?g|png|webp|heic|docx?)\b/giu

export function scrubText(value: string): string {
    return value
        .replace(EMAIL_PATTERN, "<redacted:email>")
        .replace(IBAN_PATTERN, "<redacted:iban>")
        .replace(GREEK_TAX_ID_PATTERN, "<redacted:taxid>")
        .replace(FILE_NAME_PATTERN, "<redacted:filename>")
}

/**
 * Scrub an outbound Sentry event in place-ish and return it.
 *
 * Shaped as a `beforeSend` so both runtimes can pass it straight through, and
 * defensive throughout: an exception raised while scrubbing would lose the
 * error we were trying to report, which is worse than the leak we are closing.
 */
export function scrubEvent<T extends Record<string, any>>(event: T): T {
    // The Sentry `Event` type is a large union; this function only ever reaches
    // for four optional fields and tolerates their absence, so a local `any`
    // view is honest rather than a bypass.
    const e = event as Record<string, any>
    try {
        if (typeof e.message === "string") {
            e.message = scrubText(e.message)
        }

        if (e.tags && typeof e.tags === "object") {
            for (const [key, value] of Object.entries(e.tags)) {
                if (typeof value === "string") {
                    ;(e.tags as Record<string, unknown>)[key] = scrubText(value)
                }
            }
        }

        const values = e.exception?.values
        if (Array.isArray(values)) {
            for (const entry of values) {
                if (entry && typeof entry.value === "string") {
                    entry.value = scrubText(entry.value)
                }
            }
        }

        // `logentry` is what the SDK builds for a parameterised message; the
        // formatted string lands here rather than in `message`.
        if (e.logentry && typeof e.logentry.message === "string") {
            e.logentry.message = scrubText(e.logentry.message)
        }
    } catch {
        // Never lose an error report to the scrubber.
    }
    return event
}
