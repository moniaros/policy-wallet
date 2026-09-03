/**
 * Resume and entry decisions for the first-stage onboarding — pure functions
 * over the two stored rows, so a refresh, a return visit and the dashboard's
 * gate all agree on where the person is.
 */

import { firstOpenStep, isProtectionStepId } from "@/lib/onboarding/protection-profile/steps"
import type { ProtectionStepId } from "@/lib/services/protection-profile/vocabulary"
import type { ProtectionAnswers } from "@/lib/validations/protection-profile"

export type ProtectionOnboardingStatus = "not_started" | "in_progress" | "summary_seen" | "completed"

export interface ProtectionProfileRowLike {
    answers: unknown
    answeredSteps: unknown
    unsureSteps: unknown
    completedAt: Date | null
    skippedAt: Date | null
    summaryViewedAt: Date | null
    uploadChoice: string | null
}

export interface ResolvedProtectionOnboardingState {
    status: ProtectionOnboardingStatus
    stepId: ProtectionStepId
    answers: ProtectionAnswers
    answeredSteps: string[]
    unsureSteps: string[]
    skipped: boolean
}

function stringList(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []
}

function answersOf(value: unknown): ProtectionAnswers {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {}
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
        if (isProtectionStepId(key) && v && typeof v === "object") out[key] = v
    }
    return out as ProtectionAnswers
}

export function resolveProtectionOnboardingState(
    row: ProtectionProfileRowLike | null
): ResolvedProtectionOnboardingState {
    if (!row) {
        return { status: "not_started", stepId: "intent", answers: {}, answeredSteps: [], unsureSteps: [], skipped: false }
    }
    const answers = answersOf(row.answers)
    const answeredSteps = stringList(row.answeredSteps)
    const unsureSteps = stringList(row.unsureSteps)
    const skipped = Boolean(row.skippedAt)

    if (row.completedAt) {
        // The profile is done; what remains is the tail. Someone who chose
        // «later» on the upload comes back to it, never to the questions.
        const stepId: ProtectionStepId = row.uploadChoice === "done" ? "advisor" : "upload"
        return {
            status: row.uploadChoice ? "completed" : "summary_seen",
            stepId,
            answers,
            answeredSteps,
            unsureSteps,
            skipped,
        }
    }

    const stepId = firstOpenStep(answers, answeredSteps)
    const started = answeredSteps.length > 0 || Object.keys(answers).length > 0
    return {
        status: started ? "in_progress" : "not_started",
        stepId,
        answers,
        answeredSteps,
        unsureSteps,
        skipped,
    }
}

/**
 * The dashboard's one-time redirect. True only for a policyholder who has
 * nothing yet — no completed profile, no skip on record, no policy, and no
 * legacy onboarding completion (accounts from before the protection profile
 * are never bounced into it).
 */
export function shouldEnterProtectionOnboarding(input: {
    completedAt: Date | null
    skippedAt: Date | null
    policyCount: number
    legacyCompleted: boolean
}): boolean {
    return input.policyCount === 0 && !input.completedAt && !input.skippedAt && !input.legacyCompleted
}
