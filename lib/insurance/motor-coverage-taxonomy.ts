/**
 * Greek motor-insurance coverage taxonomy — the WP-05 structured map.
 *
 * Same shape and same sourcing discipline as the home and health taxonomies:
 * every entry comes from the product's own documented branch content
 * (`docs/product/LOB_CONTENT.md`, «Αυτοκίνητο», mirrored in
 * `lib/insurance/content/motor.ts`) plus the WP-05 deliverable list in the
 * readiness plan. Nothing here is invented market knowledge.
 *
 * Two things this module deliberately does NOT do:
 *
 *  - **Tier classification.** Whether a policy is απλή / πυρός-κλοπής / μικτή
 *    is already decided by `classifyMotorCoverageTier`
 *    (lib/wallet/motor-coverage-tier.ts), which reads the extracted
 *    `vehicle.coverageTier` field and is deliberately conservative. This module
 *    reads the coverage TEXTS. The two are complementary evidence about the
 *    same policy, not competitors.
 *  - **Tier-inferred findings.** A third-party policy without own-damage cover
 *    is not defective — that absence IS the tier, priced accordingly. So
 *    own-damage, fire, weather, glass, roadside, driver-accident and
 *    uninsured-vehicle cover are detected (so surfaces can state what exists)
 *    but their absence alone is never reported as a gap. The absences the
 *    product commits to naming are exactly three: liability (the compulsory
 *    legal minimum for driving in Greece), theft, and legal protection. The
 *    branch's other two documented gaps — Green Card expiry and policy expiry —
 *    are date questions, already handled deterministically elsewhere
 *    (`green_card_expiring` seed rule; `resolvePolicyLifecycle`).
 *
 * Deterministic like its siblings: same extracted texts, same findings, every
 * run.
 */

import { buildCoverageHaystack, haystackHasAlias } from "./coverage-matching"

export type MotorCoverageKey =
    | "liability"
    | "own_damage"
    | "fire"
    | "theft"
    | "weather"
    | "glass"
    | "roadside"
    | "legal"
    | "driver_accident"
    | "uninsured_vehicle"

export interface MotorCoverage {
    key: MotorCoverageKey
    label: { el: string; en: string }
    /** Matched case- and accent-insensitively against extracted coverage text. */
    aliases: string[]
    /**
     * `expected` covers are the ones whose absence the product commits to
     * reporting. Optional covers are detected but their absence is not a
     * defect — see the module header.
     */
    expected: boolean
}

export const MOTOR_COVERAGES: MotorCoverage[] = [
    {
        key: "liability",
        label: { el: "Αστική ευθύνη", en: "Third-party liability" },
        aliases: [
            "αστικη ευθυνη",
            "αστικης ευθυνης",
            "ευθυνη εναντι τριτων",
            "σωματικες βλαβες τριτων",
            "υλικες ζημιες τριτων",
            "third party",
            "third-party",
            "liability",
        ],
        expected: true,
    },
    {
        // «μικτή»/«μεικτή» evidences own-damage cover by definition — a
        // comprehensive policy is named after exactly this benefit.
        key: "own_damage",
        label: { el: "Ίδιες ζημίες", en: "Own damage" },
        aliases: ["ιδιες ζημιες", "ιδιων ζημιων", "μικτ", "μεικτ", "own damage", "comprehensive"],
        expected: false,
    },
    {
        key: "fire",
        label: { el: "Πυρκαγιά", en: "Fire" },
        aliases: ["πυρκαγι", "πυρος", "fire"],
        expected: false,
    },
    {
        key: "theft",
        label: { el: "Κλοπή", en: "Theft" },
        aliases: ["κλοπ", "theft"],
        expected: true,
    },
    {
        key: "weather",
        label: { el: "Φυσικά φαινόμενα", en: "Natural events" },
        aliases: [
            "φυσικα φαινομεν",
            "καιρικ",
            "χαλαζ",
            "πλημμυρ",
            "θυελλ",
            "natural events",
            "weather",
            "storm",
            "hail",
            "flood",
        ],
        expected: false,
    },
    {
        key: "glass",
        label: { el: "Θραύση κρυστάλλων", en: "Glass breakage" },
        aliases: ["κρυσταλλ", "θραυσ", "glass", "windscreen", "windshield"],
        expected: false,
    },
    {
        key: "roadside",
        label: { el: "Οδική βοήθεια", en: "Roadside assistance" },
        aliases: ["οδικη βοηθει", "οδικης βοηθει", "roadside", "breakdown"],
        expected: false,
    },
    {
        key: "legal",
        label: { el: "Νομική προστασία", en: "Legal protection" },
        aliases: ["νομικη προστασι", "νομικης προστασι", "legal protection", "legal assistance", "legal expenses"],
        expected: true,
    },
    {
        key: "driver_accident",
        label: { el: "Προσωπικό ατύχημα οδηγού", en: "Driver personal accident" },
        aliases: ["προσωπικο ατυχημα", "ατυχημα οδηγου", "ατυχηματος οδηγου", "personal accident", "driver accident"],
        expected: false,
    },
    {
        key: "uninsured_vehicle",
        label: { el: "Ανασφάλιστο όχημα", en: "Uninsured vehicle" },
        aliases: ["ανασφαλιστ", "uninsured"],
        expected: false,
    },
]

export interface MotorCoverageFinding {
    key: MotorCoverageKey
    label: { el: string; en: string }
    severity: "critical" | "high" | "medium"
    /** Why this matters, in the product's own documented framing. */
    reason: { el: string; en: string }
}

const REASONS: Partial<Record<MotorCoverageKey, MotorCoverageFinding["reason"]>> = {
    liability: {
        el: "Η αστική ευθύνη είναι η υποχρεωτική ελάχιστη κάλυψη για να κυκλοφορεί όχημα στην Ελλάδα. Η απουσία της από το κείμενο του ασφαλιστηρίου θέλει άμεση επιβεβαίωση με το πρωτότυπο έγγραφο.",
        en: "Third-party liability is the compulsory legal minimum for a vehicle on Greek roads. Its absence from the policy text needs immediate confirmation against the original document.",
    },
    theft: {
        el: "Πολλά βασικά συμβόλαια δεν καλύπτουν ολική ή μερική κλοπή. Αν το όχημα έχει αξία, αξίζει έλεγχος.",
        en: "Many basic policies do not cover total or partial theft. If the vehicle has value, it is worth checking.",
    },
    legal: {
        el: "Η νομική προστασία βοηθά στη διεκδίκηση αποζημίωσης μετά από ατύχημα που δεν προκάλεσες εσύ.",
        en: "Legal protection helps you claim compensation after an accident that was not your fault.",
    },
}

/** Which taxonomy entries the extracted coverage text evidences. */
export function detectMotorCoverages(coverageTexts: string[]): Set<MotorCoverageKey> {
    const haystack = buildCoverageHaystack(coverageTexts)
    const found = new Set<MotorCoverageKey>()

    for (const coverage of MOTOR_COVERAGES) {
        if (haystackHasAlias(haystack, coverage.aliases)) {
            found.add(coverage.key)
        }
    }
    return found
}

/** Expected cover with no evidence in the policy. */
export function detectMotorCoverageGaps(coverageTexts: string[]): MotorCoverageFinding[] {
    const present = detectMotorCoverages(coverageTexts)

    return MOTOR_COVERAGES.filter((c) => c.expected && !present.has(c.key)).map((c) => ({
        key: c.key,
        label: c.label,
        severity: c.key === "liability" ? "critical" : c.key === "theft" ? "high" : "medium",
        reason:
            REASONS[c.key] ?? {
                el: `Δεν εντοπίστηκε κάλυψη «${c.label.el}» στο ασφαλιστήριο.`,
                en: `No «${c.label.en}» cover was found in the policy.`,
            },
    }))
}
