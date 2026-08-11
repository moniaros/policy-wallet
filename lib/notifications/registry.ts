/**
 * The business-event registry: every notification PolicyWallet can send,
 * declared once.
 *
 * A PolicyWallet notification is not a reminder — it is the visible end of a
 * business event. This file is what makes that enforceable: the event is
 * declared here with its priority, its recipients, its retry and escalation
 * rules and its expiry, and every channel reads the SAME declaration. A channel
 * is transport. It holds no business logic, decides nothing, and cannot
 * disagree with another channel about what an event means, because there is
 * only one place where that is written down.
 *
 * Before this existed there were three ways to emit — `sendNotification`,
 * `notifyCounterparty`, and ~20 direct `db.notificationEvent.create` calls that
 * hardcoded `channel: 'in_app'` at the call site. Which one a caller happened to
 * reach for decided whether the user's preferences were honoured and which
 * channels were even reachable. That is per-channel business logic duplicated
 * across call sites, which is exactly what the architecture forbids.
 *
 * `status: 'planned'` is a first-class value. An event that ought to fire but
 * has no emitter yet is declared here and marked planned, so the gap is visible
 * and test-enforced rather than silently missing — which is how eleven of the
 * brief's required triggers came to emit nothing at all.
 */

// ── Vocabulary ───────────────────────────────────────────────────────────────

/**
 * `analytics` is not a delivery channel. It is a server-side mirror that shares
 * this table, and it is named so that no notification surface picks it up: rows
 * with `title: "conv_checkout_completed"` and a JSON body were being rendered to
 * customers as notifications, and counted on the unread badge.
 */
export type NotificationChannel =
    | "in_app"
    | "email"
    | "push"
    // Declared, not built. Present in the vocabulary so an event can express
    // that it WOULD use them and so adding transport later is one adapter file
    // rather than a change to every event that wants it.
    | "sms"
    | "whatsapp"
    | "webhook"
    // Staff channels: an operations alert belongs where operations already are.
    | "slack"
    | "teams"
    | "analytics"

export const DELIVERABLE_CHANNELS = [
    "in_app", "email", "push", "sms", "whatsapp", "webhook", "slack", "teams",
] as const

/** Channels a user is shown, and can read. Only in-app has read state. */
export const SURFACED_CHANNELS = ["in_app"] as const

export type NotificationPriority = "critical" | "high" | "normal" | "low"

export type NotificationCategory =
    | "security"
    | "billing"
    | "risk"
    | "policy"
    | "advisory"
    | "engagement"
    | "admin"
    | "analytics"

/**
 * Who the notification is for, resolved by the caller into a real user id. Kept
 * abstract here because the registry describes the EVENT, not one occurrence of
 * it: a renewal notifies the policy owner and, when there is one, their advisor.
 */
export type RecipientKind = "owner" | "advisor" | "counterparty" | "admin"

export interface RetryPolicy {
    /** Total delivery attempts including the first. 1 = no retry. */
    attempts: number
    backoff: "none" | "linear" | "exponential"
    /** First retry delay; exponential doubles it each time. */
    baseDelayMinutes: number
}

export interface EscalationRule {
    /** Escalate after this many consecutive delivery failures. */
    afterFailures?: number
    /** Escalate when still unread after this many hours (in-app only). */
    afterUnreadHours?: number
    notify: RecipientKind
    /** The event emitted when the threshold is crossed. */
    event: string
}

export interface NotificationEventDefinition {
    /** What happened, in the language of the business. */
    businessEvent: string
    /** The condition that fires it, naming the code seam so it stays checkable. */
    triggerCondition: string
    category: NotificationCategory
    priority: NotificationPriority
    /**
     * Channels this event delivers on. A channel whose transport is not
     * configured is not attempted and writes NO row — you cannot audit a
     * delivery the system was never capable of making. A channel refused by the
     * user DOES write a row, because honouring a choice is worth recording.
     */
    channels: NotificationChannel[]
    recipients: RecipientKind[]
    /**
     * Transactional events bypass preferences. Reserved for things a user
     * cannot meaningfully consent away from: a failed payment, a security
     * event, a confirmation of something they just did. Everything else is
     * suppressible, and the settings screen must be able to reach it.
     */
    transactional: boolean
    /** What the recipient is being asked to do, or null when purely informational. */
    requiredAction: string | null
    escalation: EscalationRule | null
    retry: RetryPolicy
    /**
     * After this, delivery is abandoned. A renewal reminder that arrives three
     * weeks late is worse than one that never came.
     */
    expiresAfterHours: number | null
    /** Where the audit trail lands, beyond the notification row itself. */
    audit: "notification_event" | "activity_log"
    status: "live" | "planned"
    /** For live events: the module that emits it. Checked by the guard test. */
    emittedBy?: string
    /**
     * The emitter builds this event's name at runtime (`conv_${type}`,
     * `type === "nps" ? … : …`), so a static scan cannot see it. Set explicitly
     * rather than loosening the has-an-emitter guard, which is the one that
     * catches a declared trigger nothing actually fires.
     */
    emittedDynamically?: boolean
    /** Notes for planned events, or caveats worth keeping next to the rule. */
    note?: string
}

// ── Shared policies ──────────────────────────────────────────────────────────

const NO_RETRY: RetryPolicy = { attempts: 1, backoff: "none", baseDelayMinutes: 0 }
const STANDARD_RETRY: RetryPolicy = { attempts: 3, backoff: "exponential", baseDelayMinutes: 15 }
const PERSISTENT_RETRY: RetryPolicy = { attempts: 5, backoff: "exponential", baseDelayMinutes: 30 }

const HOUR = 1
const DAY = 24
const WEEK = 7 * DAY

/** In-app + email + push: the default reach for anything a customer must see. */
const FULL_REACH: NotificationChannel[] = ["in_app", "email", "push"]
/** Things that belong in the product, not the inbox. */
const IN_APP_ONLY: NotificationChannel[] = ["in_app"]
/** Digests and drips: the inbox is the point. */
const EMAIL_LED: NotificationChannel[] = ["in_app", "email"]

// ── The registry ─────────────────────────────────────────────────────────────

export const NOTIFICATION_EVENTS: Record<string, NotificationEventDefinition> = {
    // ── Life events, profile, household, assets ──────────────────────────────

    life_event_recorded: {
        businessEvent: "The customer told us their life changed",
        triggerCondition: "declareLifeEvent() commits a LifeEventInstance",
        category: "risk",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["owner"],
        transactional: true,
        requiredAction: "review_what_changed",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/life-events/service.ts",
        note: "Confirms we heard them. The RISK consequence is a separate event, because the two are different claims: one is 'recorded', the other is 'this changed your exposure'.",
    },

    profile_updated: {
        businessEvent: "The customer changed their profile, household or assets",
        triggerCondition: "A profile write path commits and the risk fingerprint moves",
        category: "risk",
        priority: "low",
        channels: IN_APP_ONLY,
        recipients: ["owner"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "notification_event",
        status: "planned",
        note: "Deliberately NOT wired. A profile, household or asset edit already produces the notification that matters — the RISK consequence, via protection_score_changed / GAP_DETECTED / risk_level_changed off the same recalculation. A second 'you changed something' ping for an edit the customer made ten seconds ago is noise, and noise is what makes people switch the useful ones off. The case that WOULD justify it is an ADVISOR editing a customer's profile, which is a security signal rather than a confirmation; that needs the advisor-edit path identified first, and inventing an emitter before then would fire it on the wrong half of the cases.",
    },

    questionnaire_completed: {
        businessEvent: "The customer finished a questionnaire",
        triggerCondition: "QuestionnaireInstance transitions to completed",
        category: "advisory",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["advisor"],
        transactional: true,
        requiredAction: "review_responses",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/(protected)/agent/actions.ts",
    },

    questionnaire_received: {
        businessEvent: "An advisor sent the customer a questionnaire",
        triggerCondition: "An advisor dispatches a QuestionnaireInstance",
        category: "advisory",
        priority: "normal",
        channels: FULL_REACH,
        recipients: ["owner"],
        transactional: false,
        requiredAction: "complete_questionnaire",
        escalation: { afterUnreadHours: 7 * DAY, notify: "advisor", event: "collaboration_unread_followup" },
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/(protected)/agent/actions.ts",
    },

    // ── Policy lifecycle ─────────────────────────────────────────────────────

    policy_added: {
        businessEvent: "A policy was added to the wallet",
        triggerCondition: "Policy row created by upload, advisor or onboarding",
        category: "policy",
        priority: "normal",
        channels: IN_APP_ONLY,
        recipients: ["owner"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/(protected)/agent/actions.ts",
    },

    policy_updated: {
        businessEvent: "A policy's terms changed",
        triggerCondition: "Policy update commits a change to cover, dates or premium",
        category: "policy",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["owner"],
        transactional: true,
        requiredAction: "review_change",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/(protected)/wallet/actions.ts",
    },

    policy_removed: {
        businessEvent: "A policy was removed from the wallet",
        triggerCondition: "deletePolicy() commits",
        category: "policy",
        priority: "high",
        channels: EMAIL_LED,
        recipients: ["owner"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 90 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "app/(protected)/wallet/actions.ts",
        note: "High, and emailed, because it is destructive and may not have been the owner who did it. This is the notification that lets someone notice.",
    },

    policy_shared: {
        businessEvent: "A policy was shared with an advisor",
        triggerCondition: "An AccessGrant is created over a policy",
        category: "policy",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["counterparty"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "lib/services/policy.service.ts",
    },

    policy_merged: {
        businessEvent: "Two records of one policy were merged",
        triggerCondition: "A PolicyMergeRequest is approved and applied",
        category: "policy",
        priority: "normal",
        channels: IN_APP_ONLY,
        recipients: ["owner"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/policy-merge.service.ts",
    },

    policy_merge_requested: {
        businessEvent: "Someone proposed merging two policy records",
        triggerCondition: "PolicyMergeRequest created",
        category: "policy",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["counterparty"],
        transactional: false,
        requiredAction: "approve_or_reject_merge",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/policy-merge.service.ts",
    },

    policy_merge_rejected: {
        businessEvent: "A proposed merge was rejected",
        triggerCondition: "PolicyMergeRequest transitions to rejected",
        category: "policy",
        priority: "normal",
        channels: IN_APP_ONLY,
        recipients: ["counterparty"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/policy-merge.service.ts",
    },

    document_uploaded: {
        businessEvent: "A document was uploaded against a request",
        triggerCondition: "DocumentRequest receives a PolicyDocument",
        category: "advisory",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["counterparty"],
        transactional: true,
        requiredAction: "review_document",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/api/v1/collaboration/document-requests/[id]/route.ts",
    },

    document_requested: {
        businessEvent: "An advisor asked for a document",
        triggerCondition: "DocumentRequest created",
        category: "advisory",
        priority: "normal",
        channels: FULL_REACH,
        recipients: ["owner"],
        transactional: false,
        requiredAction: "upload_document",
        escalation: { afterUnreadHours: 7 * DAY, notify: "advisor", event: "collaboration_unread_followup" },
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/api/v1/collaboration/document-requests/route.ts",
    },

    // ── AI extraction & confidence ───────────────────────────────────────────

    policy_analyzed: {
        businessEvent: "AI extraction finished and the policy is readable",
        triggerCondition: "PolicyAnalysisRun completes successfully",
        category: "risk",
        priority: "high",
        channels: FULL_REACH,
        recipients: ["owner"],
        transactional: false,
        requiredAction: "review_findings",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/policy.service.ts",
        note: "The payoff moment of the whole product, and often minutes after the customer navigated away. This is the strongest case for push in the app.",
    },

    policy_analysis_failed: {
        businessEvent: "AI extraction failed",
        triggerCondition: "PolicyAnalysisRun terminates in failed",
        category: "risk",
        priority: "high",
        channels: FULL_REACH,
        recipients: ["owner"],
        transactional: true,
        requiredAction: "retry_or_contact_support",
        escalation: { afterFailures: 3, notify: "admin", event: "admin_analysis_failure_spike" },
        retry: STANDARD_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "lib/services/policy.service.ts",
        note: "Transactional: the customer handed us a document and is owed the outcome, good or bad. Silence reads as 'still working'.",
    },

    extraction_flagged: {
        businessEvent: "Extraction succeeded but confidence was too low to trust",
        triggerCondition: "An extracted field lands below the confidence floor",
        category: "risk",
        priority: "high",
        channels: EMAIL_LED,
        recipients: ["owner"],
        transactional: false,
        requiredAction: "confirm_extracted_values",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/(protected)/wallet/actions.ts",
        note: "This is the AI-confidence trigger. It fires on the reading we could not stand behind, which is the only confidence change a customer can act on.",
    },

    ai_consent_request: {
        businessEvent: "An advisor asked to run AI analysis on the customer's documents",
        triggerCondition: "An advisor requests AI processing consent",
        category: "advisory",
        priority: "high",
        channels: FULL_REACH,
        recipients: ["owner"],
        transactional: true,
        requiredAction: "grant_or_refuse_consent",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "app/(protected)/agent/actions.ts",
        note: "Transactional and audit-logged: this is a GDPR consent request, and the record of asking matters as much as the asking.",
    },

    // ── Risk, gaps, score, recommendations ───────────────────────────────────

    GAP_DETECTED: {
        businessEvent: "A coverage gap was found",
        triggerCondition: "A risk transitions into protection_gap between two RiskProfileVersions",
        category: "risk",
        priority: "high",
        channels: FULL_REACH,
        recipients: ["owner"],
        transactional: false,
        requiredAction: "review_gap",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/notifications/risk-events.ts",
        note: "SCREAMING_CASE is the one inconsistency kept deliberately: it is the key persisted in NotificationPreference rows and read by the settings screen, and renaming it would silently re-enable the stream for everyone who switched it off.",
    },

    protection_score_changed: {
        businessEvent: "The customer's protection score moved materially",
        triggerCondition: "recordRiskProfileVersion() writes a version whose score delta clears the materiality threshold",
        category: "risk",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["owner"],
        transactional: false,
        requiredAction: "review_what_changed",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/notifications/risk-events.ts",
        note: "Hangs off the version writer, which already fires only on a MATERIAL change (contextHash). Deriving it anywhere else would let the notification disagree with the timeline about the same movement.",
    },

    risk_level_changed: {
        businessEvent: "A specific risk changed status",
        triggerCondition: "diffVersions() reports a transition other than into protection_gap",
        category: "risk",
        priority: "normal",
        channels: IN_APP_ONLY,
        recipients: ["owner"],
        transactional: false,
        requiredAction: "review_risk",
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/notifications/risk-events.ts",
        note: "In-app only on purpose. A risk CLOSING is good news and does not deserve an interruption; a risk OPENING is GAP_DETECTED, which does.",
    },

    recommendation_generated: {
        businessEvent: "New recommendations were produced",
        triggerCondition: "syncRecommendations() reports created > 0",
        category: "risk",
        priority: "normal",
        channels: IN_APP_ONLY,
        recipients: ["owner"],
        transactional: false,
        requiredAction: "review_recommendations",
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/notifications/risk-events.ts",
        note: "Batched: one notification for the run, never one per card. A person who gains six recommendations has learned one thing, not six.",
    },

    recommendation_dismissed: {
        businessEvent: "The customer dismissed a recommendation",
        triggerCondition: "PATCH /api/v1/recommendations/[id] with action=dismiss",
        category: "risk",
        priority: "low",
        channels: ["analytics"],
        recipients: ["owner"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: null,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/api/v1/recommendations/[id]/route.ts",
        emittedDynamically: true,
        note: "Recorded, not delivered. Notifying someone about their own click is noise; but a dismissal is the clearest signal a customer ever gives us and the advisor surfaces need it.",
    },

    recommendation_accepted: {
        businessEvent: "The customer acted on a recommendation",
        triggerCondition: "PATCH /api/v1/recommendations/[id] with action=actioned",
        category: "risk",
        priority: "normal",
        channels: ["analytics"],
        recipients: ["owner"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: null,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/api/v1/recommendations/[id]/route.ts",
        emittedDynamically: true,
    },

    // ── Renewals ─────────────────────────────────────────────────────────────

    policy_expiring: {
        businessEvent: "A policy is approaching its renewal date",
        triggerCondition: "renewal-check cron finds a policy inside a reminder milestone",
        category: "policy",
        priority: "high",
        channels: FULL_REACH,
        recipients: ["owner"],
        transactional: false,
        requiredAction: "review_renewal_options",
        escalation: null,
        retry: STANDARD_RETRY,
        // Deliberately short: a reminder for a renewal that has already passed is
        // worse than no reminder, so it must expire before the milestone does.
        expiresAfterHours: 3 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/renewal.service.ts",
    },

    renewal_overdue: {
        businessEvent: "A policy passed its end date without being renewed",
        triggerCondition: "renewal-check cron finds endDate in the past and no successor policy",
        category: "policy",
        priority: "critical",
        channels: FULL_REACH,
        recipients: ["owner", "advisor"],
        transactional: true,
        requiredAction: "renew_or_confirm_lapsed",
        escalation: { afterUnreadHours: 3 * DAY, notify: "advisor", event: "renewal_milestone" },
        retry: PERSISTENT_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "lib/services/renewal.service.ts",
        note: "Critical and transactional: the customer may now be uninsured, and for motor in Greece that is also unlawful. This is not a marketing reminder and cannot be switched off.",
    },

    renewal_milestone: {
        businessEvent: "An advisor's client has a renewal approaching",
        triggerCondition: "renewal-check cron, for policies with an advisor relationship",
        category: "advisory",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["advisor"],
        transactional: false,
        requiredAction: "contact_client",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 7 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/renewal.service.ts",
    },

    renewal_quote_requested: {
        businessEvent: "The customer asked for a renewal quote",
        triggerCondition: "A renewal quote request is submitted",
        category: "advisory",
        priority: "high",
        channels: EMAIL_LED,
        recipients: ["advisor"],
        transactional: true,
        requiredAction: "provide_quote",
        escalation: { afterUnreadHours: 2 * DAY, notify: "admin", event: "admin_unanswered_quote" },
        retry: STANDARD_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/(protected)/wallet/actions.ts",
    },

    renewal_outcome: {
        businessEvent: "A renewal was resolved",
        triggerCondition: "PolicyRenewal reaches a terminal state",
        category: "policy",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["owner"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/(protected)/renewals/actions.ts",
    },

    perk_reminder: {
        businessEvent: "A partner perk is about to expire",
        triggerCondition: "perk-reminders cron finds a perk inside its reminder window",
        category: "engagement",
        priority: "low",
        channels: EMAIL_LED,
        recipients: ["owner"],
        transactional: false,
        requiredAction: "claim_perk",
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: 3 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/perk-reminder.service.ts",
    },

    /**
     * A recurring condition of cover is coming due.
     *
     * The one genuinely new trigger the specialty lines introduce, and it exists
     * because those policies do not just pay out — they REQUIRE things, on a
     * schedule: annual servicing to the maker's instructions, certificates valid
     * throughout the period, an alarm that stays linked to a monitoring centre.
     * Breaching one of these does not reduce a claim, it removes the cover, and
     * nothing else in this registry watches for it.
     *
     * `high` rather than `normal`: the customer is paying for cover they may not
     * have. Deliberately NOT transactional — it is a reminder about their own
     * obligation, not a record of ours.
     *
     * Declared `planned` until the compliance scan that emits it ships. The
     * derivation is built (lib/insurance/policy-conditions.ts →
     * complianceObligations); what is missing is the cron that walks it.
     */
    obligation_due: {
        businessEvent: "A policy condition the customer must keep is coming due",
        triggerCondition:
            "a compliance scan finds an acordData.conditions entry with a recurrence inside its reminder window",
        category: "policy",
        priority: "high",
        channels: EMAIL_LED,
        recipients: ["owner"],
        transactional: false,
        requiredAction: "confirm_condition_met",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/compliance/obligation-scan.ts",
    },

    // ── Claims ───────────────────────────────────────────────────────────────
    //
    // The brief asks for "new claim" and "claim status changes". This product has
    // no claims model — no table, no thread category, nothing that could produce
    // one. Declaring them `planned` records the requirement honestly; inventing an
    // emitter for a state nothing can reach would be worse than the gap.

    claim_opened: {
        businessEvent: "A claim was opened",
        triggerCondition: "No source exists — the product has no claims model",
        category: "policy",
        priority: "critical",
        channels: FULL_REACH,
        recipients: ["owner", "advisor"],
        transactional: true,
        requiredAction: "track_claim",
        escalation: null,
        retry: PERSISTENT_RETRY,
        expiresAfterHours: 90 * DAY,
        audit: "activity_log",
        status: "planned",
        note: "Blocked on a claims model. Wiring is one entry here plus one emitter once Claim exists.",
    },

    claim_status_changed: {
        businessEvent: "A claim changed status",
        triggerCondition: "No source exists — the product has no claims model",
        category: "policy",
        priority: "high",
        channels: FULL_REACH,
        recipients: ["owner"],
        transactional: true,
        requiredAction: "review_claim",
        escalation: null,
        retry: PERSISTENT_RETRY,
        expiresAfterHours: 90 * DAY,
        audit: "activity_log",
        status: "planned",
        note: "Blocked on a claims model.",
    },

    // ── Advisory & collaboration ─────────────────────────────────────────────

    collaboration_message: {
        businessEvent: "A message was sent in an advisory thread",
        triggerCondition: "CollaborationMessage created",
        category: "advisory",
        priority: "high",
        channels: FULL_REACH,
        recipients: ["counterparty"],
        transactional: false,
        requiredAction: "read_and_reply",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/collaboration.service.ts",
    },

    collaboration_thread_assigned: {
        businessEvent: "An advisory thread was assigned",
        triggerCondition: "CollaborationThread assignee changes",
        category: "advisory",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["counterparty"],
        transactional: true,
        requiredAction: "take_ownership",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/collaboration.service.ts",
    },

    collaboration_action_assigned: {
        businessEvent: "An action was assigned in a thread",
        triggerCondition: "CollaborationAction created with an assignee",
        category: "advisory",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["counterparty"],
        transactional: false,
        requiredAction: "complete_action",
        escalation: { afterUnreadHours: 3 * DAY, notify: "counterparty", event: "collaboration_action_overdue" },
        retry: STANDARD_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/collaboration.service.ts",
    },

    collaboration_action_overdue: {
        businessEvent: "An assigned action passed its due date",
        triggerCondition: "collaboration-reminders cron finds an open action past due",
        category: "advisory",
        priority: "high",
        channels: EMAIL_LED,
        recipients: ["counterparty"],
        transactional: false,
        requiredAction: "complete_action",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 7 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/collaboration-reminders.service.ts",
    },

    collaboration_unread_followup: {
        businessEvent: "A message went unread long enough to chase",
        triggerCondition: "collaboration-reminders cron finds an unread message past the follow-up window",
        category: "advisory",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["counterparty"],
        transactional: false,
        requiredAction: "read_and_reply",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 7 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/collaboration-reminders.service.ts",
    },

    collaboration_daily_digest: {
        businessEvent: "A day's advisory activity, summarised",
        triggerCondition: "collaboration-reminders cron, once daily per participant with activity",
        category: "advisory",
        priority: "low",
        channels: EMAIL_LED,
        recipients: ["counterparty"],
        transactional: false,
        requiredAction: null,
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: 2 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/collaboration-reminders.service.ts",
    },

    advisor_assigned: {
        businessEvent: "An advisor and a customer were connected",
        triggerCondition: "CustomerRelationship becomes active",
        category: "advisory",
        priority: "high",
        channels: EMAIL_LED,
        recipients: ["owner", "advisor"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "app/(protected)/wallet/actions.ts",
        note: "Transactional and audit-logged: this is the moment another person gains sight of the customer's policies, and they are entitled to know it happened.",
    },

    customer_transferred: {
        businessEvent: "A customer was moved between advisors",
        triggerCondition: "CustomerRelationship agentUserId changes",
        category: "advisory",
        priority: "high",
        channels: EMAIL_LED,
        recipients: ["owner", "advisor"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "lib/services/team.service.ts",
    },

    proposal_received: {
        businessEvent: "An advisor sent a proposal",
        triggerCondition: "Proposal created",
        category: "advisory",
        priority: "high",
        channels: FULL_REACH,
        recipients: ["owner"],
        transactional: false,
        requiredAction: "review_proposal",
        escalation: { afterUnreadHours: 5 * DAY, notify: "advisor", event: "collaboration_unread_followup" },
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/api/v1/collaboration/proposals/route.ts",
    },

    proposal_accepted: {
        businessEvent: "A proposal was accepted",
        triggerCondition: "Proposal transitions to accepted",
        category: "advisory",
        priority: "high",
        channels: EMAIL_LED,
        recipients: ["counterparty"],
        transactional: true,
        requiredAction: "issue_policy",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "app/api/v1/collaboration/proposals/[id]/route.ts",
    },

    proposal_declined: {
        businessEvent: "A proposal was declined",
        triggerCondition: "Proposal transitions to declined",
        category: "advisory",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["counterparty"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/api/v1/collaboration/proposals/[id]/route.ts",
    },

    proposal_counter_offer: {
        businessEvent: "A counter-offer was made on a proposal",
        triggerCondition: "Proposal receives a counter-offer",
        category: "advisory",
        priority: "high",
        channels: EMAIL_LED,
        recipients: ["counterparty"],
        transactional: false,
        requiredAction: "review_counter_offer",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/api/v1/collaboration/proposals/[id]/route.ts",
    },

    opportunity_created: {
        businessEvent: "An advisory opportunity was opened",
        triggerCondition: "Opportunity created",
        category: "advisory",
        priority: "normal",
        channels: IN_APP_ONLY,
        recipients: ["advisor"],
        transactional: true,
        requiredAction: "work_opportunity",
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/(protected)/wallet/actions.ts",
    },

    team_invite: {
        businessEvent: "Someone was invited to an advisory team",
        triggerCondition: "TenantMembership invite issued",
        category: "advisory",
        priority: "high",
        channels: EMAIL_LED,
        recipients: ["counterparty"],
        transactional: true,
        requiredAction: "accept_or_decline_invite",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "lib/services/team.service.ts",
    },

    team_invite_accepted: {
        businessEvent: "A team invitation was accepted",
        triggerCondition: "TenantMembership transitions to active",
        category: "advisory",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["counterparty"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "lib/services/team.service.ts",
    },

    // ── Billing & subscription ───────────────────────────────────────────────

    payment_failed: {
        businessEvent: "A subscription payment failed",
        triggerCondition: "Stripe invoice.payment_failed marks the subscription past_due",
        category: "billing",
        priority: "critical",
        channels: FULL_REACH,
        recipients: ["owner"],
        transactional: true,
        requiredAction: "update_payment_method",
        escalation: { afterFailures: 3, notify: "admin", event: "admin_dunning_exhausted" },
        retry: PERSISTENT_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "lib/services/billing/stripe-lifecycle.ts",
        note: "The sharpest gap the audit found: the subscription was flipped to past_due and the customer was told nothing, losing paid features silently. Transactional — nobody consents away from being told their card failed.",
    },

    subscription_expired: {
        businessEvent: "A subscription ended",
        triggerCondition: "Stripe customer.subscription.deleted, or the period lapses unrenewed",
        category: "billing",
        priority: "critical",
        channels: FULL_REACH,
        recipients: ["owner"],
        transactional: true,
        requiredAction: "resubscribe_or_export_data",
        escalation: null,
        retry: PERSISTENT_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "lib/services/billing/stripe-lifecycle.ts",
    },

    subscription_upgraded: {
        businessEvent: "The customer changed plan",
        triggerCondition: "Subscription plan changes on a Stripe lifecycle event",
        category: "billing",
        priority: "high",
        channels: EMAIL_LED,
        recipients: ["owner"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "lib/services/billing/stripe-lifecycle.ts",
    },

    bonus_credits_granted: {
        businessEvent: "Credits were granted to the account",
        triggerCondition: "A credit grant commits",
        category: "billing",
        priority: "normal",
        channels: IN_APP_ONLY,
        recipients: ["owner"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/churn-prevention.service.ts",
    },

    // ── Engagement ───────────────────────────────────────────────────────────

    weekly_digest: {
        businessEvent: "The week's activity, summarised",
        triggerCondition: "weekly-digest cron, for users with something to report",
        category: "engagement",
        priority: "low",
        channels: EMAIL_LED,
        recipients: ["owner"],
        transactional: false,
        requiredAction: null,
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: 5 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/weekly-digest.service.ts",
    },

    churn_prevention: {
        businessEvent: "An at-risk customer needs re-engaging",
        triggerCondition: "churn-prevention cron scores a user as at risk",
        category: "engagement",
        priority: "low",
        channels: EMAIL_LED,
        recipients: ["owner"],
        transactional: false,
        requiredAction: null,
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: WEEK,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/churn-prevention.service.ts",
    },

    engagement_welcome: {
        businessEvent: "A new customer joined",
        triggerCondition: "engagement-drip cron, day 0",
        category: "engagement",
        priority: "low",
        channels: EMAIL_LED,
        recipients: ["owner"],
        transactional: false,
        requiredAction: "add_first_policy",
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: 3 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/engagement-drip.service.ts",
    },

    engagement_day3: {
        businessEvent: "A customer is three days in",
        triggerCondition: "engagement-drip cron, day 3, still not activated",
        category: "engagement",
        priority: "low",
        channels: EMAIL_LED,
        recipients: ["owner"],
        transactional: false,
        requiredAction: "add_first_policy",
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: 3 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/engagement-drip.service.ts",
    },

    engagement_day7: {
        businessEvent: "A customer is a week in",
        triggerCondition: "engagement-drip cron, day 7, still not activated",
        category: "engagement",
        priority: "low",
        channels: EMAIL_LED,
        recipients: ["owner"],
        transactional: false,
        requiredAction: "add_first_policy",
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: 3 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/engagement-drip.service.ts",
    },

    achievement_unlocked: {
        businessEvent: "The customer unlocked an achievement",
        triggerCondition: "An achievement's condition is first satisfied",
        category: "engagement",
        priority: "low",
        channels: IN_APP_ONLY,
        recipients: ["owner"],
        transactional: false,
        requiredAction: null,
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: 30 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/achievements.service.ts",
        note: "One event, with the achievement id in relatedObjectId. It used to be fifteen event types (`achievement_first_policy`, …), which meant the registry could never be complete and no preference could ever address the stream.",
    },

    feedback_nps: {
        businessEvent: "The customer left an NPS score",
        triggerCondition: "POST /api/v1/feedback with type=nps",
        category: "engagement",
        priority: "low",
        channels: ["analytics"],
        recipients: ["owner"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: null,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/api/v1/feedback/route.ts",
        emittedDynamically: true,
    },

    feedback_article: {
        businessEvent: "The customer rated a help article",
        triggerCondition: "POST /api/v1/feedback with type=article",
        category: "engagement",
        priority: "low",
        channels: ["analytics"],
        recipients: ["owner"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: null,
        audit: "notification_event",
        status: "live",
        emittedBy: "app/api/v1/feedback/route.ts",
        emittedDynamically: true,
    },

    // ── Security ─────────────────────────────────────────────────────────────

    login_success: {
        businessEvent: "A sign-in happened",
        triggerCondition: "A session is established",
        category: "security",
        priority: "low",
        channels: ["analytics"],
        recipients: ["owner"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: null,
        audit: "activity_log",
        status: "live",
        emittedBy: "lib/services/security.service.ts",
    },

    password_change: {
        businessEvent: "The account password changed",
        triggerCondition: "A password update commits",
        category: "security",
        priority: "critical",
        channels: FULL_REACH,
        recipients: ["owner"],
        transactional: true,
        requiredAction: "contact_support_if_not_you",
        escalation: null,
        retry: PERSISTENT_RETRY,
        expiresAfterHours: 90 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "lib/services/security.service.ts",
        note: "Never suppressible. This is the notification that lets someone discover an account takeover.",
    },

    email_change: {
        businessEvent: "The account email changed",
        triggerCondition: "An email update commits",
        category: "security",
        priority: "critical",
        channels: FULL_REACH,
        recipients: ["owner"],
        transactional: true,
        requiredAction: "contact_support_if_not_you",
        escalation: null,
        retry: PERSISTENT_RETRY,
        expiresAfterHours: 90 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "lib/services/security.service.ts",
    },

    // ── Administrative ───────────────────────────────────────────────────────

    admin_action_on_account: {
        businessEvent: "An administrator acted on a customer's account",
        triggerCondition: "An ActivityLog entry is written with a targetUserId",
        category: "admin",
        priority: "high",
        channels: EMAIL_LED,
        recipients: ["owner"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 90 * DAY,
        audit: "activity_log",
        status: "planned",
        note: "Deliberately NOT wired yet. Notifying on every admin read would bury the customer and would fire on routine support work; the rule needs to name which admin actions are worth telling someone about, and that is a policy decision, not a code one.",
    },

    admin_dunning_exhausted: {
        businessEvent: "A customer's payments failed repeatedly",
        triggerCondition: "payment_failed escalation threshold crossed",
        category: "admin",
        priority: "high",
        channels: EMAIL_LED,
        recipients: ["admin"],
        transactional: true,
        requiredAction: "contact_customer",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "app/api/v1/jobs/notification-retry/route.ts",
    },

    admin_analysis_failure_spike: {
        businessEvent: "Analysis is failing repeatedly for one customer",
        triggerCondition: "policy_analysis_failed escalation threshold crossed",
        category: "admin",
        priority: "high",
        channels: EMAIL_LED,
        recipients: ["admin"],
        transactional: true,
        requiredAction: "investigate_pipeline",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 7 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "app/api/v1/jobs/notification-retry/route.ts",
    },

    admin_unanswered_quote: {
        businessEvent: "A quote request went unanswered",
        triggerCondition: "renewal_quote_requested escalation threshold crossed",
        category: "admin",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["admin"],
        transactional: true,
        requiredAction: "chase_advisor",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 7 * DAY,
        audit: "activity_log",
        status: "live",
        emittedBy: "app/api/v1/jobs/notification-retry/route.ts",
    },

    scheduled_review_due: {
        businessEvent: "A periodic cover review is due",
        triggerCondition: "No emitter yet — needs a review cadence per customer",
        category: "advisory",
        priority: "normal",
        channels: EMAIL_LED,
        recipients: ["owner", "advisor"],
        transactional: false,
        requiredAction: "book_review",
        escalation: null,
        retry: STANDARD_RETRY,
        expiresAfterHours: 14 * DAY,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/services/risk-review/service.ts",
        note: "The cadence policy that blocked this now exists in lib/services/risk-review/policy.ts: annual as the backstop, quarterly only where assessment coverage is too thin to score honestly, and the decade birthday because `age` gates two risks and refines four more. Reactive triggers (life events, renewals) open reviews of their own with heavier weights, and a cooldown keeps a busy fortnight to one conversation.",
    },

    // ── Analytics mirror (not notifications) ─────────────────────────────────
    //
    // These share the table because a migration was once too expensive, and they
    // were written with `channel: 'in_app'`, a machine code as the title and a
    // JSON blob as the body — so `conv_checkout_completed` was rendered to
    // customers as a notification and counted on their unread badge. The
    // `analytics` channel keeps the shared store without the lie.

    conv_checkout_started: analyticsEvent("Checkout was started"),
    conv_checkout_completed: analyticsEvent("Checkout completed"),
    conv_checkout_cancelled: analyticsEvent("Checkout was abandoned"),
    conv_limit_hit: analyticsEvent("A plan limit was reached"),
    conv_free_ai_call_blocked: analyticsEvent("A free-tier AI call was blocked"),
    conv_paid_ai_call_started: analyticsEvent("A paid AI call started"),
    conv_paid_ai_call_completed: analyticsEvent("A paid AI call completed"),
    conv_proposal_accepted: analyticsEvent("A proposal was accepted (funnel mirror)"),
}

function analyticsEvent(businessEvent: string): NotificationEventDefinition {
    return {
        businessEvent,
        triggerCondition: "recordConversionEvent() — server-side funnel mirror",
        category: "analytics",
        priority: "low",
        channels: ["analytics"],
        recipients: ["owner"],
        transactional: true,
        requiredAction: null,
        escalation: null,
        retry: NO_RETRY,
        expiresAfterHours: null,
        audit: "notification_event",
        status: "live",
        emittedBy: "lib/journey/conversion-events.ts",
        emittedDynamically: true,
    }
}

// ── Lookup ───────────────────────────────────────────────────────────────────

export type NotificationEventType = keyof typeof NOTIFICATION_EVENTS

export function getEventDefinition(eventType: string): NotificationEventDefinition | null {
    return NOTIFICATION_EVENTS[eventType] ?? null
}

export function isKnownEvent(eventType: string): boolean {
    return eventType in NOTIFICATION_EVENTS
}

/** Events that reach a customer, i.e. everything except the analytics mirror. */
export function deliverableEvents(): [string, NotificationEventDefinition][] {
    return Object.entries(NOTIFICATION_EVENTS).filter(([, d]) => d.category !== "analytics")
}

/**
 * Does this event reach the user through a channel they can switch off?
 *
 * Transactional events do not, by design, and the settings screen must not offer
 * a switch that the dispatcher will ignore — the last iteration of this product
 * shipped three toggles that wrote keys no sender ever read.
 */
export function isSuppressible(eventType: string): boolean {
    const def = getEventDefinition(eventType)
    if (!def) return false
    return !def.transactional && def.category !== "analytics"
}

/** Retry delay for a given attempt number (1 = the first retry). */
export function retryDelayMinutes(policy: RetryPolicy, attempt: number): number {
    if (policy.backoff === "none") return 0
    if (policy.backoff === "linear") return policy.baseDelayMinutes * attempt
    return policy.baseDelayMinutes * Math.pow(2, Math.max(0, attempt - 1))
}
