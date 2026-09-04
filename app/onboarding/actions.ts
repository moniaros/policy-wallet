"use server"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { PolicyService } from "@/lib/services/policy.service"
import { revalidatePath } from "next/cache"
import { canUserAddPolicy, getUpgradeMessage } from "@/lib/subscription-limits"
import { displayPersonName, firstNameLabel } from "@/lib/wallet/policy-identity"
import { PREFERENCE_CHANNELS } from "@/lib/notifications/preference-channels"

const ONBOARDING_REMINDER_EVENT_TYPES = [
    "policy_expiring",
    "pending_questionnaire",
    "renewal_milestone",
    // Backward-compatible aliases used in some parts of the app/API.
    "questionnaire_received",
]

async function syncOnboardingReminderPreferences(
    userId: string,
    reminderOptIn: boolean,
    reminderChannels: string[]
) {
    // Only channels the product can deliver on outside the app — derived, so a
    // newly implemented transport is accepted here without this file changing.
    const selectedChannels = new Set(
        reminderChannels
            .map((channel) => String(channel).toLowerCase().trim())
            .filter((channel) => (PREFERENCE_CHANNELS as string[]).includes(channel))
    )

    const ops: Promise<unknown>[] = []
    for (const eventType of ONBOARDING_REMINDER_EVENT_TYPES) {
        for (const channel of PREFERENCE_CHANNELS) {
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
        // Return the destination instead of redirect()-ing here. A server-side
        // redirect() throws a NEXT_REDIRECT control-flow error, which the client
        // caller's try/catch swallowed (surfacing as a false "could not finish
        // onboarding" toast, e.g. after sending an advisor invite). The caller
        // navigates client-side with this value.
        return { redirectTo }
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
        // Log the real error, but do NOT return error.message to the client — it
        // was rendered in a toast during first-run onboarding, leaking a raw
        // (English, sometimes technical) exception. flow.tsx shows a localised
        // "upload failed" when error is absent.
        console.error("Upload error:", error)
        return { success: false as const }
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
    // Bind the invite to the addressed email. The token alone must not connect an
    // arbitrary logged-in account to the agent (a forwarded/leaked link, or a code
    // entered from the wrong account) — redemption is only valid for the person it
    // was sent to.
    if (invite.inviteeEmail.trim().toLowerCase() !== (dbUser.email ?? "").trim().toLowerCase()) {
        return { success: false, error: "wrong_account" as const }
    }

    // Redeem invite — create relationship
    await db.invite.update({
        where: { id: invite.id },
        data: { consumedAt: new Date(), inviteeUserId: dbUser.id },
    })

    // Accepting the invite IS the customer's explicit consent to this agent, so
    // set both status (UI/stats) and activationStatus (the identity-consent gate
    // in lib/agent-consent.ts) — otherwise the agent still couldn't see the
    // customer they were just connected to.
    const existingRelationship = await db.customerRelationship.findFirst({
        where: {
            agentUserId: invite.inviterUserId,
            policyholderUserId: dbUser.id,
        },
    })

    if (existingRelationship) {
        await db.customerRelationship.update({
            where: { id: existingRelationship.id },
            data: { status: "active", activationStatus: "activated" },
        })
    } else {
        await db.customerRelationship.create({
            data: {
                agentUserId: invite.inviterUserId,
                policyholderUserId: dbUser.id,
                status: "active",
                activationStatus: "activated",
            },
        })
    }

    // Get agent name for confirmation
    const agent = await db.user.findUnique({
        where: { id: invite.inviterUserId },
        select: { name: true },
    })

    return { success: true, agentName: displayPersonName(agent?.name) || "Your advisor" }
}

/**
 * Trigger real AI analysis for a policy uploaded during onboarding.
 * Uses the PolicyAnalysisOrchestrator for actual coverage analysis.
 */
export async function triggerOnboardingAnalysis(policyId: string): Promise<{
    success: boolean
    status: "completed" | "running" | "queued" | "failed"
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
        // No score here. The provisional protection score rendered on this
        // screen until Aug 2026 — it returned 100 for a portfolio with no
        // detected gaps whether or not anything had really been read, and the
        // score is now removed from the product (run PW-MOBILE-TRANSFORM-01,
        // halt H-001). The gap count is a recorded fact; that renders.
        return {
            success: true,
            status: "completed",
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
            const { canRunDeepAnalysis } = await import("@/lib/monetization/feature-gates")
            const entitlements = await resolveUserEntitlements(dbUser.id)
            if (!canRunDeepAnalysis(entitlements.tier)) {
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
            // `overallSuccessPct` used to be returned as `healthScore` here —
            // a pipeline success percentage dressed up as a protection figure.
            return {
                success: !isFailed,
                status: isComplete ? "completed" : isFailed ? "failed" : "running",
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
