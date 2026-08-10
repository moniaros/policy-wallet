export const runtime = 'nodejs'

import Link from "next/link"
import { redirect } from "next/navigation"
import { readFileSync } from "node:fs"
import { getAuthenticatedUser } from "@/lib/auth-helpers"
import { hasAnyRole } from "@/lib/api-auth"
import { db } from "@/lib/db"
import { setSchedulePaused, runScheduleNow } from "../actions"

// Admin-only internal tooling — English-only per the admin-page precedent.
// i18n-hardcoded-ignore — admin-only internal tooling

const card = "rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800"

/** Jobs safe to invoke out of band — the rest assume a daily cadence. */
const RUNNABLE = new Set(["notification-retry", "event-sweep"])

const STATUS_TONE: Record<string, string> = {
    succeeded: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    running: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    paused: "bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300",
}

/**
 * Every scheduled job, with evidence it ran.
 *
 * The cron EXPRESSIONS come from vercel.json — the platform owns when a job
 * fires and the app cannot change it. Everything else comes from `job_runs`,
 * which is the point: without run history this page could only render the
 * config file back at the operator, and a schedule you cannot observe is a
 * schedule you cannot trust. Two job routes existed for weeks that no cron ever
 * invoked, and nothing would have shown it.
 */
export default async function SchedulesPage() {
    const { dbUser } = await getAuthenticatedUser()
    if (!hasAnyRole(dbUser.roles, ["admin"])) redirect("/wallet")

    let crons: Array<{ path: string; schedule: string }> = []
    try {
        crons = JSON.parse(readFileSync("vercel.json", "utf-8")).crons ?? []
    } catch {
        // A missing or malformed vercel.json must not blank the page — the run
        // history below is the more useful half anyway.
    }

    const [schedules, recentRuns] = await Promise.all([
        db.jobSchedule.findMany({ orderBy: { name: "asc" } }),
        db.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 200 }),
    ])

    const scheduledNames = new Set(crons.map((c) => c.path.split("/").pop() ?? ""))
    const known = new Set([...scheduledNames, ...schedules.map((s) => s.name)])

    const rows = [...known].sort().map((name) => {
        const cron = crons.find((c) => c.path.endsWith(`/${name}`))
        const schedule = schedules.find((s) => s.name === name)
        const runs = recentRuns.filter((r) => r.jobName === name)
        return {
            name,
            cronExpression: cron?.schedule ?? null,
            enabled: schedule?.enabled ?? true,
            lastRun: runs[0] ?? null,
            failures: runs.filter((r) => r.status === "failed").length,
        }
    })

    return (
        <div className="p-4 sm:p-6 space-y-4 max-w-4xl">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Schedules</h1>
                    <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                        Cron timing is owned by the platform. Whether a job does anything when it
                        fires is owned here.
                    </p>
                </div>
                <Link href="/admin/automation" className="pw-btn pw-btn-sm">Automation</Link>
            </div>

            <div className="space-y-3">
                {rows.map((row) => (
                    <article key={row.name} className={`${card} p-4 ${row.enabled ? "" : "opacity-70"}`}>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="min-w-0">
                                <h2 className="font-mono text-sm font-semibold text-stone-900 dark:text-white break-all">
                                    {row.name}
                                </h2>
                                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                    {row.cronExpression ? (
                                        <>cron <code>{row.cronExpression}</code></>
                                    ) : (
                                        // The audit found exactly this: routes with no cron entry.
                                        <span className="text-amber-700 dark:text-amber-400">
                                            no cron entry — this job only runs if something calls it
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {row.lastRun && (
                                    <span className={`text-xs rounded px-2 py-0.5 ${STATUS_TONE[row.lastRun.status] ?? STATUS_TONE.paused}`}>
                                        {row.lastRun.status}
                                    </span>
                                )}
                                <form action={setSchedulePaused}>
                                    <input type="hidden" name="jobName" value={row.name} />
                                    <input type="hidden" name="enabled" value={row.enabled ? "false" : "true"} />
                                    <button
                                        type="submit"
                                        className={`text-xs rounded-full px-3 py-1.5 font-medium min-h-11 sm:min-h-0 ${
                                            row.enabled
                                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                                : "bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-300"
                                        }`}
                                    >
                                        {row.enabled ? "Pause" : "Resume"}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 text-xs">
                            <div>
                                <dt className="text-stone-500 dark:text-stone-400">Last run</dt>
                                <dd className="text-stone-900 dark:text-white">
                                    {row.lastRun
                                        ? row.lastRun.startedAt.toISOString().slice(0, 16).replace("T", " ")
                                        : "never recorded"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-stone-500 dark:text-stone-400">Duration</dt>
                                <dd className="text-stone-900 dark:text-white">
                                    {row.lastRun?.durationMs != null ? `${row.lastRun.durationMs} ms` : "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-stone-500 dark:text-stone-400">Failures (last 200)</dt>
                                <dd className={row.failures > 0 ? "text-red-600 dark:text-red-400" : "text-stone-900 dark:text-white"}>
                                    {row.failures}
                                </dd>
                            </div>
                        </dl>

                        {row.lastRun?.summary != null && (
                            <pre className="mt-3 text-xs bg-stone-50 dark:bg-stone-900 rounded p-2 overflow-x-auto text-stone-700 dark:text-stone-300">
                                {JSON.stringify(row.lastRun.summary, null, 2)}
                            </pre>
                        )}

                        {row.lastRun?.error && (
                            <p className="mt-2 text-xs text-red-600 dark:text-red-400 break-words">
                                {row.lastRun.error}
                            </p>
                        )}

                        {RUNNABLE.has(row.name) && (
                            <form action={runScheduleNow} className="mt-3">
                                <input type="hidden" name="jobName" value={row.name} />
                                <button type="submit" className="pw-btn pw-btn-sm">Run now</button>
                            </form>
                        )}
                    </article>
                ))}
            </div>

            <p className="text-xs text-stone-500 dark:text-stone-400">
                A manual run is recorded as <code>trigger: manual</code> — it proves the job works,
                not that the cron fires.
            </p>
        </div>
    )
}
