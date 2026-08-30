/**
 * The business event catalog — the source of truth for what can happen.
 *
 * Specification: docs/architecture/business-events.md
 *
 * A business event is a fact that happened in the insurance domain, stated in
 * the past tense, that would still be true if PolicyWallet had no
 * notifications, no AI and no advisors. Everything else — a notification, a
 * recommendation, an advisor task, a score recomputation, an audit row — is a
 * consumer's REACTION, decided downstream. Producers never know their consumers
 * exist.
 *
 * Two rules that settle most modelling questions:
 *
 * 1. If it would not be true without the feature, it is not a business event.
 *    `notification.delivered` is a PLATFORM event; it lives in its own
 *    namespace and may never drive domain automation, or a delivery failure
 *    could come to change a customer's risk profile.
 *
 * 2. An event per value of a field is a modelling smell. There is no
 *    `protection_score.improved` AND `.declined` — there is `.changed` carrying
 *    a direction. A consumer that cares filters; one that does not is not
 *    forced to subscribe twice.
 */

/** Aggregates events belong to. The entity the fact is about. */
export const AGGREGATES = [
    "customer",
    "household",
    "life_event",
    "risk_profile",
    "protection_score",
    "coverage_gap",
    "portfolio",
    "policy",
    "advisor",
    "claim",
    "questionnaire",
    "recommendation",
    "subscription",
    "payment",
    "ai",
    "platform",
    // Grafí application tier: a finding shown, a benefit surfaced, a question
    // answered — facts about what the product did for a customer, which the
    // «Τι έκανα για εσάς φέτος» ledger projects (lib/app/ledger.ts).
    "finding",
    "benefit",
    "question",
] as const
export type Aggregate = (typeof AGGREGATES)[number]

export type EventPriority = "P0" | "P1" | "P2" | "P3"

/**
 * `fact` — something happened to a customer or their portfolio.
 * `derived` — a computation reached a conclusion. Produced by a SUBSCRIBER,
 * never by a controller, and published only when materially different.
 */
export type EventKind = "fact" | "derived"

/**
 * The twelve things the system can do in response to an event.
 *
 * This is the complete action vocabulary. A workflow is
 * `event → decision engine → actions`, and an action outside this list means
 * the workflow is doing something the architecture has not accounted for.
 */
export const ACTIONS = [
    "email",
    "push",
    "in_app",
    "advisor_notification",
    "admin_notification",
    "ai_recommendation",
    "risk_recalculation",
    "protection_score_update",
    "coverage_gap_update",
    "scheduled_review",
    "analytics",
    "audit_log",
] as const
export type ActionType = (typeof ACTIONS)[number]

export interface EventDefinition {
    /** `aggregate.verb_past`. The public contract — domain language, not internals. */
    name: string
    aggregate: Aggregate
    kind: EventKind
    priority: EventPriority
    /**
     * INTERNAL DOCUMENTATION — a sentence for operators and developers,
     * English by convention. It must never be rendered to a user or stored in
     * a notification's title/message: until Aug 2026 the generic executor fed
     * it straight into `orchestrate`, which is how "AI extraction read the
     * policy successfully" reached Greek customers verbatim. Customer-facing
     * text lives in the notification registry's bilingual `copy`.
     */
    description: string
    /** What causes it, naming the code seam so the claim stays checkable. */
    trigger: string
    /** Payload fields a consumer may rely on. Additive-only within a version. */
    payloadFields: readonly string[]
    /**
     * Actions the decision engine may take. The engine decides WHETHER; this
     * bounds WHAT. An event cannot acquire a new kind of consequence without a
     * declaration here.
     */
    actions: readonly ActionType[]
    /**
     * Payload schema version. Additive-only within a major; a breaking change
     * is a new version with an upcaster, so a two-year-old event still replays.
     * Omitted means 1.
     */
    version?: number
    /** `live` = something publishes it. `planned` = declared, not yet wired. */
    status: "live" | "planned"
    /** Why a planned event is not wired. Required, and test-enforced. */
    note?: string
}

const def = (d: EventDefinition) => d

export const BUSINESS_EVENTS: Record<string, EventDefinition> = {
    // ── Policy ───────────────────────────────────────────────────────────────

    "policy.created": def({
        name: "policy.created",
        aggregate: "policy",
        kind: "fact",
        priority: "P1",
        description: "A policy entered the customer's wallet",
        trigger: "Policy row committed by upload, advisor entry or onboarding",
        payloadFields: ["policyId", "insurerName", "policyNumber", "lineOfBusiness", "addedByAdvisor"],
        actions: ["risk_recalculation", "in_app", "audit_log", "analytics"],
        status: "live",
    }),

    "policy.coverage_changed": def({
        name: "policy.coverage_changed",
        aggregate: "policy",
        kind: "fact",
        priority: "P1",
        description: "A policy's cover, dates or premium changed",
        trigger: "Policy update commits a material field change",
        payloadFields: ["policyId", "changedFields", "actorIsOwner"],
        actions: ["risk_recalculation", "in_app", "email", "audit_log"],
        status: "live",
    }),

    "policy.deleted": def({
        name: "policy.deleted",
        aggregate: "policy",
        kind: "fact",
        priority: "P0",
        description: "A policy was removed from the wallet",
        trigger: "deletePolicy commits",
        payloadFields: ["policyId", "insurerName", "policyNumber"],
        // Destructive, and a managing advisor can do it — the owner is always told.
        actions: ["risk_recalculation", "in_app", "email", "push", "audit_log"],
        status: "live",
    }),

    "policy.merged": def({
        name: "policy.merged",
        aggregate: "policy",
        kind: "fact",
        priority: "P2",
        description: "Two records of one policy were reconciled",
        trigger: "PolicyMergeRequest approved and applied",
        payloadFields: ["mergedIntoPolicyId", "policyNumber"],
        actions: ["risk_recalculation", "in_app", "audit_log", "analytics"],
        status: "live",
    }),

    "policy.analysis_completed": def({
        name: "policy.analysis_completed",
        aggregate: "policy",
        kind: "derived",
        priority: "P1",
        description: "AI extraction read the policy successfully",
        trigger: "PolicyAnalysisRun reaches completed",
        payloadFields: ["policyId", "runId", "insurerName", "policyNumber", "confidence", "provider"],
        actions: ["risk_recalculation", "in_app", "email", "push", "analytics", "audit_log"],
        status: "live",
    }),

    "policy.analysis_failed": def({
        name: "policy.analysis_failed",
        aggregate: "policy",
        kind: "fact",
        priority: "P1",
        description: "AI extraction did not complete",
        trigger: "PolicyAnalysisRun terminates in failed",
        payloadFields: ["policyId", "runId", "reason"],
        // The customer handed us a document and is owed the outcome. Silence
        // reads as "still working". `analytics` because the failure RATE is the
        // number that tells operations whether the pipeline is healthy.
        actions: [
            "in_app", "email", "push", "advisor_notification",
            "admin_notification", "audit_log", "analytics",
        ],
        status: "live",
    }),

    "policy.extraction_flagged": def({
        name: "policy.extraction_flagged",
        aggregate: "policy",
        kind: "fact",
        priority: "P1",
        description: "An extracted reading was flagged as untrustworthy",
        trigger: "Reviewer flags, or a field lands below the confidence floor",
        payloadFields: ["policyId", "reason", "overallConfidence"],
        actions: ["advisor_notification", "in_app", "audit_log"],
        status: "live",
    }),

    "policy.renewal_approaching": def({
        name: "policy.renewal_approaching",
        aggregate: "policy",
        kind: "derived",
        priority: "P1",
        description: "A policy reached a renewal reminder milestone",
        trigger: "renewal-check scheduler, milestone ladder 90/60/30/15/7",
        payloadFields: ["policyId", "milestone", "daysUntilExpiry", "endDate"],
        actions: ["in_app", "email", "push", "advisor_notification", "scheduled_review", "analytics"],
        status: "live",
    }),

    "policy.lapsed": def({
        name: "policy.lapsed",
        aggregate: "policy",
        kind: "derived",
        priority: "P0",
        description: "A policy passed its end date without being renewed",
        trigger: "renewal-check finds endDate in the past and no successor",
        payloadFields: ["policyId", "renewalId", "endDate", "lineOfBusiness"],
        // Motor cover is compulsory in Greece: the customer may now be driving
        // unlawfully as well as uninsured.
        actions: [
            "in_app", "email", "push", "advisor_notification",
            "risk_recalculation", "audit_log",
        ],
        status: "live",
    }),

    "policy.shared": def({
        name: "policy.shared",
        aggregate: "policy",
        kind: "fact",
        priority: "P0",
        description: "A policy was shared with an advisor",
        trigger: "AccessGrant created over a policy",
        payloadFields: ["policyId", "granteeUserId", "permissions"],
        actions: ["in_app", "email", "audit_log"],
        status: "live",
    }),

    // ── Risk ─────────────────────────────────────────────────────────────────

    "risk_profile.recalculated": def({
        name: "risk_profile.recalculated",
        aggregate: "risk_profile",
        kind: "derived",
        priority: "P1",
        description: "The customer's risk assessment materially changed",
        // Published only when contextHash moves — a nightly cron over a stable
        // book publishes nothing.
        trigger: "recordRiskProfileVersion writes a new version",
        payloadFields: ["version", "trigger", "lifeEventId", "overallScore", "previousScore", "openFindingCount"],
        actions: ["protection_score_update", "coverage_gap_update", "ai_recommendation", "analytics"],
        status: "live",
    }),

    "protection_score.changed": def({
        name: "protection_score.changed",
        aggregate: "protection_score",
        kind: "derived",
        priority: "P2",
        description: "The stored breadth figure moved materially",
        trigger: "Version delta clears the materiality threshold",
        payloadFields: ["previousScore", "currentScore", "delta", "direction", "cause"],
        // Advisor + analytics ONLY. `in_app` and `email` were removed with the
        // protection score itself (Aug 2026, PW-MOBILE-TRANSFORM-01 H-001):
        // this event may never again produce a customer-facing message.
        actions: ["advisor_notification", "analytics"],
        status: "live",
    }),

    "coverage_gap.opened": def({
        name: "coverage_gap.opened",
        aggregate: "coverage_gap",
        kind: "derived",
        priority: "P1",
        description: "A risk transitioned into an unprotected state",
        // Never raised because a PRODUCT is absent — only because an EXPOSURE
        // is unmet.
        trigger: "diffVersions reports an `opened` transition",
        payloadFields: ["riskIds", "primaryRiskId", "severity", "gapCount", "lineOfBusiness"],
        actions: ["in_app", "email", "push", "advisor_notification", "ai_recommendation", "analytics"],
        status: "live",
    }),

    "coverage_gap.closed": def({
        name: "coverage_gap.closed",
        aggregate: "coverage_gap",
        kind: "derived",
        priority: "P2",
        description: "A risk became protected",
        trigger: "diffVersions reports a `closed` transition",
        payloadFields: ["riskIds", "primaryRiskId"],
        // Good news does not deserve an interruption.
        actions: ["in_app", "analytics"],
        status: "live",
    }),

    "risk_profile.risk_level_changed": def({
        name: "risk_profile.risk_level_changed",
        aggregate: "risk_profile",
        kind: "derived",
        priority: "P2",
        description: "A risk changed status without opening or closing",
        trigger: "diffVersions reports cover_lost / priority_up / priority_down",
        payloadFields: ["riskIds", "primaryRiskId", "kinds"],
        actions: ["in_app", "analytics"],
        status: "live",
    }),

    "recommendation.generated": def({
        name: "recommendation.generated",
        aggregate: "recommendation",
        kind: "derived",
        priority: "P2",
        description: "New recommendations were produced for the customer",
        trigger: "syncRecommendations created at least one",
        payloadFields: ["count", "ruleIds"],
        actions: ["in_app", "advisor_notification", "analytics"],
        status: "live",
    }),

    "recommendation.accepted": def({
        name: "recommendation.accepted",
        aggregate: "recommendation",
        kind: "fact",
        priority: "P2",
        description: "The customer acted on a recommendation",
        trigger: "PATCH /recommendations/[id] with action=actioned",
        payloadFields: ["recommendationId", "ruleId"],
        // Under IDD / Law 4583/2018 the regulated act is the ADVICE, not our
        // analysis: acceptance hands off to a human.
        actions: ["advisor_notification", "analytics", "audit_log"],
        status: "live",
    }),

    "recommendation.dismissed": def({
        name: "recommendation.dismissed",
        aggregate: "recommendation",
        kind: "fact",
        priority: "P3",
        description: "The customer declined a recommendation",
        trigger: "PATCH /recommendations/[id] with action=dismiss",
        payloadFields: ["recommendationId", "ruleId", "reason"],
        // Notifying someone about their own click is noise.
        actions: ["analytics", "audit_log"],
        status: "live",
    }),

    // ── Customer, household, life ────────────────────────────────────────────

    "life_event.declared": def({
        name: "life_event.declared",
        aggregate: "life_event",
        kind: "fact",
        priority: "P1",
        description: "The customer told us their life changed",
        trigger: "declareLifeEvent commits a LifeEventInstance",
        payloadFields: ["lifeEventId", "definitionId", "label", "backfilled"],
        actions: [
            "risk_recalculation", "in_app", "email", "advisor_notification",
            "scheduled_review", "audit_log",
        ],
        status: "live",
    }),

    "customer.profile_updated": def({
        name: "customer.profile_updated",
        aggregate: "customer",
        kind: "fact",
        priority: "P1",
        description: "The customer's profile, household or assets changed",
        trigger: "A profile write path commits",
        payloadFields: ["changedFields", "actorIsSubject"],
        // No self-notification: telling someone what they did ten seconds ago is
        // noise. The RISK consequence is a separate, derived event.
        actions: ["risk_recalculation", "audit_log", "analytics"],
        status: "live",
    }),

    "questionnaire.completed": def({
        name: "questionnaire.completed",
        aggregate: "questionnaire",
        kind: "fact",
        priority: "P1",
        description: "The customer completed a questionnaire",
        trigger: "QuestionnaireInstance transitions to completed",
        payloadFields: ["instanceId", "templateId", "answeredCount"],
        actions: ["risk_recalculation", "advisor_notification", "in_app", "analytics"],
        status: "live",
    }),

    "customer.became_inactive": def({
        name: "customer.became_inactive",
        aggregate: "customer",
        kind: "derived",
        priority: "P2",
        description: "The customer has not engaged for a sustained period",
        trigger: "churn-prevention scoring crosses an inactivity tier",
        payloadFields: ["tier", "daysSinceActive"],
        actions: ["email", "in_app", "advisor_notification", "analytics"],
        status: "live",
    }),

    // ── Advisor ──────────────────────────────────────────────────────────────

    "advisor.linked": def({
        name: "advisor.linked",
        aggregate: "advisor",
        kind: "fact",
        priority: "P0",
        description: "An advisor and a customer were connected",
        trigger: "CustomerRelationship becomes active",
        payloadFields: ["relationshipId", "advisorUserId"],
        // Another person gains sight of insurance records; both sides are told
        // and the access is logged.
        actions: ["in_app", "email", "audit_log"],
        status: "live",
    }),

    "advisor.unlinked": def({
        name: "advisor.unlinked",
        aggregate: "advisor",
        kind: "fact",
        priority: "P0",
        description: "An advisor relationship ended",
        trigger: "CustomerRelationship transitions to terminated",
        payloadFields: ["relationshipId", "advisorUserId"],
        actions: ["in_app", "email", "audit_log"],
        status: "planned",
        note: "No emitter yet. Termination happens in more than one place and the paths must be unified first; publishing from only one would tell some customers their advisor lost access and not others, which is worse than telling none.",
    }),

    // ── Billing ──────────────────────────────────────────────────────────────

    "payment.failed": def({
        name: "payment.failed",
        aggregate: "payment",
        kind: "fact",
        priority: "P0",
        description: "A subscription payment was declined",
        trigger: "Stripe invoice.payment_failed",
        payloadFields: ["stripeEventId", "subscriptionId", "attemptCount"],
        actions: [
            "in_app", "email", "push", "admin_notification",
            "advisor_notification", "scheduled_review", "audit_log", "analytics",
        ],
        status: "live",
    }),

    "subscription.expired": def({
        name: "subscription.expired",
        aggregate: "subscription",
        kind: "fact",
        priority: "P0",
        description: "A subscription ended",
        trigger: "Stripe customer.subscription.deleted, or the period lapsed",
        payloadFields: ["stripeEventId", "subscriptionId"],
        actions: ["in_app", "email", "audit_log", "analytics"],
        status: "live",
    }),

    "subscription.changed": def({
        name: "subscription.changed",
        aggregate: "subscription",
        kind: "fact",
        priority: "P1",
        description: "The customer's plan changed",
        trigger: "Stripe lifecycle changes the plan or price",
        payloadFields: ["stripeEventId", "subscriptionId", "previousPriceId", "currentPriceId"],
        actions: ["in_app", "email", "audit_log", "analytics"],
        status: "live",
    }),

    // ── Claims — the aggregate does not exist yet ────────────────────────────

    "claim.registered": def({
        name: "claim.registered",
        aggregate: "claim",
        kind: "fact",
        priority: "P0",
        description: "A claim was opened against a policy",
        trigger: "No source — PolicyWallet has no claims model",
        payloadFields: ["claimId", "policyId", "incidentAt", "amountClaimed"],
        actions: [
            "in_app", "email", "push", "advisor_notification",
            "risk_recalculation", "audit_log", "analytics",
        ],
        status: "planned",
        note: "Blocked on a Claim aggregate — no table, no thread category, nothing that could produce it. Inventing an emitter for an unreachable state would be worse than the gap. Adding it is one entry here plus one publisher.",
    }),

    "claim.status_changed": def({
        name: "claim.status_changed",
        aggregate: "claim",
        kind: "fact",
        priority: "P0",
        description: "A claim moved between states",
        trigger: "No source — PolicyWallet has no claims model",
        payloadFields: ["claimId", "from", "to", "reason"],
        actions: ["in_app", "email", "push", "advisor_notification", "audit_log", "analytics"],
        status: "planned",
        note: "Blocked on a Claim aggregate. A rejection must carry its reason — 'rejected' without one is the worst notification an insurance product can send.",
    }),

    "claim.settled": def({
        name: "claim.settled",
        aggregate: "claim",
        kind: "fact",
        priority: "P0",
        description: "A claim was settled",
        trigger: "No source — PolicyWallet has no claims model",
        payloadFields: ["claimId", "amountSettled", "amountClaimed"],
        actions: ["in_app", "email", "advisor_notification", "risk_recalculation", "analytics"],
        status: "planned",
        note: "Blocked on a Claim aggregate. Settlement is the only ground truth the risk engine would ever get about whether cover was adequate — the data the prediction seam has been waiting for.",
    }),

    // ── Grafí application tier (B2C rebuild) ─────────────────────────────────
    // Declared here so the ledger («Τι έκανα για εσάς φέτος») is a projection
    // over facts and never a hand-typed list. Each flips to `live` in the goal
    // that wires its emitter (G7 findings, G9 benefits, G8 questions, G10 help,
    // G11 household) — a planned event that nothing publishes is stated as such.

    "finding.shown": def({
        name: "finding.shown",
        aggregate: "finding",
        kind: "derived",
        priority: "P2",
        description: "A specific, source-backed finding was shown to the customer",
        trigger: "The specificity gate passes a finding and a surface renders it (lib/app/finding.ts)",
        payloadFields: ["findingId", "hash", "kind", "tier", "policyId", "ruleId"],
        actions: ["analytics", "audit_log"],
        status: "planned",
        note: "Emitted by the Grafí app tier's / and /see routes (G7/G8) once they ship.",
    }),

    "benefit.surfaced": def({
        name: "benefit.surfaced",
        aggregate: "benefit",
        kind: "derived",
        priority: "P3",
        description: "A benefit the customer already pays for was surfaced on /money",
        trigger: "The /money route lists a perk, check-up, roadside or ENFIA item from the customer's own policies",
        payloadFields: ["policyId", "benefitKind", "benefitKey"],
        actions: ["analytics", "audit_log"],
        status: "planned",
        note: "Emitted by /money (G9) once it ships.",
    }),

    "question.answered": def({
        name: "question.answered",
        aggregate: "question",
        kind: "fact",
        priority: "P2",
        description: "The customer asked about a policy in plain words and received an answer",
        trigger: "PolicyQA completes an answer on /policies/[id]",
        payloadFields: ["policyId", "questionKey"],
        actions: ["analytics", "audit_log"],
        status: "planned",
        note: "Emitted by /policies/[id] (G8) once it ships.",
    }),

    "advisor.help_requested": def({
        name: "advisor.help_requested",
        aggregate: "advisor",
        kind: "fact",
        priority: "P1",
        description: "The customer sent a finding to their own adviser with explicit consent",
        trigger: "The help flow's ConsentSheet switch (/adviser/help/[findingId]) writes AdviserShareAudit{help_sent}",
        payloadFields: ["findingId", "advisorUserId", "policyIds", "profileFields"],
        actions: ["advisor_notification", "in_app", "audit_log", "analytics"],
        status: "planned",
        note: "Emitted by the help flow (G10) once it ships.",
    }),

    "household.person_added": def({
        name: "household.person_added",
        aggregate: "household",
        kind: "fact",
        priority: "P2",
        description: "A person was added to the customer's household",
        trigger: "/me/household writes a HouseholdPerson row",
        payloadFields: ["householdPersonId", "relation", "isDependant"],
        actions: ["risk_recalculation", "audit_log", "analytics"],
        status: "planned",
        note: "Emitted by /me/household (G11) once it ships.",
    }),

}

export type BusinessEventName = keyof typeof BUSINESS_EVENTS

export function getEventDefinition(name: string): EventDefinition | null {
    return BUSINESS_EVENTS[name] ?? null
}

export function isKnownEvent(name: string): boolean {
    return name in BUSINESS_EVENTS
}

export function liveEvents(): EventDefinition[] {
    return Object.values(BUSINESS_EVENTS).filter((e) => e.status === "live")
}

/** Does this event's declaration permit that action at all? */
export function permitsAction(name: string, action: ActionType): boolean {
    return getEventDefinition(name)?.actions.includes(action) ?? false
}
