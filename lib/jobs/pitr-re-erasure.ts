/**
 * PITR re-erasure — PW-PROVENANCE-01 R-02 (compliance pack §14.6).
 *
 * A point-in-time restore can bring back personal data that was lawfully
 * erased after the restore point. The control used to be a runbook step
 * («after ANY production restore, list completed deletion_requests with
 * completed_at after the restore point and re-execute each»). This is that
 * step as a daily job.
 *
 * The job cannot know a restore happened; the operator tells it, by setting
 * `PITR_RESTORE_POINT` to the restore's target instant (ISO-8601) once the
 * restore is done. From then on, every run re-executes the eraser for each
 * request completed after that instant — `eraseUserData` is idempotent — and
 * records what it did. A restore point already handled by a succeeded run is
 * skipped, so the variable can stay set without redoing the work daily; a
 * NEW restore is a new value. No variable → the job records «no restore point»
 * and does nothing, which is the honest state on every day without a restore.
 */

import { db } from "@/lib/db"
import { eraseUserData } from "@/lib/services/gdpr-erasure.service"

export const PITR_JOB_NAME = "pitr-re-erasure"
export const PITR_RESTORE_POINT_ENV = "PITR_RESTORE_POINT"

/** The only status a re-erasure applies to: an erasure that had HAPPENED before the restore undid it. */
export const RE_ERASURE_STATUS = "completed" as const

export interface PitrReErasureSummary {
    restorePoint: string | null
    /** `no_restore_point` — nothing configured · `already_done` — this point was handled by an earlier succeeded run · `executed` */
    outcome: "no_restore_point" | "already_done" | "executed"
    candidates: number
    reExecuted: string[]
    /** Requests whose user row is gone (SetNull) — nothing left to erase, recorded so the count is explained. */
    withoutUser: string[]
    failures: Array<{ requestId: string; userId: string; error: string }>
}

/** The configured restore point, or null; an unparsable value is treated as absent and reported by the caller. */
export function restorePointFromEnv(env: Record<string, string | undefined> = process.env): Date | null {
    const raw = env[PITR_RESTORE_POINT_ENV]
    if (!raw) return null
    const at = new Date(raw)
    return Number.isNaN(at.getTime()) ? null : at
}

/** Has a succeeded run already handled this exact restore point? */
export async function restorePointAlreadyHandled(restorePoint: Date): Promise<boolean> {
    const runs = await db.jobRun.findMany({
        where: { jobName: PITR_JOB_NAME, status: "succeeded" },
        select: { summary: true },
        orderBy: { startedAt: "desc" },
        take: 50,
    })
    const iso = restorePoint.toISOString()
    return runs.some((r) => {
        const s = r.summary as Partial<PitrReErasureSummary> | null
        return s?.restorePoint === iso && s?.outcome === "executed" && (s.failures?.length ?? 0) === 0
    })
}

export interface PitrDeps {
    erase?: (userId: string) => Promise<unknown>
    alreadyHandled?: (restorePoint: Date) => Promise<boolean>
}

/** One run. Pure over its dependencies so the guard can drive it without a database. */
export async function runPitrReErasure(restorePoint: Date | null, deps: PitrDeps = {}): Promise<PitrReErasureSummary> {
    const erase = deps.erase ?? eraseUserData
    const alreadyHandled = deps.alreadyHandled ?? restorePointAlreadyHandled
    const base = { reExecuted: [] as string[], withoutUser: [] as string[], failures: [] as PitrReErasureSummary["failures"] }
    if (!restorePoint) return { ...base, restorePoint: null, outcome: "no_restore_point", candidates: 0 }
    const iso = restorePoint.toISOString()
    if (await alreadyHandled(restorePoint)) return { ...base, restorePoint: iso, outcome: "already_done", candidates: 0 }

    const requests = await db.deletionRequest.findMany({
        where: { status: RE_ERASURE_STATUS, completedAt: { gt: restorePoint } },
        select: { id: true, userId: true },
        orderBy: { completedAt: "asc" },
    })
    const summary: PitrReErasureSummary = { ...base, restorePoint: iso, outcome: "executed", candidates: requests.length }
    for (const request of requests) {
        if (!request.userId) {
            summary.withoutUser.push(request.id)
            continue
        }
        try {
            await erase(request.userId)
            summary.reExecuted.push(request.id)
        } catch (error) {
            summary.failures.push({ requestId: request.id, userId: request.userId, error: error instanceof Error ? error.message : String(error) })
        }
    }
    return summary
}
