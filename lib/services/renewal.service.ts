import { db } from "../db"
import { sendNotification } from "../notifications"
import { logger } from "../logger"

// Milestone days before policy expiry when reminders are sent
const RENEWAL_MILESTONES = [90, 60, 30, 15, 7] as const
type Milestone = (typeof RENEWAL_MILESTONES)[number]

export type RenewalRunSummary = {
    policiesScanned: number
    renewalRecordsCreated: number
    agentTasksCreated: number
    policyholderNotificationsSent: number
    agentNotificationsSent: number
    errors: string[]
}

/**
 * Main renewal check job — called daily by the cron endpoint.
 *
 * 1. Finds all active policies expiring within 90 days
 * 2. Creates/updates PolicyRenewal records
 * 3. Sends milestone reminders to policyholders
 * 4. Creates tasks and notifications for linked agents
 */
export async function runRenewalCheck(): Promise<RenewalRunSummary> {
    const now = new Date()
    const cutoff = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days out

    const summary: RenewalRunSummary = {
        policiesScanned: 0,
        renewalRecordsCreated: 0,
        agentTasksCreated: 0,
        policyholderNotificationsSent: 0,
        agentNotificationsSent: 0,
        errors: [],
    }

    try {
        // 1. Find active policies expiring within 90 days
        const expiringPolicies = await db.policy.findMany({
            where: {
                status: "active",
                endDate: {
                    gte: now,
                    lte: cutoff,
                },
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        preferredLanguage: true,
                    },
                },
            },
        })

        summary.policiesScanned = expiringPolicies.length

        for (const policy of expiringPolicies) {
            try {
                const daysUntilExpiry = Math.ceil(
                    (policy.endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
                )

                // Determine which milestone we're at (closest one at or above current days)
                const currentMilestone = RENEWAL_MILESTONES.find(m => daysUntilExpiry <= m)
                if (!currentMilestone) continue // More than 90 days away somehow

                // 2. Upsert PolicyRenewal record
                const existingRenewal = await db.policyRenewal.findUnique({
                    where: {
                        policyId_policyEndDate: {
                            policyId: policy.id,
                            policyEndDate: policy.endDate,
                        },
                    },
                })

                // Find agent relationship for this policyholder
                const relationship = await db.customerRelationship.findFirst({
                    where: {
                        policyholderUserId: policy.ownerUserId,
                        status: { in: ["active", "pending_activation"] },
                    },
                    select: { agentUserId: true },
                })

                let renewalRecord = existingRenewal
                if (!existingRenewal) {
                    renewalRecord = await db.policyRenewal.create({
                        data: {
                            policyId: policy.id,
                            ownerUserId: policy.ownerUserId,
                            agentUserId: relationship?.agentUserId ?? null,
                            policyEndDate: policy.endDate,
                            daysBeforeExpiry: daysUntilExpiry,
                            status: "pending",
                            remindersSent: [],
                        },
                    })
                    summary.renewalRecordsCreated++
                } else {
                    // Update days count
                    await db.policyRenewal.update({
                        where: { id: existingRenewal.id },
                        data: {
                            daysBeforeExpiry: daysUntilExpiry,
                            agentUserId: relationship?.agentUserId ?? existingRenewal.agentUserId,
                        },
                    })
                }

                // Skip if already resolved
                if (renewalRecord && ["renewed_same_insurer", "renewed_different_insurer", "lapsed", "cancelled"].includes(renewalRecord.status)) {
                    continue
                }

                // 3. Check which milestones have already been sent
                const sentMilestones = parseSentMilestones(renewalRecord?.remindersSent)
                const milestonesToSend = RENEWAL_MILESTONES.filter(
                    m => daysUntilExpiry <= m && !sentMilestones.has(m)
                )

                if (milestonesToSend.length === 0) continue

                // Send the most relevant (closest) milestone
                const milestone = milestonesToSend[milestonesToSend.length - 1] as Milestone
                const isEl = policy.owner.preferredLanguage === "el"

                // 4. Notify policyholder
                await sendPolicyholderReminder(policy, milestone, isEl)
                summary.policyholderNotificationsSent++

                // 5. Notify and create task for agent if linked
                if (relationship?.agentUserId) {
                    await sendAgentRenewalNotification(
                        relationship.agentUserId,
                        policy,
                        milestone,
                        renewalRecord?.id ?? ""
                    )
                    summary.agentNotificationsSent++

                    // Create agent task on first detection or at 30-day mark
                    if (!existingRenewal || milestone <= 30) {
                        const taskCreated = await createAgentRenewalTask(
                            relationship.agentUserId,
                            policy,
                            daysUntilExpiry,
                            renewalRecord?.id ?? ""
                        )
                        if (taskCreated) summary.agentTasksCreated++
                    }
                }

                // 6. Update reminders_sent
                const updatedReminders = [
                    ...sentMilestones.entries(),
                ].map(([m, sentAt]) => ({ milestone: m, sentAt }))
                updatedReminders.push({ milestone, sentAt: now.toISOString() })

                await db.policyRenewal.update({
                    where: { id: renewalRecord!.id },
                    data: {
                        remindersSent: updatedReminders,
                        lastReminderAt: now,
                    },
                })
            } catch (err) {
                const msg = `Error processing policy ${policy.id}: ${err}`
                summary.errors.push(msg)
                logger("error", msg, { policyId: policy.id })
            }
        }

        // 7. Mark overdue policies (endDate < now, still pending)
        const overdueCount = await db.policyRenewal.updateMany({
            where: {
                status: "pending",
                policyEndDate: { lt: now },
            },
            data: { status: "overdue" },
        })
        if (overdueCount.count > 0) {
            logger("info", `Marked ${overdueCount.count} renewals as overdue`)
        }
    } catch (err) {
        const msg = `Renewal check job failed: ${err}`
        summary.errors.push(msg)
        logger("error", msg)
    }

    return summary
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSentMilestones(raw: unknown): Map<number, string> {
    const map = new Map<number, string>()
    if (!Array.isArray(raw)) return map
    for (const entry of raw) {
        if (entry && typeof entry === "object" && "milestone" in entry && "sentAt" in entry) {
            map.set(Number(entry.milestone), String(entry.sentAt))
        }
    }
    return map
}

async function sendPolicyholderReminder(
    policy: {
        id: string
        policyNumber: string
        insurerName: string
        lineOfBusiness: string
        endDate: Date
        owner: { id: string; name: string | null; preferredLanguage: string }
    },
    milestone: Milestone,
    isEl: boolean
) {
    const expiryDate = policy.endDate.toLocaleDateString(isEl ? "el-GR" : "en-GB")
    const title = isEl
        ? `Η ασφάλισή σας λήγει σε ${milestone} ημέρες`
        : `Your policy expires in ${milestone} days`
    const message = isEl
        ? `Το ασφαλιστήριο ${policy.insurerName} (${policy.policyNumber}) λήγει στις ${expiryDate}. Ελέγξτε τις επιλογές ανανέωσής σας.`
        : `Your ${policy.insurerName} policy (${policy.policyNumber}) expires on ${expiryDate}. Review your renewal options.`

    await sendNotification({
        userId: policy.owner.id,
        eventType: "policy_expiring",
        title,
        message,
        channels: ["email"],
        relatedObjectType: "policy",
        relatedObjectId: policy.id,
    })
}

async function sendAgentRenewalNotification(
    agentUserId: string,
    policy: {
        id: string
        policyNumber: string
        insurerName: string
        lineOfBusiness: string
        endDate: Date
        owner: { id: string; name: string | null }
    },
    milestone: Milestone,
    renewalId: string
) {
    const customerName = policy.owner.name || "Customer"
    const expiryDate = policy.endDate.toLocaleDateString("en-GB")
    const title = `Renewal alert: ${customerName}'s ${policy.lineOfBusiness} policy`
    const message = `${customerName}'s ${policy.insurerName} policy (${policy.policyNumber}) expires on ${expiryDate} — ${milestone} days away. Take action now.`

    await sendNotification({
        userId: agentUserId,
        eventType: "renewal_milestone",
        title,
        message,
        channels: ["email"],
        relatedObjectType: "policy",
        relatedObjectId: policy.id,
    })
}

async function createAgentRenewalTask(
    agentUserId: string,
    policy: {
        id: string
        policyNumber: string
        insurerName: string
        lineOfBusiness: string
        endDate: Date
        owner: { name: string | null }
    },
    daysUntilExpiry: number,
    renewalId: string
): Promise<boolean> {
    // Don't create duplicate tasks for the same policy
    const existingTask = await db.userTask.findFirst({
        where: {
            userId: agentUserId,
            type: "renewal",
            actionUrl: { contains: policy.id },
            status: "pending",
        },
    })
    if (existingTask) return false

    const customerName = policy.owner.name || "Customer"
    const taskDueDate = new Date(policy.endDate.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days before expiry

    await db.userTask.create({
        data: {
            userId: agentUserId,
            type: "renewal",
            title: `Renew: ${customerName} — ${policy.insurerName} ${policy.lineOfBusiness}`,
            description: `Policy ${policy.policyNumber} expires in ${daysUntilExpiry} days. Contact the customer to discuss renewal options.`,
            status: "pending",
            priority: daysUntilExpiry <= 15 ? "high" : daysUntilExpiry <= 30 ? "medium" : "low",
            dueDate: taskDueDate,
            actionUrl: `/customers?policy=${policy.id}&renewal=${renewalId}`,
            actionLabel: "Manage Renewal",
        },
    })

    return true
}
