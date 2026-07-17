import { requireApiUser } from "@/lib/api-auth"
import { createApiError, createApiResponse } from "@/lib/api-utils"
import { db } from "@/lib/db"
import { runGapEngine } from "@/lib/services/gap-engine"
import { logger } from "@/lib/logger"

/**
 * POST /api/v1/jobs/protection-score-refresh
 *
 * Cron job: Recomputes protection scores for active users.
 * Targets users who have been active in the last 90 days and have
 * at least one policy. Runs daily.
 *
 * Auth: CRON_SECRET header or admin Bearer token.
 */
export async function POST(req: Request) {
    const cronSecret = process.env.CRON_SECRET
    const headerSecret = req.headers.get("x-cron-secret")
    const authHeader = req.headers.get("authorization")
    const bearerSecret = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length)
        : null
    const isCronAuthorized = Boolean(
        cronSecret &&
        (
            (headerSecret && headerSecret === cronSecret) ||
            (bearerSecret && bearerSecret === cronSecret)
        )
    )

    if (!isCronAuthorized) {
        const authCheck = await requireApiUser({ roles: ["admin"] })
        if ("error" in authCheck) return authCheck.error
    }

    try {
        // Drive off the STALEST scores first, not "the first 1000 active users":
        // the old query had no ordering, so the same first 1000 rows were
        // refreshed every day and everyone else's score never updated. Ordering
        // by computedAt asc rotates naturally — a refreshed score moves to the
        // back of the queue — so over successive daily runs every user is
        // covered, without a queue.
        const staleBefore = new Date(Date.now() - 20 * 60 * 60 * 1000) // ~20h
        const MAX_BATCH = 500        // hard cap on rows pulled per invocation
        const TIME_BUDGET_MS = 240_000 // stop well before the 300s function limit
        const CONCURRENCY = 5        // engine runs are heavy; keep the DB sane
        const startedAt = Date.now()

        const stale = await db.protectionScore.findMany({
            where: { computedAt: { lt: staleBefore } },
            orderBy: { computedAt: "asc" },
            take: MAX_BATCH,
            select: { userId: true },
        })

        let processed = 0
        let errors = 0
        let timedOut = false

        for (let i = 0; i < stale.length; i += CONCURRENCY) {
            if (Date.now() - startedAt > TIME_BUDGET_MS) {
                timedOut = true
                break
            }
            const chunk = stale.slice(i, i + CONCURRENCY)
            const results = await Promise.allSettled(
                chunk.map((s) => runGapEngine(s.userId))
            )
            for (let j = 0; j < results.length; j++) {
                const r = results[j]
                if (r.status === "fulfilled") {
                    processed++
                } else {
                    errors++
                    logger("error", `Protection score refresh failed for user ${chunk[j].userId}`, {
                        error: String(r.reason),
                    })
                }
            }
        }

        // Honest accounting — never a silent cap. `remaining` tells the operator
        // whether one daily run keeps up or a queue is now needed.
        const remaining = Math.max(0, stale.length - processed - errors)
        const summary = {
            staleFound: stale.length,
            processed,
            errors,
            remaining,
            hitBatchCap: stale.length === MAX_BATCH,
            stoppedForTimeBudget: timedOut,
            elapsedMs: Date.now() - startedAt,
            timestamp: new Date().toISOString(),
        }

        logger("info", "Protection score refresh completed", summary)
        return createApiResponse({ summary })
    } catch (error) {
        return createApiError(
            "INTERNAL_ERROR",
            "Failed to run protection score refresh",
            500,
            String(error)
        )
    }
}

// Vercel Cron issues GET; reuse the same guarded handler (no request body is read).
export const GET = POST
