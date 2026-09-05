import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"

/**
 * B3 — requirement provenance (PW-TRANSPARENCY-02).
 *
 * A static, human-reviewed map from each authored check to WHY the requirement
 * exists: set by Greek law or EU regulation, required by a named third party,
 * common market practice, or not yet classified. This module ships with EVERY
 * entry `under_review` and `citation: null`. It does not classify: whether a
 * limit is statutory is a question for the underwriter and legal tracks, and a
 * guess here would be exactly the unbacked claim this series removes. The
 * candidates for the human track are listed, unfilled, in
 * docs/transparency/PROVENANCE-CANDIDATES.md.
 *
 * Provenance is the ordering axis (B1): only `legislative` and `contractual`
 * may come first or carry emphasis; `market` renders in its own group with
 * review-prompting framing; `under_review` renders only inside a disclosed
 * section, is never counted in a summary, and never reaches a notification,
 * an email or a report. An authored slug missing from this map fails CI
 * (tests/unit/provenance-skeleton.test.ts) rather than defaulting silently.
 */
export type GapProvenance = "legislative" | "contractual" | "market" | "under_review"

export interface ProvenanceEntry {
    provenance: GapProvenance
    /** The law, regulation or contract clause behind the requirement. Null until a human cites one. */
    citation: string | null
    /** Who classified it, and when. Null until the human track does. */
    reviewedBy: string | null
    reviewedAt: string | null
}

const UNDER_REVIEW: ProvenanceEntry = Object.freeze({ provenance: "under_review", citation: null, reviewedBy: null, reviewedAt: null })

/** Keyed by authored slug. Every value is UNDER_REVIEW until the human track classifies it. */
export const GAP_PROVENANCE: Readonly<Record<string, ProvenanceEntry>> = Object.freeze({
    // motor
    no_own_damage_cover: UNDER_REVIEW,
    no_glass_breakage_cover: UNDER_REVIEW,
    no_roadside_assistance: UNDER_REVIEW,
    missing_accident_declaration_phone: UNDER_REVIEW,
    green_card_expiring: UNDER_REVIEW,
    insured_value_above_declared: UNDER_REVIEW,
    // motorbike
    moto_no_own_damage_cover: UNDER_REVIEW,
    moto_no_roadside_assistance: UNDER_REVIEW,
    moto_missing_accident_declaration_phone: UNDER_REVIEW,
    moto_green_card_expiring: UNDER_REVIEW,
    // home
    no_earthquake_cover: UNDER_REVIEW,
    no_flood_cover: UNDER_REVIEW,
    no_fire_cover: UNDER_REVIEW,
    missing_enfia_components: UNDER_REVIEW,
    insured_value_below_rebuild_cost: UNDER_REVIEW,
    // health
    no_direct_billing: UNDER_REVIEW,
    no_annual_checkup: UNDER_REVIEW,
    missing_hospital_class: UNDER_REVIEW,
    missing_coordination_centre: UNDER_REVIEW,
    // group health
    group_missing_coordination_centre: UNDER_REVIEW,
    group_missing_hospital_class: UNDER_REVIEW,
    group_no_direct_billing: UNDER_REVIEW,
    // pet
    no_direct_vet_payment: UNDER_REVIEW,
    missing_microchip_number: UNDER_REVIEW,
    missing_leishmaniasis: UNDER_REVIEW,
    // travel
    no_repatriation_cover: UNDER_REVIEW,
    no_trip_cancellation_cover: UNDER_REVIEW,
    missing_emergency_assistance_phone: UNDER_REVIEW,
    // life
    no_beneficiaries_recorded: UNDER_REVIEW,
})

export const PROVENANCE_CLASSES: readonly GapProvenance[] = ["legislative", "contractual", "market", "under_review"]
export const PROVENANCE_RANK: Readonly<Record<GapProvenance, number>> = Object.freeze({ legislative: 0, contractual: 1, market: 2, under_review: 3 })

export function provenanceEntry(slug: string | null | undefined): ProvenanceEntry | null {
    if (!slug) return null
    return GAP_PROVENANCE[slug] ?? null
}

/**
 * A slug this map does not know renders as `under_review` — the conservative
 * side: disclosed only, never summarised, never sent. CI fails on an unmapped
 * AUTHORED slug; this covers legacy and variant slugs that reach a render.
 */
export function provenanceOf(slug: string | null | undefined): GapProvenance {
    return provenanceEntry(slug)?.provenance ?? "under_review"
}

export function isClassified(p: GapProvenance): boolean {
    return p !== "under_review"
}

/** Only legislative and contractual requirements may be ordered first or carry emphasis (B3). */
export function mayCarryEmphasis(p: GapProvenance): boolean {
    return p === "legislative" || p === "contractual"
}

export function unmappedAuthoredSlugs(definitions: ReadonlyArray<{ slug: string }> = AUTHORED_GAP_DEFINITIONS): string[] {
    return definitions.map((d) => d.slug).filter((s) => !(s in GAP_PROVENANCE))
}

/** Stable: provenance rank first, the caller's order within a class. Severity is not an input. */
export function orderByProvenance<T>(items: readonly T[], slugOf: (item: T) => string | null | undefined): T[] {
    return items
        .map((item, index) => ({ item, index, rank: PROVENANCE_RANK[provenanceOf(slugOf(item))] }))
        .sort((a, b) => a.rank - b.rank || a.index - b.index)
        .map((x) => x.item)
}

export interface ProvenanceGroups<T> {
    /** legislative + contractual, in that order — the only group that may carry emphasis. */
    emphasised: T[]
    /** common practice — separated, review-prompting, never deficiency-asserting. */
    market: T[]
    /** not yet classified — disclosed section only; never in a summary, notification, email or report. */
    underReview: T[]
}

export function partitionByProvenance<T>(items: readonly T[], slugOf: (item: T) => string | null | undefined): ProvenanceGroups<T> {
    const groups: ProvenanceGroups<T> = { emphasised: [], market: [], underReview: [] }
    for (const item of orderByProvenance(items, slugOf)) {
        const p = provenanceOf(slugOf(item))
        if (mayCarryEmphasis(p)) groups.emphasised.push(item)
        else if (p === "market") groups.market.push(item)
        else groups.underReview.push(item)
    }
    return groups
}

/**
 * The classified findings only. Every summary count and every outbound surface
 * (email, push, notification feed, report) goes through this — the guard
 * tests/unit/under-review-never-summarised.test.ts enumerates the callers.
 */
export function excludeUnderReview<T>(items: readonly T[], slugOf: (item: T) => string | null | undefined): T[] {
    return items.filter((item) => isClassified(provenanceOf(slugOf(item))))
}
