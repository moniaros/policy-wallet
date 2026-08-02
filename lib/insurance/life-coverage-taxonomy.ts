/**
 * Greek life-insurance coverage taxonomy — the WP-06 template, fourth branch.
 *
 * Same sourcing discipline as its siblings: every entry comes from the
 * product's own documented branch content (`docs/product/LOB_CONTENT.md`,
 * «Ζωή», mirrored in `lib/insurance/content/life.ts`), not invented.
 *
 * Life is the branch where the taxonomy must claim the LEAST, and the design
 * says so explicitly:
 *
 *  - The branch's three documented gaps — mortgage without life cover,
 *    dependents without protection, no income protection — are PORTFOLIO
 *    questions, not within-policy text questions, and they are already
 *    detected deterministically by `profile-gap-rules.ts` (`mortgage_no_life`,
 *    `dependents_no_life`, `income_no_protection`). This module must never
 *    duplicate them: a second copy keyed on policy text would double-report
 *    the same gap with weaker evidence.
 *  - Beneficiaries and sum adequacy — the two things LOB_CONTENT leads with —
 *    are an ACORD array (`lifeAndInvestment.beneficiaries`) and a numeric
 *    comparison against profile needs. Text matching can prove neither, so it
 *    claims neither.
 *
 * What text CAN prove: which supplementary covers the policy evidences
 * (μόνιμη ολική ανικανότητα, σοβαρές ασθένειες, απώλεια εισοδήματος, απαλλαγή
 * ασφαλίστρων — the four the product commits to reading), and whether the core
 * death benefit is evidenced at all. Only that last absence is a finding.
 */

import { buildCoverageHaystack, haystackHasAlias } from "./coverage-matching"

export type LifeCoverageKey =
    | "death_benefit"
    | "disability"
    | "critical_illness"
    | "income_loss"
    | "premium_waiver"

export interface LifeCoverage {
    key: LifeCoverageKey
    label: { el: string; en: string }
    /** Matched case- and accent-insensitively against extracted coverage text. */
    aliases: string[]
    /**
     * `expected` covers are the ones whose absence the product commits to
     * reporting. Riders are detected — so surfaces can say what exists — but
     * never reported missing; whether someone NEEDS them is the profile
     * rules' question.
     */
    expected: boolean
}

export const LIFE_COVERAGES: LifeCoverage[] = [
    {
        key: "death_benefit",
        label: { el: "Κεφάλαιο ζωής", en: "Death benefit" },
        aliases: [
            "κεφαλαιο ζωης",
            "ασφαλισμα",
            "θανατ",
            "απωλεια ζωης",
            "death benefit",
            "loss of life",
            "life cover",
            "life sum",
        ],
        expected: true,
    },
    {
        key: "disability",
        label: { el: "Μόνιμη ολική ανικανότητα", en: "Permanent total disability" },
        aliases: ["ανικανοτητ", "αναπηρι", "disability"],
        expected: false,
    },
    {
        key: "critical_illness",
        label: { el: "Σοβαρές ασθένειες", en: "Critical illness" },
        aliases: ["σοβαρες ασθενειες", "σοβαρων ασθενειων", "σοβαρη ασθενεια", "critical illness"],
        expected: false,
    },
    {
        key: "income_loss",
        label: { el: "Απώλεια εισοδήματος", en: "Loss of income" },
        aliases: [
            "απωλεια εισοδηματος",
            "απωλειας εισοδηματος",
            "προστασια εισοδηματος",
            "income protection",
            "loss of income",
            "income loss",
        ],
        expected: false,
    },
    {
        // Precise multiword aliases only: bare «απαλλαγή» means a DEDUCTIBLE in
        // most other branches, and this list is matched by substring.
        key: "premium_waiver",
        label: { el: "Απαλλαγή πληρωμής ασφαλίστρων", en: "Premium waiver" },
        aliases: [
            "απαλλαγη ασφαλιστρων",
            "απαλλαγης ασφαλιστρων",
            "απαλλαγη πληρωμης ασφαλιστρων",
            "premium waiver",
            "waiver of premium",
        ],
        expected: false,
    },
]

export interface LifeCoverageFinding {
    key: LifeCoverageKey
    label: { el: string; en: string }
    severity: "high"
    reason: { el: string; en: string }
}

const REASONS: Partial<Record<LifeCoverageKey, LifeCoverageFinding["reason"]>> = {
    death_benefit: {
        el: "Δεν εντοπίστηκε κεφάλαιο ζωής στο κείμενο του ασφαλιστηρίου — η παροχή που ορίζει το συμβόλαιο ζωής. Αξίζει επιβεβαίωση με το πρωτότυπο έγγραφο.",
        en: "No death benefit was found in the policy text — the benefit that defines a life policy. Worth confirming against the original document.",
    },
}

/** Which taxonomy entries the extracted coverage text evidences. */
export function detectLifeCoverages(coverageTexts: string[]): Set<LifeCoverageKey> {
    const haystack = buildCoverageHaystack(coverageTexts)
    const found = new Set<LifeCoverageKey>()

    for (const coverage of LIFE_COVERAGES) {
        if (haystackHasAlias(haystack, coverage.aliases)) {
            found.add(coverage.key)
        }
    }
    return found
}

/** Expected cover with no evidence in the policy. */
export function detectLifeCoverageGaps(coverageTexts: string[]): LifeCoverageFinding[] {
    const present = detectLifeCoverages(coverageTexts)

    return LIFE_COVERAGES.filter((c) => c.expected && !present.has(c.key)).map((c) => ({
        key: c.key,
        label: c.label,
        severity: "high" as const,
        reason:
            REASONS[c.key] ?? {
                el: `Δεν εντοπίστηκε κάλυψη «${c.label.el}» στο ασφαλιστήριο.`,
                en: `No «${c.label.en}» cover was found in the policy.`,
            },
    }))
}
