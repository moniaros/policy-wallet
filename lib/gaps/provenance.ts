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

/** A citation names the specific law and article (or contract class) — bilingual, with a source URL where one exists. */
export interface ProvenanceCitation {
    el: string
    en: string
    url: string | null
}

export interface ProvenanceEntry {
    provenance: GapProvenance
    /** The law, regulation or contract clause behind the requirement. Null until someone cites one. */
    citation: ProvenanceCitation | null
    /** Who classified it, and when. Null until the human track does. */
    reviewedBy: string | null
    reviewedAt: string | null
}

const UNDER_REVIEW: ProvenanceEntry = Object.freeze({ provenance: "under_review", citation: null, reviewedBy: null, reviewedAt: null })

/**
 * F5 (PW-TRANSPARENCY-02 close-out): citation-backed classification only.
 * A slug is `legislative` here ONLY because the specific law and article can
 * be named; nothing is `market` in this pass, and anything that cannot be
 * cited precisely stays `under_review`. The full 29-row review, with the
 * confidence and the pre-GA legal sign-off gate, is
 * docs/transparency/PROVENANCE-REVIEW.md.
 */
const REVIEWED_BY = "agent, citation-backed — pre-GA legal sign-off pending (docs/transparency/PROVENANCE-REVIEW.md)"
const REVIEWED_AT = "2026-09-06"

/** Ν. 2496/1997 (ΦΕΚ Α΄ 87/16.5.1997), άρθρο 17 «Υπασφάλιση – Υπερασφάλιση». */
const LAW_2496_1997_ART_17: ProvenanceEntry = Object.freeze({
    provenance: "legislative",
    citation: Object.freeze({
        el: "Ν. 2496/1997, άρθρο 17 (υπασφάλιση – υπερασφάλιση)",
        en: "Law 2496/1997, Article 17 (under-insurance and over-insurance)",
        url: "https://www.lawspot.gr/nomothesia/n-2496-1997/arthro-17-nomos-2496-1997-ypasfalisi-yperasfalisi/",
    }),
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
})

/** Ν. 4830/2021 (ΦΕΚ Α΄ 169/18.9.2021), άρθρο 9 παρ. 1 περ. β΄ — σήμανση και καταγραφή σκύλου/γάτας στο ΕΜΖΣ. */
const LAW_4830_2021_ART_9: ProvenanceEntry = Object.freeze({
    provenance: "legislative",
    citation: Object.freeze({
        el: "Ν. 4830/2021, άρθρο 9 παρ. 1 περ. β΄ (σήμανση και καταγραφή στο ΕΜΖΣ)",
        en: "Law 4830/2021, Article 9(1)(b) (microchipping and registration in the national pet registry)",
        url: "https://www.e-nomothesia.gr/kat-zoa-suntrophias-prostasia-zoon/nomos-4830-2021-phek-169a-18-9-2021.html",
    }),
    reviewedBy: REVIEWED_BY,
    reviewedAt: REVIEWED_AT,
})

/** Keyed by authored slug. UNDER_REVIEW unless a specific law and article can be named (F5). */
export const GAP_PROVENANCE: Readonly<Record<string, ProvenanceEntry>> = Object.freeze({
    // motor
    no_own_damage_cover: UNDER_REVIEW,
    no_glass_breakage_cover: UNDER_REVIEW,
    no_roadside_assistance: UNDER_REVIEW,
    missing_accident_declaration_phone: UNDER_REVIEW,
    green_card_expiring: UNDER_REVIEW,
    insured_value_above_declared: LAW_2496_1997_ART_17,
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
    insured_value_below_rebuild_cost: LAW_2496_1997_ART_17,
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
    missing_microchip_number: LAW_4830_2021_ART_9,
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

/**
 * The map is keyed by the AUTHORED slug (snake_case). The wallet's report items
 * carry `normalizeGapSlug`'s kebab form of the same slug (`insured-value-above-declared`),
 * and until the close-out that form silently resolved to `under_review` on the
 * findings page while the home tally, built from the definition slug, said
 * «legislative» — two answers for one finding. One lookup accepts both forms.
 */
const has = (key: string) => Object.prototype.hasOwnProperty.call(GAP_PROVENANCE, key)
export function canonicalGapSlug(slug: string | null | undefined): string | null {
    if (!slug) return null
    if (has(slug)) return slug
    const snake = slug.trim().toLowerCase().replace(/-+/g, "_")
    return has(snake) ? snake : null
}

export function provenanceEntry(slug: string | null | undefined): ProvenanceEntry | null {
    const key = canonicalGapSlug(slug)
    return key ? GAP_PROVENANCE[key] : null
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

/**
 * F1 — the catalogue's declared order. A finding's position within its
 * provenance class is the position of its rule in the authored catalogue,
 * never the order the definitions table returned rows in. Unknown slugs sort
 * after every authored one.
 */
const CATALOGUE_INDEX: ReadonlyMap<string, number> = new Map(AUTHORED_GAP_DEFINITIONS.map((d, i) => [d.slug, i]))
export function catalogueIndexOf(slug: string | null | undefined): number {
    if (!slug) return Number.POSITIVE_INFINITY
    return CATALOGUE_INDEX.get(canonicalGapSlug(slug) ?? slug) ?? Number.POSITIVE_INFINITY
}
/** Provenance class first (B3), then catalogue order. Zero only for the same slug or two unknown slugs. */
export function compareFindingSlugs(a: string | null | undefined, b: string | null | undefined): number {
    const rank = PROVENANCE_RANK[provenanceOf(a)] - PROVENANCE_RANK[provenanceOf(b)]
    if (rank !== 0) return rank
    const ia = catalogueIndexOf(a), ib = catalogueIndexOf(b)
    if (ia !== ib) return ia < ib ? -1 : 1
    return 0
}

/** The citation behind a classified slug; null for an unknown or under-review one. Render it wherever the class renders. */
export function provenanceCitation(slug: string | null | undefined): ProvenanceCitation | null {
    return provenanceEntry(slug)?.citation ?? null
}

export function unmappedAuthoredSlugs(definitions: ReadonlyArray<{ slug: string }> = AUTHORED_GAP_DEFINITIONS): string[] {
    return definitions.map((d) => d.slug).filter((s) => !(s in GAP_PROVENANCE))
}

/** Deterministic: provenance class, then the catalogue's declared order; the caller's order only between two unknown slugs. Severity is not an input. */
export function orderByProvenance<T>(items: readonly T[], slugOf: (item: T) => string | null | undefined): T[] {
    return items
        .map((item, index) => ({ item, index, slug: slugOf(item) }))
        .sort((a, b) => compareFindingSlugs(a.slug, b.slug) || a.index - b.index)
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
