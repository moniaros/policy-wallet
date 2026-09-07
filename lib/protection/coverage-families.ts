/**
 * The family filter of «Καλύψεις & κενά» — Όλα / Περιουσία / Υγεία /
 * Οικογένεια / Μετακίνηση / Άλλα — derived from the ONE line→area vocabulary
 * (`lib/protection/domains.ts`), never from a second table. The guard
 * `protection-domains-single-source` fails on any literal that pairs a line
 * with an area, which is deliberate: two tables drift, and a reader who sees
 * «Ταξίδια» under one family here and another on the risk lens loses the
 * thread. So travel, pet, boat and cyber sit under «Άλλα» — the domain calls
 * them lifestyle — until the vocabulary itself moves.
 *
 * Also owns the allow-list parsing of the page's two filter params. Unknown
 * values fall back silently; there is nothing to validate a reader against.
 */

import { areaForLob } from "@/lib/protection/domains"
import { COVERAGE_STATUS_IDS, type CoverageStatusId } from "@/lib/protection/coverage-status"

export const COVERAGE_FAMILY_IDS = ["property", "health", "family", "mobility", "other"] as const
export type CoverageFamilyId = (typeof COVERAGE_FAMILY_IDS)[number]

export const FAMILY_FILTER_IDS = ["all", ...COVERAGE_FAMILY_IDS] as const
export type FamilyFilterId = (typeof FAMILY_FILTER_IDS)[number]

/** The family a top-level branch belongs to, by the sphere of life its attention area names. */
export function familyOfBranch(branchId: string): CoverageFamilyId {
    const domain = areaForLob(branchId)?.domain
    switch (domain) {
        case "residence":
        case "property":
            return "property"
        case "health":
            return "health"
        case "household":
        case "money":
            return "family"
        case "mobility":
            return "mobility"
        default:
            return "other"
    }
}

export function parseFamilyFilter(value: string | string[] | undefined): FamilyFilterId {
    const v = Array.isArray(value) ? value[0] : value
    return (FAMILY_FILTER_IDS as readonly string[]).includes(v ?? "") ? (v as FamilyFilterId) : "all"
}

export function parseStatusFilter(value: string | string[] | undefined): CoverageStatusId | null {
    const v = Array.isArray(value) ? value[0] : value
    return (COVERAGE_STATUS_IDS as readonly string[]).includes(v ?? "") ? (v as CoverageStatusId) : null
}
