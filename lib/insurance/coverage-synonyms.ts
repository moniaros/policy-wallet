/**
 * Greek health-coverage names, mapped to canonical benefits. **Authored,
 * reviewed and versioned. Never inferred at runtime.**
 *
 * WHY A MAP AND NOT A SIMILARITY FUNCTION. «Νοσοκομειακή περίθαλψη» and
 * «νοσηλεία» are the same benefit under two wordings, and no amount of string
 * distance establishes that — it is a fact about Greek insurance vocabulary,
 * and the only honest way to hold it is to write it down where a human can
 * check it. A runtime guess would produce a "you are paying for this twice"
 * finding about someone's cover on the strength of a heuristic.
 *
 * THE TRAP THIS MAP EXISTS TO AVOID. «Νοσοκομειακή περίθαλψη» (the insurer
 * settles the hospital bill) and «επίδομα νοσηλείας» (a cash sum per night in
 * hospital) BOTH contain «νοσηλ». They are different products: one indemnifies
 * a cost, the other pays the insured regardless of cost, and holding both is
 * ordinary rather than wasteful. A substring match merges them and reports a
 * duplicate that is not one. They are therefore separate canonical keys, and
 * matching is longest-phrase-first so the more specific wording wins.
 *
 * SCOPE, PER OPEN-2: **health only**, seeded from exactly the benefit set the
 * ομαδικό/ατομικό article names. No motor, no home, no other branch. Widening
 * is a later item with its own review — never something a loop does
 * opportunistically, because every added phrase is a new claim that two
 * differently-worded things are the same thing.
 */

export const SYNONYM_MAP_VERSION = '2026-08-29.1'

export type CoverageKey =
    | 'hospital_care'
    | 'outpatient_care'
    | 'dental'
    | 'annual_checkup'
    | 'hospital_cash_benefit'
    | 'disability_income'

/** Human-readable, for the UI. Both locales — no untranslated key reaches a reader. */
export const COVERAGE_KEY_LABELS: Record<CoverageKey, { el: string; en: string }> = {
    hospital_care: { el: 'Νοσοκομειακή περίθαλψη', en: 'Hospital care' },
    outpatient_care: { el: 'Εξωνοσοκομειακή περίθαλψη', en: 'Outpatient care' },
    dental: { el: 'Οδοντιατρική περίθαλψη', en: 'Dental care' },
    annual_checkup: { el: 'Ετήσιος προληπτικός έλεγχος', en: 'Annual check-up' },
    hospital_cash_benefit: { el: 'Επίδομα νοσηλείας', en: 'Hospital cash benefit' },
    disability_income: { el: 'Κάλυψη ανικανότητας', en: 'Disability cover' },
}

/**
 * Authored phrases per canonical key, **longest first within each key**.
 * Accent-insensitive and case-insensitive at match time; written here with
 * accents so a reviewer reads real Greek.
 */
const AUTHORED: ReadonlyArray<{ key: CoverageKey; phrases: readonly string[] }> = [
    // Deliberately BEFORE hospital_care: «επίδομα νοσηλείας» must not be eaten
    // by the «νοσηλεία» phrase below it.
    {
        key: 'hospital_cash_benefit',
        phrases: [
            'επιδομα νοσοκομειακης περιθαλψης',
            'νοσοκομειακο επιδομα',
            'επιδομα νοσηλειας',
            'ημερησιο επιδομα νοσηλειας',
        ],
    },
    {
        key: 'hospital_care',
        phrases: [
            'νοσοκομειακη περιθαλψη',
            'νοσοκομειακη καλυψη',
            'ευρεια νοσοκομειακη περιθαλψη',
            'δαπανες νοσηλειας',
            'εξοδα νοσηλειας',
            'νοσηλεια',
        ],
    },
    {
        key: 'outpatient_care',
        phrases: [
            'εξωνοσοκομειακη περιθαλψη',
            'εξωνοσοκομειακες δαπανες',
            'εξωνοσοκομειακη καλυψη',
            'διαγνωστικες εξετασεις',
        ],
    },
    { key: 'dental', phrases: ['οδοντιατρικη περιθαλψη', 'οδοντιατρικα εξοδα', 'οδοντιατρικη καλυψη'] },
    {
        key: 'annual_checkup',
        phrases: ['ετησιος προληπτικος ελεγχος', 'προληπτικος ελεγχος', 'ετησιο check up', 'check up'],
    },
    { key: 'disability_income', phrases: ['καλυψη ανικανοτητας', 'μονιμη ολικη ανικανοτητα', 'ανικανοτητα'] },
]

/** Strip accents and punctuation, collapse whitespace, lowercase. */
export function normaliseCoverageName(raw: string): string {
    return raw
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

/** Longest authored phrase first, across ALL keys, so specificity wins globally. */
const PHRASE_INDEX: ReadonlyArray<{ key: CoverageKey; phrase: string }> = AUTHORED.flatMap(
    ({ key, phrases }) => phrases.map((phrase) => ({ key, phrase: normaliseCoverageName(phrase) }))
).sort((a, b) => b.phrase.length - a.phrase.length)

/**
 * The canonical benefit this coverage name denotes, or null.
 *
 * **Null is a real answer and must be shown to the user, never dropped.** An
 * unmapped coverage is the honest form of "we could not compare this one"; a
 * silently discarded one turns a gap in our vocabulary into a claim about their
 * policy.
 */
export function canonicalCoverageKey(rawName: string): CoverageKey | null {
    const name = normaliseCoverageName(rawName)
    if (!name) return null
    for (const { key, phrase } of PHRASE_INDEX) {
        if (name.includes(phrase)) return key
    }
    return null
}
