/**
 * Evidence closes a review — the pure half.
 *
 * A review asks the customer to LOOK at one area of their life. When a
 * policy for that area is ANALYSED, the looking has happened: the document
 * is the answer, and leaving the card open would ask them to check our
 * homework (docs/planning/PERSONAL_RISK_PROFILE.md §I). This module decides
 * WHICH open reviews a finished analysis answers; the service applies it.
 *
 * Four rules, each guarded by tests/unit/risk-review-policy.test.ts:
 *
 *   - **Same AREA only — never the same sphere.** A review's area is the one
 *     its life event asks the customer to look at (`EVENT_AREA`, one row per
 *     registry event, guarded to stay complete); a policy's is the attention
 *     area its line of business is listed under (`areaForLob`,
 *     lib/protection/domains.ts). They were compared at the `EventDomain`
 *     level until Sept 2026, and `money` carries three areas: a pension closed
 *     the mortgage review, and `mobility` carried the boat, so a car policy
 *     closed the boat review. A review with NO area — annual, quarterly,
 *     birthday, inactivity, an advisor assignment, a score drop, a critical
 *     gap — is about the whole picture and is never closed by one document.
 *   - **Only a held policy is evidence.** The same definition Layer 4 uses
 *     (`isHeldBand`): `active` / `expiring_soon`. An expired, cancelled or
 *     undated document answers nothing about the area today.
 *   - **Only an ANALYSED policy closes.** `detail: analysed` means a deep run
 *     produced `acordData.coverages[]` — the limits were read. A summary-only
 *     extraction proves the policy exists, not what it answers, so it leaves
 *     the review open. Nothing is recorded for it: `RiskReview` has no
 *     evidence field and none is added — `outcome` is the closing word.
 *   - **A policy nobody could classify is presence, not an answer.** The
 *     taxonomy's residual `other` lands in `lifestyle` for display; it does
 *     not close a lifestyle review.
 *
 * The outcome word is `policy_evidence`, written to `RiskReview.outcome` — the
 * row's only free field, read by nothing that renders. The status is
 * `completed`: the review's purpose (the customer's cover for the area was
 * looked at) was met, and `outcome` is what makes the two closings
 * distinguishable in the export and the timeline.
 */

import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { areaForLob, type AttentionAreaId } from "@/lib/protection/domains"
import { isHeldBand, type PolicyLifecycleBand } from "@/lib/protection/coverage-model"
import type { ProtectionDetail } from "@/lib/protection/evidence"
import type { PolicyStatus } from "@/lib/policy-status"
import { LIFE_EVENT_REGISTRY } from "@/lib/services/life-events/registry"
import { triggerForLifeEvent, type ReviewTrigger } from "./policy"

/** The word on the row. The service is the only writer (source guard). */
export const REVIEW_OUTCOME_POLICY_EVIDENCE = "policy_evidence"

/**
 * `resolvePolicyLifecycle().status` → the coverage model's band, the way the
 * attention-areas loader reads it (lib/protection/load-attention-areas.ts):
 * `action_needed` is a policy in force whose IDENTITY is incomplete — the
 * cover is not — so it is held; cancelled and undated are presence we cannot
 * place in time.
 */
export function lifecycleBand(status: PolicyStatus): PolicyLifecycleBand {
    if (status === "active" || status === "action_needed") return "active"
    if (status === "expiring_soon" || status === "expired") return status
    return "other"
}

/**
 * The attention area each registry event asks the customer to look at —
 * one row per life event, listed once, keyed by the registry id.
 *
 * This is NOT a line→area or risk→area table (those live in
 * lib/protection/domains.ts alone); it is the money / work / mobility /
 * lifestyle SPLIT that the registry's eight spheres cannot express: `money`
 * is debt for a mortgage and income for a raise; `work` is retirement for
 * retiring; `mobility` is lifestyle for a boat, because the boat risk and
 * the boat lines are listed there. The guard in
 * tests/unit/risk-review-policy.test.ts enumerates the registry from disk and
 * fails on an event that is unmapped, mapped twice, or mapped to an area
 * outside its own sphere without being named in EVENT_AREA_CROSSES_SPHERE.
 */
export const EVENT_AREA: Readonly<Record<string, AttentionAreaId>> = {
    marriage: "household",
    divorce: "household",
    birth: "household",
    child_leaves_home: "household",
    property_purchase: "residence",
    renting: "residence",
    property_sale: "property",
    letting_start: "property",
    // `money`, split three ways.
    mortgage: "debt",
    mortgage_cleared: "debt",
    income_increase: "income",
    vehicle_purchase: "mobility",
    motorcycle_purchase: "mobility",
    vehicle_disposal: "mobility",
    // The registry files the boat under mobility; the boat risk and every
    // boat line are listed under lifestyle, so that is where the evidence is.
    boat_purchase: "lifestyle",
    pet_adoption: "lifestyle",
    travel_frequency_increase: "lifestyle",
    // Filed under lifestyle by the registry; the `valuables_loss` risk and
    // the `fine_art` line sit with property, so a scheduled-valuables policy
    // is the evidence.
    high_value_purchase: "property",
    business_creation: "work",
    hired_employees: "work",
    // Filed under work by the registry; the pension question is its own area.
    retirement: "retirement",
    health_change: "health",
}

/** The events whose area is deliberately not in their registry sphere, with the reason above. */
export const EVENT_AREA_CROSSES_SPHERE: ReadonlySet<string> = new Set(["boat_purchase", "high_value_purchase", "retirement"])

const DEFINITION_BY_TRIGGER = new Map<ReviewTrigger, string>()
for (const def of LIFE_EVENT_REGISTRY) {
    const trigger = triggerForLifeEvent(def.id)
    // The generic trigger is shared by every unmapped event; its area comes
    // from the causing event's `definitionId`, never from the trigger alone.
    if (trigger !== "life_event" && !DEFINITION_BY_TRIGGER.has(trigger)) DEFINITION_BY_TRIGGER.set(trigger, def.id)
}

/**
 * The area a review is about, or null when it is about the whole picture.
 *
 * `definitionId` is the causing life event's registry id (the business
 * event's payload) — required only for the generic `life_event` trigger.
 */
export function reviewArea(review: { trigger: string; definitionId?: string | null }): AttentionAreaId | null {
    const definitionId =
        review.trigger === "life_event" ? (review.definitionId ?? null) : (DEFINITION_BY_TRIGGER.get(review.trigger as ReviewTrigger) ?? null)
    if (!definitionId) return null
    return EVENT_AREA[definitionId] ?? null
}

/** The area a policy is evidence for, or null when its line answers no named area. */
export function policyEvidenceArea(lineOfBusiness: string | null | undefined): AttentionAreaId | null {
    const lob = normalizeBranch(lineOfBusiness).id
    if (lob === "other") return null
    return areaForLob(lob)?.id ?? null
}

export interface EvidenceReviewRow {
    id: string
    status: string
    trigger: string
    definitionId?: string | null
}

export interface EvidenceClosureInput {
    lineOfBusiness: string | null | undefined
    lifecycle: PolicyLifecycleBand
    /** `analysed` only when the deep run produced coverages (lib/protection/coverage-model.ts). */
    detail: ProtectionDetail
    reviews: readonly EvidenceReviewRow[]
}

/**
 * The ids of the OPEN reviews this policy answers. Pure; the matrix the tests
 * pin: same area closes, another area stays (a sibling area of the same
 * sphere included), a policy that is not held or not analysed closes nothing,
 * a review already closed is never touched.
 */
export function decideEvidenceClosures(input: EvidenceClosureInput): string[] {
    if (!isHeldBand(input.lifecycle)) return []
    if (input.detail !== "analysed") return []
    const area = policyEvidenceArea(input.lineOfBusiness)
    if (!area) return []
    return input.reviews
        .filter((r) => r.status === "open" && reviewArea(r) === area)
        .map((r) => r.id)
}
