/**
 * GUARD + specification for lib/protection/coverage-status.ts — the one
 * derivation behind «Καλύψεις & κενά»'s summary and the dashboard's branch
 * map (goal series, 2026-09-07).
 *
 * The honesty edges are the point: silence is not a pass, an under-review
 * finding is disclosed and never counted, a recording-only finding never
 * changes a status, a lapsed policy is never «covered», severity is never
 * read, and the four counts plus the disclosed buckets always equal the rows.
 *
 * Probe fixtures (tests/fixtures/guard-probes/coverage-status-probes.json) are
 * the inputs a wrong derivation would misjudge; each is asserted here to
 * produce the unreassuring answer.
 */

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

import {
    coverageStatusSums,
    deriveCoverageStatus,
    relevantRows,
    toTileState,
    type CoverageStatusInput,
    type CoverageStatusPolicy,
    type CoverageStatusRun,
} from "@/lib/protection/coverage-status"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { classifyRuleQuestion, currentCatalogueVersion } from "@/lib/gaps/composition"

const NOW = new Date("2026-09-07T10:00:00.000Z")
const inAYear = new Date("2027-09-01T00:00:00.000Z")
const lastYear = new Date("2025-09-01T00:00:00.000Z")

/** Every motor coverage input present and typed — the composition can judge all five points. */
const MOTOR_ACORD_COMPLETE = {
    coverages: [{ name: "Αστική ευθύνη", limit: 1000000 }],
    vehicle: {
        ownVehicleDamage: true,
        glassBreakage: true,
        hasRoadsideAssistance: true,
        insuredValue: 12000,
        estimatedMarketValue: 12000,
        greenCardExpiryDate: "2027-06-01",
        accidentDeclarationPhone: "+30 210 0000000",
    },
}

const motorSlugs = AUTHORED_GAP_DEFINITIONS.filter((d) => d.lineOfBusiness === "motor").map((d) => d.slug)
const homeSlugs = AUTHORED_GAP_DEFINITIONS.filter((d) => d.lineOfBusiness === "home").map((d) => d.slug)
const lifeSlugs = AUTHORED_GAP_DEFINITIONS.filter((d) => d.lineOfBusiness === "life").map((d) => d.slug)

function policy(over: Partial<CoverageStatusPolicy> & { id: string; lineOfBusiness: string }): CoverageStatusPolicy {
    return {
        status: "active",
        policyNumber: `POL-${over.id}`,
        insurerName: "Interamerican",
        endDate: inAYear,
        acordData: MOTOR_ACORD_COMPLETE,
        lastAnalyzedAt: new Date("2026-09-01T00:00:00.000Z"),
        ...over,
    }
}

function completedRun(policyId: string, slugs: readonly string[], over: Partial<CoverageStatusRun> = {}): CoverageStatusRun {
    return {
        id: `run-${policyId}-ok`,
        policyId,
        status: "completed",
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
        finishedAt: new Date("2026-09-01T00:05:00.000Z"),
        attemptedRules: { slugs: [...slugs], catalogueVersion: currentCatalogueVersion() },
        ...over,
    }
}

function gap(policyId: string, slug: string, runId = `run-${policyId}-ok`) {
    return { policyId, slug, analysisRunId: runId, runFinishedAt: new Date("2026-09-01T00:05:00.000Z") }
}

function derive(over: Partial<CoverageStatusInput>) {
    return deriveCoverageStatus({ policies: [], gapRows: [], runs: [], expectedLines: [], coverHeldElsewhere: [], now: NOW, ...over })
}

const row = (result: ReturnType<typeof derive>, branch: string) => {
    const found = result.rows.find((r) => r.branch.id === branch)
    if (!found) throw new Error(`no row for ${branch}`)
    return found
}

const FLAGS = { expiringSoon: false, unknownDuration: false, lapsedOnly: false, limitsUnread: false, partialRun: false, staleCatalogue: false }

describe("coverage status — the four statuses", () => {
    it("a current run over every coverage input, nothing fired → appears covered with its denominator", () => {
        const r = derive({ policies: [policy({ id: "m1", lineOfBusiness: "motor" })], runs: [completedRun("m1", motorSlugs)] })
        const motor = row(r, "motor")
        expect(motor.status).toBe("appears_covered")
        expect(motor.checked).toBe(5)
        expect(motor.covered).toBe(5)
        expect(motor.flags.limitsUnread).toBe(false)
        expect(r.summary.appearsCovered).toBe(1)
    })

    it("silence is not a pass: an absent input stays indeterminate, the status stays hedged, never «finding»", () => {
        const acord = { ...MOTOR_ACORD_COMPLETE, vehicle: { ...MOTOR_ACORD_COMPLETE.vehicle, glassBreakage: undefined } }
        const r = derive({ policies: [policy({ id: "m1", lineOfBusiness: "motor", acordData: acord })], runs: [completedRun("m1", motorSlugs)] })
        const motor = row(r, "motor")
        expect(motor.status).toBe("appears_covered")
        expect(motor.covered).toBe(4)
        expect(motor.indeterminate).toBe(1)
    })

    it("a classified coverage-class finding on an in-force policy → «Μερική κάλυψη»", () => {
        const r = derive({
            policies: [policy({ id: "h1", lineOfBusiness: "home", acordData: { coverages: [{ name: "Πυρκαγιά" }], property: { insuredValue: 100000, estimatedRebuildCost: 200000 } } })],
            runs: [completedRun("h1", homeSlugs)],
            gapRows: [gap("h1", "insured_value_below_rebuild_cost")],
        })
        const home = row(r, "home")
        expect(home.status).toBe("finding")
        expect(home.findingCount).toBe(1)
        expect(r.summary.finding).toBe(1)
    })

    it("an under-review finding is disclosed, never counted, and never lets the branch read as covered", () => {
        const r = derive({
            policies: [policy({ id: "m1", lineOfBusiness: "motor" })],
            runs: [completedRun("m1", motorSlugs)],
            gapRows: [gap("m1", "no_glass_breakage_cover")],
        })
        const motor = row(r, "motor")
        expect(motor.status).toBeNull()
        expect(motor.bucket).toBe("under_review_only")
        expect(motor.underReviewCount).toBe(1)
        expect(motor.findingCount).toBe(0)
        expect(r.summary.underReviewOnly).toBe(1)
        expect(r.summary.appearsCovered).toBe(0)
        expect(r.summary.relevantCount).toBe(1)
    })

    it("a recording-only finding never changes the status — it is a caveat", () => {
        const r = derive({
            policies: [policy({ id: "m1", lineOfBusiness: "motor" })],
            runs: [completedRun("m1", motorSlugs)],
            gapRows: [gap("m1", "missing_accident_declaration_phone")],
        })
        const motor = row(r, "motor")
        expect(motor.status).toBe("appears_covered")
        expect(motor.notRecordedCount).toBe(1)
        // The summary carries the same total, so the page can say why a findings list is not
        // empty while «Μερική κάλυψη» reads 0 (production, 2026-09-07).
        expect(r.summary.notRecorded).toBe(1)
        expect(motor.findingCount).toBe(0)
    })

    it("an expected line with nothing held → «Χωρίς ασφαλιστήριο»; expired-only stays there with lapsedOnly", () => {
        const none = derive({ expectedLines: ["pet"] })
        expect(row(none, "pet").status).toBe("no_policy")
        expect(row(none, "pet").flags.lapsedOnly).toBe(false)

        const lapsed = derive({
            expectedLines: ["health"],
            policies: [policy({ id: "x1", lineOfBusiness: "health", endDate: lastYear, acordData: {} })],
        })
        const health = row(lapsed, "health")
        expect(health.status).toBe("no_policy")
        expect(health.flags.lapsedOnly).toBe(true)
    })

    it("a line the person declared they hold elsewhere is disclosed, not called «Χωρίς ασφαλιστήριο»", () => {
        const r = derive({ expectedLines: ["life"], coverHeldElsewhere: ["life"] })
        expect(row(r, "life").status).toBeNull()
        expect(row(r, "life").bucket).toBe("held_elsewhere")
        expect(r.summary.noPolicy).toBe(0)
        expect(r.summary.heldElsewhere).toBe(1)
    })

    it("without a score row nothing may be «Χωρίς ασφαλιστήριο», and the summary says the lines are unknown", () => {
        const r = derive({ expectedLines: null })
        expect(r.rows.every((x) => x.status !== "no_policy")).toBe(true)
        expect(r.summary.hasExpectedLines).toBe(false)
        expect(row(r, "pet").bucket).toBe("neutral")
    })
})

describe("coverage status — «Δεν ελέγχθηκε ακόμη» and its reasons", () => {
    it("never analysed (no run, no lastAnalyzedAt)", () => {
        const r = derive({ policies: [policy({ id: "m1", lineOfBusiness: "motor", lastAnalyzedAt: null })] })
        expect(row(r, "motor")).toMatchObject({ status: "not_checked", reason: "never_analysed" })
    })

    it("an unauthored branch with an in-force analysed policy", () => {
        const r = derive({ policies: [policy({ id: "p1", lineOfBusiness: "pension", acordData: {} })], runs: [completedRun("p1", [])] })
        expect(row(r, "pension")).toMatchObject({ status: "not_checked", reason: "unauthored" })
    })

    it("life has no coverage-class check — zero findings there is vacuous", () => {
        const r = derive({ policies: [policy({ id: "l1", lineOfBusiness: "life", acordData: { beneficiaries: [{ name: "x" }] } })], runs: [completedRun("l1", lifeSlugs)] })
        expect(row(r, "life")).toMatchObject({ status: "not_checked", reason: "no_coverage_checks" })
    })

    it("stale after a failed attempt keeps the old findings visible but the status unchecked", () => {
        const r = derive({
            policies: [policy({ id: "m1", lineOfBusiness: "motor" })],
            runs: [
                completedRun("m1", motorSlugs),
                { id: "run-m1-fail", policyId: "m1", status: "failed", createdAt: new Date("2026-09-05T00:00:00.000Z"), finishedAt: new Date("2026-09-05T00:01:00.000Z"), attemptedRules: null },
            ],
        })
        expect(row(r, "motor")).toMatchObject({ status: "not_checked", reason: "stale_failed" })
    })

    it("a pre-plan run (no attemptedRules) has no denominator", () => {
        const r = derive({ policies: [policy({ id: "m1", lineOfBusiness: "motor" })], runs: [completedRun("m1", motorSlugs, { attemptedRules: null })] })
        expect(row(r, "motor")).toMatchObject({ status: "not_checked", reason: "pre_plan" })
    })

    it("an unread document is counted in the denominator as unchecked", () => {
        const r = derive({ policies: [policy({ id: "u1", lineOfBusiness: "travel", policyNumber: null, insurerName: null, acordData: {} })] })
        expect(row(r, "travel")).toMatchObject({ status: "not_checked", reason: "unread" })
        expect(relevantRows(r.rows).some((x) => x.branch.id === "travel")).toBe(true)
    })

    it("limits unread is a flag on the hedged status, not a downgrade", () => {
        const acord = { vehicle: MOTOR_ACORD_COMPLETE.vehicle }
        const r = derive({ policies: [policy({ id: "m1", lineOfBusiness: "motor", acordData: acord })], runs: [completedRun("m1", motorSlugs)] })
        expect(row(r, "motor").status).toBe("appears_covered")
        expect(row(r, "motor").flags.limitsUnread).toBe(true)
    })
})

describe("coverage status — invariants", () => {
    it("children never become tiles: an expected income_protection line makes no row of its own, and — as the branch overview decides — does not make life expected", () => {
        // buildBranchOverview keeps only TOP-LEVEL expected lines (branch-page.ts:
        // the fold drops `income_protection`, `renters` and their siblings on
        // purpose). One derivation, so this module inherits that rule rather
        // than inventing a second answer to "what does the profile expect".
        const r = derive({ expectedLines: ["income_protection"] })
        expect(r.rows.some((x) => x.branch.id === "income_protection")).toBe(false)
        expect(row(r, "life").expected).toBe(false)
        expect(row(r, "life").bucket).toBe("neutral")
        // A child POLICY, however, folds into the parent's row.
        const held = derive({ policies: [policy({ id: "ip1", lineOfBusiness: "income_protection", acordData: {} })] })
        expect(row(held, "life").policyCount).toBe(1)
    })

    it("the four counts plus the three buckets always equal the rows, and the denominator is the four plus under-review-only", () => {
        const r = derive({
            expectedLines: ["pet", "life", "home"],
            coverHeldElsewhere: ["life"],
            policies: [policy({ id: "m1", lineOfBusiness: "motor" }), policy({ id: "m2", lineOfBusiness: "motor" })],
            runs: [completedRun("m1", motorSlugs), completedRun("m2", motorSlugs)],
            gapRows: [gap("m2", "no_glass_breakage_cover")],
        })
        expect(coverageStatusSums(r)).toBe(true)
        expect(r.summary.relevantCount).toBe(r.summary.appearsCovered + r.summary.finding + r.summary.noPolicy + r.summary.notChecked + r.summary.underReviewOnly)
        expect(relevantRows(r.rows).length).toBe(r.summary.relevantCount)
    })

    it("every authored rule classifies as coverage or recording — no silent unknown", () => {
        for (const d of AUTHORED_GAP_DEFINITIONS) expect(classifyRuleQuestion(d.detectionLogic), d.slug).not.toBe("unknown")
    })

    it("severity is never read, and under review is excluded through the one helper", () => {
        const src = readFileSync(join(process.cwd(), "lib/protection/coverage-status.ts"), "utf8")
        const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1")
        // No property read, no field in an input type, no string compare — the
        // word may appear in prose explaining why, nowhere the code can act on.
        expect(code).not.toMatch(/\.severity\b|\bseverity\s*[:?]|["']severity["']/)
        expect(src).toContain("excludeUnderReview(")
    })

    it("projects onto the dashboard's tile vocabulary without ever calling a lapsed or unchecked branch covered", () => {
        expect(toTileState({ status: "appears_covered", bucket: null, reason: null, flags: FLAGS })).toBe("covered")
        expect(toTileState({ status: "finding", bucket: null, reason: null, flags: FLAGS })).toBe("attention")
        expect(toTileState({ status: "no_policy", bucket: null, reason: null, flags: { ...FLAGS, lapsedOnly: true } })).toBe("attention")
        expect(toTileState({ status: "no_policy", bucket: null, reason: null, flags: FLAGS })).toBe("not_held")
        expect(toTileState({ status: "not_checked", bucket: null, reason: "unread", flags: FLAGS })).toBe("unread")
        expect(toTileState({ status: "not_checked", bucket: null, reason: "never_analysed", flags: FLAGS })).toBe("neutral")
        expect(toTileState({ status: null, bucket: "under_review_only", reason: null, flags: FLAGS })).toBe("neutral")
        expect(toTileState({ status: null, bucket: "held_elsewhere", reason: null, flags: FLAGS })).toBe("neutral")
    })
})

describe("coverage status — probes (inputs a wrong derivation would misjudge)", () => {
    const probes = JSON.parse(readFileSync(join(process.cwd(), "tests/fixtures/guard-probes/coverage-status-probes.json"), "utf8")) as Array<{
        name: string
        input: Omit<CoverageStatusInput, "now">
        branch: string
        forbidden: string[]
        expected: { status: string | null; bucket?: string | null; reason?: string | null }
    }>

    it("ships at least the three canonical probes", () => {
        expect(probes.map((p) => p.name)).toEqual(expect.arrayContaining(["active-but-never-analysed", "under-review-only", "expired-only-expected"]))
    })

    for (const probe of probes) {
        it(`probe: ${probe.name}`, () => {
            const r = deriveCoverageStatus({ ...probe.input, now: NOW })
            const x = row(r, probe.branch)
            expect(x.status).toBe(probe.expected.status)
            if (probe.expected.bucket !== undefined) expect(x.bucket).toBe(probe.expected.bucket)
            if (probe.expected.reason !== undefined) expect(x.reason).toBe(probe.expected.reason)
            for (const f of probe.forbidden) expect(x.status).not.toBe(f)
        })
    }
})
