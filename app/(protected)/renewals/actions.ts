"use server"

import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { formatDate } from "@/lib/i18n/format"
import { notifyCounterparty } from "@/lib/notifications"
import { calendarDaysUntil, startOfAthensDay } from "@/lib/policy-status"

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
    /** MEDIC §H renewal-actionable gate: real-date window + owner + an ACTIVE
     *  (customer-accepted) relationship as the servicing-contact basis; known
     *  false positives (completed/renewed) suppressed. */
    readiness: { ready: boolean; missing: string[] }
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
        // From the start of today in Athens, not from this instant: end dates are
        // stored at midnight, so `gte: now` hid a policy expiring TODAY from the
        // "next 30 days" view three hours into the day it still covered.
        dateFilter = { policyEndDate: { gte: startOfAthensDay(now), lte: cutoff } }
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

    // Contact basis for the readiness gate: an ACTIVE relationship with the
    // policy owner (customer-accepted — servicing contact, not marketing).
    const ownerIds = [...new Set(renewals.map((r) => r.policy.owner.id))]
    const activeRels = ownerIds.length
        ? await db.customerRelationship.findMany({
              where: { agentUserId: dbUser.id, policyholderUserId: { in: ownerIds }, status: 'active' },
              select: { policyholderUserId: true },
          })
        : []
    const activeRelOwners = new Set(activeRels.map((rel) => rel.policyholderUserId))
    const { gateRenewalActionable } = await import('@/lib/medic/gates')

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
        // Recomputed, not the stored snapshot. `daysBeforeExpiry` is only written
        // when the renewal cron last touched this row — so a missed cron run (they
        // fail silently) left the agent reading a stale countdown, and this page
        // disagreed with /insights and the wallet about the same policy.
        daysBeforeExpiry: calendarDaysUntil(r.policyEndDate, now),
        status: r.status,
        outcome: r.outcome,
        outcomeNotes: r.outcomeNotes,
        outcomeAt: r.outcomeAt?.toISOString() ?? null,
        lastReminderAt: r.lastReminderAt?.toISOString() ?? null,
        createdAt: r.createdAt.toISOString(),
        readiness: (() => {
            const days = calendarDaysUntil(r.policyEndDate, now)
            const gate = gateRenewalActionable({
                // Actionable window: inside 90 days (overdue counts — an
                // expired-but-unresolved renewal is MORE urgent, not done).
                expiresInWindow: days <= 90,
                // The query is agent-scoped, so an owner always exists.
                ownerAssigned: true,
                consentToContact: activeRelOwners.has(r.policy.owner.id),
                knownFalsePositive:
                    r.status === 'completed' || Boolean(r.outcome?.startsWith('renewed')),
            })
            // "Ready" means the good-enough bar is fully met — the warn-mode
            // allowed flag is about proceeding anyway, not readiness.
            return { ready: gate.missing.length === 0, missing: gate.missing }
        })(),
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
        include: {
            policy: { select: { id: true, ownerUserId: true, policyNumber: true, insurerName: true } },
        },
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

    // Break the silent handoff: tell the customer where their renewal landed.
    // Skip when the agent is also the owner (self-managed policy) to avoid a
    // self-notification.
    if (renewal.policy && renewal.policy.ownerUserId !== dbUser.id) {
        const outcomeMessage: Record<typeof data.outcome, { el: string; en: string }> = {
            renewed_same_insurer: {
                el: "Το συμβόλαιό σας ανανεώθηκε στον ίδιο ασφαλιστή.",
                en: "Your policy was renewed with the same insurer.",
            },
            renewed_different_insurer: {
                el: "Το συμβόλαιό σας ανανεώθηκε σε νέο ασφαλιστή.",
                en: "Your policy was renewed with a new insurer.",
            },
            lapsed: {
                el: "Το συμβόλαιό σας έληξε χωρίς ανανέωση.",
                en: "Your policy lapsed without renewal.",
            },
            cancelled: {
                el: "Το συμβόλαιό σας ακυρώθηκε.",
                en: "Your policy was cancelled.",
            },
        }
        await notifyCounterparty({
            userId: renewal.policy.ownerUserId,
            eventType: "renewal_outcome",
            title: {
                el: `Ενημέρωση ανανέωσης: ${renewal.policy.policyNumber}`,
                en: `Renewal update: ${renewal.policy.policyNumber}`,
            },
            message: outcomeMessage[data.outcome],
            relatedObjectType: "policy",
            relatedObjectId: renewal.policy.id,
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
                policyEndDate: { gte: startOfAthensDay(now), lte: weekFromNow },
            },
        }),
        db.policyRenewal.count({
            where: {
                agentUserId: dbUser.id,
                status: "pending",
                policyEndDate: { gte: startOfAthensDay(now), lte: monthFromNow },
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
                        owner: { select: { id: true, preferredLanguage: true } },
                    },
                },
            },
        })
        if (!renewal) continue

        const isEl = renewal.policy.owner.preferredLanguage === "el"
        // Athens-zone, like the automated policy_expiring reminder in
        // renewal.service.ts (and the wallet). A bare toLocaleDateString renders
        // in the runtime zone — UTC on Vercel — so a policy ending at Athens
        // midnight was reminded as the PREVIOUS day, disagreeing with both the
        // wallet and the automated reminder for the very same policy.
        //
        // The date is the CYCLE's own (`policyEndDate`, keyed on the resolved end
        // since PW-BRIDGE-01 C-02) — the date the adviser sees on the row they
        // clicked — never the raw `Policy.endDate` column, which names the old
        // period for a renewed policy.
        const title = {
            el: `Υπενθύμιση ανανέωσης: ${renewal.policy.insurerName}`,
            en: `Renewal reminder: ${renewal.policy.insurerName}`,
        }
        const message = {
            el: `Το ασφαλιστήριο ${renewal.policy.policyNumber} λήγει στις ${formatDate(renewal.policyEndDate, "el")}. Ο ασφαλιστικός σας σύμβουλος θα ήθελε να συζητήσετε τις επιλογές ανανέωσης.`,
            en: `Your policy ${renewal.policy.policyNumber} expires on ${formatDate(renewal.policyEndDate, "en")}. Your insurance advisor would like to discuss renewal options.`,
        }

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
