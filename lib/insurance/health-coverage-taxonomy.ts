/**
 * Greek health-insurance coverage taxonomy — the WP-06 template, third branch.
 *
 * Same shape as `home-coverage-taxonomy.ts` and derived the same way: every
 * entry comes from the product's own documented branch content
 * (`docs/product/LOB_CONTENT.md`, «Υγεία», mirrored in
 * `lib/insurance/content/health.ts`), not invented. The defining Greek health
 * gap the product commits to naming is **hospital-only programmes**: «Πολλά
 * νοσοκομειακά προγράμματα δεν καλύπτουν ιατρικές επισκέψεις και διαγνωστικές
 * εξετάσεις εκτός νοσηλείας».
 *
 * Health differs from home in kind, and the model reflects it:
 *
 *  - Home cover is peril-based (fire, quake, flood…) and a Greek home policy is
 *    normally understood to include all of them, so most absences are findings.
 *    Health cover is benefit-based, and most benefits are genuinely optional —
 *    a policy without a wellness perk is not defective. Only two absences are
 *    documented findings: no hospital benefit at all, and no out-of-hospital
 *    cover of either kind.
 *  - The product's other two documented health gaps — a LOW annual limit and
 *    waiting periods — are numeric/disclosure questions answered by the ACORD
 *    fields (`health.annualLimit`, `health.waitingPeriods`), not by coverage
 *    text. They deliberately do not appear here: a text taxonomy claiming to
 *    detect a low limit would be guessing.
 *
 * Deterministic like its siblings: same extracted texts, same findings, every
 * run.
 */

import { buildCoverageHaystack, haystackHasAlias } from "./coverage-matching"

export type HealthCoverageKey =
    | "hospital"
    | "outpatient"
    | "diagnostics"
    | "checkup"
    | "second_opinion"
    | "emergency"

export interface HealthCoverage {
    key: HealthCoverageKey
    label: { el: string; en: string }
    /** Matched case- and accent-insensitively against extracted coverage text. */
    aliases: string[]
    /**
     * `expected` benefits are the ones whose absence the product commits to
     * reporting. Optional benefits are detected (so surfaces can say "you have
     * this — use it") but their absence is not a defect.
     */
    expected: boolean
}

export const HEALTH_COVERAGES: HealthCoverage[] = [
    {
        key: "hospital",
        label: { el: "Νοσοκομειακή περίθαλψη", en: "Hospital care" },
        aliases: ["νοσοκομειακ", "νοσηλει", "hospital", "inpatient"],
        expected: true,
    },
    {
        // The defining Greek health gap: hospital-only programmes. The gap
        // logic below treats diagnostics evidence as partial out-of-hospital
        // cover and stays silent then — see detectHealthCoverageGaps.
        key: "outpatient",
        label: { el: "Εξωνοσοκομειακή περίθαλψη", en: "Outpatient care" },
        aliases: [
            "εξωνοσοκομειακ",
            "εξω-νοσοκομειακ",
            "εξωτερικα ιατρει",
            "πρωτοβαθμι",
            "outpatient",
        ],
        expected: true,
    },
    {
        key: "diagnostics",
        label: { el: "Διαγνωστικές εξετάσεις", en: "Diagnostic tests" },
        aliases: ["διαγνωστικ", "diagnostic"],
        expected: false,
    },
    {
        key: "checkup",
        label: { el: "Προληπτικός έλεγχος", en: "Preventive check-up" },
        aliases: ["προληπτικ", "check-up", "checkup", "τσεκ-απ", "τσεκ απ"],
        expected: false,
    },
    {
        key: "second_opinion",
        label: { el: "Δεύτερη ιατρική γνώμη", en: "Second medical opinion" },
        aliases: ["δευτερη ιατρικη γνωμη", "δευτερη γνωμη", "second opinion"],
        expected: false,
    },
    {
        key: "emergency",
        label: { el: "Επείγοντα περιστατικά", en: "Emergency care" },
        aliases: ["επειγο", "emergency"],
        expected: false,
    },
]

export interface HealthCoverageFinding {
    key: HealthCoverageKey
    label: { el: string; en: string }
    severity: "high" | "medium"
    /** Why this matters, in the product's own documented framing. */
    reason: { el: string; en: string }
}

const REASONS: Partial<Record<HealthCoverageKey, HealthCoverageFinding["reason"]>> = {
    hospital: {
        el: "Δεν εντοπίστηκε νοσοκομειακή κάλυψη — η παροχή που κρίνει το κόστος μιας σοβαρής νοσηλείας. Αξίζει επιβεβαίωση με το πρωτότυπο έγγραφο.",
        en: "No hospital benefit was found — the benefit that decides the cost of a serious hospitalisation. Worth confirming against the original document.",
    },
    outpatient: {
        el: "Πολλά νοσοκομειακά προγράμματα δεν καλύπτουν ιατρικές επισκέψεις και διαγνωστικές εξετάσεις εκτός νοσηλείας — ό,τι συμβαίνει εκτός νοσοκομείου πληρώνεται από εσάς.",
        en: "Many hospital programmes do not cover doctor visits and diagnostic tests outside admission — whatever happens out of hospital is paid by you.",
    },
}

/**
 * The Greek word for out-of-hospital cover CONTAINS the word for hospital
 * cover: «εξωνοσοκομειακή» ⊃ «νοσοκομειακ». Substring matching would therefore
 * read a policy that only says "outpatient care" as evidence of HOSPITAL care
 * — inventing the one benefit whose absence is this taxonomy's highest-severity
 * finding. English has the same trap ("out-of-hospital"). These forms are
 * removed from the haystack before the hospital aliases are tested; the
 * outpatient entry matches them in their own right.
 */
const OUT_OF_HOSPITAL_FORMS = [
    "εξωνοσοκομειακ",
    "εξω-νοσοκομειακ",
    "out-of-hospital",
    "outside of a hospital",
    "outside of hospital",
    "outside the hospital",
]

function withoutOutpatientForms(haystack: string): string {
    let result = haystack
    for (const form of OUT_OF_HOSPITAL_FORMS) {
        result = result.split(form).join(" ")
    }
    return result
}

/** Which taxonomy entries the extracted coverage text evidences. */
export function detectHealthCoverages(coverageTexts: string[]): Set<HealthCoverageKey> {
    const haystack = buildCoverageHaystack(coverageTexts)
    const found = new Set<HealthCoverageKey>()

    for (const coverage of HEALTH_COVERAGES) {
        const searchable = coverage.key === "hospital" ? withoutOutpatientForms(haystack) : haystack
        if (haystackHasAlias(searchable, coverage.aliases)) {
            found.add(coverage.key)
        }
    }
    return found
}

/**
 * Expected benefits with no evidence in the policy.
 *
 * Conservative on the outpatient gap: the documented finding is programmes
 * covering NEITHER visits NOR out-of-hospital diagnostics. A policy that
 * evidences diagnostics (e.g. a contracted diagnostics network) has the half
 * that text can prove, so nothing is claimed about the other half — telling
 * someone with diagnostic cover that they have "no outpatient cover" would be
 * the taxonomy inventing a gap.
 */
export function detectHealthCoverageGaps(coverageTexts: string[]): HealthCoverageFinding[] {
    const present = detectHealthCoverages(coverageTexts)

    return HEALTH_COVERAGES.filter((c) => c.expected && !present.has(c.key))
        .filter((c) => !(c.key === "outpatient" && present.has("diagnostics")))
        .map((c) => ({
            key: c.key,
            label: c.label,
            severity: c.key === "hospital" ? "high" : "medium",
            reason:
                REASONS[c.key] ?? {
                    el: `Δεν εντοπίστηκε κάλυψη «${c.label.el}» στο ασφαλιστήριο.`,
                    en: `No «${c.label.en}» cover was found in the policy.`,
                },
        }))
}
