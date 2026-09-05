/**
 * Opening and closing risk reviews.
 *
 * The policy (./policy.ts) decides WHETHER a trigger warrants a review. This
 * decides whether one should open GIVEN what is already on the customer's plate,
 * which is a different question and the one that keeps reviews rare enough to
 * matter.
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { getReviewPolicy, type ReviewTrigger } from "./policy"
import { countLiveGapRows } from "@/lib/gaps/gap-rows"
import { NON_LIVE_POLICY_STATUSES } from "@/lib/policy-status"

export interface OpenReviewArgs {
    userId: string
    trigger: ReviewTrigger
    /** The business event that caused it, for the timeline. */
    causedByEventId?: string | null
}

export type OpenReviewOutcome =
    | { opened: true; reviewId: string }
    | { opened: false; reason: "policy" | "cooldown" | "outranked" | "error" }

/**
 * Open a review, unless the customer already has enough to look at.
 *
 * Three ways this declines, and each is a deliberate product judgement:
 *
 * - **policy** — the trigger recalculates but does not warrant interrupting.
 * - **cooldown** — a review of equal or greater weight opened recently. A busy
 *   fortnight (an upload, a life event, a renewal) is ONE conversation, not
 *   three, and three review cards is how a customer learns to ignore all of them.
 * - **outranked** — an open review already covers a bigger change. A child being
 *   born supersedes an annual review; the reverse would be absurd.
 *
 * Never throws. A review is a prompt, not a precondition: failing to open one
 * must not fail the life event that caused it.
 */
export async function openReview(args: OpenReviewArgs): Promise<OpenReviewOutcome> {
    try {
        const policy = getReviewPolicy(args.trigger)
        if (!policy || !policy.startsReview) return { opened: false, reason: "policy" }

        const now = new Date()

        // An open review of equal or greater weight already covers this
        // conversation. A LIGHTER open review is superseded below rather than
        // blocking — a child being born must not be silenced by a quarterly check.
        const open = await db.riskReview.findMany({
            where: { userId: args.userId, status: "open" },
            select: { id: true, trigger: true, openedAt: true },
        })

        for (const existing of open) {
            const existingPolicy = getReviewPolicy(existing.trigger)
            if ((existingPolicy?.weight ?? 0) >= policy.weight) {
                return { opened: false, reason: "outranked" }
            }
        }

        // Cooldown against recent reviews of comparable weight, whatever their
        // outcome — a review the customer dismissed last week still means we
        // asked last week.
        const cooldownSince = new Date(now.getTime() - policy.cooldownDays * 24 * 3600_000)
        if (policy.cooldownDays > 0) {
            const recent = await db.riskReview.findMany({
                where: { userId: args.userId, openedAt: { gte: cooldownSince } },
                select: { trigger: true },
            })
            const heavierRecently = recent.some(
                (r) => (getReviewPolicy(r.trigger)?.weight ?? 0) >= policy.weight
            )
            if (heavierRecently) return { opened: false, reason: "cooldown" }
        }

        // Snapshot the position at open time, so the review can later show what
        // changed BY reviewing rather than only what is true now.
        const [score, version] = await Promise.all([
            db.protectionScore.findUnique({
                where: { userId: args.userId },
                select: { overallScore: true },
            }),
            db.riskProfileVersion.findFirst({
                where: { userId: args.userId },
                orderBy: { version: "desc" },
                select: { version: true },
            }),
        ])

        const review = await db.$transaction(async (tx) => {
            // Supersede the lighter open reviews this one replaces. Marked, not
            // deleted: "this was folded into a bigger review" is a real outcome
            // and the customer's history should say so.
            const lighter = open.map((o) => o.id)
            if (lighter.length > 0) {
                await tx.riskReview.updateMany({
                    where: { id: { in: lighter }, status: "open" },
                    data: { status: "superseded", completedAt: now },
                })
            }
            // R3: the findings count at open comes from the gap-row accessor (classified
            // live rows), never from the stored score record.
            const findingsAtOpen = await countLiveGapRows({ client: tx, scope: "classified", where: { OR: [{ policy: { ownerUserId: args.userId, status: { notIn: [...NON_LIVE_POLICY_STATUSES] } } }, { userId: args.userId }] } })
            return tx.riskReview.create({
                data: {
                    userId: args.userId,
                    trigger: args.trigger,
                    dueAt: new Date(now.getTime() + policy.dueInDays * 24 * 3600_000),
                    scoreAtOpen: score?.overallScore ?? null,
                    findingsAtOpen,
                    versionAtOpen: version?.version ?? null,
                    causedByEventId: args.causedByEventId ?? null,
                },
                select: { id: true },
            })
        })

        // Tell the customer, through the orchestrator — so quiet hours, the
        // daily cap and their preferences all apply, and the advisor is reached
        // where the event declares one. Emitted HERE rather than at each caller
        // so every path that opens a review notifies exactly once.
        const { orchestrate } = await import("@/lib/notifications/orchestrator")
        await orchestrate({
            event: "scheduled_review_due",
            subjectUserId: args.userId,
            title: policy.label,
            message: {
                el: `${policy.label.el}: αξίζει ένας γρήγορος έλεγχος της εικόνας σας.`,
                en: `${policy.label.en}: it is worth a quick look at your picture.`,
            },
            // One notification per review, so a retry cannot ask twice.
            dedupeKey: `risk_review:${review.id}`,
        })

        logger("info", "risk review opened", { userId: args.userId, trigger: args.trigger })
        return { opened: true, reviewId: review.id }
    } catch (error) {
        logger("error", "failed to open risk review", {
            userId: args.userId,
            trigger: args.trigger,
            error: error instanceof Error ? error.message : String(error),
        })
        return { opened: false, reason: "error" }
    }
}

/**
 * The customer completed a review.
 *
 * Records the score at close beside the score at open, which is the only way to
 * answer "did reviewing actually help?" — and the answer being "no change" is
 * legitimate and worth recording rather than hiding.
 */
export async function completeReview(
    reviewId: string,
    userId: string,
    outcome?: string
): Promise<boolean> {
    try {
        const score = await db.protectionScore.findUnique({
            where: { userId },
            select: { overallScore: true },
        })
        const updated = await db.riskReview.updateMany({
            // Scoped to the user: a review id is not a capability.
            where: { id: reviewId, userId, status: "open" },
            data: {
                status: "completed",
                completedAt: new Date(),
                scoreAtClose: score?.overallScore ?? null,
                outcome: outcome?.slice(0, 2000) ?? null,
            },
        })
        return updated.count > 0
    } catch (error) {
        logger("error", "failed to complete risk review", { reviewId, error: String(error) })
        return false
    }
}

export type EvidenceCloseOutcome =
    | { closed: number; reason: "closed" }
    /**
     * `summary_only`: the policy is held and its area has an open review, but
     * only the basic extraction ran — the limits were not read, so the review
     * stays open. Nothing is written for it: the model has no evidence field
     * and none is added.
     */
    | { closed: 0; reason: "not_held" | "summary_only" | "no_area" | "nothing_open" | "error" }

/**
 * A finished policy analysis closes the open reviews it answers.
 *
 * Called from BOTH completion paths — the deep run's finalize (after the
 * GapInstances are persisted) and the basic-summary extraction — through this
 * one function, so the two cannot drift (tests/unit/risk-review-policy.test.ts
 * enumerates both call sites). The decision is the pure matrix in ./evidence.ts;
 * this reads the policy AFTER the analysis wrote its line of business and
 * dates, resolves the lifecycle on the one clock, and writes.
 *
 * Idempotent: only `status: "open"` rows match, so a retry closes nothing
 * twice. Silent to the customer on purpose — the analysis result is already
 * the message, and a «review completed» notification for a review they never
 * opened would be noise. Never throws: a review is a prompt, not a
 * precondition, and failing to close one must not fail the analysis.
 */
export async function closeReviewsByPolicyEvidence(args: { policyId: string }): Promise<EvidenceCloseOutcome> {
    try {
        const { decideEvidenceClosures, lifecycleBand, policyEvidenceArea, REVIEW_OUTCOME_POLICY_EVIDENCE } = await import(
            "./evidence"
        )
        const { resolvePolicyLifecycle } = await import("@/lib/policy-status")
        const { protectionDetailFrom } = await import("@/lib/protection/coverage-model")

        const policy = await db.policy.findUnique({
            where: { id: args.policyId },
            select: {
                ownerUserId: true,
                lineOfBusiness: true,
                status: true,
                endDate: true,
                acordData: true,
                policyNumber: true,
                insurerName: true,
            },
        })
        if (!policy) return { closed: 0, reason: "nothing_open" }

        const lifecycle = lifecycleBand(resolvePolicyLifecycle(policy).status)
        // The one reading of «were the limits read» — the same the attention
        // areas use, so a policy the wallet shows as summary-only cannot close.
        const detail = protectionDetailFrom(policy.acordData)
        if (!policyEvidenceArea(policy.lineOfBusiness)) return { closed: 0, reason: "no_area" }

        const open = await db.riskReview.findMany({
            where: { userId: policy.ownerUserId, status: "open" },
            select: { id: true, status: true, trigger: true, causedByEventId: true },
        })
        if (open.length === 0) return { closed: 0, reason: "nothing_open" }

        // The generic `life_event` trigger knows its sphere only through the
        // event that raised it: the declared definition id sits on that
        // event's payload.
        const causeIds = open
            .filter((r) => r.trigger === "life_event" && r.causedByEventId)
            .map((r) => r.causedByEventId as string)
        const definitionByEvent = new Map<string, string>()
        if (causeIds.length > 0) {
            const events = await db.businessEvent.findMany({
                where: { id: { in: causeIds } },
                select: { id: true, payload: true },
            })
            for (const e of events) {
                const definitionId = (e.payload as Record<string, unknown> | null)?.definitionId
                if (typeof definitionId === "string") definitionByEvent.set(e.id, definitionId)
            }
        }

        const ids = decideEvidenceClosures({
            lineOfBusiness: policy.lineOfBusiness,
            lifecycle,
            detail,
            reviews: open.map((r) => ({
                id: r.id,
                status: r.status,
                trigger: r.trigger,
                definitionId: r.causedByEventId ? definitionByEvent.get(r.causedByEventId) ?? null : null,
            })),
        })
        if (ids.length === 0) {
            if (lifecycle !== "active" && lifecycle !== "expiring_soon") return { closed: 0, reason: "not_held" }
            if (detail !== "analysed") return { closed: 0, reason: "summary_only" }
            return { closed: 0, reason: "nothing_open" }
        }

        const score = await db.protectionScore.findUnique({
            where: { userId: policy.ownerUserId },
            select: { overallScore: true },
        })
        const updated = await db.riskReview.updateMany({
            // Scoped to the owner and to OPEN rows: a second run matches nothing.
            where: { id: { in: ids }, userId: policy.ownerUserId, status: "open" },
            data: {
                status: "completed",
                completedAt: new Date(),
                scoreAtClose: score?.overallScore ?? null,
                outcome: REVIEW_OUTCOME_POLICY_EVIDENCE,
            },
        })
        if (updated.count > 0) {
            logger("info", "risk review closed by policy evidence", {
                userId: policy.ownerUserId,
                policyId: args.policyId,
                closed: updated.count,
            })
        }
        return { closed: updated.count, reason: "closed" }
    } catch (error) {
        logger("error", "failed to close risk reviews by policy evidence", {
            policyId: args.policyId,
            error: error instanceof Error ? error.message : String(error),
        })
        return { closed: 0, reason: "error" }
    }
}

export async function dismissReview(reviewId: string, userId: string): Promise<boolean> {
    try {
        const updated = await db.riskReview.updateMany({
            where: { id: reviewId, userId, status: "open" },
            data: { status: "dismissed", completedAt: new Date() },
        })
        return updated.count > 0
    } catch {
        return false
    }
}

/** The review to show the customer, if any. */
export async function getOpenReview(userId: string) {
    try {
        return await db.riskReview.findFirst({
            where: { userId, status: "open" },
            // Heaviest first would need a join; opened-desc is equivalent
            // because a heavier review supersedes the lighter ones as it opens.
            orderBy: { openedAt: "desc" },
        })
    } catch {
        return null
    }
}

/**
 * Expire reviews nobody acted on.
 *
 * An overdue review is not a failure to chase harder — it is a prompt the
 * customer chose not to take, and leaving it open for ever would make the card
 * permanent furniture. Expiring lets the next genuine trigger open a fresh one
 * with a reason that is actually current.
 */
export async function expireOverdueReviews(now = new Date()): Promise<number> {
    try {
        const result = await db.riskReview.updateMany({
            where: { status: "open", dueAt: { lt: now } },
            data: { status: "expired", completedAt: now },
        })
        return result.count
    } catch {
        return 0
    }
}
