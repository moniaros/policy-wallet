"use server"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

export type RenewalView = {
    id: string
    policyId: string
    policyNumber: string
    insurerName: string
    lineOfBusiness: string
    premiumAmount: number | null
    customerName: string
    customerId: string
    policyEndDate: string
    daysBeforeExpiry: number
    status: string
    outcome: string | null
    outcomeNotes: string | null
    outcomeAt: string | null
    lastReminderAt: string | null
    createdAt: string
}

export async function getAgentRenewals(filters?: {
    status?: string
    timeframe?: "7" | "15" | "30" | "60" | "90" | "all"
}): Promise<RenewalView[]> {
    const { dbUser } = await getAuthenticatedUser()

    const statusFilter = filters?.status && filters.status !== "all"
        ? { status: filters.status }
        : {}

    const now = new Date()
    let dateFilter = {}
    if (filters?.timeframe && filters.timeframe !== "all") {
        const days = parseInt(filters.timeframe)
        const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
        dateFilter = { policyEndDate: { gte: now, lte: cutoff } }
    }

    const renewals = await db.policyRenewal.findMany({
        where: {
            agentUserId: dbUser.id,
            ...statusFilter,
            ...dateFilter,
        },
        include: {
            policy: {
                select: {
                    id: true,
                    policyNumber: true,
                    insurerName: true,
                    lineOfBusiness: true,
                    premiumAmount: true,
                    owner: {
                        select: { id: true, name: true, email: true },
                    },
                },
            },
        },
        orderBy: { policyEndDate: "asc" },
    })

    return renewals.map((r) => ({
        id: r.id,
        policyId: r.policy.id,
        policyNumber: r.policy.policyNumber,
        insurerName: r.policy.insurerName,
        lineOfBusiness: r.policy.lineOfBusiness,
        premiumAmount: r.policy.premiumAmount ? Number(r.policy.premiumAmount) : null,
        customerName: r.policy.owner.name || r.policy.owner.email,
        customerId: r.policy.owner.id,
        policyEndDate: r.policyEndDate.toISOString(),
        daysBeforeExpiry: r.daysBeforeExpiry,
        status: r.status,
        outcome: r.outcome,
        outcomeNotes: r.outcomeNotes,
        outcomeAt: r.outcomeAt?.toISOString() ?? null,
        lastReminderAt: r.lastReminderAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
    }))
}

export async function updateRenewalOutcome(
    renewalId: string,
    data: {
        outcome: "renewed_same_insurer" | "renewed_different_insurer" | "lapsed" | "cancelled"
        notes?: string
    }
): Promise<{ success: boolean; error?: string }> {
    const { dbUser } = await getAuthenticatedUser()

    const renewal = await db.policyRenewal.findFirst({
        where: { id: renewalId, agentUserId: dbUser.id },
    })

    if (!renewal) {
        return { success: false, error: "Renewal not found" }
    }

    const isRenewed = data.outcome === "renewed_same_insurer" || data.outcome === "renewed_different_insurer"

    await db.policyRenewal.update({
        where: { id: renewalId },
        data: {
            status: isRenewed ? "completed" : data.outcome,
            outcome: data.outcome,
            outcomeNotes: data.notes ?? null,
            outcomeAt: new Date(),
        },
    })

    // Complete the linked agent task if it exists
    if (renewal.taskId) {
        await db.userTask.updateMany({
            where: { id: renewal.taskId, userId: dbUser.id },
            data: { status: "completed", completedAt: new Date() },
        })
    }

    return { success: true }
}

export async function getRenewalStats(): Promise<{
    total: number
    pending: number
    overdue: number
    completedThisMonth: number
    lapsedThisMonth: number
    expiringThisWeek: number
    expiringThisMonth: number
    premiumAtRisk: number
}> {
    const { dbUser } = await getAuthenticatedUser()
    const now = new Date()
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [total, pending, overdue, completedThisMonth, lapsedThisMonth, expiringThisWeek, expiringThisMonth, atRiskPolicies] = await Promise.all([
        db.policyRenewal.count({ where: { agentUserId: dbUser.id } }),
        db.policyRenewal.count({ where: { agentUserId: dbUser.id, status: "pending" } }),
        db.policyRenewal.count({ where: { agentUserId: dbUser.id, status: "overdue" } }),
        db.policyRenewal.count({
            where: {
                agentUserId: dbUser.id,
                status: "completed",
                outcomeAt: { gte: monthStart },
            },
        }),
        db.policyRenewal.count({
            where: {
                agentUserId: dbUser.id,
                outcome: "lapsed",
                outcomeAt: { gte: monthStart },
            },
        }),
        db.policyRenewal.count({
            where: {
                agentUserId: dbUser.id,
                status: "pending",
                policyEndDate: { gte: now, lte: weekFromNow },
            },
        }),
        db.policyRenewal.count({
            where: {
                agentUserId: dbUser.id,
                status: "pending",
                policyEndDate: { gte: now, lte: monthFromNow },
            },
        }),
        db.policyRenewal.findMany({
            where: {
                agentUserId: dbUser.id,
                status: { in: ["pending", "overdue"] },
            },
            include: {
                policy: { select: { premiumAmount: true } },
            },
        }),
    ])

    const premiumAtRisk = atRiskPolicies.reduce(
        (sum, r) => sum + (r.policy.premiumAmount ? Number(r.policy.premiumAmount) : 0),
        0
    )

    return {
        total,
        pending,
        overdue,
        completedThisMonth,
        lapsedThisMonth,
        expiringThisWeek,
        expiringThisMonth,
        premiumAtRisk,
    }
}

export async function sendBatchRenewalReminder(renewalIds: string[]): Promise<{
    success: boolean
    sent: number
    error?: string
}> {
    const { dbUser } = await getAuthenticatedUser()
    // Batch renewal reminders are the "renewal automation" feature (Pro+).
    // Starter agents send reminders one at a time; batch/sequence is Pro.
    const { canAgentUseFeature } = await import("@/lib/subscription-entitlements")
    if (!(await canAgentUseFeature(dbUser.id, "renewalAutomation"))) {
        return { success: false, sent: 0, error: "Batch renewal reminders require the Pro plan or higher." }
    }
    const { sendNotification } = await import("@/lib/notifications")

    let sent = 0
    for (const id of renewalIds) {
        const renewal = await db.policyRenewal.findFirst({
            where: { id, agentUserId: dbUser.id, status: { in: ["pending", "overdue"] } },
            include: {
                policy: {
                    select: {
                        id: true,
                        policyNumber: true,
                        insurerName: true,
                        endDate: true,
                        owner: { select: { id: true, preferredLanguage: true } },
                    },
                },
            },
        })
        if (!renewal) continue

        const isEl = renewal.policy.owner.preferredLanguage === "el"
        const expiryDate = renewal.policy.endDate.toLocaleDateString(isEl ? "el-GR" : "en-GB")
        const title = isEl
            ? `Υπενθύμιση ανανέωσης: ${renewal.policy.insurerName}`
            : `Renewal reminder: ${renewal.policy.insurerName}`
        const message = isEl
            ? `Το ασφαλιστήριο ${renewal.policy.policyNumber} λήγει στις ${expiryDate}. Ο ασφαλιστικός σας σύμβουλος θα ήθελε να συζητήσετε τις επιλογές ανανέωσης.`
            : `Your policy ${renewal.policy.policyNumber} expires on ${expiryDate}. Your insurance advisor would like to discuss renewal options.`

        await sendNotification({
            userId: renewal.policy.owner.id,
            eventType: "policy_expiring",
            title,
            message,
            channels: ["email"],
            relatedObjectType: "policy",
            relatedObjectId: renewal.policy.id,
        })
        sent++
    }

    return { success: true, sent }
}
