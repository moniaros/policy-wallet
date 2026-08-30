export type JourneyEventName =
    | "onboarding_step_viewed"
    | "onboarding_step_completed"
    | "onboarding_step_failed"
    | "onboarding_started"
    | "onboarding_resumed"
    | "onboarding_skipped"
    | "segment_selected"
    | "goal_selected"
    | "familiarity_selected"
    | "file_ready_selected"
    | "policy_upload_started"
    | "policy_upload_completed"
    | "policy_upload_failed"
    | "sample_analysis_started"
    | "sample_analysis_viewed"
    | "reminders_opt_in"
    | "next_best_action_clicked"
    | "onboarding_completed"
    | "first_policy_uploaded"
    | "first_ai_answer_received"
    | "first_policy_shared"
    | "upgrade_prompt_viewed"
    | "upgrade_started"
    | "upgrade_completed"
    // Conversion funnel (2026-07 monetization pass)
    | "pricing_viewed"
    | "upgrade_trigger_viewed"
    | "upgrade_trigger_clicked"
    | "upgrade_modal_opened"
    | "plan_selected"
    | "billing_period_selected"
    | "checkout_started"
    | "checkout_completed"
    | "checkout_cancelled"
    | "feature_unlocked"
    | "paywall_dismissed"
    | "upload_limit_reached"
    | "ai_question_limit_reached"
    | "feature_locked_viewed"
    // Paid Aha Loop v1 (2026-07): first-policy → locked cards → dual-CTA modal
    | "free_policy_uploaded"
    | "free_policy_parsed"
    | "post_parse_upgrade_prompt_viewed"
    | "locked_feature_clicked"
    | "plus_recommended_seen"
    | "starter_selected"
    | "plus_selected"
    | "free_ai_call_blocked"
    | "paid_ai_call_started"
    | "paid_ai_call_completed"
    // ── Grafí application tier (§11, the revenue equation) ──────────────────
    | "activation.first_policy_read"
    | "moment_of_truth.shown"
    | "finding.dismissed"
    | "help.requested"
    | "help.consented"
    | "life_event.recorded"
    | "household.person_added"
    | "plan.viewed_ledger"
    | "plan.upgraded"
    | "notification.opened"

/**
 * Standard payload for conversion-funnel events. All fields optional —
 * emit what the surface knows; the analytics layer tolerates gaps.
 */
export interface ConversionPayload {
    plan?: string
    trigger_source?: string
    screen?: string
    feature_requested?: string
    billing_period?: "monthly" | "annual"
    policy_count?: number
    insurer_count?: number
    insurance_branch?: string
    device_type?: "mobile" | "desktop"
    locale?: string
    /** Index signature keeps this assignable to the GA AnalyticsPayload. */
    [key: string]: string | number | boolean | null | undefined
}

export interface JourneyEventPayloadMap {
    onboarding_step_viewed: {
        locale?: string
        step_id?: string
        step_variant?: string
        skip_used?: boolean
    }
    onboarding_step_completed: {
        locale?: string
        step_id?: string
        step_variant?: string
        elapsed_ms?: number
        skip_used?: boolean
    }
    onboarding_step_failed: {
        locale?: string
        step_id?: string
        step_variant?: string
        elapsed_ms?: number
        error_code?: string
    }
    onboarding_started: {
        locale?: string
        source?: string
        step?: number
    }
    onboarding_resumed: {
        locale?: string
        step?: number
    }
    onboarding_skipped: {
        locale?: string
        step?: number
        location?: string
    }
    segment_selected: {
        locale?: string
        user_segment?: "individual" | "family_manager" | "small_business"
    }
    goal_selected: {
        locale?: string
        selected_goals?: string
    }
    familiarity_selected: {
        locale?: string
        insurance_familiarity?: "beginner" | "intermediate" | "experienced"
    }
    file_ready_selected: {
        locale?: string
        has_file_ready?: boolean
        source?: string
    }
    policy_upload_started: {
        locale?: string
        step_id?: string
        file_type?: string
        file_size_kb?: number
        source?: string
    }
    policy_upload_completed: {
        locale?: string
        step_id?: string
        policy_id?: string
        source?: string
    }
    policy_upload_failed: {
        locale?: string
        step_id?: string
        file_type?: string
        source?: string
        error_code?: string
    }
    sample_analysis_started: {
        locale?: string
        step_id?: string
        first_category_engaged?: "motor" | "health" | "property" | "life" | "other"
    }
    sample_analysis_viewed: {
        locale?: string
        first_category_engaged?: "motor" | "health" | "property" | "life" | "other"
    }
    reminders_opt_in: {
        locale?: string
        enabled?: boolean
        channels?: string
    }
    next_best_action_clicked: {
        locale?: string
        step_id?: string
        step_variant?: string
        target_route?: string
        location?: string
    }
    onboarding_completed: {
        locale?: string
        steps_completed?: number
        first_category_engaged?: "motor" | "health" | "property" | "life" | "other"
        has_file_ready?: boolean
    }
    first_policy_uploaded: {
        policy_id?: string
        source?: string
    }
    first_ai_answer_received: {
        policy_id?: string
    }
    first_policy_shared: {
        policy_id?: string
        share_type?: "agent_existing" | "agent_invite" | "family"
    }
    upgrade_prompt_viewed: {
        reason: string
        location?: string
    }
    upgrade_started: {
        tier?: string
        source?: string
    }
    upgrade_completed: {
        tier?: string
        source?: string
    }
    pricing_viewed: ConversionPayload
    upgrade_trigger_viewed: ConversionPayload
    upgrade_trigger_clicked: ConversionPayload
    upgrade_modal_opened: ConversionPayload
    plan_selected: ConversionPayload
    billing_period_selected: ConversionPayload
    checkout_started: ConversionPayload
    checkout_completed: ConversionPayload
    checkout_cancelled: ConversionPayload
    feature_unlocked: ConversionPayload
    paywall_dismissed: ConversionPayload
    upload_limit_reached: ConversionPayload
    ai_question_limit_reached: ConversionPayload
    feature_locked_viewed: ConversionPayload
    free_policy_uploaded: ConversionPayload
    free_policy_parsed: ConversionPayload
    post_parse_upgrade_prompt_viewed: ConversionPayload
    locked_feature_clicked: ConversionPayload
    plus_recommended_seen: ConversionPayload
    starter_selected: ConversionPayload
    plus_selected: ConversionPayload
    free_ai_call_blocked: ConversionPayload
    paid_ai_call_started: ConversionPayload
    paid_ai_call_completed: ConversionPayload
    // ── Grafí application tier ──────────────────────────────────────────────
    "activation.first_policy_read": { policy_id?: string; line?: string }
    "moment_of_truth.shown": { finding_id: string; tier: string; kind: string }
    "finding.dismissed": { finding_id: string; reason: "chosen" | "renewed" | "not_relevant" }
    "help.requested": { finding_id: string }
    "help.consented": { finding_id: string; policies_shared: number }
    "life_event.recorded": { event_id: string }
    "household.person_added": { relation: string; is_dependant: boolean }
    "plan.viewed_ledger": { tier: string }
    "plan.upgraded": { from: string; to: string }
    "notification.opened": { stream: "protection" | "meanwhile"; event_type: string }

}
