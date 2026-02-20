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
}
