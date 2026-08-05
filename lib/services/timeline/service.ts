/**
 * Gathering the timeline's sources.
 *
 * Eight queries, one per source, run in parallel and each failing soft. The
 * timeline is a read-only explanation surface: one unreadable source should cost
 * that source's rows, not the page. In particular the two newest tables
 * (`LifeEventInstance`, `RiskProfileVersion`) sit behind migrations that are not
 * yet applied anywhere, so on a current database those queries throw and the
 * timeline must still render everything else.
 */

import { db } from "@/lib/db"
import { parseRisks, type VersionRow } from "./diff"
import { buildTimeline, type TimelineSources } from "./build"
import type { TimelineEntry } from "./types"

/** Nothing rather than an exception — see the module note. */
async function soft<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
    try {
        return await promise
    } catch (error) {
        console.error(`Timeline source "${label}" unavailable:`, error)
        return fallback
    }
}

export interface GetTimelineOptions {
    /** How many entries to return. The page shows a window, not a lifetime. */
    limit?: number
}

export async function getTimeline(
    userId: string,
    options: GetTimelineOptions = {}
): Promise<TimelineEntry[]> {
    const { limit = 60 } = options

    const [lifeEvents, policies, renewals, recommendations, versionRows, threads, actions, relationship] =
        await Promise.all([
            soft(
                db.lifeEventInstance.findMany({
                    where: { userId },
                    select: { id: true, definitionId: true, occurredAt: true },
                    orderBy: { occurredAt: "desc" },
                    take: 100,
                }),
                [],
                "life events"
            ),
            soft(
                db.policy.findMany({
                    where: { ownerUserId: userId },
                    select: {
                        id: true,
                        lineOfBusiness: true,
                        insurerName: true,
                        createdAt: true,
                        startDate: true,
                        endDate: true,
                        status: true,
                    },
                    orderBy: { createdAt: "desc" },
                    take: 100,
                }),
                [],
                "policies"
            ),
            soft(
                db.policyRenewal.findMany({
                    where: { ownerUserId: userId },
                    select: {
                        id: true,
                        policyId: true,
                        policyEndDate: true,
                        status: true,
                        outcome: true,
                        outcomeAt: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: "desc" },
                    take: 50,
                }),
                [],
                "renewals"
            ),
            soft(
                db.recommendationInstance.findMany({
                    where: { userId },
                    select: {
                        id: true,
                        riskId: true,
                        lineOfBusiness: true,
                        title: true,
                        createdAt: true,
                        status: true,
                    },
                    orderBy: { createdAt: "desc" },
                    take: 100,
                }),
                [],
                "recommendations"
            ),
            soft(
                db.riskProfileVersion.findMany({
                    where: { userId },
                    select: {
                        version: true,
                        computedAt: true,
                        trigger: true,
                        lifeEventId: true,
                        overallScore: true,
                        indeterminate: true,
                        openFindingCount: true,
                        risks: true,
                    },
                    orderBy: { version: "asc" },
                    take: 200,
                }),
                [],
                "risk profile versions"
            ),
            soft(
                db.collaborationThread.findMany({
                    where: { relationship: { policyholderUserId: userId } },
                    select: { id: true, subject: true, createdAt: true },
                    orderBy: { createdAt: "desc" },
                    take: 50,
                }),
                [],
                "advisor threads"
            ),
            soft(
                db.collaborationAction.findMany({
                    where: { thread: { relationship: { policyholderUserId: userId } } },
                    select: { id: true, title: true, createdAt: true, completedAt: true },
                    orderBy: { createdAt: "desc" },
                    take: 50,
                }),
                [],
                "advisor actions"
            ),
            soft(
                db.customerRelationship.findFirst({
                    where: { policyholderUserId: userId, status: "active" },
                    select: { id: true, createdAt: true },
                    orderBy: { createdAt: "asc" },
                }),
                null,
                "advisor relationship"
            ),
        ])

    const versions: VersionRow[] = versionRows.map((v) => ({
        version: v.version,
        computedAt: v.computedAt,
        trigger: v.trigger,
        lifeEventId: v.lifeEventId,
        overallScore: v.overallScore,
        indeterminate: v.indeterminate,
        openFindingCount: v.openFindingCount,
        risks: parseRisks(v.risks),
    }))

    const advisorActions: TimelineSources["advisorActions"] = [
        ...(relationship
            ? [{ id: relationship.id, kind: "advisor_linked" as const, at: relationship.createdAt, subject: null }]
            : []),
        ...threads.map((t) => ({
            id: t.id,
            kind: "thread_opened" as const,
            at: t.createdAt,
            subject: t.subject,
        })),
        ...actions.flatMap((a) => [
            { id: a.id, kind: "action_assigned" as const, at: a.createdAt, subject: a.title },
            // Assigning and completing are two things that happened, not one
            // thing with a status — a timeline that showed only the current
            // state would lose the fact that it was ever outstanding.
            ...(a.completedAt
                ? [{ id: `${a.id}:done`, kind: "action_completed" as const, at: a.completedAt, subject: a.title }]
                : []),
        ]),
    ]

    const sources: TimelineSources = {
        lifeEvents,
        policies,
        renewals,
        recommendations: recommendations.map((r) => ({
            id: r.id,
            riskId: r.riskId,
            lineOfBusiness: r.lineOfBusiness,
            title: (r.title ?? { en: "", el: "" }) as { en: string; el: string },
            createdAt: r.createdAt,
            status: r.status,
        })),
        advisorActions,
        versions,
    }

    return buildTimeline(sources).slice(0, limit)
}
