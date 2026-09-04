import { readFileSync } from "node:fs"
import { describe, expect, it, vi } from "vitest"

/**
 * The read seam — lib/protection/load-attention-areas.ts.
 *
 * Prisma is a Proxy that records every call and answers from a per-test
 * table (the pattern of tests/unit/upload-keeps-its-document.test.ts), so
 * the whole assembly runs for real: `toLifeContext`, `assessRisks` through
 * the engine's own `toPolicyFields`, `resolvePolicyLifecycle`,
 * `buildCoverageModel`, `deriveProtectionPriorities`, `buildAttentionAreas`.
 * Nothing between the rows and the bundle is stubbed.
 */

const state = vi.hoisted(() => ({
    rows: {} as Record<string, unknown>,
    calls: {} as Record<string, any[][]>,
}))

vi.mock("@sentry/nextjs", () => ({ captureMessage: vi.fn() }))
vi.mock("@/lib/db", () => {
    const model = (name: string) =>
        new Proxy(
            {},
            {
                get: (_t, method: string) => (...args: any[]) => {
                    const key = `${name}.${method}`
                    ;(state.calls[key] ??= []).push(args)
                    return Promise.resolve(key in state.rows ? state.rows[key] : method === "findMany" ? [] : null)
                },
            }
        )
    return { db: new Proxy({}, { get: (_t, name: string) => model(name) }) }
})

import { AREA_IDS, type AttentionAreaId } from "@/lib/protection/domains"
import {
    loadAttentionAreas,
    PROFILE_CONTEXT_SELECT,
    type AttentionAreasBundle,
} from "@/lib/protection/load-attention-areas"
import { FACTOR_COLUMNS } from "@/lib/services/gap-engine/life-context"
import { GAP_CONTENT_MAP } from "@/lib/wallet/gap-report"

// ── Fixtures ────────────────────────────────────────────────────────────

/** The clock every date below is relative to. */
const AT = "2026-09-04T10:00:00.000Z"
const NOW = new Date(AT)
const NEXT_YEAR = new Date("2027-09-04T00:00:00.000Z")
const LAST_WINTER = new Date("2026-01-15T00:00:00.000Z")
const IN_TEN_DAYS = new Date("2026-09-14T00:00:00.000Z")

const exact = (source: "onboarding" | "assessment" = "onboarding") => ({ source, precision: "exact" as const, at: AT })

/** Two people depend on this person, who is employed — and the refining facts too. */
const FAMILY_PROFILE = {
    childrenCount: 1,
    dependentsCount: 2,
    employmentStatus: "employed",
    dateOfBirth: new Date("1985-05-05T00:00:00Z"),
    maritalStatus: "married",
    annualIncome: 30000,
    savingsAmount: 5000,
    answeredFields: ["childrenCount", "dependentsCount", "employmentStatus", "dateOfBirth", "maritalStatus", "annualIncome", "savingsAmount"],
    factProvenance: {
        childrenCount: exact(),
        dependentsCount: exact(),
        employmentStatus: exact(),
        dateOfBirth: exact(),
        maritalStatus: exact(),
        annualIncome: exact("assessment"),
        savingsAmount: exact("assessment"),
        // A stale or malformed entry is dropped by the parser, never carried.
        vehiclesCount: { source: "nobody", precision: "exact", at: AT },
    },
}

/** «Health» named, a child last year, low confidence and its reason. */
const STATEMENTS = {
    intent: "understand",
    riskConcerns: ["health"],
    commitments: [],
    confidenceLevel: "unsure",
    uncertaintyReasons: ["dont_know_coverage"],
    recentChanges: ["new_child", "health_changed", "not-a-chip"],
    futureConsiderations: [],
    guidancePreference: "explain_everything",
    unsureSteps: [],
    completedAt: NOW,
    skippedAt: null,
}

const SLUG = Object.keys(GAP_CONTENT_MAP)[0]
const RULE = "life_sum_below_income_years"
const finding = (over: Record<string, unknown> = {}) => ({
    id: "g1",
    ruleId: RULE,
    severity: "HIGH",
    definition: { slug: SLUG, ruleId: RULE },
    ...over,
})
/** The deep run's product — plus one nameless entry the model must not carry. */
const ANALYSED = { coverages: [{ name: " Death benefit ", limit: 100000, status: "included" }, { limit: "x" }, { name: "" }] }

const lifePolicy = (over: Record<string, unknown> = {}) => ({
    id: "life-1",
    lineOfBusiness: "life",
    status: "active",
    policyNumber: "L-1",
    insurerName: "Ethniki",
    endDate: NEXT_YEAR,
    acordData: null,
    gapInstances: [],
    ...over,
})

async function load(rows: { profile?: unknown; statements?: unknown; policies?: unknown[] } = {}): Promise<AttentionAreasBundle> {
    state.calls = {}
    state.rows = {
        "policyholderProfile.findUnique": rows.profile ?? null,
        "protectionProfile.findUnique": rows.statements ?? null,
        "policy.findMany": rows.policies ?? [],
    }
    return loadAttentionAreas({ userId: "u1", language: "el", now: NOW })
}

const area = (bundle: AttentionAreasBundle, id: AttentionAreaId) => bundle.areas.find((a) => a.area === id)!

// ── No profile ──────────────────────────────────────────────────────────

describe("no profile, nothing uploaded", () => {
    it("every area is unknown and dormant — an empty bundle, never a reassuring one", async () => {
        const b = await load()
        expect(b.areas.map((a) => a.area).sort()).toEqual([...AREA_IDS].sort())
        for (const a of b.areas) {
            expect(a.alignment, a.area).toBe("unknown")
            expect(a.activated, a.area).toBe(false)
            expect(a.requiresValidation, a.area).toBe(true)
            expect(a.protection).toEqual({ lines: [], gaps: [], hasAnalysed: false })
        }
        expect(b.summary).toEqual({ areaCount: 10, activatedCount: 0, unknownCount: 10, coveredCount: 0, gapCount: 0 })
        expect(b.policyCount).toBe(0)
        expect(b.analysedCount).toBe(0)
        expect(b.activatedAreas).toEqual([])
        expect(b.provenance).toEqual({})
        expect(b.needs).toEqual({
            riskConcerns: [],
            uncertaintyReasons: [],
            guidancePreference: null,
            recentChangeAreas: [],
            intent: null,
            confidenceLevel: null,
            completedAt: null,
            skippedAt: null,
        })
        expect(Object.values(b.ctx.known).every((known) => known === false)).toBe(true)
        expect(b.factorsToResolve.length).toBeGreaterThan(0)
    })

    it("reads the three rows once each, with the minimised selects, keyed by the caller's user", async () => {
        await load()
        expect(state.calls["policyholderProfile.findUnique"]).toEqual([[{ where: { userId: "u1" }, select: PROFILE_CONTEXT_SELECT }]])
        expect(state.calls["protectionProfile.findUnique"]).toHaveLength(1)
        expect(state.calls["protectionProfile.findUnique"][0][0].where).toEqual({ userId: "u1" })
        expect(state.calls["policy.findMany"]).toHaveLength(1)
        const policyQuery = state.calls["policy.findMany"][0][0]
        expect(policyQuery.where).toEqual({ ownerUserId: "u1" })
        // Rule findings only — no AI prose can reach a heading through this seam.
        expect(JSON.stringify(policyQuery.select)).not.toMatch(/aiExplanation|aiSuggestion/)
        expect(policyQuery.select.gapInstances.where.status.in).toEqual(["open", "detected", "acknowledged"])
    })
})

// ── Dependants declared ─────────────────────────────────────────────────

describe("dependants declared, nothing uploaded", () => {
    it("household is high (a child last year) and not_yet_checked — «δεν έχουμε δει», never «δεν έχετε»", async () => {
        const b = await load({ profile: FAMILY_PROFILE, statements: STATEMENTS })
        const h = area(b, "household")
        expect(h.importance).toBe("high")
        expect(h.activated).toBe(true)
        expect(h.alignment).toBe("not_yet_checked")
        expect(h.confidence).toBe("user_reported")
        expect(h.protection.lines).toEqual([])
        expect(b.activatedAreas).toContain("household")
        expect(b.summary.coveredCount).toBe(0)
        expect(b.summary.gapCount).toBe(0)
        expect(b.policyCount).toBe(0)
    })

    it("a stated concern with nothing held is review — attention raised, never a gap", async () => {
        const b = await load({ profile: FAMILY_PROFILE, statements: { ...STATEMENTS, riskConcerns: ["family"], recentChanges: [] } })
        const h = area(b, "household")
        expect(h.importance).toBe("high")
        expect(h.alignment).toBe("review")
        expect(b.summary.gapCount).toBe(0)
        expect(b.activatedAreas[0]).toBe("household")
    })

    it("carries the statements and the parsed provenance, and resolves recent changes to areas", async () => {
        const b = await load({ profile: FAMILY_PROFILE, statements: STATEMENTS })
        expect(b.needs.riskConcerns).toEqual(["health"])
        expect(b.needs.uncertaintyReasons).toEqual(["dont_know_coverage"])
        expect(b.needs.guidancePreference).toBe("explain_everything")
        expect(b.needs.intent).toBe("understand")
        expect(b.needs.confidenceLevel).toBe("unsure")
        expect(b.needs.completedAt).toBe(NOW)
        expect(b.needs.skippedAt).toBeNull()
        // new_child → household, health_changed → health, an unknown chip → nothing.
        expect(b.needs.recentChangeAreas).toEqual(["household", "health"])
        expect(b.provenance.dependentsCount).toEqual(exact())
        expect(b.provenance.annualIncome).toEqual(exact("assessment"))
        expect(b.provenance).not.toHaveProperty("vehiclesCount")
        expect(area(b, "health").activated).toBe(true)
    })
})

// ── A summary-only policy ───────────────────────────────────────────────

describe("a summary-only life policy", () => {
    it("household appears_covered; the line is held, policy_verified, and its limits unread", async () => {
        const b = await load({ profile: FAMILY_PROFILE, statements: STATEMENTS, policies: [lifePolicy()] })
        const h = area(b, "household")
        expect(h.alignment).toBe("appears_covered")
        expect(h.requiresValidation).toBe(false)
        expect(h.protection.lines).toEqual([
            { lob: "life", policyId: "life-1", lifecycle: "active", detail: "summary_only", evidence: "policy_verified", held: true, coverages: [] },
        ])
        expect(h.protection.hasAnalysed).toBe(false)
        expect(b.policyCount).toBe(1)
        expect(b.analysedCount).toBe(0)
        expect(b.summary.coveredCount).toBe(1)
    })
})

// ── A finding on an analysed policy ─────────────────────────────────────

describe("a rule finding on an analysed policy", () => {
    it("household is gap; the finding is titled by the content resolver and graded by describeSeverity", async () => {
        const b = await load({
            profile: FAMILY_PROFILE,
            statements: STATEMENTS,
            policies: [lifePolicy({ acordData: ANALYSED, gapInstances: [finding()] })],
        })
        const h = area(b, "household")
        expect(h.alignment).toBe("gap")
        expect(h.protection.gaps).toEqual([
            {
                id: "g1",
                ruleId: RULE,
                slug: SLUG,
                severity: "high",
                title: { el: GAP_CONTENT_MAP[SLUG].titleEl, en: GAP_CONTENT_MAP[SLUG].titleEn },
                policyId: "life-1",
                onHeldPolicy: true,
            },
        ])
        expect(h.protection.lines[0].detail).toBe("analysed")
        expect(h.protection.lines[0].coverages).toEqual([{ name: "Death benefit", limit: 100000, status: "included" }])
        expect(h.protection.hasAnalysed).toBe(true)
        expect(b.analysedCount).toBe(1)
        expect(b.summary.gapCount).toBe(1)
    })

    it("an instance without provenance takes the definition's rule id; a run without coverages is still summary_only", async () => {
        const b = await load({
            profile: FAMILY_PROFILE,
            policies: [lifePolicy({ acordData: { coverages: [] }, gapInstances: [finding({ ruleId: null })] })],
        })
        const h = area(b, "household")
        expect(h.protection.gaps[0].ruleId).toBe(RULE)
        expect(h.protection.lines[0].detail).toBe("summary_only")
        expect(b.analysedCount).toBe(0)
    })
})

// ── Liveness ────────────────────────────────────────────────────────────

describe("liveness comes from the lifecycle, never from the stored column", () => {
    it("a policy stored `active` whose cover ended last winter is expired: kept, not held, its finding history", async () => {
        const b = await load({
            profile: FAMILY_PROFILE,
            policies: [lifePolicy({ status: "active", endDate: LAST_WINTER, acordData: ANALYSED, gapInstances: [finding()] })],
        })
        const h = area(b, "household")
        expect(h.protection.lines[0]).toMatchObject({ lifecycle: "expired", held: false })
        expect(h.protection.gaps[0].onHeldPolicy).toBe(false)
        expect(h.alignment).toBe("not_yet_checked")
        expect(b.policyCount).toBe(1)
    })

    it("expiring within the month is still in force", async () => {
        const b = await load({ profile: FAMILY_PROFILE, policies: [lifePolicy({ endDate: IN_TEN_DAYS })] })
        expect(area(b, "household").protection.lines[0]).toMatchObject({ lifecycle: "expiring_soon", held: true })
        expect(area(b, "household").alignment).toBe("appears_covered")
    })

    it("analysing, cancelled and unknown duration are not placeable", async () => {
        const b = await load({
            profile: FAMILY_PROFILE,
            policies: [
                lifePolicy({ id: "reading", status: "analyzing" }),
                lifePolicy({ id: "cancelled", status: "cancelled" }),
                lifePolicy({ id: "undated", acordData: { policy: { expirationDate: "??" } } }),
            ],
        })
        const byId = Object.fromEntries(area(b, "household").protection.lines.map((l) => [l.policyId, l]))
        expect(byId.reading).toMatchObject({ lifecycle: "other", held: false })
        expect(byId.cancelled).toMatchObject({ lifecycle: "other", held: false })
        expect(byId.undated).toMatchObject({ lifecycle: "other", held: false })
        expect(b.policyCount).toBe(3)
    })
})

// ── Unread rows ─────────────────────────────────────────────────────────

describe("an unread row is the presence of a document, never of cover", () => {
    // The Sept-2026 defect row: a one-line PDF, `active`, a future end date,
    // a placeholder identity — and the map credited the family with cover.
    it("a placeholder identity with a future end date is NOT held, whatever the stored status says", async () => {
        const b = await load({
            profile: FAMILY_PROFILE,
            statements: STATEMENTS,
            policies: [lifePolicy({ id: "placeholder", policyNumber: "", insurerName: "", status: "active" })],
        })
        const h = area(b, "household")
        expect(h.protection.lines[0]).toMatchObject({ policyId: "placeholder", lifecycle: "other", held: false })
        expect(h.alignment).toBe("not_yet_checked")
        expect(b.summary.coveredCount).toBe(0)
        expect(b.policyCount).toBe(1)
    })

    it("a document read and found to carry no policy (EXTRACTION_EMPTY) is NOT held", async () => {
        const b = await load({
            profile: FAMILY_PROFILE,
            statements: STATEMENTS,
            policies: [
                lifePolicy({
                    id: "empty",
                    policyNumber: "",
                    insurerName: "",
                    status: "action_needed",
                    acordData: { processingError: { code: "EXTRACTION_EMPTY", retryable: true, occurredAt: AT } },
                }),
            ],
        })
        expect(area(b, "household").protection.lines[0]).toMatchObject({ lifecycle: "other", held: false })
        expect(area(b, "household").alignment).toBe("not_yet_checked")
        expect(b.summary.coveredCount).toBe(0)
    })

    it("an IDENTIFIED policy whose later deep run was blocked is still in force — a blocked re-read does not unmake it", async () => {
        const b = await load({
            profile: FAMILY_PROFILE,
            policies: [lifePolicy({ id: "blocked", status: "action_needed", acordData: { processingError: { code: "TOKEN_LIMIT_BLOCKED", retryable: true } } })],
        })
        expect(area(b, "household").protection.lines[0]).toMatchObject({ lifecycle: "active", held: true })
    })
})

// ── By construction ─────────────────────────────────────────────────────

const LOADER = "lib/protection/load-attention-areas.ts"
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "")

describe("by construction", () => {
    it("names no score or percentage, and the bundle carries no such field at any depth", async () => {
        expect(stripComments(readFileSync(LOADER, "utf-8"))).not.toMatch(/\b(score|scores|percent|percentage|pct)\b/i)
        const seen: string[] = []
        const visit = (node: unknown): void => {
            if (!node || typeof node !== "object" || node instanceof Date) return
            for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
                if (/score|percent|pct/i.test(k)) seen.push(k)
                visit(v)
            }
        }
        visit(await load({ profile: FAMILY_PROFILE, statements: STATEMENTS, policies: [lifePolicy({ acordData: ANALYSED, gapInstances: [finding()] })] }))
        expect(seen).toEqual([])
    })

    it("the profile select is exactly what toLifeContext reads, plus provenance — enumerated from the engine, not assumed", () => {
        const engine = stripComments(readFileSync("lib/services/gap-engine/life-context.ts", "utf-8"))
        const reads = new Set<string>([...engine.matchAll(/\bp[?!]?\.(\w+)/g)].map((m) => m[1]))
        for (const columns of Object.values(FACTOR_COLUMNS)) for (const c of columns) reads.add(c)
        expect(reads.size, "the read scan found nothing — did life-context.ts change shape?").toBeGreaterThan(20)
        const selected = new Set(Object.keys(PROFILE_CONTEXT_SELECT))
        expect([...reads].filter((c) => !selected.has(c)), "columns the context reads but the loader does not select").toEqual([])
        expect([...selected].filter((c) => c !== "factProvenance" && !reads.has(c)), "columns selected that the context never reads").toEqual([])
    })

    it("Art. 9 values travel on ctx only, and the columns the context never reads are never selected", async () => {
        const b = await load({ profile: { ...FAMILY_PROFILE, chronicConditions: ["diabetes"], familyMedicalHistory: ["cancer"] } })
        const paths: string[] = []
        const visit = (node: unknown, path: string): void => {
            if (!node || typeof node !== "object" || node instanceof Date) return
            for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
                if (k === "chronicConditions" || k === "familyMedicalHistory") paths.push(`${path}.${k}`)
                visit(v, `${path}.${k}`)
            }
        }
        visit(b, "bundle")
        expect(paths.sort()).toEqual(["bundle.ctx.chronicConditions", "bundle.ctx.familyMedicalHistory"])
        for (const never of ["gender", "heightCm", "weightKg", "activityLevel", "riskTolerance", "lifeEvents", "preferences"]) {
            expect(PROFILE_CONTEXT_SELECT).not.toHaveProperty(never)
        }
    })

    it("derives liveness through the one clock and the engine's own mapper — never a date, never the stored status", () => {
        const src = stripComments(readFileSync(LOADER, "utf-8"))
        expect(src).toMatch(/\bresolvePolicyLifecycle\(/)
        expect(src).toMatch(/\btoPolicyFields\(/)
        // Unread-ness is asked through the one predicate, never re-derived here.
        expect(src).toMatch(/\bisUnreadPolicy\(/)
        expect(src).not.toMatch(/PENDING-|__PENDING_EXTRACTION__|EXTRACTION_EMPTY/)
        expect(src).not.toMatch(/\bcoverageEngineStatus\(|\bisPolicyCoverageActive\(|Date\.now\(\)|\.getTime\(\)|86[_]?400[_]?000/)
        // Server-only by construction: the db import is what the client-bundle guard walks.
        expect(src).toMatch(/^import \{ db \} from "@\/lib\/db"$/m)
    })

    it("the engine's three entry points map policies through the same function the loader uses", () => {
        const engine = stripComments(readFileSync("lib/services/gap-engine/index.ts", "utf-8"))
        expect(engine.match(/\btoPolicyFields\(policies\)/g)?.length).toBe(3)
        expect(engine).not.toMatch(/status:\s*coverageEngineStatus\(p as any\)/)
    })
})
