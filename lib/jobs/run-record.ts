/**
 * Recording what the scheduled jobs actually did.
 *
 * The platform owns *when* a cron fires — vercel.json, and the app cannot change
 * it. What the app owns is whether the job does anything when it does, and
 * whether anyone can see that it ran.
 *
 * Without this the admin console could only render vercel.json back at the
 * operator: a list of cron expressions with no evidence any of them executed. A
 * schedule you cannot observe is a schedule you cannot trust, and the audit
 * found two job routes that no cron had ever invoked precisely because nothing
 * would have shown it.
 */

import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { logger } from "@/lib/logger"

export interface JobRunResult<T> {
    /** The job's own return value, or null when it was paused or threw. */
    result: T | null
    /** True when the operator has this schedule switched off. */
    paused: boolean
}

/**
 * Is this schedule switched on?
 *
 * Unknown jobs are ENABLED. A job that has never run has no row, and defaulting
 * an unrecognised name to "off" would mean a newly deployed job silently never
 * runs — failing closed in the direction that loses work rather than the one
 * that protects it.
 */
async function isEnabled(jobName: string): Promise<boolean> {
    try {
        const schedule = await db.jobSchedule.findUnique({
            where: { name: jobName },
            select: { enabled: true },
        })
        return schedule?.enabled ?? true
    } catch {
        // An unreadable schedule table must not stop the work.
        return true
    }
}

/**
 * Run a bookkeeping write, swallowing anything it throws.
 *
 * `x.y().catch()` is not enough: if the model itself is missing — a client
 * generated before the migration, or a partial mock — the member access throws
 * BEFORE there is a promise to attach a catch to, and the wrapper takes down the
 * job it exists to observe. Observability must never be load-bearing.
 */
async function quietly(fn: () => Promise<unknown>): Promise<void> {
    try {
        await fn()
    } catch {
        // Deliberately silent: the job's own outcome is what matters.
    }
}

/**
 * Wrap a scheduled job so its execution is recorded and its pause switch honoured.
 *
 * Never changes the job's own behaviour: the recording is best-effort at every
 * step, and a failure to write the audit row must not fail the job it is
 * auditing.
 */
export async function withJobRun<T>(
    jobName: string,
    fn: () => Promise<T>,
    options: { trigger?: "cron" | "manual"; description?: string } = {}
): Promise<JobRunResult<T>> {
    const trigger = options.trigger ?? "cron"

    // Upsert the schedule so the list is what actually runs, rather than what
    // someone once wrote down in a config file.
    await quietly(() =>
        db.jobSchedule.upsert({
            where: { name: jobName },
            create: { name: jobName, description: options.description ?? null },
            update: options.description ? { description: options.description } : {},
        })
    )

    if (!(await isEnabled(jobName))) {
        // Recorded, not silent. "This did not happen because you paused it" is
        // exactly what an operator needs when a customer asks why nothing
        // arrived — and it is invisible if a paused job simply returns.
        await quietly(() =>
            db.jobRun.create({
                data: { jobName, status: "paused", trigger, finishedAt: new Date(), durationMs: 0 },
            })
        )
        logger("info", "scheduled job is paused", { jobName })
        return { result: null, paused: true }
    }

    const startedAt = Date.now()
    let runId: string | null = null
    try {
        const row = await db.jobRun.create({
            data: { jobName, status: "running", trigger },
            select: { id: true },
        })
        runId = row?.id ?? null
    } catch {
        // Carry on unrecorded rather than skipping the work.
    }

    try {
        const result = await fn()
        if (runId) {
            await quietly(() =>
                db.jobRun.update({
                    where: { id: runId },
                    data: {
                        status: "succeeded",
                        finishedAt: new Date(),
                        durationMs: Date.now() - startedAt,
                        // Whatever the job reports about what it did. Jobs already
                        // return honest summaries including what they could NOT
                        // finish; this is where that becomes visible.
                        summary: summarise(result),
                    },
                })
            )
        }
        return { result, paused: false }
    } catch (error) {
        if (runId) {
            await quietly(() =>
                db.jobRun.update({
                    where: { id: runId },
                    data: {
                        status: "failed",
                        finishedAt: new Date(),
                        durationMs: Date.now() - startedAt,
                        error: error instanceof Error ? error.message.slice(0, 1000) : String(error),
                    },
                })
            )
        }
        // Re-thrown: the route still reports its own failure. This wrapper
        // observes, it does not swallow.
        throw error
    }
}

/**
 * A job's return value, reduced to something storable.
 *
 * Most jobs return a plain summary object, which is exactly what the console
 * should show. Some return a Response — a route body, not a summary — and
 * storing that would put an opaque object in the audit trail. Anything that is
 * not a plain object is recorded as null rather than as noise.
 */
function summarise(result: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
    if (!result || typeof result !== "object") return Prisma.DbNull
    // A Response is a route body, not a summary; storing it would put an opaque
    // object in the audit trail.
    if (typeof (result as { json?: unknown }).json === "function") return Prisma.DbNull
    try {
        return JSON.parse(JSON.stringify(result)) as Prisma.InputJsonValue
    } catch {
        return Prisma.DbNull
    }
}
