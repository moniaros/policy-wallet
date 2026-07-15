"use server"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { PolicyService } from "@/lib/services/policy.service"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { canUserAddPolicy, getUpgradeMessage } from "@/lib/subscription-limits"

const ONBOARDING_REMINDER_EVENT_TYPES = [
    "policy_expiring",
    "pending_questionnaire",
    "renewal_milestone",
    // Backward-compatible aliases used in some parts of the app/API.
    "questionnaire_received",
]

const ONBOARDING_NOTIFICATION_CHANNELS = ["email", "push"] as const

async function syncOnboardingReminderPreferences(
    userId: string,
    reminderOptIn: boolean,
    reminderChannels: string[]
) {
    const selectedChannels = new Set(
        reminderChannels
            .map((channel) => String(channel).toLowerCase().trim())
            .filter((channel): channel is "email" | "push" => channel === "email" || channel === "push")
    )

    const ops: Promise<unknown>[] = []
    for (const eventType of ONBOARDING_REMINDER_EVENT_TYPES) {
        for (const channel of ONBOARDING_NOTIFICATION_CHANNELS) {
            const enabled = reminderOptIn && selectedChannels.has(channel)
            ops.push(
                db.notificationPreference.upsert({
                    where: {
                        userId_eventType_channel: {
                            userId,
                            eventType,
                            channel,
                        },
                    },
                    update: { enabled },
                    create: {
                        userId,
                        eventType,
                        channel,
                        enabled,
                    },
                })
            )
        }
    }

    await Promise.all(ops)
}

export async function completeOnboardingStep(step: number, data?: any) {
    const { dbUser } = await getAuthenticatedUser()
    const userId = dbUser.id

    // Get or create policyholder profile
    let profile = await db.policyholderProfile.findUnique({
        where: { userId }
    })

    if (!profile) {
        profile = await db.policyholderProfile.create({
            data: {
                userId,
                preferences: {}
            }
        })
    }

    const currentPreferences = (profile.preferences as Record<string, any>) || {}
    const payload = (data && typeof data === "object") ? data : {}
    const {
        onboardingReminderOptIn,
        onboardingReminderChannels,
        ...persistedPayload
    } = payload as Record<string, any>

    const updatedPreferences: Record<string, any> = {
        ...currentPreferences,
        onboardingStep: step,
        ...persistedPayload, // Merge step data except reminder channel payload (stored in notification_preferences)
    }

    const shouldComplete = Boolean(payload?.markCompleted) || step >= 7

    if (shouldComplete) {
        updatedPreferences.onboardingCompleted = true
        updatedPreferences.onboardingCompletedAt = new Date().toISOString()
        updatedPreferences.showTour = true
    }

    await db.policyholderProfile.update({
        where: { userId },
        data: {
            preferences: updatedPreferences
        }
    })

    const hasReminderChoice = Object.prototype.hasOwnProperty.call(payload, "onboardingReminderOptIn")
    if (hasReminderChoice) {
        const reminderOptIn = Boolean(onboardingReminderOptIn)
        const reminderChannels = Array.isArray(onboardingReminderChannels)
            ? onboardingReminderChannels
            : []
        await syncOnboardingReminderPreferences(userId, reminderOptIn, reminderChannels)
    }

    revalidatePath("/onboarding")

    if (shouldComplete) {
        const redirectTo = typeof payload?.redirectTo === "string" && payload.redirectTo.startsWith("/")
            ? payload.redirectTo
            : "/home"
        redirect(redirectTo)
    }
}

export async function uploadOnboardingPolicy(formData: FormData) {
    const { dbUser } = await getAuthenticatedUser()
    const userId = dbUser.id

    const file = formData.get("file") as File
    const canAdd = await canUserAddPolicy(userId)
    if (!canAdd.allowed) {
        return {
            success: false,
            error: getUpgradeMessage("policy_limit_reached", (dbUser.preferredLanguage as "el" | "en") || "en"),
        }
    }

    if (!file) {
        return { success: false, error: "No file provided" }
    }

    const policyService = new PolicyService(db)

    try {
        const result = await policyService.uploadAndParse(userId, file, dbUser.preferredLanguage as "en" | "el")

        // Trigger background analysis if not already handled by service (service usually returns 'analyzing' status)
        // The service method uploadAndParse creates a record with 'analyzing' status.
        // We should trigger the background job. In a real app, this would be a queue.
        // Here we might just call it async without awaiting, or rely on a separate worker.
        // For this implementation, we'll let the client poll or show "Analyzing..."

        // Simulating the trigger of background analysis (fire and forget pattern in server actions is tricky, 
        // usually we'd use a queue, but here we can try to call it)
        // However, Vercel server functions might kill execution if we don't await.
        // For onboarding speed, we might not want to wait for full analysis.
        // The service logic:
        /*
        policyService.runBackgroundAnalysis(result.policyId, userId, dbUser.preferredLanguage as "en" | "el")
            .catch(err => console.error("Background analysis error:", err))
        */

        // Instead of fire-and-forget which is unreliable in serverless, we return success 
        // and let the client know it's analyzing.

        // Just ensuring policyholder profile exists
        await db.policyholderProfile.upsert({
            where: { userId },
            create: { userId, preferences: {} },
            update: {}
        })

        return { success: true, policyId: result.policyId }
    } catch (error) {
        console.error("Upload error:", error)
        return { success: false, error: error instanceof Error ? error.message : "Upload failed" }
    }
}

export async function getOnboardingState() {
    const { dbUser } = await getAuthenticatedUser()

    const profile = await db.policyholderProfile.findUnique({
        where: { userId: dbUser.id }
    })

    if (!profile || !profile.preferences) return {
        step: 1,
        completed: false,
        name: dbUser.name?.split(" ")[0] || "there",
        onboardingSegment: null as "individual" | "family_manager" | "small_business" | null,
        onboardingGoals: [] as string[],
        onboardingFamiliarity: null as "beginner" | "intermediate" | "experienced" | null,
        onboardingFileReady: null as boolean | null,
        onboardingEntryCompleted: false,
        hasAiConsent: Boolean(dbUser.aiProcessingConsentVersion),
    }

    const prefs = profile.preferences as any
    return {
        step: prefs.onboardingStep || 1,
        completed: prefs.onboardingCompleted || false,
        name: dbUser.name?.split(" ")[0] || "there",
        onboardingSegment: prefs.onboardingSegment ?? null,
        onboardingGoals: Array.isArray(prefs.onboardingGoals) ? prefs.onboardingGoals : [],
        onboardingFamiliarity: prefs.onboardingFamiliarity ?? null,
        onboardingFileReady: typeof prefs.onboardingFileReady === "boolean" ? prefs.onboardingFileReady : null,
        onboardingEntryCompleted: Boolean(prefs.onboardingEntryCompletedAt),
        hasAiConsent: Boolean(dbUser.aiProcessingConsentVersion),
    }
}

export async function redeemInviteCode(code: string) {
    const { dbUser } = await getAuthenticatedUser()

    // Find invite by token
    const invite = await db.invite.findUnique({ where: { token: code } })
    if (!invite) {
        return { success: false, error: "invalid" as const }
    }
    if (invite.consumedAt) {
        return { success: false, error: "already_used" as const }
    }
    if (invite.expiresAt < new Date()) {
        return { success: false, error: "expired" as const }
    }

    // Redeem invite — create relationship
    await db.invite.update({
        where: { id: invite.id },
        data: { consumedAt: new Date(), inviteeUserId: dbUser.id },
    })

    // Activate or create customer relationship
    const existingRelationship = await db.customerRelationship.findFirst({
        where: {
            agentUserId: invite.inviterUserId,
            policyholderUserId: dbUser.id,
        },
    })

    if (existingRelationship) {
        await db.customerRelationship.update({
            where: { id: existingRelationship.id },
            data: { status: "active" },
        })
    } else {
        await db.customerRelationship.create({
            data: {
                agentUserId: invite.inviterUserId,
                policyholderUserId: dbUser.id,
                status: "active",
            },
        })
    }

    // Get agent name for confirmation
    const agent = await db.user.findUnique({
        where: { id: invite.inviterUserId },
        select: { name: true },
    })

    return { success: true, agentName: agent?.name || "Your advisor" }
}

/**
 * Trigger real AI analysis for a policy uploaded during onboarding.
 * Uses the PolicyAnalysisOrchestrator for actual coverage analysis.
 */
export async function triggerOnboardingAnalysis(policyId: string): Promise<{
    success: boolean
    status: "completed" | "running" | "queued" | "failed"
    healthScore?: number
    gapCount?: number
    runId?: string
    error?: string
}> {
    const { dbUser } = await getAuthenticatedUser()

    if (!policyId) {
        return { success: false, status: "failed", error: "No policy ID" }
    }

    // Verify the policy belongs to the user
    const policy = await db.policy.findFirst({
        where: { id: policyId, ownerUserId: dbUser.id },
        select: { id: true, lastAnalyzedAt: true },
    })

    if (!policy) {
        return { success: false, status: "failed", error: "Policy not found" }
    }

    // If already analyzed, return results directly
    if (policy.lastAnalyzedAt) {
        const gaps = await db.gapInstance.findMany({
            where: { policyId, status: { in: ["open", "detected", "acknowledged"] } },
            select: { severity: true },
        })
        const c = gaps.filter(g => g.severity === "critical").length
        const h = gaps.filter(g => g.severity === "high").length
        const m = gaps.filter(g => g.severity === "medium").length
        const l = gaps.filter(g => g.severity === "low").length
        const score = Math.max(0, Math.min(100, 100 - (c * 25 + h * 15 + m * 8 + l * 3)))

        return {
            success: true,
            status: "completed",
            healthScore: score,
            gapCount: gaps.length,
        }
    }

    // Check for existing analysis run
    const existingRun = await db.policyAnalysisRun.findFirst({
        where: { policyId, userId: dbUser.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, status: true },
    })

    if (existingRun && existingRun.status === "running") {
        return { success: true, status: "running" as const }
    }

    // Trigger new analysis
    try {
        const { PolicyAnalysisOrchestratorService } = await import("@/lib/services/analysis/policy-analysis-orchestrator.service")
        const orchestrator = new PolicyAnalysisOrchestratorService()

        // Free/Starter get the basic parsed summary only — deep AI (gaps,
        // clarity) is a Plus feature. Onboarding users are typically free.
        const initiator = await db.user.findUnique({ where: { id: dbUser.id }, select: { roles: true } })
        const isAgent = Boolean(initiator?.roles?.includes("agent"))
        if (!isAgent) {
            const { resolveUserEntitlements } = await import("@/lib/subscription-entitlements")
            const entitlements = await resolveUserEntitlements(dbUser.id)
            if (entitlements.tier !== "pro") {
                const basic = await orchestrator.extractBasicSummary(policyId, dbUser.id)
                return {
                    success: basic.status === "completed",
                    status: basic.status === "completed" ? "completed" : "failed",
                }
            }
        }

        const result = await orchestrator.createAndExecuteRun(
            policyId,
            dbUser.id,
            (dbUser.preferredLanguage as "en" | "el") || "en"
        )

        if (result) {
            const isComplete = result.status === "completed" || result.status === "completed_with_warnings"
            const isFailed = result.status === "failed" || result.status === "blocked"
            return {
                success: !isFailed,
                status: isComplete ? "completed" : isFailed ? "failed" : "running",
                healthScore: result.overallSuccessPct ?? undefined,
            }
        }

        return { success: true, status: "completed" }
    } catch (error) {
        console.error("Onboarding analysis error:", error)
        // No background worker drains queued runs, so creating one would leave the
        // policy permanently stuck in 'analyzing'. Revert to 'incomplete' instead so
        // the user sees a clear failure and can retry manually.
        try {
            await db.policy.update({
                where: { id: policyId },
                data: { status: "incomplete" },
            })
        } catch {
            // best-effort
        }
        return { success: false, status: "failed" as const, error: "Analysis failed. Please try again." }
    }
}

export async function dismissTour() {
    const { dbUser } = await getAuthenticatedUser()

    const profile = await db.policyholderProfile.findUnique({
        where: { userId: dbUser.id }
    })

    if (!profile) return

    await db.policyholderProfile.update({
        where: { userId: dbUser.id },
        data: {
            preferences: {
                ...(profile.preferences as any),
                showTour: false
            }
        }
    })

    revalidatePath("/wallet")
}
