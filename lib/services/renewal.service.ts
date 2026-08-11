import { calendarDaysUntil, startOfAthensDay, NON_LIVE_POLICY_STATUSES } from "@/lib/policy-status"
import { formatDate } from "@/lib/i18n/format"
import { db } from "../db"
import { sendNotification } from "../notifications"
import { emit } from "../notifications/dispatch"
import { logger } from "../logger"
import { resolveUserEntitlements } from "@/lib/subscription-entitlements"
import { getGrantedPolicyIds, isPolicyVisibleToAgent } from "@/lib/agent-visibility"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { RENEWAL_MILESTONES, BASIC_MILESTONES, type Milestone } from "@/lib/renewals/milestones"

/**
 * Which milestone reminder to MAIL, and which milestones to MARK sent, for a
 * policy that is `daysUntilExpiry` days out given the milestones already sent.
 *
 * `mark` is EVERY un-sent milestone at or above the current day count — a single
 * reminder covers all the milestones already reached. `mail` is the closest of
 * those (the smallest), because that is the one whose wording ("expiring soon")
 * fits where the policy actually is.
 *
 * The bug this exists to prevent: marking only the mailed milestone left the
 * higher ones un-sent, so a policy first seen BELOW a milestone boundary drained
 * its backlog one email per DAY — a policy uploaded 8 days before expiry mailed a
 * reminder five days running. Pure and exported so that daily-cadence behaviour
 * is unit-testable without standing up the whole cron.
 */
export function selectRenewalReminder(
    daysUntilExpiry: number,
    allowedMilestones: readonly number[],
    alreadySent: readonly number[],
): { mail: number | null; mark: number[] } {
    const sent = new Set(alreadySent)
    const due = allowedMilestones.filter((m) => daysUntilExpiry <= m && !sent.has(m))
    if (due.length === 0) return { mail: null, mark: [] }
    return { mail: due[due.length - 1], mark: [...due] }
}

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
    // The last day of cover is still cover. `gte: now` dropped a policy from the
    // scan from 00:00 UTC — 03:00 Athens — on its own expiry day, so its renewal
    // record stopped being updated and its agent task stopped being refreshed on
    // the one day either could still change the outcome.
    const startOfToday = startOfAthensDay(now)

    const summary: RenewalRunSummary = {
        policiesScanned: 0,
        renewalRecordsCreated: 0,
        agentTasksCreated: 0,
        policyholderNotificationsSent: 0,
        agentNotificationsSent: 0,
        errors: [],
    }

    try {
        // 1. Find every real policy expiring within 90 days.
        //
        // NOT status === 'active'. Policy.status is an ingestion state nothing
        // recomputes: 'expiring_soon' and 'action_needed' are in-force, and
        // 'incomplete' is a real uploaded policy pending review. Requiring exactly
        // 'active' meant a policy literally marked "expiring_soon" got NO renewal
        // reminder at all — the lapse-prevention ladder never fired for the very
        // policies most likely to lapse. The endDate window already excludes
        // lapsed and far-future policies; only the non-policy states are dropped.
        const expiringPolicies = await db.policy.findMany({
            where: {
                status: { notIn: [...NON_LIVE_POLICY_STATUSES] },
                endDate: {
                    gte: startOfToday,
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
        const entitlementCache = new Map<string, boolean>()
        // Granted policy-ids per agent, cached per run. A relationship is NOT
        // consent to see a customer's self-uploaded policies (agent-visibility
        // model): an agent may only be told about a renewal for a policy they
        // uploaded or hold a policy-scoped grant for. Without this the cron
        // notifies the linked agent about EVERY expiring policy the customer
        // owns, leaking insurer/number/dates the visibility model hides.
        const grantedPolicyIdsCache = new Map<string, Set<string>>()

        for (const policy of expiringPolicies) {
            try {
                // Athens calendar days, like every other expiry count. This value
                // both selects the milestone below AND is persisted as the
                // "N days before expiry" the policyholder reads in the reminder,
                // so a UTC off-by-one could skip a milestone outright or send a
                // renewal notice quoting the wrong number of days.
                const daysUntilExpiry = calendarDaysUntil(policy.endDate, now)

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

                // Only link/notify the agent for policies they may actually see
                // (uploaded by them, or an active policy-scoped grant). A bare
                // relationship confers no visibility.
                let visibleAgentUserId: string | null = null
                if (relationship?.agentUserId) {
                    const aid = relationship.agentUserId
                    let grantedSet = grantedPolicyIdsCache.get(aid)
                    if (grantedSet === undefined) {
                        grantedSet = new Set(await getGrantedPolicyIds(aid))
                        grantedPolicyIdsCache.set(aid, grantedSet)
                    }
                    if (isPolicyVisibleToAgent(policy, aid, grantedSet)) {
                        visibleAgentUserId = aid
                    }
                }

                let renewalRecord = existingRenewal
                if (!existingRenewal) {
                    renewalRecord = await db.policyRenewal.create({
                        data: {
                            policyId: policy.id,
                            ownerUserId: policy.ownerUserId,
                            agentUserId: visibleAgentUserId,
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
                            agentUserId: visibleAgentUserId ?? existingRenewal.agentUserId,
                        },
                    })
                }

                // Skip if already resolved
                if (renewalRecord && ["renewed_same_insurer", "renewed_different_insurer", "lapsed", "cancelled"].includes(renewalRecord.status)) {
                    continue
                }

                // 3. Check which milestones have already been sent.
                // Paid owners get the full ladder; free owners the basic
                // 30-day reminder only (entitlement cached per owner per run).
                let ownerHasFullReminders = entitlementCache.get(policy.ownerUserId)
                if (ownerHasFullReminders === undefined) {
                    const entitlements = await resolveUserEntitlements(policy.ownerUserId)
                    ownerHasFullReminders = entitlements.limits.notifications === true
                    entitlementCache.set(policy.ownerUserId, ownerHasFullReminders)
                }
                const allowedMilestones: readonly number[] = ownerHasFullReminders
                    ? RENEWAL_MILESTONES
                    : BASIC_MILESTONES
                const sentMilestones = parseSentMilestones(renewalRecord?.remindersSent)
                const { mail: mailMilestone, mark: milestonesToSend } = selectRenewalReminder(
                    daysUntilExpiry,
                    allowedMilestones,
                    [...sentMilestones.keys()],
                )

                if (mailMilestone === null) {
                    // No reminder due today, but the agent's open renewal task
                    // still ages: keep its countdown and priority current on every
                    // run, not only on the ~5 days a milestone happens to fire.
                    if (visibleAgentUserId) {
                        await refreshAgentRenewalTask(visibleAgentUserId, policy, daysUntilExpiry)
                    }
                    continue
                }

                // Send the most relevant (closest) milestone. This is the ledger
                // entry — what the reader is TOLD is daysUntilExpiry.
                const milestone = mailMilestone as Milestone
                const isEl = policy.owner.preferredLanguage === "el"

                // 4. Notify policyholder
                await sendPolicyholderReminder(policy, daysUntilExpiry, isEl)
                summary.policyholderNotificationsSent++

                // 5. Notify and create task for agent — only when the agent may
                // see this policy (visibility-gated above).
                if (visibleAgentUserId) {
                    await sendAgentRenewalNotification(
                        visibleAgentUserId,
                        policy,
                        daysUntilExpiry,
                        renewalRecord?.id ?? ""
                    )
                    summary.agentNotificationsSent++

                    // Create agent task on first detection or at 30-day mark
                    if (!existingRenewal || milestone <= 30) {
                        const taskCreated = await createAgentRenewalTask(
                            visibleAgentUserId,
                            policy,
                            daysUntilExpiry,
                            renewalRecord?.id ?? ""
                        )
                        if (taskCreated) summary.agentTasksCreated++
                    }
                }

                // 6. Update reminders_sent.
                //
                // Mark EVERY currently-due milestone as sent, not only the one we
                // mailed. milestonesToSend holds all un-sent milestones at or above
                // today's day count; one consolidated reminder covers all of them.
                // Marking just `milestone` left the higher ones un-sent, so a policy
                // first seen BELOW a milestone boundary drained its backlog one email
                // per day — a policy uploaded 8 days before expiry sent a reminder
                // five days running (15→7→30→60→90, one per run). One email a day to
                // a customer whose policy is about to lapse reads as a malfunction,
                // not care. Now: one send collapses the passed milestones, and the
                // remaining ladder fires normally as each boundary is crossed.
                const nowIso = now.toISOString()
                const updatedReminders = [
                    ...sentMilestones.entries(),
                ].map(([m, sentAt]) => ({ milestone: m, sentAt }))
                for (const m of milestonesToSend) {
                    updatedReminders.push({ milestone: m, sentAt: nowIso })
                }

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

        // 7. Mark overdue policies — those whose end date is before TODAY.
        // Keyed off `lt: now` this fired on the expiry day itself: the cron runs
        // at 05:00 UTC, end dates are stored at midnight, so a policy still in
        // force until tonight was reported "overdue" at 08:00 Athens that
        // morning — to the agent, and in the Overdue count on /insights.
        //
        // Read before writing: `updateMany` cannot tell us WHOSE cover just
        // lapsed, and until now nothing did — a policy passed its end date, the
        // row quietly turned "overdue", and the customer was never told. For
        // motor in Greece that means driving uninsured, which is unlawful as
        // well as uncovered.
        const nowOverdue = await db.policyRenewal.findMany({
            where: {
                status: "pending",
                policyEndDate: { lt: startOfToday },
            },
            select: {
                id: true,
                policyId: true,
                policyEndDate: true,
                policy: {
                    select: {
                        policyNumber: true,
                        insurerName: true,
                        ownerUserId: true,
                    },
                },
            },
        })

        const overdueCount = await db.policyRenewal.updateMany({
            where: {
                status: "pending",
                policyEndDate: { lt: startOfToday },
            },
            data: { status: "overdue" },
        })
        if (overdueCount.count > 0) {
            logger("info", `Marked ${overdueCount.count} renewals as overdue`)
        }

        for (const renewal of nowOverdue) {
            if (!renewal.policy?.ownerUserId) continue
            const ref = [renewal.policy.policyNumber, renewal.policy.insurerName]
                .filter(Boolean)
                .join(" · ")
            await emit({
                event: "renewal_overdue",
                userId: renewal.policy.ownerUserId,
                title: {
                    el: "Το ασφαλιστήριό σας έληξε",
                    en: "Your policy has lapsed",
                },
                message: {
                    el: `${ref} πέρασε την ημερομηνία λήξης χωρίς ανανέωση. Αν το ανανεώσατε αλλού, ενημερώστε το wallet σας.`,
                    en: `${ref} passed its end date without being renewed. If you renewed elsewhere, update your wallet.`,
                },
                relatedObjectType: "policy",
                relatedObjectId: renewal.policyId,
                // Once per lapse, not once per cron run. The status flip above
                // already makes this a one-shot, but the key is what survives a
                // re-run that races it.
                dedupeKey: `renewal_overdue:${renewal.id}`,
            })
            summary.policyholderNotificationsSent++
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

/**
 * How long is left, in words. `milestone` is a LEDGER bucket — which rung of the
 * ladder we have already sent — and is not the answer to "when does my policy
 * expire". The two only coincide for a policy that has sat in the product since
 * before the 90-day mark and a cron that has not missed a day.
 *
 * They diverge for every policy uploaded inside the window, which is most of
 * them: people upload the policy they just received, or the one they are worried
 * about. On the free plan the ladder is the single 30-day rung, so a policy
 * uploaded three days before expiry produced one email titled "Your policy
 * expires in 30 days" over a body naming a date three days out.
 */
export function daysLeftPhrase(days: number, isEl: boolean): string {
    if (days <= 0) return isEl ? "λήγει σήμερα" : "expires today"
    if (days === 1) return isEl ? "λήγει αύριο" : "expires tomorrow"
    return isEl ? `λήγει σε ${days} ημέρες` : `expires in ${days} days`
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
    daysUntilExpiry: number,
    isEl: boolean
) {
    // Athens, like every date the app itself renders (lib/i18n/format.ts). A bare
    // toLocaleDateString resolves against the RUNTIME zone — UTC on Vercel — so a
    // policy ending at Athens midnight was emailed as the previous day while the
    // wallet showed the correct one.
    const expiryDate = formatDate(policy.endDate, isEl ? "el" : "en")
    const title = isEl
        ? `Η ασφάλισή σας ${daysLeftPhrase(daysUntilExpiry, true)}`
        : `Your policy ${daysLeftPhrase(daysUntilExpiry, false)}`
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

/**
 * Agent renewal-alert subject line. `lineOfBusiness` is a raw taxonomy code
 * (e.g. `income_protection`), so the title must resolve it to the human branch
 * label — an underscored machine code in a professional email to an intermediary
 * reads as auto-generated. Pure + exported so the resolution is unit-testable.
 */
export function agentRenewalEmailTitle(customerName: string, lineOfBusiness: string): string {
    const branchLabel = normalizeBranch(lineOfBusiness).label.en
    return `Renewal alert: ${customerName}'s ${branchLabel} policy`
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
    daysUntilExpiry: number,
    renewalId: string
) {
    const customerName = policy.owner.name || "Customer"
    const expiryDate = formatDate(policy.endDate, "en")
    const title = agentRenewalEmailTitle(customerName, policy.lineOfBusiness)
    // Real days remaining, not the milestone rung — the agent TASK created in the
    // same iteration already quotes daysUntilExpiry, so the two disagreed about
    // the same policy in the same run.
    const away =
        daysUntilExpiry <= 0 ? "today" : daysUntilExpiry === 1 ? "tomorrow" : `${daysUntilExpiry} days away`
    const message = `${customerName}'s ${policy.insurerName} policy (${policy.policyNumber}) expires on ${expiryDate} — ${away}. Take action now.`

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

type RenewalTaskPolicy = {
    id: string
    policyNumber: string
    insurerName: string
    lineOfBusiness: string
    endDate: Date
    owner: { name: string | null }
}

/** The task's countdown and priority — recomputed from days left, never frozen. */
export function renewalTaskState(policy: { policyNumber: string }, daysUntilExpiry: number) {
    const expiresIn =
        daysUntilExpiry <= 0
            ? "expires today"
            : daysUntilExpiry === 1
              ? "expires tomorrow"
              : `expires in ${daysUntilExpiry} days`
    return {
        description: `Policy ${policy.policyNumber} ${expiresIn}. Contact the customer to discuss renewal options.`,
        priority: daysUntilExpiry <= 15 ? "high" : daysUntilExpiry <= 30 ? "medium" : "low",
    }
}

function findPendingRenewalTask(agentUserId: string, policyId: string) {
    return db.userTask.findFirst({
        where: {
            userId: agentUserId,
            type: "renewal",
            actionUrl: { contains: policyId },
            status: "pending",
        },
    })
}

/**
 * Keep an already-open renewal task honest.
 *
 * The countdown and the priority were both written once, at first detection, and
 * never revisited — so a task opened at 88 days out still read "expires in 88
 * days · low" on the day the cover lapsed. The one task on the agent's list that
 * most needed to rise to the top was the one guaranteed to stay at the bottom.
 */
async function refreshAgentRenewalTask(
    agentUserId: string,
    policy: RenewalTaskPolicy,
    daysUntilExpiry: number
): Promise<void> {
    const existingTask = await findPendingRenewalTask(agentUserId, policy.id)
    if (!existingTask) return
    const { description, priority } = renewalTaskState(policy, daysUntilExpiry)
    if (existingTask.description === description && existingTask.priority === priority) return
    await db.userTask.update({
        where: { id: existingTask.id },
        data: {
            description,
            priority,
            dueDate: new Date(policy.endDate.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
    })
}

async function createAgentRenewalTask(
    agentUserId: string,
    policy: RenewalTaskPolicy,
    daysUntilExpiry: number,
    renewalId: string
): Promise<boolean> {
    const customerName = policy.owner.name || "Customer"
    const taskDueDate = new Date(policy.endDate.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days before expiry
    const { description, priority } = renewalTaskState(policy, daysUntilExpiry)

    // Don't create duplicate tasks for the same policy — refresh the open one.
    const existingTask = await findPendingRenewalTask(agentUserId, policy.id)
    if (existingTask) {
        await refreshAgentRenewalTask(agentUserId, policy, daysUntilExpiry)
        return false
    }

    await db.userTask.create({
        data: {
            userId: agentUserId,
            type: "renewal",
            title: `Renew: ${customerName} — ${policy.insurerName} ${normalizeBranch(policy.lineOfBusiness).label.en}`,
            description,
            status: "pending",
            priority,
            dueDate: taskDueDate,
            actionUrl: `/customers?policy=${policy.id}&renewal=${renewalId}`,
            actionLabel: "Manage Renewal",
        },
    })

    return true
}
