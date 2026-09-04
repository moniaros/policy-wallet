/**
 * The flow's analytics, on the typed journey path. Called from the
 * orchestrator only — never from the reducer — so the reducer stays pure and
 * a test can render the flow with these stubbed.
 */

import { trackJourneyEvent } from "@/lib/journey/funnel"
import type { ProtectionStepId } from "@/lib/services/protection-profile/vocabulary"
import type { StepKind } from "./steps"

type Locale = "el" | "en"

export function trackStarted(locale: Locale, resumed: boolean, stepId: ProtectionStepId) {
    if (resumed) trackJourneyEvent("onboarding_resumed", { locale, step_id: stepId })
    else trackJourneyEvent("onboarding_started", { locale, source: "signup" })
}

export function trackStepViewed(locale: Locale, stepId: ProtectionStepId, kind: StepKind) {
    trackJourneyEvent("onboarding_step_viewed", { locale, step_id: stepId, step_variant: kind })
}

export function trackStepCompleted(locale: Locale, stepId: ProtectionStepId, kind: StepKind, elapsedMs: number, unsure: boolean) {
    trackJourneyEvent("onboarding_step_completed", { locale, step_id: stepId, step_variant: kind, elapsed_ms: elapsedMs, skip_used: unsure })
}

export function trackStepFailed(locale: Locale, stepId: ProtectionStepId, errorCode: string) {
    trackJourneyEvent("onboarding_step_failed", { locale, step_id: stepId, error_code: errorCode })
}

export function trackDontKnow(locale: Locale, stepId: ProtectionStepId) {
    trackJourneyEvent("onboarding_dont_know_used", { locale, step_id: stepId })
}

/** One typed event per answered screen; `option` is always an enum id. */
export function trackAnswer(locale: Locale, stepId: ProtectionStepId, value: Record<string, unknown>) {
    switch (stepId) {
        case "intent":
            trackJourneyEvent("intent_selected", { locale, step_id: stepId, option: String(value.intent) })
            return
        case "people":
        case "home":
        case "income":
        case "income_dependency":
        case "obligations":
        case "mobility": {
            const raw = value.people ?? value.home ?? value.income ?? value.dependency ?? value.commitments ?? value.vehicles
            const option = Array.isArray(raw) ? raw.join("+") : raw === undefined ? undefined : String(raw)
            trackJourneyEvent("life_context_selected", { locale, step_id: stepId, option, dont_know_used: value.unsure === true })
            return
        }
        case "hurt_most": {
            const concerns = Array.isArray(value.concerns) ? (value.concerns as string[]) : []
            concerns.forEach((option, position) =>
                trackJourneyEvent("risk_concern_selected", { locale, option, answer_count: concerns.length, position })
            )
            return
        }
        case "changes": {
            const changes = Array.isArray(value.changes) ? (value.changes as string[]) : []
            for (const option of changes) {
                trackJourneyEvent("life_change_selected", { locale, option, branch: option === "health_changed" ? "flag" : "registry" })
            }
            return
        }
        case "plans": {
            const plans = Array.isArray(value.plans) ? (value.plans as string[]) : []
            for (const option of plans) trackJourneyEvent("future_consideration_selected", { locale, option })
            return
        }
        case "confidence":
            trackJourneyEvent("confidence_level_selected", { locale, option: String(value.confidence) })
            return
        case "guidance":
            trackJourneyEvent("guidance_preference_selected", { locale, option: (value.guidance as string | null) ?? null })
            return
        default:
            return
    }
}

/** The last life-context screen (mobility) saved — the facts are in. */
export function trackLifeContextCompleted(locale: Locale, input: { intent: string | undefined; dontKnowCount: number }) {
    trackJourneyEvent("life_context_completed", { locale, intent: input.intent, dont_know_count: input.dontKnowCount })
}

/** One per area the map renders, the first time this session shows it. */
export function trackAttentionAreaCreated(input: { area: string; importance: string; confidence: string; alignment: string }) {
    trackJourneyEvent("attention_area_created", input)
}

export function trackCompleted(locale: Locale, input: { stepsCompleted: number; elapsedMs: number; dontKnowCount: number; priorityCount: number; resumed: boolean }) {
    trackJourneyEvent("protection_profile_completed", {
        locale,
        steps_completed: input.stepsCompleted,
        elapsed_ms: input.elapsedMs,
        dont_know_count: input.dontKnowCount,
        priority_count: input.priorityCount,
        resumed: input.resumed,
    })
}

export function trackSummaryViewed(locale: Locale, input: { priorityCount: number; applicableRiskCount: number; firstRiskId: string | null }) {
    trackJourneyEvent("protection_summary_viewed", {
        locale,
        priority_count: input.priorityCount,
        applicable_risk_count: input.applicableRiskCount,
        first_risk_id: input.firstRiskId,
    })
}

export function trackSkipped(locale: Locale, location: string) {
    trackJourneyEvent("onboarding_skipped", { locale, location })
}

export function trackUpload(locale: Locale, phase: "started" | "completed" | "failed", errorCode?: string) {
    if (phase === "started") trackJourneyEvent("policy_upload_started", { locale, source: "onboarding" })
    else if (phase === "completed") {
        trackJourneyEvent("policy_upload_completed", { locale, source: "onboarding" })
        trackJourneyEvent("first_policy_uploaded", { source: "onboarding" })
    } else trackJourneyEvent("policy_upload_failed", { locale, source: "onboarding", error_code: errorCode })
}

export function trackFinished(locale: Locale, stepsCompleted: number, uploaded: boolean) {
    trackJourneyEvent("onboarding_completed", { locale, steps_completed: stepsCompleted, has_file_ready: uploaded })
}
