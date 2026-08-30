/**
 * The banned-word lint (§3, §6) — the analyst's voice, enforced.
 *
 * The product is informational: it never «προτείνει», never «συμβουλεύει»,
 * never says «αγοράστε», «αλλάξτε», «εξοικονομήστε», «κόψτε», never names «το
 * καλύτερο πρόγραμμα». «Πρόταση» may appear in exactly one place — the
 * adviser's own tab — where a licensed intermediary's proposals are
 * legitimately proposals.
 *
 * Two regimes over the two dictionaries:
 *   STRICT   — every key under `app.*` (the Grafí application tier) except
 *              `app.adviser.*`: one hit fails the build.
 *   RATCHET  — the legacy dictionary: existing hits are baselined
 *              (tests/fixtures/voice-baseline.json) and may only shrink; a new
 *              key or a higher count fails. The legacy surfaces retire with
 *              their goals (G8+), and the baseline shrinks with them.
 *
 * Matching is accent-insensitive and case-insensitive (NFD, marks stripped)
 * so «Προτείνω», «προτεινω» and «ΠΡΟΤΕΙΝΩ» are one word. Stems are chosen so
 * the canonical lines stay legal: «Δεν σας λέω τι να αγοράσετε» (subjunctive)
 * is not «αγοράστε» (imperative); «σύμβουλος»/«συμβουλή» are not «συμβουλεύω».
 */

export interface BannedStem {
    id: string
    /** Applied to the folded (lowercase, accent-stripped) text. */
    pattern: RegExp
    lang: "el" | "en"
}

export const BANNED_STEMS: readonly BannedStem[] = [
    // `\b` is ASCII-only in JS regexes — it does not delimit Greek words — so the
    // Greek stems use Unicode-letter lookarounds under the `u` flag.
    { id: "el.protasi", pattern: /(?<!\p{L})προτασ(?:η|εις|ης|εων)(?!\p{L})/u, lang: "el" },
    { id: "el.proteino", pattern: /(?<!\p{L})προτειν/u, lang: "el" },
    { id: "el.symvouleuo", pattern: /(?<!\p{L})συμβουλευ(?:ω|ουμε|ει|ουν|σ)/u, lang: "el" },
    { id: "el.kalytero-programma", pattern: /καλυτερ(?:ο|α|η)\s+(?:προγραμμα|προγραμματα|ασφαλεια|ασφαλιστηριο|επιλογη)/u, lang: "el" },
    { id: "el.allaxte", pattern: /(?<!\p{L})αλλαξτε(?!\p{L})/u, lang: "el" },
    { id: "el.agoraste", pattern: /(?<!\p{L})αγοραστε(?!\p{L})/u, lang: "el" },
    { id: "el.exoikonom", pattern: /(?<!\p{L})εξοικονομ/u, lang: "el" },
    { id: "el.kopste", pattern: /(?<!\p{L})κοψτε(?!\p{L})/u, lang: "el" },
    { id: "en.recommend", pattern: /\brecommend(?:s|ed|ing|ation|ations)?\b/, lang: "en" },
    { id: "en.we-advise", pattern: /\b(?:we|i)\s+advise\b/, lang: "en" },
    { id: "en.best-plan", pattern: /\bbest\s+(?:plan|policy|cover|deal|option)\b/, lang: "en" },
    // «Switch to annual billing» is a billing toggle, not advice — the stem is the insurer/policy sense.
    { id: "en.switch-to", pattern: /\bswitch\s+(?:to\s+(?:a|an|another|the)\b|your\s+(?:insurer|policy|provider)|insurer|provider|policy)/, lang: "en" },
    { id: "en.buy-now", pattern: /\b(?:buy\s+now|you\s+should\s+buy|should\s+buy)\b/, lang: "en" },
    { id: "en.save-money", pattern: /\bsave\s+(?:money|up\s+to|\d)/, lang: "en" },
    { id: "en.cut", pattern: /\bcut\s+(?:your|the)\s+(?:premium|policy|cover|cost)/, lang: "en" },
]

/** Keys the adviser owns — the ONE place «πρόταση» is legitimate. */
export const ADVISER_NAMESPACES: readonly string[] = ["app.adviser", "adviser"]

export function fold(text: string): string {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

export interface VoiceHit {
    key: string
    stem: string
    /** The offending fragment, for the report. */
    excerpt: string
}

function isAdviserKey(key: string): boolean {
    return ADVISER_NAMESPACES.some((ns) => key === ns || key.startsWith(`${ns}.`))
}

/** Every banned hit in a dictionary tree, keyed by dotted path. */
export function scanDictionary(dict: unknown, lang: "el" | "en", prefix = ""): VoiceHit[] {
    const hits: VoiceHit[] = []
    const stems = BANNED_STEMS.filter((s) => s.lang === lang)
    const walk = (node: unknown, path: string) => {
        if (typeof node === "string") {
            if (isAdviserKey(path)) return
            const folded = fold(node)
            for (const s of stems) {
                const m = s.pattern.exec(folded)
                if (m) hits.push({ key: path, stem: s.id, excerpt: node.slice(Math.max(0, m.index - 20), m.index + 40) })
            }
            return
        }
        if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return }
        if (node && typeof node === "object") {
            for (const [k, v] of Object.entries(node as Record<string, unknown>)) walk(v, path ? `${path}.${k}` : k)
        }
    }
    walk(dict, prefix)
    return hits
}

/** Hits grouped by key → count, the shape the ratchet baseline stores. */
export function countByKey(hits: VoiceHit[]): Record<string, number> {
    const out: Record<string, number> = {}
    for (const h of hits) out[h.key] = (out[h.key] ?? 0) + 1
    return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)))
}

/** What changed against the baseline: new keys or higher counts fail; lower counts must be delisted. */
export function diffAgainstBaseline(current: Record<string, number>, baseline: Record<string, number>): { grew: string[]; shrank: string[] } {
    const grew: string[] = []
    const shrank: string[] = []
    for (const [k, n] of Object.entries(current)) if (n > (baseline[k] ?? 0)) grew.push(`${k} — ${n} hit(s), baseline allows ${baseline[k] ?? 0}`)
    for (const [k, n] of Object.entries(baseline)) if ((current[k] ?? 0) < n) shrank.push(`${k} — now ${current[k] ?? 0}, baseline says ${n}`)
    return { grew, shrank }
}
