import { db } from "@/lib/db"
import { emit } from "@/lib/notifications/dispatch"
import { logger } from "@/lib/logger"
import { branchLabel } from "@/lib/insurance/taxonomy"
import { complianceObligations, type ComplianceObligation } from "@/lib/insurance/policy-conditions"
import { isPolicyCoverageActive } from "@/lib/policy-status"

/**
 * The compliance scan — the emitter behind `obligation_due`.
 *
 * Specialty policies do not only pay out; they REQUIRE things, on a schedule.
 * Annual servicing to the maker's instructions. Certificates valid throughout
 * the period. An alarm that stays connected to a monitoring centre. Keys held
 * off the premises out of hours. Breaching one of these does not reduce a claim
 * — on a Greek ΑΠΑΡΑΒΑΤΟΣ ΟΡΟΣ it removes the cover — and until this scan
 * existed nothing in the product watched for any of it.
 *
 * THE FAILURE MODE IT ADDRESSES is quiet by nature. Nobody decides to stop
 * servicing the engines; the service is simply not booked, and the policy keeps
 * renewing and keeps looking fine right up until the claim that tests it.
 *
 * DESIGN CHOICES WORTH STATING:
 *
 *  - **Only live cover is scanned.** Reminding someone about the conditions of a
 *    lapsed policy is noise, and worse, it implies the cover still exists.
 *  - **Only conditions whose breach costs cover** are notified. A documentary
 *    condition that merely reduces a claim is real, and it belongs on the policy
 *    page, not in someone's inbox.
 *  - **One notification per policy, not per condition.** A marine hull schedule
 *    carries nine warranties; nine separate emails is how a product teaches
 *    people to filter it.
 *  - **Dedupe is keyed to the policy and the window**, so a scan that runs twice
 *    — or a cron that retries — does not send twice.
 */

/** Anniversary window: how early an annual obligation is worth raising. */
const ANNUAL_LEAD_DAYS = 30

/**
 * How often a standing obligation is worth re-raising.
 *
 * A `continuous` requirement has no due date — the alarm must simply always be
 * connected — so the choice is a cadence rather than a deadline. Twice a year is
 * frequent enough to catch a lapsed monitoring contract and rare enough not to
 * become furniture.
 */
const CONTINUOUS_INTERVAL_DAYS = 182

const DAY_MS = 24 * 60 * 60 * 1000

export interface ObligationScanSummary {
    policiesScanned: number
    policiesWithObligations: number
    notificationsEmitted: number
    deduped: number
}

/** Conditions worth interrupting someone for. */
function isNotifiable(obligation: ComplianceObligation): boolean {
    return obligation.severity === "critical" || obligation.severity === "high"
}

/**
 * Whether an obligation falls inside its reminder window.
 *
 * Annual obligations key off the policy's own start date when the condition
 * names no date of its own — the anniversary is when a yearly service or a
 * certificate renewal actually falls due, and it is the only date the document
 * reliably gives us.
 */
export function isDue(
    obligation: ComplianceObligation,
    policyStart: Date,
    now: Date
): boolean {
    if (obligation.recurrence === "continuous") {
        // Phase against the policy start so a book of policies does not all
        // notify on the same day.
        const elapsedDays = Math.floor((now.getTime() - policyStart.getTime()) / DAY_MS)
        if (elapsedDays < 0) return false
        const sinceLast = elapsedDays % CONTINUOUS_INTERVAL_DAYS
        return sinceLast < 1
    }

    const stated = obligation.dueBy ? new Date(obligation.dueBy) : null
    const target = stated && !Number.isNaN(stated.getTime())
        ? stated
        : nextAnniversary(policyStart, now)

    const daysUntil = Math.ceil((target.getTime() - now.getTime()) / DAY_MS)
    return daysUntil >= 0 && daysUntil <= ANNUAL_LEAD_DAYS
}

function nextAnniversary(start: Date, now: Date): Date {
    const anniversary = new Date(start)
    anniversary.setFullYear(now.getFullYear())
    if (anniversary.getTime() < now.getTime()) {
        anniversary.setFullYear(now.getFullYear() + 1)
    }
    return anniversary
}

/**
 * Walk live policies and raise the obligations that fall due.
 *
 * Reads `acordData.conditions` — which only exists on policies extracted since
 * ACORD v3 — so the scan is a no-op for the existing book until those policies
 * are re-analysed. That is the correct behaviour: inventing obligations for a
 * policy whose conditions were never captured would be worse than silence.
 */
export async function runObligationScan(now: Date = new Date()): Promise<ObligationScanSummary> {
    const policies = await db.policy.findMany({
        where: { status: { notIn: ["deleted", "cancelled"] } },
        select: {
            id: true,
            ownerUserId: true,
            insurerName: true,
            lineOfBusiness: true,
            startDate: true,
            endDate: true,
            coverageEndDate: true,
            status: true,
            acordData: true,
        },
    })

    const summary: ObligationScanSummary = {
        policiesScanned: policies.length,
        policiesWithObligations: 0,
        notificationsEmitted: 0,
        deduped: 0,
    }

    for (const policy of policies) {
        if (!isPolicyCoverageActive(policy as never)) continue

        const conditions = (policy.acordData as { conditions?: unknown } | null)?.conditions
        if (!Array.isArray(conditions) || conditions.length === 0) continue

        const obligations = complianceObligations(conditions as never).filter(isNotifiable)
        if (obligations.length === 0) continue

        summary.policiesWithObligations += 1

        const due = obligations.filter((obligation) => isDue(obligation, policy.startDate, now))
        if (due.length === 0) continue

        // One notification per policy per window. A marine hull schedule carries
        // nine warranties, and nine emails is how people learn to ignore all of them.
        const windowKey = `${now.getUTCFullYear()}-${Math.floor(now.getUTCMonth() / 6)}`
        const dedupeKey = `obligation_due:${policy.id}:${windowKey}`

        try {
            // The most severe obligation leads the message; the rest are on the
            // policy page. `complianceObligations` returns them unsorted, but
            // `isNotifiable` has already narrowed to critical and high, so the
            // first is representative either way.
            const lead = due[0].summary ?? { el: due[0].text, en: due[0].text }
            const elBranch = branchLabel(policy.lineOfBusiness, "el")
            const enBranch = branchLabel(policy.lineOfBusiness, "en")

            const result = await emit({
                event: "obligation_due",
                userId: policy.ownerUserId,
                relatedObjectType: "policy",
                relatedObjectId: policy.id,
                dedupeKey,
                title: {
                    el: `Προϋπόθεση κάλυψης προς έλεγχο — ${elBranch}`,
                    en: `A condition of cover to check — ${enBranch}`,
                },
                message: {
                    el: due.length > 1
                        ? `Το ασφαλιστήριό σου με την ${policy.insurerName} θέτει ${due.length} προϋποθέσεις που πρέπει να τηρούνται. Η πρώτη: ${lead.el}`
                        : `Το ασφαλιστήριό σου με την ${policy.insurerName} θέτει την εξής προϋπόθεση κάλυψης: ${lead.el}`,
                    en: due.length > 1
                        ? `Your policy with ${policy.insurerName} sets ${due.length} conditions that have to be kept. The first: ${lead.en}`
                        : `Your policy with ${policy.insurerName} sets this condition of cover: ${lead.en}`,
                },
            })
            if ((result as { deduped?: boolean })?.deduped) summary.deduped += 1
            else summary.notificationsEmitted += 1
        } catch (error) {
            // A single policy's notification failing must not abandon the sweep.
            logger("error", "obligation scan: emit failed", {
                policyId: policy.id,
                error: error instanceof Error ? error.message : String(error),
            })
        }
    }

    return summary
}
