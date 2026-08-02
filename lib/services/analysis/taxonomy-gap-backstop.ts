/**
 * The deterministic taxonomy layer of the analysis flow.
 *
 * Four branch taxonomies exist (home, health, motor, life) and, until this
 * module, nothing in the analysis pipeline called them: the findings a Greek
 * policyholder most needs — earthquake not automatic, hospital-only programme,
 * no theft cover — were still reported only when a completion happened to
 * mention them. This is the missing wire.
 *
 * It runs inside the orchestrator's finalize step as a BACKSTOP to the AI
 * findings, not a replacement:
 *
 *  - If the AI already reported a gap for a cover, the taxonomy adds nothing —
 *    the AI entry carries richer, document-specific explanation text.
 *  - If the AI stayed silent about an expected cover, the taxonomy adds the
 *    finding deterministically, with the product's documented bilingual
 *    framing. Same extraction, same findings, every run.
 *
 * Evidence discipline, in order of strength:
 *
 *  1. A cover named in the snapshot's `notCovered` list is CONFIRMED absent —
 *     the document says so. Reported regardless of how thin the enumeration
 *     is.
 *  2. A cover merely missing from `covered` is inferred absent — reported only
 *     when the enumeration is substantial (≥ MIN_COVERED_FOR_INFERENCE
 *     entries). A two-line summary that does not mention liability is not
 *     evidence that a motor policy lacks liability; it is evidence the list is
 *     short. This is the same absence-of-data-is-not-absence-of-cover rule as
 *     `explicitly_false` in lib/gap-detection.ts.
 *  3. A cover present in BOTH lists (model noise) counts as covered — the
 *     conservative reading, since inventing a gap is the costlier error.
 */

import {
    detectHomeCoverages,
    detectHomeCoverageGaps,
} from "@/lib/insurance/home-coverage-taxonomy"
import {
    detectHealthCoverages,
    detectHealthCoverageGaps,
} from "@/lib/insurance/health-coverage-taxonomy"
import {
    detectMotorCoverages,
    detectMotorCoverageGaps,
} from "@/lib/insurance/motor-coverage-taxonomy"
import {
    detectLifeCoverages,
    detectLifeCoverageGaps,
} from "@/lib/insurance/life-coverage-taxonomy"
import { normalizeBranch } from "@/lib/insurance/taxonomy"

/**
 * Below this many `covered` entries, silence about a cover is treated as an
 * incomplete enumeration rather than evidence of absence.
 */
export const MIN_COVERED_FOR_INFERENCE = 3

export interface TaxonomyBackstopGap {
    /** Stable slug: taxonomy_<branch>_<coverageKey>. */
    slug: string
    /** English definition title (the gap_definitions row is created from it). */
    name: string
    severity: string
    explanationEl: string
    explanationEn: string
}

interface BackstopInput {
    /** The policy's line of business (any spelling — normalized here). */
    lineOfBusiness: string
    /** clarity.coverageSnapshot.covered — what the document evidences. */
    covered: string[]
    /** clarity.coverageSnapshot.notCovered — confirmed absences. */
    notCovered: string[]
    /** Merged ACORD data; used only for evidence-based escalation. */
    acordData?: unknown
    /** Slugs already detected by the AI passes, for dedup. */
    existingSlugs: string[]
}

/**
 * Keyword stems that mark an existing AI slug as "already about this cover".
 * Checked against slugs normalised to lowercase with separators as spaces, so
 * `home-earthquake`, `missing_earthquake_coverage` and `no_theft_cover` all
 * dedupe against their taxonomy counterparts.
 */
const DEDUP_STEMS: Record<string, string[]> = {
    earthquake: ["earthquake", "σεισμ"],
    flood: ["flood", "πλημμυρ"],
    fire: ["fire", "πυρ"],
    weather: ["weather", "storm", "καιρικ"],
    theft: ["theft", "burglary", "κλοπ"],
    water_damage: ["water", "pipe", "σωλην"],
    building: ["building", "structure", "κτιρι"],
    contents: ["contents", "περιεχομεν"],
    hospital: ["hospital", "inpatient", "νοσοκομειακ"],
    outpatient: ["outpatient", "εξωνοσοκομειακ"],
    liability: ["liability", "third party", "third-party", "αστικ"],
    legal: ["legal", "νομικ"],
    death_benefit: ["death", "life cover", "life sum", "κεφαλαιο ζωης"],
}

function normaliseSlug(slug: string): string {
    return slug.toLowerCase().replace(/[-_]+/g, " ")
}

function alreadyReported(existing: string[], coverageKey: string): boolean {
    const stems = DEDUP_STEMS[coverageKey] ?? [coverageKey.replace(/_/g, " ")]
    return existing.some((slug) => {
        const normalised = normaliseSlug(slug)
        return stems.some((stem) => normalised.includes(stem))
    })
}

/** Evidence-based, not profile-based: the extractor found a mortgagee bank. */
function evidencesMortgage(acordData: unknown): boolean {
    const bank = (acordData as { property?: { mortgageeBank?: unknown } } | null)?.property
        ?.mortgageeBank
    return typeof bank === "string" && bank.trim().length > 0
}

interface BranchTaxonomy {
    detect: (texts: string[]) => Set<string>
    gaps: (texts: string[]) => Array<{
        key: string
        label: { el: string; en: string }
        severity: string
        reason: { el: string; en: string }
    }>
}

function taxonomyFor(branch: string, acordData: unknown): BranchTaxonomy | null {
    switch (branch) {
        case "home":
            return {
                detect: detectHomeCoverages as BranchTaxonomy["detect"],
                gaps: (texts) =>
                    detectHomeCoverageGaps(texts, { hasMortgage: evidencesMortgage(acordData) }),
            }
        case "health":
            return {
                detect: detectHealthCoverages as BranchTaxonomy["detect"],
                gaps: detectHealthCoverageGaps,
            }
        case "motor":
            return {
                detect: detectMotorCoverages as BranchTaxonomy["detect"],
                gaps: detectMotorCoverageGaps,
            }
        case "life":
            return {
                detect: detectLifeCoverages as BranchTaxonomy["detect"],
                gaps: detectLifeCoverageGaps,
            }
        default:
            return null
    }
}

/**
 * Deterministic taxonomy findings the AI passes did not already report.
 *
 * Pure: no I/O, no model call. The orchestrator merges the result into the
 * same gap set the AI produced, so downstream (instances, opportunities,
 * score) sees one combined, deduplicated picture.
 */
export function taxonomyBackstopGaps(input: BackstopInput): TaxonomyBackstopGap[] {
    const branchRecord = normalizeBranch(input.lineOfBusiness)
    // Child branches score and read as their parent: a motorbike is motor
    // cover, a rented home is home cover.
    const branch = (branchRecord.parentId ?? branchRecord.id).toLowerCase()

    const taxonomy = taxonomyFor(branch, input.acordData)
    if (!taxonomy) return []

    const coveredKeys = taxonomy.detect(input.covered)
    // Rule 1: named in notCovered = confirmed absent. Rule 3: covered wins.
    const confirmedAbsent = new Set(
        [...taxonomy.detect(input.notCovered)].filter((key) => !coveredKeys.has(key))
    )
    const enumerationIsSubstantial = input.covered.length >= MIN_COVERED_FOR_INFERENCE

    return taxonomy
        .gaps(input.covered)
        .filter((finding) => {
            if (confirmedAbsent.has(finding.key)) return true
            // Rule 2: inference from silence needs a substantial enumeration.
            return enumerationIsSubstantial
        })
        .filter((finding) => !alreadyReported(input.existingSlugs, finding.key))
        .map((finding) => ({
            slug: `taxonomy_${branch}_${finding.key}`,
            name: `${finding.label.en} — ${branchLabelEn(branch)}`,
            severity: finding.severity,
            explanationEl: finding.reason.el,
            explanationEn: finding.reason.en,
        }))
}

function branchLabelEn(branch: string): string {
    switch (branch) {
        case "home":
            return "Home"
        case "health":
            return "Health"
        case "motor":
            return "Motor"
        case "life":
            return "Life"
        default:
            return branch
    }
}
