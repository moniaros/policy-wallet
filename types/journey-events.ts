export type JourneyEventName =
    | "onboarding_step_viewed"
    | "onboarding_step_completed"
    | "onboarding_step_failed"
    | "onboarding_started"
    | "onboarding_resumed"
    | "onboarding_skipped"
    | "policy_upload_started"
    | "policy_upload_completed"
    | "policy_upload_failed"
    | "next_best_action_clicked"
    | "intent_selected"
    | "life_context_selected"
    | "risk_concern_selected"
    | "confidence_level_selected"
    | "life_change_selected"
    | "future_consideration_selected"
    | "guidance_preference_selected"
    | "onboarding_dont_know_used"
    | "protection_profile_completed"
    | "protection_summary_viewed"
    | "onboarding_completed"
    | "first_policy_uploaded"
    // Personal risk profile (docs/planning/PERSONAL_RISK_PROFILE.md §J): the
    // needs → risk → coverage chain, so product questions about which area
    // drives uploads and returns can be answered. Options are enum ids only.
    | "life_context_completed"
    | "attention_area_created"
    | "risk_assessment_started"
    | "risk_area_opened"
    | "risk_factor_answered"
    | "risk_area_completed"
    | "recommendation_viewed"
    | "action_started"
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
        step_id?: string
    }
    onboarding_skipped: {
        locale?: string
        step?: number
        location?: string
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
    next_best_action_clicked: {
        locale?: string
        step_id?: string
        step_variant?: string
        target_route?: string
        location?: string
    }
    // ── First-stage onboarding: the Personal Protection Profile ──────────
    // `option` is always an enum id from lib/services/protection-profile/
    // vocabulary.ts — never free text, and never a household count.
    intent_selected: {
        locale?: string
        step_id?: string
        option?: string
    }
    life_context_selected: {
        locale?: string
        step_id?: string
        option?: string
        dont_know_used?: boolean
    }
    risk_concern_selected: {
        locale?: string
        option?: string
        answer_count?: number
        position?: number
    }
    confidence_level_selected: {
        locale?: string
        option?: string
    }
    life_change_selected: {
        locale?: string
        option?: string
        branch?: "registry" | "flag"
    }
    future_consideration_selected: {
        locale?: string
        option?: string
    }
    guidance_preference_selected: {
        locale?: string
        option?: string | null
    }
    onboarding_dont_know_used: {
        locale?: string
        step_id?: string
    }
    protection_profile_completed: {
        locale?: string
        steps_completed?: number
        elapsed_ms?: number
        dont_know_count?: number
        priority_count?: number
        resumed?: boolean
    }
    protection_summary_viewed: {
        locale?: string
        priority_count?: number
        applicable_risk_count?: number
        first_risk_id?: string | null
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
    life_context_completed: {
        locale?: string
        intent?: string
        dont_know_count?: number
    }
    attention_area_created: {
        area: string
        importance: string
        confidence: string
        alignment?: string
    }
    risk_assessment_started: {
        source: "protection" | "dashboard" | "onboarding_map"
        activated_count?: number
    }
    risk_area_opened: {
        area: string
        importance: string
        alignment: string
        confidence: string
    }
    risk_factor_answered: {
        area: string
        factor: string
        special_category?: boolean
    }
    risk_area_completed: {
        area: string
        remaining_unknown: number
    }
    recommendation_viewed: {
        rule_id: string
        area?: string
    }
    action_started: {
        kind: "answer_questions" | "check_first_policy" | "review_finding" | "prevention" | "contact_advisor"
        area?: string
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
}
