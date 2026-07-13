/**
 * Display normalization for extracted insurer names.
 *
 * PolicyDocument extraction stores whatever string the PDF carries
 * ("ΕΘΝΙΚΗ Η ΠΡΩΤΗ ΑΣΦΑΛΙΣΤΙΚΗ", "EUROLIFE FFH ΜΟΝΟΠΡΟΣΩΠΗ Α.Ε.Α.Ζ."),
 * and the detail page rendered it verbatim. This registry maps the noisy
 * extracted forms to a canonical Greek-market display name; unknown names
 * fall back to the cleaned raw string.
 */

// Legal-form / boilerplate tokens dropped from the comparison key. Dotted
// acronyms (Α.Ε., Α.Ε.Ε.Γ.Α.) collapse to single-letter tokens, which are
// dropped wholesale below.
const NOISE_TOKENS = new Set([
    "αε",
    "αεγα",
    "αεεγα",
    "αεαζ",
    "μονοπροσωπη",
    "ανωνυμη",
    "ανωνυμοσ",
    "εταιρεια",
    "εταιρια",
    "sa",
    "ltd",
    "plc",
    "ae",
])

export function normalizeInsurerKey(raw: string): string {
    const base = String(raw || "")
        .normalize("NFD")
        // strip diacritics (Greek tonos included)
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/ς/g, "σ")
        .replace(/[^a-z0-9α-ω]+/g, " ")
        .trim()
    // NOTE: \b word boundaries do not work for Greek letters in JS regexes
    // (they are non-word chars), so suffix stripping is token-based.
    return base
        .split(" ")
        .filter((token) => token.length > 1 && !NOISE_TOKENS.has(token))
        .join(" ")
}

interface InsurerEntry {
    displayName: string
    logoUrl?: string
}

const ENTRIES: Array<{ aliases: string[]; entry: InsurerEntry }> = [
    {
        aliases: [
            "εθνική ασφαλιστική",
            "εθνική",
            "εθνική η πρώτη ασφαλιστική",
            "ethniki asfalistiki",
            "ethniki",
            "the ethniki",
        ],
        entry: { displayName: "Εθνική Ασφαλιστική" },
    },
    { aliases: ["eurolife", "eurolife ffh", "eurolife erb"], entry: { displayName: "Eurolife FFH" } },
    { aliases: ["interamerican", "ιντεραμέρικαν"], entry: { displayName: "Interamerican" } },
    { aliases: ["nn", "nn hellas", "nn ελλάς"], entry: { displayName: "NN Hellas" } },
    {
        aliases: ["allianz", "allianz ευρωπαϊκή πίστη", "ευρωπαϊκή πίστη"],
        entry: { displayName: "Allianz – Ευρωπαϊκή Πίστη" },
    },
    { aliases: ["generali", "generali hellas"], entry: { displayName: "Generali Hellas" } },
    { aliases: ["axa"], entry: { displayName: "Generali Hellas (πρώην AXA)" } },
    { aliases: ["ergo", "έργκο"], entry: { displayName: "ERGO Ασφαλιστική" } },
    { aliases: ["groupama", "groupama φοίνιξ"], entry: { displayName: "Groupama Ασφαλιστική" } },
    { aliases: ["υδρόγειος", "ydrogios"], entry: { displayName: "Υδρόγειος Ασφαλιστική" } },
    { aliases: ["ατλαντική ένωση", "atlantiki enosi"], entry: { displayName: "Ατλαντική Ένωση" } },
    { aliases: ["interlife"], entry: { displayName: "Interlife" } },
    { aliases: ["μινέττα", "minetta"], entry: { displayName: "Μινέττα Ασφαλιστική" } },
    { aliases: ["hellas direct"], entry: { displayName: "Hellas Direct" } },
    { aliases: ["anytime"], entry: { displayName: "Anytime (Interamerican)" } },
    { aliases: ["interasco"], entry: { displayName: "Interasco" } },
    { aliases: ["prime insurance"], entry: { displayName: "Prime Insurance" } },
    { aliases: ["συνεταιριστική", "syneteristiki"], entry: { displayName: "Συνεταιριστική Ασφαλιστική" } },
    { aliases: ["ορίζων", "orizon", "orizon insurance"], entry: { displayName: "Ορίζων Ασφαλιστική" } },
]

/** Keys are the NORMALIZED alias forms (same normalization as lookups). */
export const INSURER_REGISTRY: Record<string, InsurerEntry> = Object.fromEntries(
    ENTRIES.flatMap(({ aliases, entry }) =>
        aliases.map((alias) => [normalizeInsurerKey(alias), entry])
    )
)

export function resolveInsurerDisplay(
    raw: string | null | undefined
): { displayName: string; logoUrl: string | null } {
    const cleaned = String(raw || "").replace(/\s+/g, " ").trim()
    if (!cleaned) return { displayName: "", logoUrl: null }

    const key = normalizeInsurerKey(cleaned)
    const exact = key ? INSURER_REGISTRY[key] : undefined
    if (exact) return { displayName: exact.displayName, logoUrl: exact.logoUrl || null }

    // Substring pass: extracted names often wrap the brand in extra words
    // ("ΕΘΝΙΚΗ Η ΠΡΩΤΗ ΑΣΦΑΛΙΣΤΙΚΗ …"). Longest alias wins so e.g.
    // "eurolife ffh" beats bare brand fragments.
    const paddedKey = ` ${key} `
    const aliasHit = Object.keys(INSURER_REGISTRY)
        .filter((alias) => alias.length >= 4 && paddedKey.includes(` ${alias} `))
        .sort((a, b) => b.length - a.length)[0]
    if (aliasHit) {
        const entry = INSURER_REGISTRY[aliasHit]
        return { displayName: entry.displayName, logoUrl: entry.logoUrl || null }
    }

    return { displayName: cleaned, logoUrl: null }
}
