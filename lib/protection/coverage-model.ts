/**
 * Layer 4 — actual protection, per attention area, from policies alone.
 *
 * Built ONLY from the policies a person holds and the rule-decided findings on
 * them — never from an answer, a statement or a priority. Answers live in
 * Layers 1–2; this layer says what the documents show, so that the composition
 * (attention-areas.ts) can put "what you said" beside "what your policies say"
 * without either one contaminating the other.
 * See docs/planning/PERSONAL_RISK_PROFILE.md §C Layer 4 and §I.
 *
 * Three honesty rules are enforced here rather than left to callers:
 *
 *   - A line is `held` only while it is in force (`active` / `expiring_soon`).
 *     An EXPIRED policy is kept in the area — the person can see it, and its
 *     findings still show — but it does not make the area "held": a lapsed
 *     home policy answers nothing about the home today, and an area whose only
 *     line has expired reads as NOT YET CHECKED, never as covered.
 *   - A line's evidence says the policy EXISTS (`policy_verified`); `detail`
 *     says whether its limits were read. `summary_only` is the basic extraction
 *     every tier gets; `analysed` means a deep run produced coverages.
 *   - A finding counts only on a held policy. A gap on an expired document is
 *     history, not an open finding.
 *
 * Plain inputs by design: the caller resolves lifecycle through
 * `resolvePolicyLifecycle` (lib/policy-status.ts — the one clock) and hands
 * over a band; nothing here imports Prisma or re-derives a date.
 */

import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { AREAS, AREA_IDS, areaForLob, type AttentionAreaId } from "@/lib/protection/domains"
import { protectionEvidence, type EvidenceLevel, type ProtectionDetail } from "@/lib/protection/evidence"
import type { Bilingual } from "@/lib/services/life-events/types"

/**
 * The caller's mapping of `resolvePolicyLifecycle().status`:
 *   `active` · `expiring_soon` — in force, HELD;
 *   `expired`                 — kept, flagged, not held;
 *   `other`                   — cancelled or of unknown duration: presence we
 *                               cannot place in time, so neither held nor expired.
 * Feed `assessRisks` the same policies with `status: "active"` for both held
 * bands, or the engine and this model will disagree about what is in force.
 */
export type PolicyLifecycleBand = "active" | "expiring_soon" | "expired" | "other"

export interface CoverageInput {
    name: string
    limit?: number
    status?: string
}

export interface GapFindingInput {
    id: string
    ruleId: string
    slug: string
    severity: string
    title: Bilingual
}

export interface PolicyEvidenceInput {
    id: string
    /** Raw stored value; folded through `normalizeBranch` here. */
    lineOfBusiness: string
    lifecycle: PolicyLifecycleBand
    detail: ProtectionDetail
    /** Present only when `detail` is `analysed`. Carried, not interpreted. */
    coverages?: CoverageInput[]
    /** Rule-decided `GapInstance` rows on this policy — never AI prose. */
    gaps: GapFindingInput[]
}

export interface CoverageLine {
    /** Canonical branch id (`motor`, `motorbike`, `home`, …). */
    lob: string
    policyId: string
    lifecycle: PolicyLifecycleBand
    detail: ProtectionDetail
    /** Always `policy_verified` — the document exists; `detail` says how much of it we read. */
    evidence: EvidenceLevel
    /** In force today. False for `expired` and `other`. */
    held: boolean
    coverages: CoverageInput[]
}

export interface CoverageGap extends GapFindingInput {
    policyId: string
    /** The finding sits on a policy that is in force. Only these decide alignment. */
    onHeldPolicy: boolean
}

export interface AreaCoverage {
    lines: CoverageLine[]
    gaps: CoverageGap[]
    /** At least one HELD line whose limits were read. */
    hasAnalysed: boolean
}

/** One entry per attention area, always — an empty area is `{ lines: [], gaps: [], hasAnalysed: false }`. */
export type CoverageModel = Record<AttentionAreaId, AreaCoverage>

/**
 * The bands in display order; the first two are in force. This is consumption
 * of a resolved lifecycle, never a derivation or a presentation of one — the
 * words, colours and day counts stay in lib/policy-status.ts and
 * lib/wallet/policy-status-view.ts (tests/unit/policy-status-display-single-source).
 */
const BAND_ORDER: readonly PolicyLifecycleBand[] = ["active", "expiring_soon", "expired", "other"]
const HELD_BANDS: ReadonlySet<PolicyLifecycleBand> = new Set(BAND_ORDER.slice(0, 2))
const bandRank = (band: PolicyLifecycleBand): number => BAND_ORDER.indexOf(band)

export function isHeldBand(lifecycle: PolicyLifecycleBand): boolean {
    return HELD_BANDS.has(lifecycle)
}

/**
 * The area a policy is listed under. Every writable line and every line the
 * catalogue can name resolves through the table; a branch that is neither
 * (the taxonomy's residual `other`, an unparented specialty) lands in
 * `lifestyle`, where presence is never read as an answer to a named risk.
 */
export function areaForPolicyLine(lineOfBusiness: string): { area: AttentionAreaId; lob: string } {
    const lob = normalizeBranch(lineOfBusiness).id
    return { area: areaForLob(lob)?.id ?? AREAS.lifestyle.id, lob }
}

/**
 * `acordData.coverages[]` as the model's plain shape — carried, never
 * interpreted. Only a completed deep run writes coverages (the upload-time
 * extraction writes a summary), so a non-empty list is what `analysed` means.
 * Shared by the attention-areas loader and the review closer so the two
 * cannot disagree about whether a policy's limits were read.
 */
export function coverageInputsFrom(acordData: unknown): CoverageInput[] {
    const raw = (acordData as { coverages?: unknown } | null | undefined)?.coverages
    if (!Array.isArray(raw)) return []
    const out: CoverageInput[] = []
    for (const entry of raw) {
        if (!entry || typeof entry !== "object") continue
        const c = entry as Record<string, unknown>
        if (typeof c.name !== "string" || c.name.trim().length === 0) continue
        out.push({
            name: c.name.trim(),
            ...(typeof c.limit === "number" && Number.isFinite(c.limit) ? { limit: c.limit } : {}),
            ...(typeof c.status === "string" && c.status.length > 0 ? { status: c.status } : {}),
        })
    }
    return out
}

/** `analysed` only when a deep run produced coverages; a run without them is still `summary_only`. */
export function protectionDetailFrom(acordData: unknown): ProtectionDetail {
    return coverageInputsFrom(acordData).length > 0 ? "analysed" : "summary_only"
}

export function emptyCoverageModel(): CoverageModel {
    const model = {} as CoverageModel
    for (const id of AREA_IDS) model[id] = { lines: [], gaps: [], hasAnalysed: false }
    return model
}

export function buildCoverageModel(policies: readonly PolicyEvidenceInput[]): CoverageModel {
    const model = emptyCoverageModel()

    for (const policy of policies) {
        const { area, lob } = areaForPolicyLine(policy.lineOfBusiness)
        const held = isHeldBand(policy.lifecycle)
        const bucket = model[area]
        bucket.lines.push({
            lob,
            policyId: policy.id,
            lifecycle: policy.lifecycle,
            detail: policy.detail,
            evidence: protectionEvidence(policy.detail),
            held,
            coverages: policy.detail === "analysed" ? [...(policy.coverages ?? [])] : [],
        })
        for (const gap of policy.gaps) {
            bucket.gaps.push({ ...gap, policyId: policy.id, onHeldPolicy: held })
        }
    }

    for (const id of AREA_IDS) {
        const bucket = model[id]
        // Held first, then by band, then by id — a stable order the UI can trust.
        bucket.lines.sort(
            (a, b) =>
                Number(b.held) - Number(a.held) ||
                bandRank(a.lifecycle) - bandRank(b.lifecycle) ||
                a.policyId.localeCompare(b.policyId)
        )
        bucket.gaps.sort(
            (a, b) => Number(b.onHeldPolicy) - Number(a.onHeldPolicy) || a.policyId.localeCompare(b.policyId) || a.id.localeCompare(b.id)
        )
        bucket.hasAnalysed = bucket.lines.some((l) => l.held && l.detail === "analysed")
    }

    return model
}

/** Every line across the model, held ones first. */
export function allLines(model: CoverageModel): CoverageLine[] {
    return AREA_IDS.flatMap((id) => model[id].lines).sort((a, b) => Number(b.held) - Number(a.held))
}

/** Lines in force across the whole model — the set a risk may be answered by. */
export function heldLines(model: CoverageModel): CoverageLine[] {
    return allLines(model).filter((l) => l.held)
}

/** Does the area hold at least one line in force? Expired-only → false. */
export function areaHasHeldLine(model: CoverageModel, area: AttentionAreaId): boolean {
    return model[area].lines.some((l) => l.held)
}
