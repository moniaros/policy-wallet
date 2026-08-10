/**
 * Recording a life event.
 *
 * The whole flow, in order:
 *
 *   declare → resolve definition → backfill prerequisites → apply deltas to the
 *   profile → record the instance → re-run the risk engine → version the result
 *
 * The two halves are deliberately separate. Applying an event changes what we
 * KNOW; the risk engine then decides, unchanged, what that means. Nothing in
 * this file computes a risk, a severity or a recommendation — if it did, the
 * guarantee that a risk which does not apply can never become a recommendation
 * would now have two places to be broken instead of one.
 */

import { db } from "@/lib/db"
import { logger } from "@/lib/logger"
import { applyLifeEvent, checkDependencies } from "./apply"
import { getLifeEvent } from "./registry"
import { recordRiskProfileVersion } from "./risk-profile-version"
import type { EventConfidence, EventSource, LifeEventOccurrence } from "./types"

export interface DeclareLifeEventArgs {
    userId: string
    definitionId: string
    occurredAt: Date
    magnitude?: number | null
    source?: EventSource
    confidence?: EventConfidence
}

export interface DeclareLifeEventResult {
    ok: boolean
    reason?: string
    eventId?: string
    /** Prerequisites we synthesised because the customer's history was missing them. */
    backfilled: string[]
    /** Deltas that could not be applied, with the reason. Never silent. */
    skipped: Array<{ column: string; reason: string }>
    profileChanged: boolean
    version?: {
        written: boolean
        version: number | null
        previousScore: number | null
        delta: number | null
    }
}

/**
 * A prerequisite that arrives late is our gap, not the customer's.
 *
 * Someone declaring a second child with no first child on record has one. We
 * synthesise the antecedent at `derived` confidence with no window — it is a
 * fact we should already have had, not news — rather than refusing the
 * declaration and making them fix our bookkeeping.
 */
async function backfillPrerequisites(
    userId: string,
    definitionId: string,
    occurredAt: Date,
    priorIds: string[]
): Promise<string[]> {
    const check = checkDependencies(definitionId, priorIds)
    if (check.satisfied) return []

    const backfilled: string[] = []
    for (const missing of check.missing) {
        if (missing.kind !== "requires_event") continue
        if (!getLifeEvent(missing.target)) continue
        await db.lifeEventInstance.create({
            data: {
                userId,
                definitionId: missing.target,
                // Dated a moment before the event that implied it, so the
                // chronology reads correctly.
                occurredAt: new Date(occurredAt.getTime() - 1000),
                source: "profile_delta",
                confidence: "medium",
                status: "applied",
                appliedPatch: { backfilled: true } as any,
            },
        })
        backfilled.push(missing.target)
    }
    return backfilled
}

export async function declareLifeEvent(
    args: DeclareLifeEventArgs
): Promise<DeclareLifeEventResult> {
    const {
        userId,
        definitionId,
        occurredAt,
        magnitude = null,
        source = "customer_declared",
        confidence = "high",
    } = args

    const definition = getLifeEvent(definitionId)
    if (!definition) {
        return { ok: false, reason: "unknown_event", backfilled: [], skipped: [], profileChanged: false }
    }

    const [profile, priorEvents] = await Promise.all([
        db.policyholderProfile.findUnique({ where: { userId } }),
        db.lifeEventInstance.findMany({
            where: { userId, status: "applied" },
            select: { definitionId: true },
        }),
    ])

    const priorIds = priorEvents.map((e) => e.definitionId)

    if (!definition.repeatable && priorIds.includes(definitionId)) {
        return {
            ok: false,
            reason: "already_recorded",
            backfilled: [],
            skipped: [],
            profileChanged: false,
        }
    }

    const backfilled = await backfillPrerequisites(userId, definitionId, occurredAt, priorIds)

    const occurrence: LifeEventOccurrence = {
        definitionId,
        occurredAt,
        source,
        confidence,
        magnitude,
    }
    const applied = applyLifeEvent(occurrence, profile as Record<string, unknown> | null)

    // Answered columns union into `answeredFields` — without this an event can
    // change a value and still leave the risk in `needs_review`, which is the
    // state meaning "we have not asked".
    const previouslyAnswered = Array.isArray(profile?.answeredFields)
        ? (profile.answeredFields as unknown[]).filter((f): f is string => typeof f === "string")
        : []
    const answeredFields = [...new Set([...previouslyAnswered, ...applied.answeredColumns])]

    const hasPatch = Object.keys(applied.patch).length > 0
    const event = await db.$transaction(async (tx) => {
        if (hasPatch || applied.answeredColumns.length > 0) {
            await tx.policyholderProfile.upsert({
                where: { userId },
                create: { userId, ...applied.patch, answeredFields },
                update: { ...applied.patch, answeredFields },
            })
        }
        return tx.lifeEventInstance.create({
            data: {
                userId,
                definitionId,
                occurredAt,
                source,
                confidence,
                magnitude,
                status: "applied",
                appliedPatch: applied.patch as any,
            },
        })
    })

    // Publish the FACT. The recalculation, the confirmation notification and
    // the advisor's visibility of it are all CONSEQUENCES, decided by the
    // decision engine — this code says what happened and stops there.
    //
    // Dual-write during the migration: the direct calls below still run, so
    // nothing depends on the event yet and either path alone is sufficient.
    const { publishLifeEventDeclared } = await import("@/lib/events/publishers")
    await publishLifeEventDeclared({
        lifeEventId: event.id,
        userId,
        definitionId,
        occurredAt,
        label: definition.label?.en ?? definitionId,
        backfilled,
    })

    // Recalculate. Non-blocking by design: the declaration has already
    // succeeded, and a scoring failure must not lose the customer's statement
    // about their own life.
    let version: DeclareLifeEventResult["version"]
    try {
        version = await recalculateRiskProfile(userId, "life_event", event.id)
    } catch (error) {
        logger("warn", "risk recalculation after life event failed (non-blocking)", {
            userId,
            definitionId,
            error: error instanceof Error ? error.message : String(error),
        })
    }

    // Confirm we heard them. Deliberately separate from the risk events the
    // recalculation above emits: "we recorded what you told us" and "this
    // changed your exposure" are different claims, and collapsing them would
    // make the confirmation sound like a finding.
    const { emit } = await import("@/lib/notifications/dispatch")
    const label = getLifeEvent(definitionId)?.label
    await emit({
        event: "life_event_recorded",
        userId,
        title: {
            el: "Καταγράψαμε την αλλαγή σας",
            en: "We recorded your update",
        },
        message: {
            el: `${label?.el ?? definitionId} — ενημερώσαμε την εικόνα κινδύνου σας.`,
            en: `${label?.en ?? definitionId} — we have updated your risk picture.`,
        },
        // One confirmation per declared event, so a retry of the action cannot
        // tell the customer twice that we heard them once.
        dedupeKey: `life_event:${event.id}`,
    })

    return {
        ok: true,
        eventId: event.id,
        backfilled,
        skipped: applied.skipped,
        profileChanged: hasPatch,
        version,
    }
}

/**
 * Re-run the assessment and apply the result everywhere it is read.
 *
 * The gap engine is imported lazily: this module is also read by the API route
 * and the UI for the registry alone, and eagerly pulling in Prisma, the taxonomy
 * and the whole risk catalog for a list of event labels is wasteful.
 *
 * This used to take the READ-ONLY snapshot and record a version from it,
 * skipping the score cache and the recommendation sync, on the reasoning that
 * the full engine "would be a recursive write path here, since a profile update
 * is itself a recalculation trigger".
 *
 * That reasoning did not hold, and it cost two consumers. `runGapEngine` writes
 * exactly three things — the cached ProtectionScore, RecommendationInstance rows
 * and a RiskProfileVersion — and none of them can re-enter `declareLifeEvent`.
 * Meanwhile the dashboard reads the CACHED score, so the omission was visible to
 * customers: declare "a child was born", receive a notification that a coverage
 * gap opened, open the dashboard, and see the pre-event score with
 * recommendations that do not mention the new gap.
 *
 * `lifeEventId` is now plumbed through the full engine, so the causal link the
 * timeline draws survives — which is the only thing the reduced path was really
 * protecting.
 */
export async function recalculateRiskProfile(
    userId: string,
    trigger: "life_event" | "policy_change" | "profile_update" | "cron" | "manual",
    lifeEventId?: string | null
) {
    const { runGapEngine } = await import("@/lib/services/gap-engine")
    const result = await runGapEngine(userId, { trigger, lifeEventId: lifeEventId ?? null })
    // The engine's own version result, not a reconstruction: `written: false`
    // with a real version number means the assessment genuinely did not move,
    // which is a different statement from "we did not look".
    return result.version ?? { written: false, version: null, previousScore: null, delta: null }
}

export interface RecordedLifeEvent {
    id: string
    definitionId: string
    occurredAt: Date
    discoveredAt: Date
    source: string
    confidence: string
    magnitude: number | null
}

export async function getLifeEventHistory(
    userId: string,
    limit = 50
): Promise<RecordedLifeEvent[]> {
    const rows = await db.lifeEventInstance.findMany({
        where: { userId, status: "applied" },
        orderBy: { occurredAt: "desc" },
        take: limit,
        select: {
            id: true,
            definitionId: true,
            occurredAt: true,
            discoveredAt: true,
            source: true,
            confidence: true,
            magnitude: true,
        },
    })
    return rows.map((r) => ({ ...r, magnitude: r.magnitude ? Number(r.magnitude) : null }))
}
