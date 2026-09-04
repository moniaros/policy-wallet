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
import { after } from "next/server"
import type { Prisma } from "@prisma/client"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { refreshProtectionScore } from "@/lib/services/gap-engine"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { declareLifeEvent } from "@/lib/services/life-events/service"
import { recordConversionEvent } from "@/lib/journey/conversion-events"
import { firstNameLabel } from "@/lib/wallet/policy-identity"
import { insightFromContext, type FirstInsight } from "@/lib/services/onboarding/quick-start"
import type { AttentionAreaView, AttentionSummary } from "@/lib/protection/attention-areas"
import type { AttentionAreaId } from "@/lib/protection/domains"
import { loadAttentionAreas } from "@/lib/protection/load-attention-areas"
import {
    deriveProtectionPriorities,
    topPriorityIds,
    type ProtectionPriority,
} from "@/lib/services/protection-profile/derive-priorities"
import {
    applyFactWrites,
    existingFacts,
    factWritesFrom,
    profileFactData,
} from "@/lib/services/protection-profile/fact-writes"
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
import type { PlanTier } from "@/types/subscription-entitlements"

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
            const existing = await tx.policyholderProfile.findUnique({ where: { userId } })
            // One precedence rule for every writer (fact-writes.ts): a floor
            // from these screens never replaces a figure the /protection
            // wizard recorded; a value the person chose here replaces an older
            // floor — and, being newer, an older exact answer.
            const applied = applyFactWrites({
                existing: existingFacts(existing as Record<string, unknown> | null),
                writes: factWritesFrom(patch.columns, { source: "onboarding", precision: patch.precision }),
                alsoAnswered: patch.answeredFields,
                now: new Date(),
            })
            const facts = profileFactData(applied)
            await tx.policyholderProfile.upsert({
                where: { userId },
                update: { ...facts },
                create: { userId, ...facts },
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
    /**
     * The attention areas (lib/protection/load-attention-areas.ts) — what the
     * map's rows render: alignment, unknown facts, confidence, density. The
     * bundle's `ctx` (Art. 9 columns among it) never crosses to the client.
     */
    areas: AttentionAreaView[]
    attention: AttentionSummary
    /** `areas` filtered to `activated`, same order — «Ξεκινάμε από». */
    activatedAreas: AttentionAreaId[]
    policyCount: number
    analysedCount: number
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
    const language = dbUser.preferredLanguage === "en" ? "en" : "el"

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
        await db.protectionProfile.update({
            where: { userId },
            data: {
                completedAt: new Date(),
                priorityAreas: topPriorityIds(priorities) as Json,
            },
        })

        // The map renders from what this action computes in memory — the
        // derived priorities and the pure insight — not from the persisted
        // assessment. Everything that runs the engine (each life-event
        // declaration, and the refresh when nothing was declared) reaches a
        // model provider and took 20 s in front of the customer; it now runs
        // after the response, and the dashboard reads the result when it lands.
        const recentChanges = stringList(row.recentChanges)
        after(async () => {
            // Life changes → LifeEventInstance rows. The facts (children, home,
            // vehicle) were written by the steps, so the registry's increments
            // must not run again; the record, the bus event and the
            // recalculation still do. A non-repeatable event already on file is
            // simply skipped.
            let declared = 0
            const occurredAt = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
            for (const id of recentChanges) {
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
            // Each declaration already ran the engine; otherwise run it once.
            if (declared === 0) {
                await refreshProtectionScore(userId, "profile_update").catch((err) => {
                    console.error("protection profile engine run failed:", err)
                })
            }
        })

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

    // The map's rows: the four layers composed on read, with the person's
    // guidance preference and uncertainty reasons already folded into each
    // area's density and order. Read after the seal so a completed row's
    // statements are the ones the composition sees; nothing here writes.
    const bundle = await loadAttentionAreas({ userId, language })

    const insight = insightFromContext(ctx)
    return {
        priorities,
        areas: bundle.areas,
        attention: bundle.summary,
        activatedAreas: bundle.activatedAreas,
        policyCount: bundle.policyCount,
        analysedCount: bundle.analysedCount,
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

/**
 * The map, re-read after the first upload — the same fields the completion
 * carries for the rows, so the client can diff the picture before the upload
 * against the one after it. Nothing else from the bundle: `ctx` (Art. 9
 * among it), `needs` and `provenance` stay on the server.
 */
export type ProtectionMapRefresh = Pick<ProtectionProfileCompletion, "areas" | "attention" | "activatedAreas" | "policyCount" | "analysedCount">

function mapRefreshFrom(bundle: Awaited<ReturnType<typeof loadAttentionAreas>>): ProtectionMapRefresh {
    return {
        areas: bundle.areas,
        attention: bundle.summary,
        activatedAreas: bundle.activatedAreas,
        policyCount: bundle.policyCount,
        analysedCount: bundle.analysedCount,
    }
}

/**
 * «Θα το κάνω αργότερα» / «Δεν το έχω πρόχειρο τώρα» — or the upload done.
 * After a `done` the map is re-read and returned, so the flow can go BACK to
 * the picture and show what the document moved; a `later` returns nothing.
 */
export async function recordUploadChoice(choice: "done" | "later"): Promise<ProtectionMapRefresh | null> {
    const { dbUser } = await getAuthenticatedUser()
    const userId = dbUser.id
    const language = dbUser.preferredLanguage === "en" ? "en" : "el"
    await db.protectionProfile.upsert({
        where: { userId },
        create: { userId, uploadChoice: choice },
        update: { uploadChoice: choice },
    })
    if (choice !== "done") {
        revalidatePath("/dashboard")
        return null
    }
    const count = await db.policy.count({ where: { ownerUserId: userId, status: { not: "deleted" } } })
    if (count === 1) {
        await recordConversionEvent(userId, "first_policy_uploaded", { source: "onboarding" })
    }
    revalidatePath("/dashboard")
    return mapRefreshFrom(await loadAttentionAreas({ userId, language }))
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
    /**
     * The plan the server resolved — what decides whether the first upload's
     * reading will include the limits. The upload screen's tier-honest line
     * reads this and never a client-side guess.
     */
    tier: PlanTier
}

export async function getProtectionOnboardingState(): Promise<ProtectionOnboardingViewState> {
    const { dbUser } = await getAuthenticatedUser()
    const { resolveUserEntitlements } = await import("@/lib/subscription-entitlements")
    const [row, profile, entitlements] = await Promise.all([
        db.protectionProfile.findUnique({ where: { userId: dbUser.id } }),
        db.policyholderProfile.findUnique({ where: { userId: dbUser.id }, select: { preferences: true } }),
        resolveUserEntitlements(dbUser.id),
    ])
    return {
        ...resolveProtectionOnboardingState(row),
        name: firstNameLabel(dbUser.name),
        hasAiConsent: Boolean(dbUser.aiProcessingConsentVersion),
        language: dbUser.preferredLanguage === "en" ? "en" : "el",
        finished: objectOf(profile?.preferences).onboardingCompleted === true,
        tier: entitlements.tier,
    }
}
