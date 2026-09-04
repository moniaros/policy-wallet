import { describe, expect, it } from "vitest"
import {
    applyFactWrites,
    existingFacts,
    factWritesFrom,
    profileFactData,
    type FactWrite,
} from "@/lib/services/protection-profile/fact-writes"
import { parseFactProvenance } from "@/lib/protection/evidence"

/**
 * The precedence rule for profile facts, in full
 * (docs/planning/PERSONAL_RISK_PROFILE.md §C Layer 1).
 *
 * Five writers used to carry five overwrite rules; this is the one that
 * replaces them, so every cell of the matrix is pinned here rather than
 * re-derived at a call site.
 */

const NOW = new Date("2026-09-04T10:00:00.000Z")
const EARLIER = "2026-08-01T00:00:00.000Z"

const write = (column: string, value: unknown, over: Partial<FactWrite> = {}): FactWrite => ({
    column,
    value,
    source: "assessment",
    precision: "exact",
    ...over,
})

function stored(columns: Record<string, unknown>, provenance: Record<string, unknown> = {}, answered?: string[]) {
    return existingFacts({
        ...columns,
        answeredFields: answered ?? Object.keys(columns),
        factProvenance: provenance,
    })
}

const prov = (source: string, precision: "coarse" | "exact", at = EARLIER) => ({ source, precision, at })

describe("the precedence matrix", () => {
    it.each([
        // [existing precision, incoming precision, incoming source, applies?]
        ["coarse", "exact", "assessment", true],
        ["coarse", "coarse", "onboarding", true],
        ["exact", "exact", "life_event", true],
        ["exact", "coarse", "quick_start", false],
    ] as const)(
        "stored %s ← incoming %s from %s → applies: %s",
        (existingPrecision, incomingPrecision, source, applies) => {
            const existing = stored(
                { dependentsCount: 4 },
                { dependentsCount: prov("assessment", existingPrecision) }
            )
            const out = applyFactWrites({
                existing,
                writes: [write("dependentsCount", 1, { precision: incomingPrecision, source })],
                now: NOW,
            })
            if (applies) {
                expect(out.data).toEqual({ dependentsCount: 1 })
                expect(out.factProvenance.dependentsCount).toEqual({
                    source,
                    precision: incomingPrecision,
                    at: NOW.toISOString(),
                })
                expect(out.skipped).toEqual([])
            } else {
                expect(out.data).toEqual({})
                expect(out.factProvenance.dependentsCount).toEqual(prov("assessment", "exact"))
                expect(out.skipped).toEqual([{ column: "dependentsCount", reason: "coarse_over_exact" }])
            }
        }
    )

    it("equal precision → the newer write wins, whatever the stored timestamp says", () => {
        const existing = stored(
            { childrenCount: 2 },
            { childrenCount: prov("questionnaire", "exact", "2099-01-01T00:00:00.000Z") }
        )
        const out = applyFactWrites({ existing, writes: [write("childrenCount", 3)], now: NOW })
        expect(out.data).toEqual({ childrenCount: 3 })
        expect(out.factProvenance.childrenCount.source).toBe("assessment")
    })

    it("`policy` never replaces a declared value — coarse or exact", () => {
        for (const precision of ["coarse", "exact"] as const) {
            const existing = stored({ vehiclesCount: 2 }, { vehiclesCount: prov("onboarding", precision) })
            const out = applyFactWrites({
                existing,
                writes: [write("vehiclesCount", 3, { source: "policy", precision: "exact" })],
                now: NOW,
            })
            expect(out.data, precision).toEqual({})
            expect(out.skipped).toEqual([{ column: "vehiclesCount", reason: "policy_over_declared" }])
        }
    })

    it("`policy` may replace an earlier `policy` value, and may fill an unknown column", () => {
        const fromPolicy = stored({ vehiclesCount: 1 }, { vehiclesCount: prov("policy", "exact") })
        expect(
            applyFactWrites({ existing: fromPolicy, writes: [write("vehiclesCount", 2, { source: "policy" })], now: NOW }).data
        ).toEqual({ vehiclesCount: 2 })
        const unknown = existingFacts({ vehiclesCount: 0, answeredFields: [], factProvenance: null })
        expect(
            applyFactWrites({ existing: unknown, writes: [write("vehiclesCount", 2, { source: "policy" })], now: NOW }).data
        ).toEqual({ vehiclesCount: 2 })
    })
})

describe("absence and blanks", () => {
    it("a column absent from `writes` is untouched — data names only what was written", () => {
        const existing = stored(
            { chronicConditions: ["diabetes"], childrenCount: 2 },
            { chronicConditions: prov("assessment", "exact"), childrenCount: prov("onboarding", "exact") }
        )
        const out = applyFactWrites({ existing, writes: [write("childrenCount", 3)], now: NOW })
        expect(out.data).toEqual({ childrenCount: 3 })
        expect(out.data).not.toHaveProperty("chronicConditions")
        expect(out.factProvenance.chronicConditions).toEqual(prov("assessment", "exact"))
        expect(out.answeredFields.sort()).toEqual(["childrenCount", "chronicConditions"])
    })

    it("null / undefined is ignored — never an erasure — unless `clear` is explicit", () => {
        const existing = stored({ mortgageAmount: 120_000 }, { mortgageAmount: prov("assessment", "exact") })
        const ignored = applyFactWrites({
            existing,
            writes: [write("mortgageAmount", null), write("mortgageAmount", undefined)],
            now: NOW,
        })
        expect(ignored.data).toEqual({})
        expect(ignored.skipped).toEqual([
            { column: "mortgageAmount", reason: "no_value" },
            { column: "mortgageAmount", reason: "no_value" },
        ])
        expect(ignored.factProvenance.mortgageAmount).toEqual(prov("assessment", "exact"))

        const cleared = applyFactWrites({
            existing,
            writes: [write("mortgageAmount", null, { source: "life_event", clear: true })],
            now: NOW,
        })
        expect(cleared.data).toEqual({ mortgageAmount: null })
        expect(cleared.factProvenance.mortgageAmount.source).toBe("life_event")
    })

    it("an explicit clear still obeys precedence: a coarse clear cannot erase an exact figure", () => {
        const existing = stored({ loanAmount: 5000 }, { loanAmount: prov("assessment", "exact") })
        const out = applyFactWrites({
            existing,
            writes: [write("loanAmount", null, { precision: "coarse", clear: true, source: "onboarding" })],
            now: NOW,
        })
        expect(out.data).toEqual({})
        expect(out.skipped).toEqual([{ column: "loanAmount", reason: "coarse_over_exact" }])
    })

    it("a winning write with the SAME value changes no data but upgrades the provenance", () => {
        const existing = stored({ propertiesOwned: 1 }, { propertiesOwned: prov("quick_start", "coarse") })
        const out = applyFactWrites({ existing, writes: [write("propertiesOwned", 1)], now: NOW })
        expect(out.data).toEqual({})
        expect(out.factProvenance.propertiesOwned).toEqual(prov("assessment", "exact", NOW.toISOString()))
    })

    it("compares a Decimal column with an incoming number, and arrays by content", () => {
        const decimal = { toNumber: () => 1500, toString: () => "1500" }
        const existing = stored(
            { annualIncome: decimal, activities: ["skiing", "diving"] },
            { annualIncome: prov("assessment", "exact"), activities: prov("assessment", "exact") }
        )
        const out = applyFactWrites({
            existing,
            writes: [write("annualIncome", 1500), write("activities", ["skiing", "diving"])],
            now: NOW,
        })
        expect(out.data).toEqual({})
        const changed = applyFactWrites({ existing, writes: [write("activities", ["skiing"])], now: NOW })
        expect(changed.data).toEqual({ activities: ["skiing"] })
    })
})

describe("answeredFields — the derived union the engine reads", () => {
    it("unions existing, every settled column and `alsoAnswered`; a skipped write settles nothing new", () => {
        const existing = stored({ hasPets: true }, { hasPets: prov("assessment", "exact") }, ["hasPets", "ownsBoat"])
        const out = applyFactWrites({
            existing,
            writes: [
                write("vehiclesCount", 1, { precision: "coarse", source: "quick_start" }),
                write("hasPets", false, { precision: "coarse", source: "quick_start" }),
                write("cyberExposure", null),
            ],
            alsoAnswered: ["travelsFrequently"],
            now: NOW,
        })
        expect(out.answeredFields.sort()).toEqual(["hasPets", "ownsBoat", "travelsFrequently", "vehiclesCount"])
        expect(out.data).toEqual({ vehiclesCount: 1 })
    })

    it("within one batch, a later exact write beats an earlier coarse one on the same column", () => {
        const existing = existingFacts(null)
        const out = applyFactWrites({
            existing,
            writes: [
                write("dependentsCount", 1, { precision: "coarse", source: "onboarding" }),
                write("dependentsCount", 3, { precision: "exact", source: "assessment" }),
            ],
            now: NOW,
        })
        expect(out.data).toEqual({ dependentsCount: 3 })
        expect(out.factProvenance.dependentsCount.precision).toBe("exact")
        const reversed = applyFactWrites({
            existing,
            writes: [
                write("dependentsCount", 3, { precision: "exact", source: "assessment" }),
                write("dependentsCount", 1, { precision: "coarse", source: "onboarding" }),
            ],
            now: NOW,
        })
        expect(reversed.data).toEqual({ dependentsCount: 3 })
    })
})

describe("rows written before provenance existed", () => {
    it("an answered column with no provenance is a declared exact value: coarse loses, exact wins", () => {
        // What the wizard wrote for a year: values and answeredFields, nothing
        // about who or how precisely.
        const legacy = existingFacts({
            childrenCount: 3,
            dependentsCount: 4,
            answeredFields: ["childrenCount", "dependentsCount"],
            factProvenance: null,
        })
        const floor = applyFactWrites({
            existing: legacy,
            writes: [write("dependentsCount", 1, { precision: "coarse", source: "onboarding" })],
            now: NOW,
        })
        expect(floor.data).toEqual({})
        expect(floor.skipped).toEqual([{ column: "dependentsCount", reason: "coarse_over_exact" }])

        const figure = applyFactWrites({ existing: legacy, writes: [write("childrenCount", 2)], now: NOW })
        expect(figure.data).toEqual({ childrenCount: 2 })
    })

    it("a non-default value with no answeredFields entry counts as declared too (the pre-ledger rule)", () => {
        const legacy = existingFacts({ ownsBoat: true, answeredFields: null, factProvenance: null })
        const out = applyFactWrites({
            existing: legacy,
            writes: [write("ownsBoat", false, { precision: "coarse", source: "quick_start" })],
            now: NOW,
        })
        expect(out.data).toEqual({})
    })

    it("a defaulted column nobody answered is open to any write", () => {
        const legacy = existingFacts({ ownsBoat: false, answeredFields: [], factProvenance: null })
        const out = applyFactWrites({
            existing: legacy,
            writes: [write("ownsBoat", true, { precision: "coarse", source: "quick_start" })],
            now: NOW,
        })
        expect(out.data).toEqual({ ownsBoat: true })
    })

    it("PROBE: an old-shape factProvenance JSON is tolerated, entry by entry", () => {
        // A string, an array, a bogus source, a missing timestamp, and one
        // good entry. Only the good one survives; nothing throws.
        for (const bad of ["garbage", 42, ["childrenCount"], null]) {
            expect(parseFactProvenance(bad)).toEqual({})
            const out = applyFactWrites({
                existing: existingFacts({ childrenCount: 1, answeredFields: ["childrenCount"], factProvenance: bad }),
                writes: [write("childrenCount", 2)],
                now: NOW,
            })
            expect(out.data).toEqual({ childrenCount: 2 })
        }
        const mixed = {
            childrenCount: { source: "wizard_v1", precision: "exact", at: EARLIER },
            vehiclesCount: { source: "assessment", precision: "exact" },
            ownsHome: { source: "onboarding", precision: "coarse", at: EARLIER },
            dependentsCount: "exact",
        }
        const out = applyFactWrites({
            existing: existingFacts({ ownsHome: true, answeredFields: ["ownsHome"], factProvenance: mixed }),
            writes: [],
            now: NOW,
        })
        expect(out.factProvenance).toEqual({ ownsHome: prov("onboarding", "coarse") })
    })
})

describe("helpers", () => {
    it("factWritesFrom maps a patch with one precision or a per-column table, and clears nulls only on request", () => {
        const flat = factWritesFrom({ a: 1, b: null }, { source: "life_event", precision: "exact" })
        expect(flat).toEqual([
            { column: "a", value: 1, source: "life_event", precision: "exact" },
            { column: "b", value: null, source: "life_event", precision: "exact" },
        ])
        const cleared = factWritesFrom({ b: null }, { source: "life_event", precision: "exact", clearNulls: true })
        expect(cleared[0]).toMatchObject({ clear: true })
        const table = factWritesFrom({ a: 1, b: 2 }, { source: "onboarding", precision: { a: "coarse" } })
        expect(table.map((w) => w.precision)).toEqual(["coarse", "exact"])
    })

    it("profileFactData is the upsert shape: data plus the two ledgers", () => {
        const out = applyFactWrites({ existing: existingFacts(null), writes: [write("hasPets", true)], now: NOW })
        expect(profileFactData(out)).toEqual({
            hasPets: true,
            answeredFields: ["hasPets"],
            factProvenance: { hasPets: prov("assessment", "exact", NOW.toISOString()) },
        })
    })
})
