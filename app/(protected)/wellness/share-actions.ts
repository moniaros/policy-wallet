"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { ENDED_RELATIONSHIP_STATUSES } from "@/lib/agent-visibility"
import { emit } from "@/lib/notifications/dispatch"
import { collaborationService } from "@/lib/services/collaboration.service"
import { HEALTH_SHARE_THREAD } from "@/lib/insurance/content/agent-requests"
import { HEALTH_SHARE_CONSENT_VERSION, buildHealthSnapshot } from "@/lib/wellness/health-share"
import type { CategoryScore } from "@/lib/wellness/scoring"
import { logger } from "@/lib/logger"

/**
 * Prevention brief P2 — the person shows ONE advisor a frozen, minimised
 * snapshot of their health picture. Public endpoints: the subject is the
 * session; the relationship must be the caller's own and still living;
 * consent is the literal `true`, checked before anything is read.
 */
const ShareInput = z.object({
    relationshipId: z.string().min(1),
    scope: z.enum(["assessment", "profile", "both"]),
    consent: z.literal(true),
})

export async function shareHealthWithAdvisor(input: { relationshipId: string; scope: "assessment" | "profile" | "both"; consent: boolean }) {
    const { dbUser } = await getAuthenticatedUser()
    const parsed = ShareInput.safeParse(input)
    if (!parsed.success) return { error: "CONSENT_REQUIRED" as const }
    const { relationshipId, scope } = parsed.data

    const relationship = await db.customerRelationship.findFirst({
        where: { id: relationshipId, policyholderUserId: dbUser.id, status: { notIn: [...ENDED_RELATIONSHIP_STATUSES] } },
        select: { id: true, agentUserId: true },
    })
    if (!relationship) return { error: "NOT_FOUND" as const }

    const [assessment, profile] = await Promise.all([
        scope === "profile" ? null : db.healthRiskAssessment.findFirst({ where: { userId: dbUser.id }, orderBy: { createdAt: "desc" }, select: { scores: true, createdAt: true } }),
        scope === "assessment" ? null : db.policyholderProfile.findUnique({
            where: { userId: dbUser.id },
            select: { smokingStatus: true, activityLevel: true, chronicConditions: true, familyMedicalHistory: true, heightCm: true, weightKg: true },
        }),
    ])
    const snapshot = buildHealthSnapshot(
        scope,
        assessment ? { scores: assessment.scores as unknown as CategoryScore[], createdAt: assessment.createdAt } : null,
        profile
    )
    if (!snapshot.assessment && !snapshot.profile) return { error: "NOTHING_TO_SHARE" as const }

    const share = await db.healthShare.upsert({
        where: { userId_agentUserId: { userId: dbUser.id, agentUserId: relationship.agentUserId } },
        create: {
            userId: dbUser.id, agentUserId: relationship.agentUserId, relationshipId: relationship.id,
            scope, consentVersion: HEALTH_SHARE_CONSENT_VERSION, snapshot: snapshot as unknown as Prisma.InputJsonValue, status: "active",
        },
        update: {
            relationshipId: relationship.id, scope, consentVersion: HEALTH_SHARE_CONSENT_VERSION,
            snapshot: snapshot as unknown as Prisma.InputJsonValue, status: "active", revokedAt: null, lastViewedAt: null,
        },
    })

    // The thread and the notification say THAT a share exists — never a value.
    try {
        await collaborationService.ensureAutomationThread(dbUser.id, {
            relationshipId: relationship.id,
            subject: HEALTH_SHARE_THREAD.subject.el,
            category: HEALTH_SHARE_THREAD.category,
            priority: HEALTH_SHARE_THREAD.priority,
            initialMessage: HEALTH_SHARE_THREAD.message.el,
        })
    } catch (error) {
        logger("warn", "health share: thread not opened", { error: String(error) })
    }
    await emit({
        event: "health_share_received",
        userId: relationship.agentUserId,
        title: { el: "Κοινοποίηση εικόνας υγείας", en: "Health picture shared" },
        message: { el: "Ένας πελάτης σας κοινοποίησε την εικόνα υγείας του.", en: "A customer shared their health picture with you." },
        dedupeKey: `health_share:${share.id}:${share.updatedAt.toISOString()}`,
    })

    revalidatePath("/wellness")
    return { ok: true as const }
}

/** Withdraw: the snapshot is deleted, not just hidden. */
export async function revokeHealthShare(shareId: string) {
    const { dbUser } = await getAuthenticatedUser()
    if (typeof shareId !== "string" || !shareId) return { error: "INVALID" as const }
    const result = await db.healthShare.updateMany({
        where: { id: shareId, userId: dbUser.id, status: "active" },
        data: { status: "revoked", snapshot: Prisma.DbNull, revokedAt: new Date() },
    })
    revalidatePath("/wellness")
    return result.count > 0 ? { ok: true as const } : { error: "NOT_FOUND" as const }
}
