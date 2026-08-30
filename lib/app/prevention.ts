/**
 * Prevention readiness — TYPES ONLY (§9, product-evolution NOW/NEXT/FUTURE).
 *
 * Nothing here is rendered, stored or emitted. The shape exists so a future
 * preventive opportunity can reference a life event, an observed issue, its
 * evidence, an optional action, eligibility, the user's decision, a real
 * service and an outcome WITHOUT restructuring the household, profile,
 * finding or life-event models. No opportunity may ever be generated from an
 * unsupported AI inference, and no personal risk/health/safety score exists.
 *
 * tests/unit/app-prevention-types-only.test.ts asserts: no import of this
 * module outside lib/app, no `prevention.*` analytics call site, no table.
 */
import type { FindingSource } from "./finding"

export type PreventionEvidenceKind = "document" | "profile" | "rule" | "authoritative_source"

export interface PreventionEvidence {
    kind: PreventionEvidenceKind
    /** A finding-style source pointer when the evidence is a document. */
    source?: FindingSource
    /** Authoritative external source: name + url + date, never a bare claim. */
    reference?: { name: string; url: string; retrievedOn: string }
}

export type PreventionDecision = "undecided" | "wants_to_act" | "declined" | "not_now"
export type PreventionOutcome = "not_started" | "started" | "completed" | "abandoned"

/** A real, approved service — never a directory entry, never a suggestion. */
export interface PreventionServiceRef {
    providerId: string
    serviceId: string
    approvedOn: string
}

export interface PreventionOpportunity {
    id: string
    householdPersonId: string | null
    lifeEventId: string | null
    observedIssue: { key: string; params: Record<string, string | number> }
    evidence: PreventionEvidence[]
    action: { key: string; params: Record<string, string | number> } | null
    eligibility: { eligible: boolean; reasonKey: string | null }
    decision: PreventionDecision
    service: PreventionServiceRef | null
    outcome: PreventionOutcome
}

/** Reserved analytics names — a type, deliberately with no emitter. */
export type PreventionAnalyticsEvent =
    | "prevention.opportunity_shown"
    | "prevention.action_started"
    | "prevention.action_completed"
    | "prevention.service_connected"
