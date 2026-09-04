/**
 * One confidence scale for every conclusion the protection surfaces draw.
 *
 * The product distinguishes what the person SAID, what the system DERIVED from
 * several answers, what an uploaded POLICY shows, and what an outside source
 * confirms. Before this module those distinctions lived in four places with four
 * vocabularies (life-event `confidence`, the risk graph's `declared | derived |
 * inferred` defaulted to `declared`, `GapInstance.ruleInputs`, and a binary
 * `answeredFields`), so a floor-estimated dependant count and a declared one were
 * indistinguishable to everything downstream. See
 * docs/planning/PERSONAL_RISK_PROFILE.md §C.
 *
 * Ordering (weakest → strongest): unknown < inferred < user_reported <
 * policy_verified < externally_verified. A derivation is ranked BELOW a direct
 * statement on purpose — `dependentsCount` floored from «Ο/Η σύντροφός μου» is a
 * lower bound, not the number the person would give if asked.
 * `externally_verified` exists so the model can hold it; nothing produces it yet.
 */

export const EVIDENCE_LEVELS = [
    "unknown",
    "inferred",
    "user_reported",
    "policy_verified",
    "externally_verified",
] as const

export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number]

const RANK: Record<EvidenceLevel, number> = {
    unknown: 0,
    inferred: 1,
    user_reported: 2,
    policy_verified: 3,
    externally_verified: 4,
}

/** The weakest link decides how sure a composed conclusion may claim to be. */
export function lowestEvidence(levels: readonly EvidenceLevel[]): EvidenceLevel {
    let lowest: EvidenceLevel = "externally_verified"
    let seen = false
    for (const l of levels) {
        seen = true
        if (RANK[l] < RANK[lowest]) lowest = l
    }
    return seen ? lowest : "unknown"
}

export function evidenceAtLeast(level: EvidenceLevel, floor: EvidenceLevel): boolean {
    return RANK[level] >= RANK[floor]
}

// ── Fact provenance (Layer 1) ──────────────────────────────────────────────

/** Who wrote a profile fact. `policy` is reserved for facts read from a document. */
export const FACT_SOURCES = [
    "onboarding",
    "quick_start",
    "assessment",
    "life_event",
    "questionnaire",
    "advisor",
    "policy",
] as const

export type FactSource = (typeof FACT_SOURCES)[number]

/**
 * `coarse` — a bound or a bucket (a floor of 1 for «my partner», «3+» children,
 * a residence type). `exact` — the figure or value the person actually gave.
 * An exact answer replaces a coarse one; a coarse answer never replaces an exact
 * one (the precedence rule lives in lib/services/protection-profile/fact-writes.ts).
 */
export type FactPrecision = "coarse" | "exact"

export interface FactProvenance {
    source: FactSource
    precision: FactPrecision
    /** ISO-8601 instant of the write. */
    at: string
}

/** Keyed by PolicyholderProfile column name; stored as `fact_provenance` JSON. */
export type FactProvenanceMap = Record<string, FactProvenance>

const SOURCE_SET = new Set<string>(FACT_SOURCES)

/**
 * Lenient reader for the stored JSON: an entry that does not parse is dropped
 * rather than poisoning the map, because the engine must keep working on a row
 * an older writer produced.
 */
export function parseFactProvenance(json: unknown): FactProvenanceMap {
    if (!json || typeof json !== "object" || Array.isArray(json)) return {}
    const out: FactProvenanceMap = {}
    for (const [column, value] of Object.entries(json as Record<string, unknown>)) {
        if (!value || typeof value !== "object") continue
        const v = value as Record<string, unknown>
        const source = typeof v.source === "string" && SOURCE_SET.has(v.source) ? (v.source as FactSource) : null
        const precision = v.precision === "coarse" || v.precision === "exact" ? v.precision : null
        const at = typeof v.at === "string" && !Number.isNaN(Date.parse(v.at)) ? v.at : null
        if (!source || !precision || !at) continue
        out[column] = { source, precision, at }
    }
    return out
}

/** The evidence a single fact carries, from how it was written. */
export function factEvidence(provenance: FactProvenance | undefined | null): EvidenceLevel {
    if (!provenance) return "unknown"
    if (provenance.source === "policy") return "policy_verified"
    return provenance.precision === "exact" ? "user_reported" : "inferred"
}

// ── Protection evidence (Layer 4) ──────────────────────────────────────────

/**
 * How much of a held policy the product has actually read. `summary_only` is the
 * basic extraction every tier gets; `analysed` means a deep run produced
 * `acordData.coverages[]`, so limits and optional covers are known.
 */
export type ProtectionDetail = "summary_only" | "analysed"

export function protectionEvidence(detail: ProtectionDetail | null | undefined): EvidenceLevel {
    return detail ? "policy_verified" : "unknown"
}
