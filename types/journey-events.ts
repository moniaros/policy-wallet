export type JourneyEventName =
    | "onboarding_started"
    | "onboarding_completed"
    | "first_policy_uploaded"
    | "first_ai_answer_received"
    | "first_policy_shared"
    | "upgrade_prompt_viewed"
    | "upgrade_started"
    | "upgrade_completed"

export interface JourneyEventPayloadMap {
    onboarding_started: {
        locale?: string
        source?: string
    }
    onboarding_completed: {
        locale?: string
        steps_completed?: number
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
