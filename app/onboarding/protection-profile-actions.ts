"use server"

/**
 * The persistence seam of the first-stage onboarding (the Personal Protection
 * Profile). Kept apart from ./actions.ts on purpose: the upload, analysis and
 * invite actions there are pinned by guards and untouched.
 *
 * Every write is idempotent and keyed by the step, so a retried tap or a
 * refresh mid-flow can never double-count. Facts go to the typed
 * PolicyholderProfile columns through the quick start's non-overwriting rule;
 * statements go to ProtectionProfile. Nothing here computes a score.
 */

import { revalidatePath } from "next/cache"
import type { Prisma } from "@prisma/client"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { refreshProtectionScore } from "@/lib/services/gap-engine"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { declareLifeEvent } from "@/lib/services/life-events/service"
import { recordConversionEvent } from "@/lib/journey/conversion-events"
import { firstNameLabel } from "@/lib/wallet/policy-identity"
import { insightFromContext, type FirstInsight } from "@/lib/services/onboarding/quick-start"
import {
    deriveProtectionPriorities,
    topPriorityIds,
    type ProtectionPriority,
} from "@/lib/services/protection-profile/derive-priorities"
import { protectionProfilePatch, type ProtectionStatements } from "@/lib/services/protection-profile/patch"
import {
    resolveProtectionOnboardingState,
    type ResolvedProtectionOnboardingState,
} from "@/lib/services/protection-profile/state"
import {
    COUNTED_STEPS,
    LIFE_CHANGE_OPTIONS,
    type ProtectionStepId,
} from "@/lib/services/protection-profile/vocabulary"
import { nextStep } from "@/lib/onboarding/protection-profile/steps"
import { ProtectionProfileStepSchema, type ProtectionAnswers } from "@/lib/validations/protection-profile"

type Json = Prisma.InputJsonValue

function stringList(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []
}

function objectOf(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

/** The statement fields a step sets, as Prisma column writes. */
function statementWrites(s: ProtectionStatements): Prisma.ProtectionProfileUncheckedUpdateInput {
    const out: Prisma.ProtectionProfileUncheckedUpdateInput = {}
    if (s.intent !== undefined) out.intent = s.intent
    if (s.riskConcerns !== undefined) out.riskConcerns = s.riskConcerns as Json
    if (s.commitments !== undefined) out.commitments = s.commitments as Json
    if (s.confidenceLevel !== undefined) out.confidenceLevel = s.confidenceLevel
    if (s.uncertaintyReasons !== undefined) out.uncertaintyReasons = s.uncertaintyReasons as Json
    if (s.recentChanges !== undefined) out.recentChanges = s.recentChanges as Json
    if (s.futureConsiderations !== undefined) out.futureConsiderations = s.futureConsiderations as Json
    if (s.guidancePreference !== undefined) out.guidancePreference = s.guidancePreference
    return out
}

export type SaveProtectionStepResult =
    | { ok: true; next: ProtectionStepId | null; answeredSteps: string[] }
    | { ok: false; error: "validation" }

/** Save one screen's answer. Idempotent; the next screen comes back with it. */
export async function saveProtectionProfileStep(input: unknown): Promise<SaveProtectionStepResult> {
    const { dbUser } = await getAuthenticatedUser()
    const userId = dbUser.id
    const parsed = ProtectionProfileStepSchema.safeParse(input)
    if (!parsed.success) return { ok: false, error: "validation" }

    const step = parsed.data
    const patch = protectionProfilePatch(step)
    const { step: stepId, ...answer } = step

    const result = await db.$transaction(async (tx) => {
        if (Object.keys(patch.columns).length > 0 || patch.answeredFields.length > 0) {
            const existing = await tx.policyholderProfile.findUnique({
                where: { userId },
                select: { answeredFields: true },
            })
            const previously = stringList(existing?.answeredFields)
            // Never overwrite an answer the customer has already given properly
            // (the /protection wizard is more precise than these screens).
            const fresh = Object.fromEntries(
                Object.entries(patch.columns).filter(([column]) => !previously.includes(column))
            )
            const answered = [...new Set([...previously, ...patch.answeredFields])]
            await tx.policyholderProfile.upsert({
                where: { userId },
                update: { ...fresh, answeredFields: answered },
                create: { userId, ...patch.columns, answeredFields: answered },
            })
        }

        const row = await tx.protectionProfile.findUnique({ where: { userId } })
        const answers = { ...objectOf(row?.answers), [stepId]: answer } as ProtectionAnswers
        const answeredSteps = [...new Set([...stringList(row?.answeredSteps), stepId])]
        const unsureBefore = stringList(row?.unsureSteps).filter((s) => s !== stepId)
        const unsureSteps = patch.unsure ? [...unsureBefore, stepId] : unsureBefore
        const writes = statementWrites(patch.statements)
        await tx.protectionProfile.upsert({
            where: { userId },
            create: {
                ...(writes as Omit<Prisma.ProtectionProfileUncheckedCreateInput, "userId">),
                userId,
                answers: answers as Json,
                answeredSteps: answeredSteps as Json,
                unsureSteps: unsureSteps as Json,
            },
            update: {
                answers: answers as Json,
                answeredSteps: answeredSteps as Json,
                unsureSteps: unsureSteps as Json,
                ...writes,
            },
        })
        return { answers, answeredSteps }
    })

    return { ok: true, next: nextStep(stepId, result.answers), answeredSteps: result.answeredSteps }
}

export interface ProtectionProfileCompletion {
    priorities: ProtectionPriority[]
    insight: FirstInsight | null
    unsureCount: number
    countedTotal: number
    confidence: string | null
    concerns: string[]
    /** How many risks the engine now considers applicable to this person. */
    applicableRiskCount: number
}

/**
 * The map screen: seal the profile, declare the registry-backed life changes
 * (after the facts — no delta re-applied), refresh the engine once, and return
 * what the map renders. Safe to call twice: the second call only reads.
 */
export async function completeProtectionProfile(): Promise<ProtectionProfileCompletion> {
    const { dbUser } = await getAuthenticatedUser()
    const userId = dbUser.id

    const [profile, row] = await Promise.all([
        db.policyholderProfile.findUnique({ where: { userId } }),
        db.protectionProfile.findUnique({ where: { userId } }),
    ])

    const statements = row
        ? {
              riskConcerns: row.riskConcerns,
              commitments: row.commitments,
              recentChanges: row.recentChanges,
              futureConsiderations: row.futureConsiderations,
              unsureSteps: row.unsureSteps,
          }
        : null
    const ctx = toLifeContext(profile)
    const priorities = deriveProtectionPriorities(ctx, statements)

    if (row && !row.completedAt) {
        // Life changes → LifeEventInstance rows. The facts (children, home,
        // vehicle) were written by the steps, so the registry's increments
        // must not run again; the record, the bus event and the recalculation
        // still do. A non-repeatable event already on file is simply skipped.
        let declared = 0
        const occurredAt = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
        for (const id of stringList(row.recentChanges)) {
            const option = LIFE_CHANGE_OPTIONS.find((o) => o.id === id)
            if (!option?.registry) continue
            try {
                const res = await declareLifeEvent({
                    userId,
                    definitionId: option.registry,
                    occurredAt,
                    source: "customer_declared",
                    confidence: "high",
                    applyDelta: false,
                })
                if (res.ok) declared++
            } catch (error) {
                console.error("protection profile: life event declaration failed", option.registry, error)
            }
        }

        await db.protectionProfile.update({
            where: { userId },
            data: {
                completedAt: new Date(),
                priorityAreas: topPriorityIds(priorities) as Json,
            },
        })

        // Awaited, as the quick start does: the map renders from the persisted
        // assessment. Each declaration above already ran the engine.
        if (declared === 0) {
            await refreshProtectionScore(userId, "profile_update").catch((err) => {
                console.error("protection profile engine run failed:", err)
            })
        }

        const unsure = stringList(row.unsureSteps)
        await recordConversionEvent(userId, "protection_profile_completed", {
            source: "onboarding",
            intent: row.intent ?? undefined,
            priorityCount: priorities.filter((p) => p.importance === "high" || p.importance === "medium").length,
            dontKnowCount: unsure.length,
            confidence: row.confidenceLevel ?? undefined,
        })
        revalidatePath("/dashboard")
        revalidatePath("/protection")
    }

    const insight = insightFromContext(ctx)
    return {
        priorities,
        insight,
        unsureCount: stringList(row?.unsureSteps).length,
        countedTotal: COUNTED_STEPS.length,
        confidence: row?.confidenceLevel ?? null,
        concerns: stringList(row?.riskConcerns),
        applicableRiskCount: insight ? insight.alsoFound + 1 : 0,
    }
}

export async function markProtectionSummaryViewed(): Promise<void> {
    const { dbUser } = await getAuthenticatedUser()
    await db.protectionProfile.updateMany({
        where: { userId: dbUser.id, summaryViewedAt: null },
        data: { summaryViewedAt: new Date() },
    })
}

/** «Θα το κάνω αργότερα» / «Δεν το έχω πρόχειρο τώρα» — or the upload done. */
export async function recordUploadChoice(choice: "done" | "later"): Promise<void> {
    const { dbUser } = await getAuthenticatedUser()
    const userId = dbUser.id
    await db.protectionProfile.upsert({
        where: { userId },
        create: { userId, uploadChoice: choice },
        update: { uploadChoice: choice },
    })
    if (choice === "done") {
        const count = await db.policy.count({ where: { ownerUserId: userId, status: { not: "deleted" } } })
        if (count === 1) {
            await recordConversionEvent(userId, "first_policy_uploaded", { source: "onboarding" })
        }
    }
    revalidatePath("/dashboard")
}

/** «Παράλειψη για τώρα» — recorded so the dashboard never redirects again. */
export async function skipProtectionProfile(): Promise<{ redirectTo: string }> {
    const { dbUser } = await getAuthenticatedUser()
    const userId = dbUser.id
    await db.protectionProfile.upsert({
        where: { userId },
        create: { userId, skippedAt: new Date() },
        update: { skippedAt: new Date() },
    })
    revalidatePath("/dashboard")
    return { redirectTo: "/dashboard" }
}

/**
 * The end of the stage. Sets the legacy completion flags too, so the wallet's
 * coach marks and every reader of `preferences.onboardingCompleted` behave as
 * they did for the five-step intake.
 */
export async function finishProtectionOnboarding(): Promise<{ redirectTo: string }> {
    const { dbUser } = await getAuthenticatedUser()
    const userId = dbUser.id
    const profile = await db.policyholderProfile.findUnique({ where: { userId }, select: { preferences: true } })
    const preferences = objectOf(profile?.preferences)
    const now = new Date().toISOString()
    await db.policyholderProfile.upsert({
        where: { userId },
        create: {
            userId,
            preferences: { onboardingCompleted: true, onboardingCompletedAt: now, showTour: true } as Json,
        },
        update: {
            preferences: { ...preferences, onboardingCompleted: true, onboardingCompletedAt: now, showTour: true } as Json,
        },
    })
    revalidatePath("/dashboard")
    revalidatePath("/wallet")
    return { redirectTo: "/dashboard" }
}

export interface ProtectionOnboardingViewState extends ResolvedProtectionOnboardingState {
    name: string
    hasAiConsent: boolean
    language: "el" | "en"
    /** The stage was finished (legacy flag) — the page redirects to the dashboard. */
    finished: boolean
}

export async function getProtectionOnboardingState(): Promise<ProtectionOnboardingViewState> {
    const { dbUser } = await getAuthenticatedUser()
    const [row, profile] = await Promise.all([
        db.protectionProfile.findUnique({ where: { userId: dbUser.id } }),
        db.policyholderProfile.findUnique({ where: { userId: dbUser.id }, select: { preferences: true } }),
    ])
    return {
        ...resolveProtectionOnboardingState(row),
        name: firstNameLabel(dbUser.name),
        hasAiConsent: Boolean(dbUser.aiProcessingConsentVersion),
        language: dbUser.preferredLanguage === "en" ? "en" : "el",
        finished: objectOf(profile?.preferences).onboardingCompleted === true,
    }
}
