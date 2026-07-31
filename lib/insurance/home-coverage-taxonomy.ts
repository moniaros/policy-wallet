/**
 * Greek home-insurance coverage taxonomy, and the gaps that matter here.
 *
 * The gap engine had no per-branch coverage model. Findings for a home policy
 * were whatever the model volunteered from a loose prompt, so the one thing a
 * Greek homeowner most needs told — that **earthquake cover is usually NOT
 * automatic** and is a priced optional extension — depended on the model
 * choosing to mention it.
 *
 * Every entry here is taken from the product's own documented branch content
 * (`docs/product/LOB_CONTENT.md`, «Κατοικία»), not invented: the coverage list
 * (fire, earthquake, flood, weather, theft, water pipes) and the three named
 * gaps are the ones the product already commits to explaining.
 *
 * Deterministic on purpose. These checks read the extracted coverage list and
 * decide; no model call, so the same policy yields the same finding every time
 * and a mortgage-critical gap cannot be missed because a completion was
 * unlucky.
 */

export type HomeCoverageKey =
    | "fire"
    | "earthquake"
    | "flood"
    | "weather"
    | "theft"
    | "water_damage"
    | "contents"
    | "building"

export interface HomeCoverage {
    key: HomeCoverageKey
    label: { el: string; en: string }
    /** Matched case-insensitively against extracted coverage text. */
    aliases: string[]
    /**
     * `expected` cover is what a Greek home policy is normally understood to
     * include; its absence is a finding. Optional cover is not a defect.
     */
    expected: boolean
}

export const HOME_COVERAGES: HomeCoverage[] = [
    {
        key: "fire",
        label: { el: "Πυρκαγιά", en: "Fire" },
        aliases: ["πυρκαγι", "πυρος", "πυρός", "fire"],
        expected: true,
    },
    {
        key: "earthquake",
        label: { el: "Σεισμός", en: "Earthquake" },
        aliases: ["σεισμ", "earthquake"],
        // Usually an optional extension in Greek policies — and in a country
        // with this seismic risk, its absence is the single most consequential
        // home finding, so it is reported as expected.
        expected: true,
    },
    {
        key: "flood",
        label: { el: "Πλημμύρα", en: "Flood" },
        aliases: ["πλημμυρ", "πλημμύρ", "flood"],
        expected: true,
    },
    {
        key: "weather",
        label: { el: "Καιρικά φαινόμενα", en: "Weather events" },
        aliases: ["καιρικ", "θύελλ", "θυελλ", "χαλάζ", "χαλαζ", "storm", "weather"],
        expected: true,
    },
    {
        key: "theft",
        label: { el: "Κλοπή", en: "Theft" },
        aliases: ["κλοπ", "διαρρηξ", "διάρρηξ", "theft", "burglary"],
        expected: true,
    },
    {
        key: "water_damage",
        label: { el: "Ζημιά από νερά", en: "Water damage" },
        aliases: ["σωλην", "σωλήν", "νερ", "υδραυλ", "water", "pipe"],
        expected: true,
    },
    {
        key: "building",
        label: { el: "Κτίριο", en: "Building" },
        aliases: ["κτιρι", "κτίρι", "οικοδομ", "building", "structure"],
        expected: true,
    },
    {
        key: "contents",
        label: { el: "Περιεχόμενο", en: "Contents" },
        aliases: ["περιεχομεν", "περιεχόμεν", "contents"],
        expected: true,
    },
]

export interface HomeCoverageFinding {
    key: HomeCoverageKey
    label: { el: string; en: string }
    severity: "critical" | "high" | "medium"
    /** Why this matters, in the product's own documented framing. */
    reason: { el: string; en: string }
}

/** Findings that need more than "this word was absent" to explain. */
const REASONS: Partial<Record<HomeCoverageKey, HomeCoverageFinding["reason"]>> = {
    earthquake: {
        el: "Η κάλυψη σεισμού συνήθως ΔΕΝ είναι αυτόματη στα ελληνικά ασφαλιστήρια κατοικίας — είναι προαιρετική προσθήκη με δική της απαλλαγή.",
        en: "Earthquake cover is usually NOT automatic in Greek home policies — it is an optional extension with its own excess.",
    },
    contents: {
        el: "Αν καλύπτεται μόνο το κτίριο, τα πράγματα μέσα στο σπίτι μένουν χωρίς προστασία σε κλοπή ή ζημιά.",
        en: "If only the building is covered, everything inside it is unprotected against theft or damage.",
    },
    flood: {
        el: "Η πλημμύρα και τα καιρικά φαινόμενα συχνά έχουν χωριστούς όρους και απαλλαγές.",
        en: "Flood and weather events often carry separate terms and excesses.",
    },
}

function normalise(text: string): string {
    return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

/** Which taxonomy entries the extracted coverage text evidences. */
export function detectHomeCoverages(coverageTexts: string[]): Set<HomeCoverageKey> {
    const haystack = normalise(coverageTexts.join(" | "))
    const found = new Set<HomeCoverageKey>()

    for (const coverage of HOME_COVERAGES) {
        if (coverage.aliases.some((alias) => haystack.includes(normalise(alias)))) {
            found.add(coverage.key)
        }
    }
    return found
}

/**
 * Expected cover with no evidence in the policy.
 *
 * @param hasMortgage raises earthquake to critical: a lender normally requires
 * active fire/earthquake cover for the life of the loan, so its absence is not
 * merely a risk but a probable breach of the mortgage terms.
 */
export function detectHomeCoverageGaps(
    coverageTexts: string[],
    opts: { hasMortgage?: boolean } = {}
): HomeCoverageFinding[] {
    const present = detectHomeCoverages(coverageTexts)

    return HOME_COVERAGES.filter((c) => c.expected && !present.has(c.key)).map((c) => ({
        key: c.key,
        label: c.label,
        severity:
            c.key === "earthquake"
                ? opts.hasMortgage
                    ? "critical"
                    : "high"
                : c.key === "fire" || c.key === "building"
                  ? "high"
                  : "medium",
        reason:
            REASONS[c.key] ?? {
                el: `Δεν εντοπίστηκε κάλυψη «${c.label.el}» στο ασφαλιστήριο.`,
                en: `No «${c.label.en}» cover was found in the policy.`,
            },
    }))
}
