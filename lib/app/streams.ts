/**
 * The two streams of /updates (§8.6).
 *
 *   protection — a fact about the household's cover: an expiry, a renewal
 *                milestone, a gap or review finding, a reading that could not
 *                be completed, a claim, an obligation, a scheduled review
 *   meanwhile  — what the product did on its own, and everything else: system
 *                confirmations, engagement, billing, security, collaboration
 *
 * EVERY notification event in the registry is assigned here; the test
 * enumerates the registry and fails on an unassigned or unknown key, so a new
 * event cannot ship without a stream.
 */
export const NOTIFICATION_STREAMS = ["protection", "meanwhile"] as const
export type NotificationStream = (typeof NOTIFICATION_STREAMS)[number]

export const STREAM_OF_EVENT: Record<string, NotificationStream> = {
    // — protection —
    policy_expiring: "protection",
    renewal_overdue: "protection",
    renewal_milestone: "protection",
    renewal_outcome: "protection",
    obligation_due: "protection",
    perk_reminder: "protection",
    risk_level_changed: "protection",
    recommendation_generated: "protection",
    extraction_flagged: "protection",
    policy_analysis_failed: "protection",
    claim_opened: "protection",
    claim_status_changed: "protection",
    scheduled_review_due: "protection",
    proposal_received: "protection",
    ai_consent_request: "protection",
    document_requested: "protection",
    // The legacy gap-detected key (capitalised in the registry; the preference
    // group of the same name) — a finding is a protection fact.
    GAP_DETECTED: "protection",
    // — meanwhile —
    // The conversion mirror rows share the notification table on the
    // `analytics` channel, which every customer surface filters out; assigned
    // so the parity test proves they can never reach the badge.
    conv_checkout_started: "meanwhile",
    conv_checkout_completed: "meanwhile",
    conv_checkout_cancelled: "meanwhile",
    conv_limit_hit: "meanwhile",
    conv_free_ai_call_blocked: "meanwhile",
    conv_paid_ai_call_started: "meanwhile",
    conv_paid_ai_call_completed: "meanwhile",
    conv_proposal_accepted: "meanwhile",
    engagement_day3: "meanwhile",
    engagement_day7: "meanwhile",
    life_event_recorded: "meanwhile",
    profile_updated: "meanwhile",
    questionnaire_completed: "meanwhile",
    questionnaire_received: "meanwhile",
    policy_added: "meanwhile",
    policy_updated: "meanwhile",
    policy_removed: "meanwhile",
    policy_shared: "meanwhile",
    policy_merged: "meanwhile",
    policy_merge_requested: "meanwhile",
    policy_merge_rejected: "meanwhile",
    document_uploaded: "meanwhile",
    policy_analyzed: "meanwhile",
    recommendation_dismissed: "meanwhile",
    recommendation_accepted: "meanwhile",
    renewal_quote_requested: "meanwhile",
    collaboration_message: "meanwhile",
    collaboration_thread_assigned: "meanwhile",
    collaboration_action_assigned: "meanwhile",
    collaboration_action_overdue: "meanwhile",
    collaboration_unread_followup: "meanwhile",
    collaboration_daily_digest: "meanwhile",
    advisor_assigned: "meanwhile",
    customer_transferred: "meanwhile",
    proposal_accepted: "meanwhile",
    proposal_declined: "meanwhile",
    proposal_counter_offer: "meanwhile",
    opportunity_created: "meanwhile",
    team_invite: "meanwhile",
    team_invite_accepted: "meanwhile",
    payment_failed: "meanwhile",
    subscription_expired: "meanwhile",
    subscription_upgraded: "meanwhile",
    bonus_credits_granted: "meanwhile",
    weekly_digest: "meanwhile",
    churn_prevention: "meanwhile",
    engagement_welcome: "meanwhile",
    achievement_unlocked: "meanwhile",
    feedback_nps: "meanwhile",
    feedback_article: "meanwhile",
    login_success: "meanwhile",
    password_change: "meanwhile",
    email_change: "meanwhile",
    admin_action_on_account: "meanwhile",
    admin_dunning_exhausted: "meanwhile",
    admin_analysis_failure_spike: "meanwhile",
    admin_unanswered_quote: "meanwhile",
}

/** Unknown events fall into «meanwhile» — they can never inflate the badge. */
export function streamOf(eventType: string): NotificationStream {
    return STREAM_OF_EVENT[eventType] ?? "meanwhile"
}
