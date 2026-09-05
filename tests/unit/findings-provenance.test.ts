import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import {
    attemptedRuleCountOf,
    describeFindingsProvenance,
    findingsProvenanceLine,
    type AttemptProvenance,
} from "@/lib/gaps/findings-provenance"
import { el } from "@/lib/i18n/translations/el"
import { en } from "@/lib/i18n/translations/en"

/**
 * B0.3 — a failed re-run does not present stale findings as current.
 *
 * The fixture the amendment names: a policy analysed successfully, then
 * re-analysed with a forced failure. Every surface showing its findings must
 * state that the latest attempt failed and show the date of the findings it
 * displays. The derivation is pinned here over the whole state matrix, in both
 * locales; the surface half asserts that the four named surfaces (B2C policy
 * detail, B2C analysis, B2B client detail, B2B report) render the line.
 */
const D = (s: string) => new Date(s)

const okRun: AttemptProvenance = { id: "run-ok", status: "completed", finishedAt: D("2026-08-01T09:00:00Z"), attemptedRuleCount: 6 }
const failedRun: AttemptProvenance = { id: "run-fail", status: "failed", finishedAt: D("2026-09-01T09:00:00Z"), attemptedRuleCount: 6 }
const blockedRun: AttemptProvenance = { id: "run-blocked", status: "blocked", finishedAt: D("2026-09-02T09:00:00Z"), attemptedRuleCount: 6 }
const runningRun: AttemptProvenance = { id: "run-live", status: "running", createdAt: D("2026-09-03T09:00:00Z"), attemptedRuleCount: 6 }
const partialRun: AttemptProvenance = { id: "run-partial", status: "completed_with_warnings", finishedAt: D("2026-09-04T09:00:00Z"), attemptedRuleCount: 6 }
const unassessedRun: AttemptProvenance = { id: "run-none", status: "completed", finishedAt: D("2026-09-04T09:00:00Z"), attemptedRuleCount: 0 }

const rowsFrom = (run: AttemptProvenance, n = 2) =>
    Array.from({ length: n }, () => ({ analysisRunId: run.id, runFinishedAt: run.finishedAt ?? null }))

describe("describeFindingsProvenance — the state matrix", () => {
    it("success then forced failure: findings are dated to the success and marked stale", () => {
        const p = describeFindingsProvenance(rowsFrom(okRun), failedRun, okRun)
        expect(p.state).toBe("stale_failed")
        expect(p.stale).toBe(true)
        expect(p.findingsRunId).toBe("run-ok")
        expect(p.findingsAt).toEqual(okRun.finishedAt)
        expect(p.latestAttemptStatus).toBe("failed")
        expect(p.latestAttemptAt).toEqual(failedRun.finishedAt)
        expect(p.findingCount).toBe(2)
    })

    it("success (zero findings) then forced failure still dates the zero to the success", () => {
        const p = describeFindingsProvenance([], failedRun, okRun)
        expect(p.state).toBe("stale_failed")
        expect(p.findingsRunId).toBe("run-ok")
        expect(p.findingCount).toBe(0)
    })

    it("failure with no earlier success: nothing has been checked", () => {
        expect(describeFindingsProvenance([], failedRun, null).state).toBe("none_after_failure")
        expect(describeFindingsProvenance([], blockedRun, null).state).toBe("none_after_failure")
    })

    it("current: rows from the latest completed attempt", () => {
        const p = describeFindingsProvenance(rowsFrom(okRun), okRun, okRun)
        expect(p.state).toBe("current")
        expect(p.stale).toBe(false)
        expect(describeFindingsProvenance([], okRun, okRun).state).toBe("current")
    })

    it("partial: rows from a completed_with_warnings attempt", () => {
        expect(describeFindingsProvenance(rowsFrom(partialRun), partialRun, partialRun).state).toBe("partial")
        expect(describeFindingsProvenance([], partialRun, partialRun).state).toBe("partial")
    })

    it("blocked after a success is stale_blocked, not failed and not current", () => {
        const p = describeFindingsProvenance(rowsFrom(okRun), blockedRun, okRun)
        expect(p.state).toBe("stale_blocked")
        expect(p.stale).toBe(true)
    })

    it("a running attempt keeps the previous findings and says a new one is in progress", () => {
        expect(describeFindingsProvenance(rowsFrom(okRun), runningRun, okRun).state).toBe("in_progress")
        expect(describeFindingsProvenance([], runningRun, okRun)).toMatchObject({ state: "in_progress", findingsRunId: "run-ok", stale: true })
        expect(describeFindingsProvenance([], runningRun, null)).toMatchObject({ state: "in_progress", findingsRunId: null, stale: false })
    })

    it("never analysed: none", () => {
        expect(describeFindingsProvenance([], null, null).state).toBe("none")
    })

    it("a completed run that attempted zero rules is unassessed, not current (B1.5 pre-wiring)", () => {
        expect(describeFindingsProvenance([], unassessedRun, unassessedRun).state).toBe("unassessed")
        expect(describeFindingsProvenance([], failedRun, unassessedRun)).toMatchObject({ state: "unassessed", stale: true })
    })

    it("reads the attempted-rule count from a run's stored plan", () => {
        expect(attemptedRuleCountOf({ slugs: ["a", "b"] })).toBe(2)
        expect(attemptedRuleCountOf({ slugs: [] })).toBe(0)
        expect(attemptedRuleCountOf(null)).toBeNull()
        expect(attemptedRuleCountOf({})).toBeNull()
    })
})

describe("findingsProvenanceLine — the words, both locales", () => {
    it("stale_failed names both dates and says the findings are not current", () => {
        const p = describeFindingsProvenance(rowsFrom(okRun), failedRun, okRun)
        const elLine = findingsProvenanceLine(p, el.gapProvenance, "el")
        const enLine = findingsProvenanceLine(p, en.gapProvenance, "en")
        expect(elLine.tone).toBe("warning")
        expect(elLine.text).toContain("απέτυχε")
        expect(elLine.text).toContain("1 Σεπτεμβρίου 2026")
        expect(elLine.text).toContain("1 Αυγούστου 2026")
        expect(elLine.text).toContain("δεν είναι τρέχοντα")
        expect(enLine.text).toContain("failed")
        expect(enLine.text).toContain("1 September 2026")
        expect(enLine.text).toContain("1 August 2026")
        expect(enLine.text).toContain("not current")
        expect(elLine.text).not.toMatch(/\{(date|latestDate)\}/)
        expect(enLine.text).not.toMatch(/\{(date|latestDate)\}/)
    })

    it("every state produces a filled sentence in both locales, and no state reads as reassurance", () => {
        const cases = [
            describeFindingsProvenance(rowsFrom(okRun), okRun, okRun),
            describeFindingsProvenance([], okRun, okRun),
            describeFindingsProvenance(rowsFrom(partialRun), partialRun, partialRun),
            describeFindingsProvenance([], unassessedRun, unassessedRun),
            describeFindingsProvenance(rowsFrom(okRun), failedRun, okRun),
            describeFindingsProvenance(rowsFrom(okRun), blockedRun, okRun),
            describeFindingsProvenance(rowsFrom(okRun), runningRun, okRun),
            describeFindingsProvenance([], runningRun, null),
            describeFindingsProvenance([], null, null),
            describeFindingsProvenance([], failedRun, null),
        ]
        const reassurance = /Καλή κάλυψη|Εντάξει|Επαρκής|Προστατευμέν|Σε καλή κατάσταση|you are covered|good coverage|all clear/i
        for (const locale of ["el", "en"] as const) {
            const copy = locale === "el" ? el.gapProvenance : en.gapProvenance
            for (const p of cases) {
                const line = findingsProvenanceLine(p, copy, locale)
                expect(line.text.length, `${p.state} ${locale}`).toBeGreaterThan(20)
                expect(line.text, `${p.state} ${locale}`).not.toMatch(/\{(date|latestDate)\}/)
                expect(line.text, `${p.state} ${locale}`).not.toMatch(reassurance)
            }
        }
    })
})

describe("the four named surfaces render the provenance line", () => {
    const read = (p: string) => readFileSync(p, "utf8")

    it("B2C policy detail + analysis (one page, one card) derive and render it", () => {
        expect(read("app/(protected)/wallet/[id]/page.tsx")).toMatch(/describeFindingsProvenance\(/)
        expect(read("app/(protected)/wallet/[id]/page.tsx")).toMatch(/findingsProvenance=\{/)
        expect(read("components/wallet/PolicyDetailsClientView.tsx")).toMatch(/findingsProvenance=\{findingsProvenance\}/)
        expect(read("app/(protected)/wallet/[id]/AnalysisCard.tsx")).toMatch(/<FindingsProvenanceLine/)
    })

    it("B2B client detail (agent customer-policy view) derives and renders it", () => {
        const src = read("app/(protected)/customers/[id]/policy/[policyId]/page.tsx")
        expect(src).toMatch(/describeFindingsProvenance\(/)
        expect(src).toMatch(/findingsProvenance=\{/)
        // And no longer lists superseded rows.
        expect(src).toMatch(/supersededAt:\s*null/)
    })

    it("the B2B report carries it, from both routes", () => {
        expect(read("lib/services/reports/savings-report.ts")).toMatch(/findings-provenance/)
        expect(read("app/api/v1/agent/policies/[id]/branded-report/route.ts")).toMatch(/describeFindingsProvenance\(/)
        expect(read("app/api/v1/policies/[id]/savings-report/route.ts")).toMatch(/describeFindingsProvenance\(/)
    })
})
