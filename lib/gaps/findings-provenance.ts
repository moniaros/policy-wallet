/**
 * Which run a policy's findings come from, and whether that is the latest
 * attempt — one derivation for every surface that renders gap rows.
 *
 * Until B0 a failed re-analysis left the previous run's rows in place with
 * nothing to say so: the policy read «απαιτείται ενέργεια» while its findings
 * list looked current. Rows now carry `analysisRunId` (B0.2), so a surface can
 * always name the run and its date, and can say when the latest attempt is
 * NOT the run the findings came from (B0.3).
 *
 * Nothing here decides a finding. It reads rows and runs and returns a state
 * plus the two dates a reader needs. `tests/unit/findings-provenance.test.ts`
 * pins the matrix and the surfaces that must render it.
 */

export type FindingsProvenanceState =
    /** No attempt has ever completed; nothing has been checked. */
    | "none"
    /** The latest attempt failed or was blocked and no earlier attempt completed. */
    | "none_after_failure"
    /** A run completed for a branch with no authored checks: nothing was assessed. */
    | "unassessed"
    /** The findings shown come from the latest attempt, which completed. */
    | "current"
    /** The findings come from the latest attempt, which completed with missing sections. */
    | "partial"
    /** The findings come from an earlier run; the latest attempt FAILED. */
    | "stale_failed"
    /** The findings come from an earlier run; the latest attempt was BLOCKED (gate, consent, quota). */
    | "stale_blocked"
    /** A new attempt is queued or running; the findings come from the last completed run. */
    | "in_progress"

export interface FindingRowProvenance {
    analysisRunId: string
    runFinishedAt: Date | string | null | undefined
}

export interface AttemptProvenance {
    id: string
    status: string
    finishedAt?: Date | string | null
    createdAt?: Date | string | null
    /** `attemptedRules.slugs.length` when known — 0 means the branch has no authored checks. */
    attemptedRuleCount?: number | null
}

export interface FindingsProvenance {
    state: FindingsProvenanceState
    /** The run the displayed findings come from. */
    findingsRunId: string | null
    findingsAt: Date | null
    findingCount: number
    latestAttemptId: string | null
    latestAttemptStatus: string | null
    latestAttemptAt: Date | null
    /** True whenever the findings shown are not from the latest attempt. */
    stale: boolean
}

const TERMINAL_OK = new Set(["completed", "completed_with_warnings"])
const TERMINAL_BAD = new Set(["failed", "blocked"])
const LIVE = new Set(["queued", "running"])

function toDate(value: Date | string | null | undefined): Date | null {
    if (!value) return null
    const d = value instanceof Date ? value : new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
}

/** `attemptedRules.slugs.length` from a run's stored plan, or null when absent. */
export function attemptedRuleCountOf(attemptedRules: unknown): number | null {
    const slugs = (attemptedRules as { slugs?: unknown } | null | undefined)?.slugs
    return Array.isArray(slugs) ? slugs.length : null
}

/**
 * @param rows            the LIVE gap rows shown on the surface (supersededAt null)
 * @param latestAttempt   the most recent run for the policy, any status
 * @param lastCompleted   the most recent run that completed (either status), when
 *                        the caller has it — needed to date a zero-finding
 *                        result that precedes a failed attempt
 */
export function describeFindingsProvenance(
    rows: readonly FindingRowProvenance[],
    latestAttempt: AttemptProvenance | null | undefined,
    lastCompleted?: AttemptProvenance | null
): FindingsProvenance {
    const latestAt = latestAttempt ? toDate(latestAttempt.finishedAt) ?? toDate(latestAttempt.createdAt) : null
    const latestStatus = latestAttempt?.status ?? null

    // The run the rows came from: newest finishedAt wins (after B0 they agree).
    let findingsRunId: string | null = null
    let findingsAt: Date | null = null
    for (const row of rows) {
        const at = toDate(row.runFinishedAt)
        if (!findingsRunId || (at && (!findingsAt || at > findingsAt))) {
            findingsRunId = row.analysisRunId
            findingsAt = at
        }
    }

    const base = {
        findingsRunId,
        findingsAt,
        findingCount: rows.length,
        latestAttemptId: latestAttempt?.id ?? null,
        latestAttemptStatus: latestStatus,
        latestAttemptAt: latestAt,
    }

    const unassessed = (a: AttemptProvenance | null | undefined) =>
        Boolean(a && TERMINAL_OK.has(a.status) && a.attemptedRuleCount === 0)

    if (rows.length === 0) {
        if (!latestAttempt) return { ...base, state: "none", stale: false }
        if (TERMINAL_OK.has(latestStatus!)) {
            if (unassessed(latestAttempt)) {
                return { ...base, state: "unassessed", findingsRunId: latestAttempt.id, findingsAt: latestAt, stale: false }
            }
            return {
                ...base,
                state: latestStatus === "completed_with_warnings" ? "partial" : "current",
                findingsRunId: latestAttempt.id,
                findingsAt: latestAt,
                stale: false,
            }
        }
        const prior = lastCompleted && lastCompleted.id !== latestAttempt.id ? lastCompleted : null
        const priorAt = prior ? toDate(prior.finishedAt) ?? toDate(prior.createdAt) : null
        if (TERMINAL_BAD.has(latestStatus!)) {
            if (!prior) return { ...base, state: "none_after_failure", stale: false }
            if (unassessed(prior)) return { ...base, state: "unassessed", findingsRunId: prior.id, findingsAt: priorAt, stale: true }
            return {
                ...base,
                state: latestStatus === "blocked" ? "stale_blocked" : "stale_failed",
                findingsRunId: prior.id,
                findingsAt: priorAt,
                stale: true,
            }
        }
        if (LIVE.has(latestStatus!)) {
            return prior
                ? { ...base, state: "in_progress", findingsRunId: prior.id, findingsAt: priorAt, stale: true }
                : { ...base, state: "in_progress", stale: false }
        }
        return { ...base, state: "none", stale: false }
    }

    // Rows exist.
    if (!latestAttempt || latestAttempt.id === findingsRunId) {
        const status = latestAttempt?.status ?? "completed"
        return { ...base, state: status === "completed_with_warnings" ? "partial" : "current", stale: false }
    }
    if (TERMINAL_BAD.has(latestStatus!)) {
        return { ...base, state: latestStatus === "blocked" ? "stale_blocked" : "stale_failed", stale: true }
    }
    if (LIVE.has(latestStatus!)) return { ...base, state: "in_progress", stale: true }
    // A later completed run with rows from an earlier one cannot happen after
    // B0 (the writer supersedes); if it does, the rows' own run is the truth.
    return { ...base, state: "current", stale: false }
}

/** The copy the line renders, one string per state; `{date}` / `{latestDate}` are filled here. */
export interface GapProvenanceCopy {
    label: string
    current: string
    currentNoFindings: string
    partial: string
    unassessed: string
    staleFailed: string
    staleBlocked: string
    inProgress: string
    inProgressNoPrior: string
    none: string
    noneAfterFailure: string
}

export type ProvenanceTone = "neutral" | "warning" | "muted"

export interface ProvenanceLine {
    text: string
    tone: ProvenanceTone
    state: FindingsProvenanceState
}

export function formatProvenanceDate(date: Date | null, locale: "el" | "en"): string {
    if (!date) return locale === "el" ? "άγνωστη ημερομηνία" : "unknown date"
    return new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Athens",
    }).format(date)
}

/**
 * The sentence a surface renders beside its findings. Text is always present;
 * `tone` may add an icon, never replace the words.
 */
export function findingsProvenanceLine(
    p: FindingsProvenance,
    copy: GapProvenanceCopy,
    locale: "el" | "en"
): ProvenanceLine {
    const date = formatProvenanceDate(p.findingsAt, locale)
    const latestDate = formatProvenanceDate(p.latestAttemptAt, locale)
    const fill = (s: string) => s.replace("{date}", date).replace("{latestDate}", latestDate)
    switch (p.state) {
        case "current":
            return { text: fill(p.findingCount > 0 ? copy.current : copy.currentNoFindings), tone: "neutral", state: p.state }
        case "partial":
            return { text: fill(copy.partial), tone: "warning", state: p.state }
        case "unassessed":
            return { text: fill(copy.unassessed), tone: "warning", state: p.state }
        case "stale_failed":
            return { text: fill(copy.staleFailed), tone: "warning", state: p.state }
        case "stale_blocked":
            return { text: fill(copy.staleBlocked), tone: "warning", state: p.state }
        case "in_progress":
            return { text: fill(p.findingsAt ? copy.inProgress : copy.inProgressNoPrior), tone: "muted", state: p.state }
        case "none_after_failure":
            return { text: fill(copy.noneAfterFailure), tone: "warning", state: p.state }
        case "none":
        default:
            return { text: fill(copy.none), tone: "muted", state: p.state }
    }
}
