import { Client } from "@upstash/qstash"
import { logger } from "@/lib/logger"

// Durable queue for AI analysis execution. Today analysis runs inline in the
// request via after() — a launch-time burst of uploads/re-runs would fan out
// unbounded LLM calls (provider rate-limit blowups) and race function timeouts.
// When QStash is configured, we instead publish the run to a queue with a
// concurrency cap and retries; the signed /api/v1/jobs/execute-analysis
// consumer picks it up. Without QStash (dev / demo), callers fall back to the
// existing inline after() path — behavior is identical.

function appBaseUrl(): string | null {
    const explicit = process.env.QSTASH_CALLBACK_BASE_URL || process.env.NEXTAUTH_URL
    if (explicit) return explicit.replace(/\/$/, "")
    // Vercel provides the deployment host without protocol.
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
    return null
}

/**
 * Enqueue an analysis run for durable, concurrency-capped execution.
 * Returns true if the run was handed to QStash (the caller must NOT execute it
 * inline), false if QStash isn't configured (the caller runs it inline).
 */
export async function enqueueAnalysisRun(
    runId: string,
    language: "en" | "el"
): Promise<boolean> {
    const token = process.env.QSTASH_TOKEN
    const base = appBaseUrl()
    if (!token || !base) return false

    try {
        const client = new Client({ token })
        await client.publishJSON({
            url: `${base}/api/v1/jobs/execute-analysis`,
            body: { runId, language },
            // A run is published once. If a retry of the caller publishes the
            // same run again inside QStash's dedup window, it is dropped at the
            // queue rather than racing the first delivery for the lease.
            deduplicationId: runId,
            // Cap concurrent AI analyses across the fleet so a burst can't
            // exceed provider rate limits. Tune with AI_ANALYSIS_PARALLELISM.
            flowControl: {
                key: "ai-analysis",
                parallelism: Number(process.env.AI_ANALYSIS_PARALLELISM ?? 5),
            },
            // Sized against the execution lease: a killed executor's lease
            // stays valid up to ~4 min after death (TTL 4 min, 60s interval
            // heartbeat), and the consumer 503s while it is held. With only 2
            // retries QStash's early exponential backoff exhausted the budget
            // INSIDE that window and the run was never resumed; 5 retries
            // stretch the schedule well past lease expiry.
            retries: 5,
        })
        return true
    } catch (error) {
        // Publish failed — fall back to inline so the run still executes; the
        // caller's inline path is the safety net.
        logger("error", "Failed to enqueue analysis run on QStash; falling back to inline", {
            runId,
            error: error instanceof Error ? error.message : String(error),
        })
        return false
    }
}
