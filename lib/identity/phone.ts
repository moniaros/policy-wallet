/**
 * Greek mobile numbers — the second half of a no-email customer's identity
 * (owner decision D3: ΑΦΜ + Greek mobile).
 *
 * A Greek mobile is `69XXXXXXXX` (10 digits, 69 prefix), optionally behind
 * the +30 / 0030 country code, with any spacing, dots or dashes. A landline
 * (`21…`, `23…`) or a foreign number is NOT accepted as identity — it may
 * still be stored as a phone, it just cannot stand in for an email.
 */

/** Digits only, the international prefix normalised away. */
function significantDigits(raw: string): string {
    const digits = raw.replace(/\D/g, "")
    if (digits.startsWith("0030")) return digits.slice(4)
    if (digits.startsWith("30") && digits.length === 12) return digits.slice(2)
    return digits
}

/** E.164 (`+3069XXXXXXXX`) when the value is a Greek mobile; null otherwise. */
export function normalizeGreekMobile(raw: string | null | undefined): string | null {
    if (typeof raw !== "string") return null
    const trimmed = raw.trim()
    if (!trimmed) return null
    const national = significantDigits(trimmed)
    if (!/^69\d{8}$/.test(national)) return null
    return `+30${national}`
}

export function isGreekMobile(raw: string | null | undefined): boolean {
    return normalizeGreekMobile(raw) !== null
}
