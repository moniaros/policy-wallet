import { describe, it, expect } from "vitest"
import { AcordDataSchema } from "@/lib/schemas/acord-data"
import {
    COVERAGE_FACT_SOURCES,
    readCoverageFacts,
    type CoverageFactSources,
} from "@/lib/services/risk-graph/service"

/**
 * The coverage facts the risk graph reads are checked AGAINST THE SCHEMA.
 *
 * V2-P1-07: `readCoverageFacts` resolved the sum insured from two property
 * spellings and a spelling the schema never defined (`coverage.sumInsured`),
 * and never read `vehicle.insuredValue` — the schema's own motor field. Every
 * insured motorist therefore rolled up as «Άγνωστο» while the figure sat
 * unread in the column. The list was hand-kept and had never been compared to
 * `AcordDataSchema`, so nothing could notice.
 *
 * This guard makes that comparison permanent, in the repo's enumerate-not-assume
 * shape (see CLAUDE.md "Guards must enumerate, not assume"):
 *
 *   UNIVERSE (D-005): every leaf path of `AcordDataSchema`, enumerated
 *   mechanically by walking the Zod definitions — no hand-kept path list can
 *   drift from the schema, because the schema itself is the input.
 *
 *   For each fact (`perils`, `territories`, `sumInsured`) a SIGNATURE picks the
 *   universe's fact-bearing paths, and each match must be either read by
 *   `COVERAGE_FACT_SOURCES` or exempted below with a written reason. A new
 *   schema field that carries a fact now forces a decision — read it, or say
 *   why not — instead of silently never rendering.
 *
 *   Every declared `schemaPaths` entry must exist in the schema with the right
 *   type, and every `legacyPaths` entry must NOT exist there (that is what
 *   makes it legacy). `coverage.sumInsured` passing as a schema read is the
 *   exact confusion that produced the defect.
 *
 *   PROBES: the table is injectable into the real `readCoverageFacts`, so the
 *   red-proof is behavioural, not cosmetic — removing a path both turns this
 *   guard red naming the field AND makes the real reader drop a payload it
 *   reads today.
 */

// ── Universe: every leaf path of AcordDataSchema ─────────────────────

interface SchemaLeaf {
    /** Dot path; array hops render as `[]` (e.g. `coverages[].limits[].amount`). */
    path: string
    /** The unwrapped Zod kind at the leaf: number, string, boolean, enum, … */
    kind: string
}

/** Unwrap optional/nullable/default wrappers to the underlying type. */
function unwrap(schema: any): any {
    let current = schema
    while (current?._def?.innerType) current = current._def.innerType
    return current
}

function collectLeaves(schema: any, prefix: string, out: SchemaLeaf[]): void {
    const t = unwrap(schema)
    const kind = t?._def?.type
    if (kind === "object") {
        for (const [key, child] of Object.entries(t.shape)) {
            collectLeaves(child, prefix ? `${prefix}.${key}` : key, out)
        }
        return
    }
    if (kind === "array") {
        collectLeaves(t.element, `${prefix}[]`, out)
        return
    }
    out.push({ path: prefix, kind: kind ?? "unknown" })
}

function schemaLeaves(): SchemaLeaf[] {
    const out: SchemaLeaf[] = []
    collectLeaves(AcordDataSchema, "", out)
    return out
}

const LEAVES = schemaLeaves()
const LEAF_BY_PATH = new Map(LEAVES.map((l) => [l.path, l]))
const lastSegment = (path: string) => path.split(".").pop() ?? path

// ── Signatures: which schema paths carry each fact ───────────────────

/**
 * A field whose NAME is the sum-insured fact. Exact last-segment match — a
 * containment match would drag in valuation references (`estimatedMarketValue`,
 * `estimatedRebuildCost`) that the schema itself treats as a different fact:
 * the `value_drift` gap rule detects when insuredValue and estimatedMarketValue
 * DIVERGE, which only makes sense if they are not the same thing.
 */
const SUM_INSURED_FIELD_NAMES = new Set([
    "insuredValue",
    "sumInsured",
    "replacementValue",
    "hullValue",
    "deathBenefit",
    "annualLimit",
    "annualLimitTotal",
    "medicalExpensesLimit",
])

const SUM_INSURED_EXEMPT: Record<string, string> = {
    "travel.medicalExpensesLimit":
        "one benefit's cap, not the policy's sum insured — deriveSumInsured (lib/wallet/policy-review.ts) " +
        "deliberately resolves travel to policy.sumInsured; the graph must not read a figure the wallet refuses to display as the sum insured",
    "marineVessel.hullValue":
        "the hull's agreed valuation; deriveSumInsured does not treat it as the policy's sum insured either — " +
        "wire both surfaces together or neither, so the wallet and the graph never quote different figures",
}

function isSumInsuredCarrier(leaf: SchemaLeaf): boolean {
    // A per-item or per-person amount is never the POLICY's sum insured.
    if (leaf.path.includes("[]")) return false
    return leaf.kind === "number" && SUM_INSURED_FIELD_NAMES.has(lastSegment(leaf.path))
}

/**
 * A field that records whether a specific PERIL is covered. The schema holds
 * no peril list anywhere — peril facts live in per-line flags — so today every
 * carrier is exempted: mapping flags onto the tokens `assessPeril` compares
 * (`fire`, `earthquake`, `flood`, `theft`, `liability`) is a semantic decision
 * this table has not made, and half-mapping would turn "we did not read this
 * flag" into "not named on the policy" — the unknown-becomes-absence error.
 * The signature still runs so a NEW peril flag forces this decision afresh.
 */
const PERIL_FLAG_REASON =
    "boolean peril flag, not a peril list — feeding assessPeril needs the flags→tokens mapping decided first " +
    "(see COVERAGE_FACT_SOURCES.perils in lib/services/risk-graph/service.ts)"

const PERIL_EXEMPT: Record<string, string> = {
    "property.fireCoverageIncluded": PERIL_FLAG_REASON,
    "property.earthquakeCoverageIncluded": PERIL_FLAG_REASON,
    "property.floodCoverageIncluded": PERIL_FLAG_REASON,
    "property.theftCoverageLimit": "a theft SUB-LIMIT implies the theft peril, but reading a number as a peril is the mapping decision above",
    "home.catastropheCoverage.fire": PERIL_FLAG_REASON,
    "home.catastropheCoverage.earthquake": PERIL_FLAG_REASON,
    "home.catastropheCoverage.flood": PERIL_FLAG_REASON,
    "home.theftCoverageLimit": "legacy alias of property.theftCoverageLimit — same reason",
    "vehicle.ownVehicleDamage": PERIL_FLAG_REASON,
    "vehicle.glassBreakage": PERIL_FLAG_REASON,
    "vehicle.coverageTier":
        "every Greek motor tier implies the compulsory liability peril, but inferring perils from a free-string tier " +
        "is a taxonomy, not a spelling — decide it with the flags→tokens mapping",
    "motor.ownVehicleDamage": "legacy alias of vehicle.ownVehicleDamage — same reason",
    "motor.glassBreakage": "legacy alias of vehicle.glassBreakage — same reason",
    "motor.coverageTier": "legacy alias of vehicle.coverageTier — same reason",
    "travel.repatriationCovered": PERIL_FLAG_REASON,
    "travel.cancellationCovered": PERIL_FLAG_REASON,
    "travel.winterSportsCovered": PERIL_FLAG_REASON,
    "travel.preExistingConditionsCovered": PERIL_FLAG_REASON,
    "pet.leishmaniaCovered": PERIL_FLAG_REASON,
}

function isPerilCarrier(leaf: SchemaLeaf): boolean {
    if (leaf.path.includes("[]")) return false
    if (leaf.path.startsWith("home.catastropheCoverage.")) return true
    if (/(^|\.)(vehicle|motor)\.(ownVehicleDamage|glassBreakage|coverageTier)$/.test(leaf.path)) return true
    if (lastSegment(leaf.path) === "theftCoverageLimit") return true
    return leaf.kind === "boolean" && /(Covered|CoverageIncluded)$/.test(lastSegment(leaf.path))
}

/**
 * Territorial-scope fields. All exempted for one reason: they hold free text
 * in the document's own language, and `assessTerritory` compares lowercase
 * English tokens — wired raw, «Ελλάδα» would FAIL the "covers Greece" check
 * and downgrade every Greek motorist for being insured at home.
 */
const TERRITORY_REASON =
    "free text in the document's language; assessTerritory compares fixed English tokens, so this needs a name " +
    "normalizer (Ελλάδα/Greece/GR → greece, …) before it can be read without failing every Greek policy"

const TERRITORY_EXEMPT: Record<string, string> = {
    "territorialScope.description": TERRITORY_REASON,
    "territorialScope.includes[]": TERRITORY_REASON,
    "territorialScope.excludes[]": TERRITORY_REASON,
    "territorialScope.sanctionsClause": "a sanctions-clause flag, not a place — no territory token can represent it",
    "territorialScope.navigationLimits": TERRITORY_REASON,
}

const isTerritoryCarrier = (leaf: SchemaLeaf) => leaf.path.startsWith("territorialScope.")

// ── The audit itself, as a function of the table so probes can mutate it ──

function auditFactSources(sources: CoverageFactSources): string[] {
    const violations: string[] = []

    for (const [fact, { schemaPaths, legacyPaths }] of Object.entries(sources)) {
        // Fact type: sumInsured reads a number leaf; the other two read arrays
        // of strings, which the walker records as `path[]` string leaves.
        const expectsNumber = fact === "sumInsured"

        for (const path of schemaPaths) {
            const leaf = expectsNumber ? LEAF_BY_PATH.get(path) : LEAF_BY_PATH.get(`${path}[]`)
            if (!leaf) {
                violations.push(
                    `${fact}: "${path}" is declared a schema path but AcordDataSchema defines no such field — ` +
                        `a phantom spelling reads nothing (this is how coverage.sumInsured shadowed vehicle.insuredValue)`
                )
            } else if (expectsNumber && leaf.kind !== "number") {
                violations.push(`${fact}: "${path}" exists but is ${leaf.kind}, not number`)
            } else if (!expectsNumber && leaf.kind !== "string") {
                violations.push(`${fact}: "${path}" exists but is an array of ${leaf.kind}, not string`)
            }
        }

        for (const path of legacyPaths) {
            if (LEAF_BY_PATH.has(path) || LEAF_BY_PATH.has(`${path}[]`)) {
                violations.push(
                    `${fact}: "${path}" is marked legacy but exists in AcordDataSchema — move it to schemaPaths`
                )
            }
            if ((schemaPaths as readonly string[]).includes(path)) {
                violations.push(`${fact}: "${path}" is listed as both schema and legacy`)
            }
        }
    }

    // Coverage: every fact-bearing schema field is read or exempted, by name.
    const checks: Array<{
        fact: keyof CoverageFactSources
        carrier: (leaf: SchemaLeaf) => boolean
        exempt: Record<string, string>
    }> = [
        { fact: "sumInsured", carrier: isSumInsuredCarrier, exempt: SUM_INSURED_EXEMPT },
        { fact: "perils", carrier: isPerilCarrier, exempt: PERIL_EXEMPT },
        { fact: "territories", carrier: isTerritoryCarrier, exempt: TERRITORY_EXEMPT },
    ]
    for (const { fact, carrier, exempt } of checks) {
        const read = new Set(sources[fact].schemaPaths)
        for (const leaf of LEAVES.filter(carrier)) {
            const bare = leaf.path.replace(/\[\]$/, "")
            if (read.has(bare) || read.has(leaf.path)) continue
            if (exempt[leaf.path] || exempt[bare]) continue
            violations.push(
                `${fact}: schema field "${leaf.path}" carries this fact but readCoverageFacts never reads it — ` +
                    `add it to COVERAGE_FACT_SOURCES.${fact}.schemaPaths, or exempt it here with a reason`
            )
        }
        // An exemption for a field the schema no longer has is stale bookkeeping.
        for (const path of Object.keys(exempt)) {
            if (!LEAF_BY_PATH.has(path) && !LEAF_BY_PATH.has(`${path}[]`)) {
                violations.push(`${fact}: exemption for "${path}" names no field in AcordDataSchema — remove it`)
            }
        }
    }

    return violations
}

/** Build the smallest acordData that populates exactly one dot-path. */
function payloadAt(path: string, value: unknown): Record<string, unknown> {
    const root: Record<string, unknown> = {}
    const segments = path.split(".")
    let cursor: Record<string, unknown> = root
    for (const segment of segments.slice(0, -1)) {
        const next: Record<string, unknown> = {}
        cursor[segment] = next
        cursor = next
    }
    cursor[segments[segments.length - 1]] = value
    return root
}

/** The table, minus one sum-insured path — the shape of the original defect. */
function without(path: string): CoverageFactSources {
    return {
        ...COVERAGE_FACT_SOURCES,
        sumInsured: {
            schemaPaths: COVERAGE_FACT_SOURCES.sumInsured.schemaPaths.filter((p) => p !== path),
            legacyPaths: COVERAGE_FACT_SOURCES.sumInsured.legacyPaths,
        },
    }
}

// ── The guard ────────────────────────────────────────────────────────

describe("readCoverageFacts is checked against AcordDataSchema", () => {
    it("enumerates a real universe (the walker did not silently break)", () => {
        // A walker that returns nothing would pass every check below vacuously.
        expect(LEAVES.length).toBeGreaterThan(100)
        expect(LEAVES.filter(isSumInsuredCarrier).length).toBeGreaterThanOrEqual(10)
        expect(LEAVES.filter(isPerilCarrier).length).toBeGreaterThanOrEqual(10)
        expect(LEAVES.filter(isTerritoryCarrier).length).toBe(5)
        // And the walker sees the defect's field specifically.
        expect(LEAF_BY_PATH.get("vehicle.insuredValue")?.kind).toBe("number")
    })

    it("every fact-bearing schema field is read or exempted, and no spelling is phantom", () => {
        expect(auditFactSources(COVERAGE_FACT_SOURCES)).toEqual([])
    })
})

describe("probe: the guard goes red, and the behaviour actually changes", () => {
    // Not a formality. Removing vehicle.insuredValue reproduces the exact
    // shipped defect, so this probe is the committed proof the guard would
    // have caught it — and the proof must be behavioural: the same mutation
    // that turns the audit red must make the real reader drop the payload.
    it("removing vehicle.insuredValue turns the audit red, naming the field", () => {
        const violations = auditFactSources(without("vehicle.insuredValue"))
        expect(violations.length).toBeGreaterThan(0)
        expect(violations.join("\n")).toContain('"vehicle.insuredValue"')
    })

    it("the same mutation makes the real reader lose the motor sum insured", () => {
        const motor = { vehicle: { insuredValue: 12500 } }
        expect(readCoverageFacts(motor).sumInsured).toBe(12500)
        expect(readCoverageFacts(motor, without("vehicle.insuredValue")).sumInsured).toBeNull()
    })

    it("holds for every wired sum-insured path, not only the one that shipped broken", () => {
        for (const path of COVERAGE_FACT_SOURCES.sumInsured.schemaPaths) {
            const payload = payloadAt(path, 77000)

            // Flow-through: the path is live in the real reader…
            expect(readCoverageFacts(payload).sumInsured, `${path} is not actually read`).toBe(77000)
            // …its removal loses the read…
            expect(
                readCoverageFacts(payload, without(path)).sumInsured,
                `removing ${path} did not change behaviour — the probe proves nothing`
            ).toBeNull()
            // …and the audit names it.
            expect(auditFactSources(without(path)).join("\n"), `audit stays green without ${path}`).toContain(
                `"${path}"`
            )
        }
    })

    it("a phantom spelling — the defect's other half — is also red", () => {
        const phantom: CoverageFactSources = {
            ...COVERAGE_FACT_SOURCES,
            sumInsured: {
                schemaPaths: [...COVERAGE_FACT_SOURCES.sumInsured.schemaPaths, "coverage.sumInsured"],
                legacyPaths: [],
            },
        }
        const violations = auditFactSources(phantom).join("\n")
        expect(violations).toContain('"coverage.sumInsured"')
        expect(violations).toContain("phantom")
    })
})

describe("what the reader returns (unknown stays unknown)", () => {
    it("reads the motor sum insured from the schema's own field", () => {
        const facts = readCoverageFacts({ vehicle: { insuredValue: 18000, estimatedMarketValue: 19500 } })
        expect(facts.sumInsured).toBe(18000)
    })

    it("does not read a valuation reference as the sum insured", () => {
        // estimatedMarketValue is what the schedule says the car is WORTH —
        // the value_drift gap rule compares insuredValue against it, so the
        // graph reading it as the sum insured would erase the very drift that
        // rule exists to catch.
        const facts = readCoverageFacts({ vehicle: { estimatedMarketValue: 19500 } })
        expect(facts.sumInsured).toBeNull()
    })

    it("still returns null — never zero — when nothing readable exists", () => {
        // The fixture shape applyUnknownHouseholdFixture writes: an envelope
        // with dates and premium, no vehicle section. «Άγνωστο» is CORRECT
        // there, and the fix must not manufacture a figure for it.
        const facts = readCoverageFacts({
            _version: 3,
            policy: { insurerName: "Interamerican", lineOfBusiness: "motor", premium: { amount: 250 } },
        })
        expect(facts).toEqual({ perils: null, territories: null, sumInsured: null })
    })

    it("junk in an early spelling no longer hides a readable later one", () => {
        const facts = readCoverageFacts({
            coverage: { sumInsured: "not a number" },
            vehicle: { insuredValue: 9000 },
        })
        expect(facts.sumInsured).toBe(9000)
    })
})
