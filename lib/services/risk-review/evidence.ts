/**
 * Evidence closes a review — the pure half.
 *
 * A review asks the customer to LOOK at one sphere of their life. When a
 * policy for that sphere is analysed, the looking has happened: the document
 * is the answer, and leaving the card open would ask them to check our
 * homework (docs/planning/PERSONAL_RISK_PROFILE.md §I). This module decides
 * WHICH open reviews a finished analysis answers; the service applies it.
 *
 * Three rules, each guarded by tests/unit/risk-review-policy.test.ts:
 *
 *   - **Same sphere only.** A review's sphere is the life-event definition it
 *     was raised for (`domain` in the registry); a policy's is the attention
 *     area its line of business is listed under (lib/protection/domains.ts).
 *     They are compared at the `EventDomain` level because money carries three
 *     areas (income, debt, retirement) and a review knows only the sphere.
 *     A review with NO sphere — annual, quarterly, birthday, inactivity, an
 *     advisor assignment, a score drop, a critical gap — is about the whole
 *     picture and is never closed by one document.
 *   - **Only a held policy is evidence.** The same definition Layer 4 uses
 *     (`isHeldBand`): `active` / `expiring_soon`. An expired, cancelled or
 *     undated document answers nothing about the sphere today.
 *   - **A policy nobody could classify is presence, not an answer.** The
 *     taxonomy's residual `other` lands in `lifestyle` for display; it does
 *     not close a lifestyle review.
 *
 * The outcome word is `policy_evidence`, written to `RiskReview.outcome` — the
 * row's only free field, read by nothing that renders. The status is
 * `completed`: the review's purpose (the customer's cover for the sphere was
 * looked at) was met, and `outcome` is what makes the two closings
 * distinguishable in the export and the timeline.
 */

import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { areaForLob } from "@/lib/protection/domains"
import { isHeldBand, type PolicyLifecycleBand } from "@/lib/protection/coverage-model"
import type { PolicyStatus } from "@/lib/policy-status"
import { LIFE_EVENT_REGISTRY } from "@/lib/services/life-events/registry"
import type { EventDomain } from "@/lib/services/life-events/types"
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

const DEFINITION_BY_TRIGGER = new Map<ReviewTrigger, EventDomain>()
for (const def of LIFE_EVENT_REGISTRY) {
    const trigger = triggerForLifeEvent(def.id)
    // The generic trigger is shared by every unmapped event; its sphere comes
    // from the causing event's `definitionId`, never from the trigger alone.
    if (trigger !== "life_event" && !DEFINITION_BY_TRIGGER.has(trigger)) DEFINITION_BY_TRIGGER.set(trigger, def.domain)
}

/**
 * The sphere a review is about, or null when it is about the whole picture.
 *
 * `definitionId` is the causing life event's registry id (the business
 * event's payload) — required only for the generic `life_event` trigger.
 */
export function reviewDomain(review: { trigger: string; definitionId?: string | null }): EventDomain | null {
    if (review.trigger === "life_event") {
        const def = review.definitionId ? LIFE_EVENT_REGISTRY.find((d) => d.id === review.definitionId) : undefined
        return def?.domain ?? null
    }
    return DEFINITION_BY_TRIGGER.get(review.trigger as ReviewTrigger) ?? null
}

/** The sphere a policy is evidence for, or null when its line answers no named sphere. */
export function policyEvidenceDomain(lineOfBusiness: string | null | undefined): EventDomain | null {
    const lob = normalizeBranch(lineOfBusiness).id
    if (lob === "other") return null
    return areaForLob(lob)?.domain ?? null
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
    reviews: readonly EvidenceReviewRow[]
}

/**
 * The ids of the OPEN reviews this policy answers. Pure; the matrix the tests
 * pin: same sphere closes, another sphere stays, a policy that is not held
 * closes nothing, a review already closed is never touched.
 */
export function decideEvidenceClosures(input: EvidenceClosureInput): string[] {
    if (!isHeldBand(input.lifecycle)) return []
    const domain = policyEvidenceDomain(input.lineOfBusiness)
    if (!domain) return []
    return input.reviews
        .filter((r) => r.status === "open" && reviewDomain(r) === domain)
        .map((r) => r.id)
}
