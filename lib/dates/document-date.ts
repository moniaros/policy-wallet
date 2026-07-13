/**
 * Deterministic parsing of dates as they appear in Greek insurance documents
 * and in AI-extracted payloads.
 *
 * The extraction prompts normalize dates to DD-MM-YYYY (locked), documents
 * themselves write "22 ΜΑΪΟΥ 2024", and edited review fields produce ISO
 * yyyy-MM-dd — so every downstream consumer must accept all three. The one
 * hard rule: a failed parse yields null. NEVER substitute the current date;
 * the old now()/now()+1y fallbacks are exactly what painted an expired
 * policy as active for a year.
 */

const GREEK_MONTHS: Record<string, number> = {}

// Genitive and nominative forms per month (diacritics stripped, uppercase).
const MONTH_FORMS: Array<[number, string[]]> = [
    [1, ["ΙΑΝΟΥΑΡΙΟΥ", "ΙΑΝΟΥΑΡΙΟΣ", "ΓΕΝΑΡΗ", "ΓΕΝΑΡΗΣ", "ΙΑΝ"]],
    [2, ["ΦΕΒΡΟΥΑΡΙΟΥ", "ΦΕΒΡΟΥΑΡΙΟΣ", "ΦΛΕΒΑΡΗ", "ΦΛΕΒΑΡΗΣ", "ΦΕΒ"]],
    [3, ["ΜΑΡΤΙΟΥ", "ΜΑΡΤΙΟΣ", "ΜΑΡΤΗ", "ΜΑΡΤΗΣ", "ΜΑΡ"]],
    [4, ["ΑΠΡΙΛΙΟΥ", "ΑΠΡΙΛΙΟΣ", "ΑΠΡΙΛΗ", "ΑΠΡΙΛΗΣ", "ΑΠΡ"]],
    [5, ["ΜΑΙΟΥ", "ΜΑΙΟΣ", "ΜΑΗ", "ΜΑΗΣ"]],
    [6, ["ΙΟΥΝΙΟΥ", "ΙΟΥΝΙΟΣ", "ΙΟΥΝΗ", "ΙΟΥΝ"]],
    [7, ["ΙΟΥΛΙΟΥ", "ΙΟΥΛΙΟΣ", "ΙΟΥΛΗ", "ΙΟΥΛ"]],
    [8, ["ΑΥΓΟΥΣΤΟΥ", "ΑΥΓΟΥΣΤΟΣ", "ΑΥΓ"]],
    [9, ["ΣΕΠΤΕΜΒΡΙΟΥ", "ΣΕΠΤΕΜΒΡΙΟΣ", "ΣΕΠΤΕΜΒΡΗ", "ΣΕΠ"]],
    [10, ["ΟΚΤΩΒΡΙΟΥ", "ΟΚΤΩΒΡΙΟΣ", "ΟΚΤΩΒΡΗ", "ΟΚΤ"]],
    [11, ["ΝΟΕΜΒΡΙΟΥ", "ΝΟΕΜΒΡΙΟΣ", "ΝΟΕΜΒΡΗ", "ΝΟΕ"]],
    [12, ["ΔΕΚΕΜΒΡΙΟΥ", "ΔΕΚΕΜΒΡΙΟΣ", "ΔΕΚΕΜΒΡΗ", "ΔΕΚ"]],
]
for (const [month, forms] of MONTH_FORMS) {
    for (const form of forms) GREEK_MONTHS[form] = month
}

/** Uppercase + strip Greek diacritics (tonos AND dialytika: ΜΑΪΟΥ → ΜΑΙΟΥ). */
function normalizeGreekToken(raw: string): string {
    return raw
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
}

function buildDate(year: number, month: number, day: number): Date | null {
    if (year < 1900 || year > 2100) return null
    if (month < 1 || month > 12) return null
    if (day < 1 || day > 31) return null
    const date = new Date(Date.UTC(year, month - 1, day))
    // Reject overflow (e.g. 31-02-2024 rolling into March).
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null
    }
    return date
}

/**
 * Parse a document/extracted date string. Accepted forms:
 * - ISO: 2024-05-22 (optionally with a time suffix)
 * - Day-first numeric: 22-05-2024, 22/05/2024, 22.5.2024
 * - Greek month name: "22 ΜΑΪΟΥ 2024", "22 Μαΐου 2024", "22η ΜΑΙΟΥ 2024",
 *   nominative and genitive, any casing, with or without diaeresis.
 *
 * Returns null when nothing parses — no fallback, ever.
 */
export function parseDocumentDate(raw: unknown): Date | null {
    if (raw instanceof Date) {
        return Number.isNaN(raw.getTime()) ? null : raw
    }
    const text = String(raw ?? "").trim()
    if (!text) return null

    // ISO first (also matches Date#toISOString output).
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/)
    if (iso) {
        return buildDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))
    }

    // Day-first numeric: dd-MM-yyyy / dd/MM/yyyy / dd.MM.yyyy.
    const numeric = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/)
    if (numeric) {
        return buildDate(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]))
    }

    // Greek month name, e.g. "22 ΜΑΪΟΥ 2024" (possibly embedded in a phrase
    // like "Έναρξη Ασφάλισης 22 ΜΑΪΟΥ 2024" or "Αθήνα, 22 ΜΑΪΟΥ 2024").
    const greek = text.match(/(\d{1,2})(?:ης?|η)?\s+(\p{L}+)\.?\s+(\d{4})/u)
    if (greek) {
        const month = GREEK_MONTHS[normalizeGreekToken(greek[2])]
        if (month) {
            return buildDate(Number(greek[3]), month, Number(greek[1]))
        }
    }

    return null
}

/** ISO date-only string (yyyy-MM-dd) or null. */
export function toIsoDateString(date: Date | null): string | null {
    if (!date || Number.isNaN(date.getTime())) return null
    return date.toISOString().slice(0, 10)
}

/** Convenience: parse + format for display, null-safe (never "Invalid Date"). */
export function formatDocumentDate(raw: unknown, locale: string): string | null {
    const parsed = parseDocumentDate(raw)
    return parsed ? parsed.toLocaleDateString(locale, { timeZone: "UTC" }) : null
}

/** Two document dates refer to the same calendar day. */
export function isSameDocumentDate(a: unknown, b: unknown): boolean {
    const da = parseDocumentDate(a)
    const db = parseDocumentDate(b)
    if (!da || !db) return false
    return toIsoDateString(da) === toIsoDateString(db)
}
