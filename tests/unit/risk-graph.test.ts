import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { assessRisks } from "@/lib/services/gap-engine/risk-assessment"
import { projectRiskGraph, graphSummary, getNode } from "@/lib/services/risk-graph/projection"
import {
    bindRisksToGraph,
    rollUpState,
    protectionSummary,
    type ProtectingPolicy,
} from "@/lib/services/risk-graph/protection"
import { presentRiskGraph } from "@/lib/services/risk-graph/present"
import { reconcileWithGraph } from "@/lib/services/risk-graph/reconcile"
import { assembleRiskGraph } from "@/lib/services/risk-graph/service"
import { RISK_CATALOG } from "@/lib/services/gap-engine/risk-catalog"
import { NODE_TYPES, RISK_STATES, type DimensionAssessment } from "@/lib/services/risk-graph/types"

/**
 * Guards for the Personal Risk Graph.
 *
 * The graph exists so the product understands the customer's LIFE rather than
 * their policies. These tests pin the three properties that claim is made of:
 * things become nodes (so a risk can name WHICH house is uninsured), protection
 * is judged on dimensions (so "insured" stops meaning "fine"), and every verdict
 * carries evidence (so no claim is unfalsifiable).
 *
 * They also pin what must NOT happen: the graph must stay derivable from
 * `LifeContext` alone, so every existing surface keeps working untouched.
 */

const ALL_ANSWERED = [
    "dateOfBirth", "maritalStatus", "childrenCount", "dependentsCount", "hasPets",
    "vehiclesCount", "residenceType", "propertiesOwned", "rentsOutProperty",
    "ownsBusiness", "employmentStatus", "businessEmployees", "annualIncome",
    "savingsAmount", "mortgageAmount", "hasLoans", "loanAmount", "travelsFrequently",
    "activities", "valuablesValue", "cyberExposure", "retirementPlanning",
]

function profile(overrides: Record<string, unknown> = {}) {
    return {
        answeredFields: ALL_ANSWERED,
        dateOfBirth: new Date("1985-01-01"),
        maritalStatus: "single",
        childrenCount: 0,
        dependentsCount: 0,
        hasPets: false,
        vehiclesCount: 0,
        residenceType: "rented",
        propertiesOwned: 0,
        rentsOutProperty: false,
        ownsBusiness: false,
        employmentStatus: "employed",
        businessEmployees: 0,
        annualIncome: 30000,
        savingsAmount: 5000,
        mortgageAmount: null,
        hasLoans: false,
        loanAmount: null,
        travelsFrequently: false,
        activities: [],
        valuablesValue: 0,
        cyberExposure: "low",
        retirementPlanning: true,
        ...overrides,
    } as any
}

const NOW = new Date("2026-08-04")
const ctxOf = (p: unknown) => toLifeContext(p as any, NOW)

function policy(over: Partial<ProtectingPolicy> = {}): ProtectingPolicy {
    return {
        id: "pol-1",
        lineOfBusiness: "home",
        status: "active",
        insurerName: "Test Insurer",
        perils: null,
        sumInsured: null,
        coverageEndDate: new Date("2027-01-01"),
        ...over,
    }
}

/** The whole pipeline, the way the service runs it. */
function bind(p: Record<string, unknown>, policies: ProtectingPolicy[] = []) {
    const ctx = ctxOf(profile(p))
    const graph = projectRiskGraph(ctx)
    const assessments = assessRisks(
        ctx,
        policies.map((x) => ({ lineOfBusiness: x.lineOfBusiness, status: x.status }))
    )
    return { ctx, graph, assessments, risks: bindRisksToGraph(assessments, graph, policies, ctx, NOW) }
}

describe("the graph models life, not products", () => {
    it("has no node type that is an insurance concept", () => {
        // The single structural guarantee that keeps this a life model. A
        // `policy` node would let risk derivation read what someone bought.
        for (const forbidden of ["policy", "cover", "claim", "quote", "premium", "gap"]) {
            expect(NODE_TYPES as readonly string[]).not.toContain(forbidden)
        }
    })

    it("projects without touching policies at all", () => {
        // Same context, wildly different wallets — identical graph.
        const ctx = ctxOf(profile({ propertiesOwned: 2, residenceType: "owned", vehiclesCount: 1 }))
        const a = projectRiskGraph(ctx)
        const b = projectRiskGraph(ctx)
        expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    })

    it("reads only LifeContext — no db, no clock, no Prisma", () => {
        const src = readFileSync("lib/services/risk-graph/projection.ts", "utf8")
        expect(src).not.toMatch(/from ["']@\/lib\/db["']/)
        expect(src).not.toMatch(/prisma/i)
        expect(src).not.toMatch(/new Date\(/)
    })

    it("says nothing about a factor nobody was asked", () => {
        // Silence is not denial. An unasked profile must produce no asset nodes
        // rather than nodes asserting the customer owns nothing.
        const silent = toLifeContext({ answeredFields: [] } as any, NOW)
        const graph = projectRiskGraph(silent)
        expect(graph.byType.property).toHaveLength(0)
        expect(graph.byType.vehicle).toHaveLength(0)
        expect(graph.byType.pet).toHaveLength(0)
    })
})

describe("identity: counts become things", () => {
    it("two owned properties become two independently-anchored nodes", () => {
        const { graph, risks } = bind({ propertiesOwned: 2, residenceType: "owned" })
        expect(graph.byType.property).toEqual(["property:1", "property:2"])

        const home = risks.find((r) => r.riskId === "home_building_damage")
        expect(home?.anchorNodeIds).toEqual(["property:1", "property:2"])
    })

    it("one policy over two properties is partial, not protected — and says so", () => {
        // The question `minPolicies` approximated by counting: a policy naming
        // one house says nothing about the other.
        const { risks } = bind(
            { propertiesOwned: 2, residenceType: "owned" },
            [policy({ perils: ["fire", "earthquake", "flood", "theft"], sumInsured: 200000 })]
        )
        const home = risks.find((r) => r.riskId === "home_building_damage")
        expect(home?.state).toBe("partially_protected")
        // Every dimension passes here, so the shortfall is the ONLY reason —
        // and it has to appear in the evidence or the badge is unexplained.
        expect(home?.dimensions.every((d) => d.verdict === "satisfied")).toBe(true)
        expect(home?.evidence.some((e) => e.statement.en.includes("does not cover the others"))).toBe(true)
    })

    it("a tenant's home is a node they do not own, and is not a building risk", () => {
        const { graph, risks } = bind({ residenceType: "rented", propertiesOwned: 0 })
        expect(getNode(graph, "property:rented")?.attributes.ownedBySubject).toBe(false)
        expect(risks.find((r) => r.riskId === "home_building_damage")).toBeUndefined()
    })

    it("caps synthetic nodes instead of modelling fifty cars", () => {
        const { graph } = bind({ vehiclesCount: 50 })
        expect(graph.byType.vehicle).toHaveLength(12)
    })

    it("marks every generated node synthetic so no surface claims it was described", () => {
        const { graph } = bind({ propertiesOwned: 2, residenceType: "owned", vehiclesCount: 1 })
        for (const id of [...graph.byType.property, ...graph.byType.vehicle]) {
            const node = getNode(graph, id)
            if (node?.id === "property:rented") continue
            expect(node?.attributes.synthetic).toBe(true)
            expect(node?.confidence).toBe("derived")
        }
    })
})

describe("protection has four states, and all four are reachable", () => {
    const dims = (...verdicts: DimensionAssessment["verdict"][]): DimensionAssessment[] =>
        verdicts.map((verdict, i) => ({
            dimension: (["peril", "limit", "territory", "period"] as const)[i],
            verdict,
            detail: { en: "", el: "" },
        }))

    it("rolls up as specified", () => {
        expect(rollUpState(dims("satisfied", "satisfied"), false)).toBe("unprotected")
        expect(rollUpState(dims("satisfied", "satisfied"), true)).toBe("protected")
        expect(rollUpState(dims("failed", "satisfied"), true)).toBe("partially_protected")
        expect(rollUpState(dims("unevaluable", "satisfied"), true)).toBe("partially_protected")
        expect(rollUpState(dims("unevaluable", "unevaluable"), true)).toBe("unknown")
    })

    it("treats liveness as existence, not adequacy", () => {
        // Cover that has expired is not partial protection — it is none.
        expect(rollUpState(dims("satisfied", "satisfied", "satisfied", "failed"), true)).toBe("unprotected")
        // And a policy we know nothing about except that it is in force is
        // `unknown`, not `partially_protected` — period must not dilute it.
        expect(rollUpState(dims("unevaluable", "unevaluable", "unevaluable", "satisfied"), true)).toBe("unknown")
    })

    it("reaches every state through the real pipeline", () => {
        // A state no customer can ever be in is a bug, not caution — this is
        // the check that caught territory being permanently unevaluable.
        const seen = new Set<string>()

        // unprotected: exposure, no cover.
        seen.add(bind({ vehiclesCount: 1 }).risks.find((r) => r.riskId === "motor_liability")!.state)

        // protected: cover, perils named, sum insured readable.
        seen.add(
            bind({ propertiesOwned: 1, residenceType: "owned" }, [
                policy({ perils: ["fire", "earthquake", "flood", "theft"], sumInsured: 250000 }),
            ]).risks.find((r) => r.riskId === "home_building_damage")!.state
        )

        // partially_protected: cover, but a peril we expect is not named.
        seen.add(
            bind({ propertiesOwned: 1, residenceType: "owned" }, [
                policy({ perils: ["fire"], sumInsured: 250000 }),
            ]).risks.find((r) => r.riskId === "home_building_damage")!.state
        )

        // unknown: cover exists but nothing about it is readable.
        seen.add(
            bind({ propertiesOwned: 1, residenceType: "owned" }, [
                policy({ perils: null, sumInsured: null }),
            ]).risks.find((r) => r.riskId === "home_building_damage")!.state
        )

        expect([...seen].sort()).toEqual([...RISK_STATES].sort())
    })

    it("an unreadable sum insured is unknown, never zero cover", () => {
        const { risks } = bind({ propertiesOwned: 1, residenceType: "owned" }, [
            policy({ perils: ["fire", "earthquake", "flood", "theft"], sumInsured: null }),
        ])
        const home = risks.find((r) => r.riskId === "home_building_damage")
        expect(home?.state).not.toBe("unprotected")
        expect(home?.dimensions.find((d) => d.dimension === "limit")?.verdict).toBe("unevaluable")
    })

    it("does not treat territory as a live question for a fixed-location risk", () => {
        // A Greek home policy on a Greek flat cannot be geographically wrong.
        const { risks } = bind({ propertiesOwned: 1, residenceType: "owned" }, [policy()])
        const home = risks.find((r) => r.riskId === "home_building_damage")
        expect(home?.dimensions.map((d) => d.dimension)).not.toContain("territory")
    })

    it("does not dock a motorist for territorial data nobody extracts", () => {
        // Scoping territory to the risks where geography matters was only half
        // the fix: nothing populates territories, so every insured motorist,
        // traveller and boat owner stayed permanently `partially_protected` —
        // a shrug with no information in it, docking their score as well.
        const { risks } = bind({ vehiclesCount: 1 }, [
            policy({ id: "m", lineOfBusiness: "motor", perils: ["liability"], sumInsured: 1000000 }),
        ])
        const motor = risks.find((r) => r.riskId === "motor_liability")!
        expect(motor.dimensions.map((d) => d.dimension)).not.toContain("territory")
        expect(motor.state).toBe("protected")
    })

    it("judges territory the moment a policy actually carries one", () => {
        const { risks } = bind({ vehiclesCount: 1 }, [
            policy({
                id: "m",
                lineOfBusiness: "motor",
                perils: ["liability"],
                sumInsured: 1000000,
                territories: ["greece"],
            }),
        ])
        const motor = risks.find((r) => r.riskId === "motor_liability")!
        expect(motor.dimensions.find((d) => d.dimension === "territory")?.verdict).toBe("satisfied")
        expect(motor.state).toBe("protected")
    })

    it("fails territory when the named cover does not reach the customer", () => {
        const { risks } = bind({ travelsFrequently: true }, [
            policy({
                id: "t",
                lineOfBusiness: "travel",
                perils: null,
                sumInsured: 50000,
                territories: ["domestic_only"],
            }),
        ])
        const travel = risks.find((r) => r.riskId === "travel_abroad")!
        expect(travel.dimensions.find((d) => d.dimension === "territory")?.verdict).toBe("failed")
        expect(travel.state).toBe("partially_protected")
    })

    it("an expired policy is not protection", () => {
        const { risks } = bind({ vehiclesCount: 1 }, [
            policy({ id: "p-motor", lineOfBusiness: "motor", status: "expired" }),
        ])
        const motor = risks.find((r) => r.riskId === "motor_liability")
        expect(motor?.state).toBe("unprotected")
        expect(motor?.protectedBy).toEqual([])
    })
})

describe("every risk carries evidence", () => {
    it("no bound risk is ever unsupported", () => {
        const { risks } = bind(
            {
                propertiesOwned: 2,
                residenceType: "owned",
                vehiclesCount: 1,
                hasPets: true,
                childrenCount: 2,
                dependentsCount: 2,
                mortgageAmount: 120000,
                travelsFrequently: true,
                cyberExposure: "high",
            },
            [policy({ lineOfBusiness: "motor", id: "p-motor" })]
        )
        expect(risks.length).toBeGreaterThan(0)
        for (const risk of risks) {
            expect(risk.evidence.length).toBeGreaterThan(0)
            for (const item of risk.evidence) {
                expect(item.statement.en.length).toBeGreaterThan(0)
                expect(item.statement.el.length).toBeGreaterThan(0)
            }
        }
    })

    it("points at the node that produces the risk, and at the absence of cover", () => {
        const { risks } = bind({ vehiclesCount: 1 })
        const motor = risks.find((r) => r.riskId === "motor_liability")!
        expect(motor.evidence.some((e) => e.kind === "declared_fact" && e.nodeId === "vehicle:1")).toBe(true)
        expect(motor.evidence.some((e) => e.kind === "absence")).toBe(true)
    })

    it("names the policy it rests on when cover exists", () => {
        const { risks } = bind({ vehiclesCount: 1 }, [
            policy({ id: "p-motor", lineOfBusiness: "motor" }),
        ])
        const motor = risks.find((r) => r.riskId === "motor_liability")!
        expect(motor.evidence.some((e) => e.kind === "held_policy" && e.policyRef === "p-motor")).toBe(true)
        expect(motor.protectedBy).toContain("p-motor")
    })
})

describe("evidence reads like language, in both languages", () => {
    it("does not conjugate a label into a sentence", () => {
        // `${label} is recorded in your profile` produced "You is recorded in
        // your profile." for every subject-wide risk and "Valuables is
        // recorded…" for plurals. Greek was worse: «καταγεγραμμένο» has to
        // agree in gender and number with everything from «η επιχείρησή σας» to
        // «τα δάνειά σας», which no single template can do.
        const { graph, risks } = bind({
            propertiesOwned: 1, residenceType: "owned", valuablesValue: 50000,
            hasLoans: true, loanAmount: 5000, ownsBusiness: true,
            employmentStatus: "self_employed", cyberExposure: "high",
        })
        expect(graph.nodes.length).toBeGreaterThan(0)
        for (const risk of risks) {
            for (const item of risk.evidence) {
                expect(item.statement.en, `${risk.riskId}: ${item.statement.en}`).not.toMatch(
                    /\b(You|Valuables|accounts|savings|loans) is\b/
                )
            }
        }
    })

    it("says something true about a risk the person carries in their own body", () => {
        const { risks } = bind({ retirementPlanning: false })
        const own = risks.find((r) => r.anchorNodeIds.includes("person:self"))
        expect(own).toBeTruthy()
        expect(own!.evidence[0].statement.en).toBe("This is a risk you carry personally.")
        expect(own!.evidence[0].statement.el).toContain("προσωπικά")
    })

    it("names conditions and activities in Greek, not by their stored ids", () => {
        // Both label maps already existed — CONDITION_LABELS in the engine,
        // the activity labels stranded inside the intake wizard — so a Greek
        // reader was shown "cycling_competitive" as the thing producing their
        // injury risk while the app knew «Αγωνιστική ποδηλασία» all along.
        const { graph } = bind({
            activities: ["cycling_competitive"],
            chronicConditions: ["diabetes"],
            answeredFields: [...ALL_ANSWERED, "chronicConditions"],
        })
        expect(getNode(graph, "activity:cycling_competitive")?.label.el).toBe("Αγωνιστική ποδηλασία")
        expect(getNode(graph, "health_condition:diabetes")?.label.el).toBe("Διαβήτης")
    })

    it("passes an unrecognised condition through as its own text", () => {
        // Activities are filtered to the known set by `toLifeContext`, but
        // chronic conditions are free text — so the label lookup has to fall
        // back to what the customer actually wrote rather than dropping it.
        const { graph } = bind({
            chronicConditions: ["σαρκοείδωση"],
            answeredFields: [...ALL_ANSWERED, "chronicConditions"],
        })
        expect(getNode(graph, "health_condition:σαρκοείδωση")?.label.el).toBe("σαρκοείδωση")
    })

    it("keeps raw extraction tokens out of Greek copy", () => {
        // "Σε ισχύ: το ασφαλιστήριο home" and "Δεν κατονομάζονται: earthquake,
        // flood" are the same defect the repo's Greek-copy guard exists for.
        const { risks } = bind({ propertiesOwned: 1, residenceType: "owned", valuablesValue: 50000 }, [
            policy({ insurerName: "ΕΘΝΙΚΗ", perils: ["fire"], sumInsured: 200000 }),
        ])
        const raw = /\b(home|motor|boat|renters|gadget|earthquake|flood|theft|fire|liability)\b/i
        for (const risk of risks) {
            for (const item of risk.evidence) {
                expect(item.statement.el, `${risk.riskId}: ${item.statement.el}`).not.toMatch(raw)
            }
            for (const dimension of risk.dimensions) {
                expect(dimension.detail.el, `${risk.riskId}/${dimension.dimension}`).not.toMatch(raw)
            }
        }
    })
})

describe("a risk anchors to everything that produces it", () => {
    it("finds the debt even when it is a loan and not a mortgage", () => {
        // `life_debt` applies on TOTAL outstanding debt but anchored only to
        // mortgages, so a customer with a car loan held a risk pointing at
        // nothing in their life — and therefore carrying no evidence.
        const { risks } = bind({ hasLoans: true, loanAmount: 5000, mortgageAmount: null })
        const debt = risks.find((r) => r.riskId === "life_debt")
        expect(debt).toBeTruthy()
        expect(debt!.anchorNodeIds).toContain("loan:1")
        expect(debt!.evidence.some((e) => e.kind === "declared_fact")).toBe(true)
    })

    it.each([
        ["renting in the city, letting the one flat they own", { residenceType: "rented", propertiesOwned: 1, rentsOutProperty: true }],
        ["renting, letting two owned flats", { residenceType: "rented", propertiesOwned: 2, rentsOutProperty: true }],
        ["living with family, letting the flat they own", { residenceType: "family", propertiesOwned: 1, rentsOutProperty: true }],
        ["owner-occupier letting a second flat", { residenceType: "owned", propertiesOwned: 2, rentsOutProperty: true }],
    ])("anchors the letting risk when %s", (_name, overrides) => {
        // Reserving property 1 as "the home" only holds when they own where
        // they live. All three of the other arrangements are ordinary in Greece,
        // and each left `landlord_letting` applying with nothing to point at.
        const { risks } = bind(overrides)
        const letting = risks.find((r) => r.riskId === "landlord_letting")
        expect(letting, "landlord_letting should apply when they let property").toBeTruthy()
        expect(letting!.anchorNodeIds.length).toBeGreaterThan(0)
    })

    it("does not mark the home they live in as let", () => {
        const { graph } = bind({ residenceType: "owned", propertiesOwned: 2, rentsOutProperty: true })
        expect(getNode(graph, "property:1")?.attributes.isLet).toBeNull()
        expect(getNode(graph, "property:2")?.attributes.isLet).toBe(true)
    })

    it("keeps the anchor table honest", () => {
        // A mistyped key or node type falls back silently to the person anchor,
        // so the risk would render "This is a risk you carry personally" for
        // something that is really about a house.
        const src = readFileSync("lib/services/risk-graph/protection.ts", "utf8")
        const block = src.slice(src.indexOf("const RISK_ANCHORS"), src.indexOf("/** Perils a line"))
        const keys = [...block.matchAll(/^\s{4}(\w+):\s*\{/gm)].map((m) => m[1])
        const catalogIds = new Set(RISK_CATALOG.map((r) => r.id))
        expect(keys.length).toBeGreaterThan(10)
        expect(keys.filter((k) => !catalogIds.has(k))).toEqual([])

        // Only the nodeTypes arrays — attribute filters quote values too.
        const types = [...block.matchAll(/nodeTypes:\s*\[([^\]]*)\]/g)].flatMap((m) =>
            [...m[1].matchAll(/"(\w+)"/g)].map((x) => x[1])
        )
        expect(types.length).toBeGreaterThan(10)
        expect(types.filter((t) => !(NODE_TYPES as readonly string[]).includes(t))).toEqual([])
    })
})

describe("the sum insured is compared, not merely read", () => {
    it("fails the limit when cover is smaller than the debt behind it", () => {
        // Reporting "satisfied" because a number could be read let €10,000 of
        // cover on a house carrying a €180,000 mortgage roll up to `protected`.
        const { risks } = bind(
            { residenceType: "owned", propertiesOwned: 1, mortgageAmount: 180000 },
            [policy({ perils: ["fire", "earthquake", "flood", "theft"], sumInsured: 10000 })]
        )
        const home = risks.find((r) => r.riskId === "home_building_damage")!
        expect(home.dimensions.find((d) => d.dimension === "limit")?.verdict).toBe("failed")
        expect(home.state).toBe("partially_protected")
    })

    it("passes when the cover clears the debt", () => {
        const { risks } = bind(
            { residenceType: "owned", propertiesOwned: 1, mortgageAmount: 180000 },
            [policy({ perils: ["fire", "earthquake", "flood", "theft"], sumInsured: 250000 })]
        )
        const home = risks.find((r) => r.riskId === "home_building_damage")!
        expect(home.dimensions.find((d) => d.dimension === "limit")?.verdict).toBe("satisfied")
        expect(home.state).toBe("protected")
    })

    it("applies the same floor to cover meant to stop debt outliving you", () => {
        const { risks } = bind({ hasLoans: true, loanAmount: 40000 }, [
            policy({ id: "l", lineOfBusiness: "life", sumInsured: 5000 }),
        ])
        const debt = risks.find((r) => r.riskId === "life_debt")!
        expect(debt.dimensions.find((d) => d.dimension === "limit")?.verdict).toBe("failed")
    })

    it("invents no benchmark where the profile holds none", () => {
        // We do not know what this flat is worth, so a readable sum insured is
        // all we can honestly report — not a verdict on whether it is enough.
        const { risks } = bind({ residenceType: "owned", propertiesOwned: 1, mortgageAmount: null }, [
            policy({ perils: ["fire", "earthquake", "flood", "theft"], sumInsured: 1 }),
        ])
        const home = risks.find((r) => r.riskId === "home_building_damage")!
        expect(home.dimensions.find((d) => d.dimension === "limit")?.detail.en).toBe(
            "A sum insured is recorded."
        )
    })
})

describe("cover is judged against what the RISK needs", () => {
    it("does not call valuables protected by a policy that never names theft", () => {
        // The `gadget` line has no peril expectations of its own, so a home
        // policy naming only fire reported the customer's jewellery as fully
        // protected. Theft is the entire question for valuables.
        const { risks } = bind({ residenceType: "owned", propertiesOwned: 1, valuablesValue: 50000 }, [
            policy({ perils: ["fire"], sumInsured: 200000 }),
        ])
        const valuables = risks.find((r) => r.riskId === "valuables_loss")
        expect(valuables?.state).toBe("partially_protected")
        expect(valuables?.dimensions.find((d) => d.dimension === "peril")?.verdict).toBe("failed")
    })
})

describe("the graph never invents a risk", () => {
    it("binds only risks the assessment already called applicable", () => {
        const { assessments, risks } = bind({ hasPets: false, vehiclesCount: 0 })
        const applicable = new Set(
            assessments.filter((a) => a.applicability === "applicable").map((a) => a.riskId)
        )
        for (const risk of risks) expect(applicable.has(risk.riskId)).toBe(true)
    })

    it("shows no pet risk to someone without a pet, and no motor risk without a vehicle", () => {
        const { risks } = bind({ hasPets: false, vehiclesCount: 0 })
        const ids = risks.map((r) => r.riskId)
        expect(ids).not.toContain("pet_costs")
        expect(ids).not.toContain("motor_liability")
    })

    it("counts states without losing any risk", () => {
        const { risks } = bind({ propertiesOwned: 1, residenceType: "owned", vehiclesCount: 2 })
        const summary = protectionSummary(risks)
        const total = Object.values(summary).reduce((a, b) => a + b, 0)
        expect(total).toBe(risks.length)
    })
})

describe("presentation", () => {
    it("puts the worst first", () => {
        const { graph, assessments, risks } = bind(
            { propertiesOwned: 1, residenceType: "owned", vehiclesCount: 1, hasPets: true },
            [policy({ perils: ["fire", "earthquake", "flood", "theft"], sumInsured: 200000 })]
        )
        const views = presentRiskGraph(risks, graph, assessments)
        const rank = { unprotected: 0, partially_protected: 1, unknown: 2, protected: 3 }
        for (let i = 1; i < views.length; i++) {
            expect(rank[views[i].state]).toBeGreaterThanOrEqual(rank[views[i - 1].state])
        }
    })

    it("resolves anchors to human labels in both languages", () => {
        const { graph, assessments, risks } = bind({ propertiesOwned: 2, residenceType: "owned" })
        const views = presentRiskGraph(risks, graph, assessments)
        const home = views.find((v) => v.riskId === "home_building_damage")!
        expect(home.anchors).toHaveLength(2)
        for (const anchor of home.anchors) {
            expect(anchor.en.length).toBeGreaterThan(0)
            expect(anchor.el.length).toBeGreaterThan(0)
        }
    })

    it("renders a risk whose assessment went missing rather than dropping it", () => {
        // Silently dropping would hide an unprotected exposure — the exact
        // failure this surface exists to prevent.
        const { graph, risks } = bind({ vehiclesCount: 1 })
        const views = presentRiskGraph(risks, graph, [])
        expect(views).toHaveLength(risks.length)
        expect(views.find((v) => v.riskId === "motor_liability")?.name.en).toBe("motor_liability")
    })

    it("never loses or duplicates a risk", () => {
        const { graph, assessments, risks } = bind({
            propertiesOwned: 1,
            residenceType: "owned",
            vehiclesCount: 1,
            childrenCount: 1,
            dependentsCount: 1,
        })
        const views = presentRiskGraph(risks, graph, assessments)
        expect(views.map((v) => v.riskId).sort()).toEqual(risks.map((r) => r.riskId).sort())
    })
})

/**
 * The persona sweep.
 *
 * Structural invariants asserted across every validation persona rather than a
 * hand-picked case, because the defects this found were all of the form "holds
 * for the customer I was thinking about". `professional_liability` anchoring to
 * nothing for a self-employed person with no job title is the example: applicable,
 * rendered, and supported by no evidence about their life at all.
 */
describe("structural invariants hold for every persona", () => {
    const PERSONAS: Array<[string, Record<string, unknown>, ProtectingPolicy[]]> = [
        ["never asked anything", { answeredFields: [] }, []],
        ["single renter", {}, []],
        ["home owner", { residenceType: "owned", propertiesOwned: 1 }, []],
        ["married", { maritalStatus: "married" }, []],
        ["parent of two", { maritalStatus: "married", childrenCount: 2, dependentsCount: 2 }, []],
        ["pet owner", { hasPets: true }, []],
        ["motorist", { vehiclesCount: 1 }, []],
        ["self-employed, no job title", { ownsBusiness: true, employmentStatus: "self_employed" }, []],
        ["employer", { ownsBusiness: true, businessEmployees: 4, employmentStatus: "self_employed" }, []],
        ["retired", { dateOfBirth: new Date("1952-01-01"), employmentStatus: "retired", annualIncome: 12000 }, []],
        ["student", { dateOfBirth: new Date("2004-01-01"), employmentStatus: "student", annualIncome: 0 }, []],
        ["frequent traveller", { travelsFrequently: true }, []],
        ["boat owner", { ownsBoat: true }, []],
        ["landlord", { residenceType: "owned", propertiesOwned: 3, rentsOutProperty: true }, []],
        ["high net worth", { residenceType: "owned", propertiesOwned: 2, valuablesValue: 150000, savingsAmount: 400000, annualIncome: 200000 }, []],
        ["cyber exposed", { cyberExposure: "high" }, []],
        ["mortgaged parent", { residenceType: "owned", propertiesOwned: 1, mortgageAmount: 180000, childrenCount: 1, dependentsCount: 1 }, []],
        ["unreadable policy", { residenceType: "owned", propertiesOwned: 1 }, [policy({ perils: null, sumInsured: null })]],
        ["everything at once", {
            maritalStatus: "married", childrenCount: 3, dependentsCount: 3, hasPets: true,
            vehiclesCount: 2, residenceType: "owned", propertiesOwned: 3, rentsOutProperty: true,
            ownsBusiness: true, businessEmployees: 10, employmentStatus: "self_employed",
            annualIncome: 90000, savingsAmount: 50000, mortgageAmount: 200000, hasLoans: true,
            loanAmount: 30000, travelsFrequently: true, activities: ["skiing"],
            valuablesValue: 40000, cyberExposure: "high", ownsBoat: true,
        }, []],
    ]

    it.each(PERSONAS)("%s", (_name, overrides, policies) => {
        const { graph, assessments, risks } = bind(overrides, policies)
        const nodeIds = new Set(graph.nodes.map((n) => n.id))
        const applicable = new Set(
            assessments.filter((a) => a.applicability === "applicable").map((a) => a.riskId)
        )

        for (const risk of risks) {
            expect(applicable.has(risk.riskId), `${risk.riskId} bound but not applicable`).toBe(true)
            expect(risk.evidence.length, `${risk.riskId} has no evidence`).toBeGreaterThan(0)

            // Every risk points at something in their LIFE, not only at the
            // absence of a policy. A risk that cannot name what produces it is
            // a product recommendation wearing a risk's clothes.
            expect(
                risk.anchorNodeIds.length,
                `${risk.riskId} anchors to no node — nothing in the graph produces it`
            ).toBeGreaterThan(0)
            expect(
                risk.evidence.some((e) => e.kind === "declared_fact"),
                `${risk.riskId} cites no fact about the customer`
            ).toBe(true)

            for (const id of risk.anchorNodeIds) {
                expect(nodeIds.has(id), `${risk.riskId} anchors to missing node ${id}`).toBe(true)
            }

            // State and cover must tell the same story.
            if (risk.state === "unprotected") expect(risk.protectedBy).toEqual([])
            else expect(risk.protectedBy.length).toBeGreaterThan(0)

            // A verdict short of `protected` must say why. Without this, a
            // two-property customer saw an amber badge beside three green
            // dimensions and nothing but positive evidence — the verdict
            // asserting itself, which is what evidence exists to prevent.
            if (risk.state !== "protected") {
                expect(
                    risk.evidence.some(
                        (e) => e.kind === "absence" || e.kind === "derived" || e.kind === "market_rule"
                    ),
                    `${risk.riskId} is ${risk.state} but nothing explains why`
                ).toBe(true)
            }
        }

        // No dangling edges, and nothing floating unconnected.
        const linked = new Set(graph.edges.flatMap((e) => [e.from, e.to]))
        for (const edge of graph.edges) {
            expect(nodeIds.has(edge.from), `edge from missing ${edge.from}`).toBe(true)
            expect(nodeIds.has(edge.to), `edge to missing ${edge.to}`).toBe(true)
        }
        for (const node of graph.nodes) {
            if (node.id === "person:self") continue
            expect(linked.has(node.id), `orphan node ${node.id}`).toBe(true)
        }

        const ids = risks.map((r) => r.riskId)
        expect(new Set(ids).size).toBe(ids.length)
    })
})

describe("one answer per risk, across the whole page", () => {
    it("stops the risk list claiming covered while the graph says partial", () => {
        // Both panels render on /coverage-insights. Before reconciliation the
        // page said «Ήδη καλυμμένο» and «Μερικώς προστατευμένο» about the same
        // risk, inches apart.
        const { assessments, risks } = bind(
            { residenceType: "owned", propertiesOwned: 1, valuablesValue: 20000, vehiclesCount: 1 },
            [
                policy({ perils: ["fire"], sumInsured: 200000 }),
                policy({ id: "m", lineOfBusiness: "motor", perils: null, sumInsured: null }),
            ]
        )
        const reconciled = reconcileWithGraph(assessments, risks)
        const stateById = new Map(risks.map((r) => [r.riskId, r.state]))

        for (const a of reconciled) {
            if (a.status !== "already_covered") continue
            const state = stateById.get(a.riskId)
            expect(state === undefined || state === "protected", `${a.riskId} claims covered but graph says ${state}`).toBe(true)
        }
        // And it actually fired, rather than passing because nothing matched.
        expect(reconciled.filter((a) => a.status === "needs_review").length).toBeGreaterThan(0)
    })

    it("never talks a risk up", () => {
        // The graph may downgrade a coverage claim; it must never promote a gap
        // to covered. A protection surface that argues itself upward is the
        // exact failure the rebuild was for.
        const { assessments, risks } = bind({ vehiclesCount: 1, hasPets: true }, [])
        const reconciled = reconcileWithGraph(assessments, risks)
        for (let i = 0; i < assessments.length; i++) {
            if (assessments[i].status !== "already_covered") {
                expect(reconciled[i].status).toBe(assessments[i].status)
            }
        }
    })

    it("is what the engine actually scores, on both of its paths", () => {
        // The score is computed from the assessments, so if either engine path
        // went back to raw `assessRisks` the number would credit a fire-only
        // home policy as full home protection while the panel below it said
        // otherwise. Two call sites, both must read the reconciled set.
        const src = readFileSync("lib/services/gap-engine/index.ts", "utf8")
        // Both entry points must source `riskAssessments` from the reconciling
        // helper. Matched on the binding rather than an exact call expression,
        // so refactoring the destructuring does not fail a guard that has no
        // quarrel with it.
        const viaHelper = [...src.matchAll(/riskAssessments[^\n]*=[^\n]*reconciledAssessments\(/g)]
        expect(viaHelper).toHaveLength(2)
        expect(src).not.toMatch(/riskAssessments[^\n]*=\s*assessRisks\(/)
    })

    it("degrades rather than blanking the page if the projection throws", () => {
        // Both engine entry points feed the whole coverage page. Before the
        // graph existed this path could not fail; a defect in a derived,
        // additive layer must not take the score and recommendations with it.
        const src = readFileSync("lib/services/gap-engine/index.ts", "utf8")
        const helper = src.slice(
            src.indexOf("function reconciledAssessments"),
            src.indexOf("// ── Main orchestrator")
        )
        expect(helper).toMatch(/try\s*\{/)
        expect(helper).toMatch(/catch/)
        // The catch branch must still produce a real assessment, not rethrow.
        expect(helper.slice(helper.indexOf("catch"))).toMatch(/assessRisks\(/)
    })

    it("leaves a fully protected risk alone", () => {
        const { assessments, risks } = bind({ residenceType: "owned", propertiesOwned: 1 }, [
            policy({ perils: ["fire", "earthquake", "flood", "theft"], sumInsured: 250000 }),
        ])
        const home = reconcileWithGraph(assessments, risks).find((a) => a.riskId === "home_building_damage")
        expect(risks.find((r) => r.riskId === "home_building_damage")?.state).toBe("protected")
        expect(home?.status).toBe("already_covered")
    })
})

describe("the service reads what the dimensions need", () => {
    it("still reads the pre-schema `coverage.*` spellings older rows carry", () => {
        // CAUTION: this payload is the LEGACY shape — AcordDataSchema defines
        // no `coverage` object at all, and no extractor has ever written one.
        // This very test once claimed to prove "every dimension is reachable
        // from production data" while exercising a spelling production never
        // produces; the schema-shaped tests below are that proof now
        // (V2-P1-07). This one only pins that old stored rows keep working.
        const result = assembleRiskGraph(profile({ vehiclesCount: 1 }), [
            {
                id: "m",
                lineOfBusiness: "motor",
                status: "active",
                insurerName: "ΕΘΝΙΚΗ",
                endDate: new Date("2027-01-01"),
                acordData: {
                    coverage: {
                        perils: ["liability"],
                        territories: ["greece"],
                        sumInsured: 1_000_000,
                    },
                },
            },
        ])
        const motor = result.risks.find((r) => r.riskId === "motor_liability")!
        expect(motor.dimensions.map((d) => d.dimension).sort()).toEqual(["limit", "period", "peril", "territory"].sort())
        expect(motor.dimensions.every((d) => d.verdict === "satisfied")).toBe(true)
        expect(motor.state).toBe("protected")
    })

    it("treats unreadable extraction as unknown, never as zero", () => {
        const result = assembleRiskGraph(profile({ residenceType: "owned", propertiesOwned: 1 }), [
            {
                id: "h",
                lineOfBusiness: "home",
                status: "active",
                insurerName: null,
                endDate: new Date("2027-01-01"),
                acordData: { somethingElse: true },
            },
        ])
        const home = result.risks.find((r) => r.riskId === "home_building_damage")!
        expect(home.state).toBe("unknown")
        expect(home.protectedBy).toEqual(["h"])
    })

    it("reads the motor sum insured from the field the schema actually defines", () => {
        // V2-P1-07. `vehicle.insuredValue` is the schema's own motor field
        // (acord-data.ts) — the authored value_drift rules and the renewal
        // differential both read it — but readCoverageFacts resolved the sum
        // insured from two property spellings and a phantom, so every insured
        // motorist rolled up as «Άγνωστο» while the figure sat in the column.
        const result = assembleRiskGraph(profile({ vehiclesCount: 1 }), [
            {
                id: "m",
                lineOfBusiness: "motor",
                status: "active",
                insurerName: "ΕΘΝΙΚΗ",
                endDate: new Date("2027-01-01"),
                acordData: {
                    _version: 3,
                    vehicle: { insuredValue: 14500, estimatedMarketValue: 15000 },
                    policy: { lineOfBusiness: "motor" },
                },
            },
        ])
        const motor = result.risks.find((r) => r.riskId === "motor_liability")!
        // The limit dimension can finally run on real extraction data…
        expect(motor.dimensions.find((d) => d.dimension === "limit")?.verdict).toBe("satisfied")
        // …but the perils are still genuinely unreadable (no schema field
        // carries a peril list — see COVERAGE_FACT_SOURCES), so the honest
        // roll-up is partial: no longer «Άγνωστο», and NOT `protected` —
        // a sum insured alone does not confirm the compulsory liability cover.
        expect(motor.dimensions.find((d) => d.dimension === "peril")?.verdict).toBe("unevaluable")
        expect(motor.state).toBe("partially_protected")
    })

    it("keeps «Άγνωστο» for a motor policy whose extraction holds nothing readable", () => {
        // The unknown-household fixture's exact shape: a policy envelope with
        // dates and premium, no vehicle section. `unknown` is CORRECT there —
        // the fix must widen what can be read, never manufacture a figure.
        const result = assembleRiskGraph(profile({ vehiclesCount: 1 }), [
            {
                id: "m",
                lineOfBusiness: "motor",
                status: "active",
                insurerName: "Interamerican",
                endDate: new Date("2027-01-01"),
                acordData: {
                    _version: 3,
                    policy: { lineOfBusiness: "motor", premium: { amount: 250 } },
                },
            },
        ])
        expect(result.risks.find((r) => r.riskId === "motor_liability")?.state).toBe("unknown")
    })

    it("an underinsured home read from real extraction data still fails the limit", () => {
        // The guard's own trap: after widening the read, a policy that is
        // genuinely too small must not surface as protected merely because the
        // number became readable.
        const result = assembleRiskGraph(
            profile({ residenceType: "owned", propertiesOwned: 1, mortgageAmount: 180000 }),
            [
                {
                    id: "h",
                    lineOfBusiness: "home",
                    status: "active",
                    insurerName: null,
                    endDate: new Date("2027-01-01"),
                    acordData: { _version: 3, property: { insuredValue: 10000 } },
                },
            ]
        )
        const home = result.risks.find((r) => r.riskId === "home_building_damage")!
        expect(home.dimensions.find((d) => d.dimension === "limit")?.verdict).toBe("failed")
        expect(home.state).toBe("partially_protected")
    })

    it("compares the death benefit the schema defines against the debt behind it", () => {
        // Same defect class as motor: the life_debt floor comparison existed
        // and was reachable only from hand-built fixtures, because
        // `lifeAndInvestment.deathBenefit` — the wallet's own sum-insured field
        // for life (deriveSumInsured) — was never read from acordData.
        const result = assembleRiskGraph(profile({ hasLoans: true, loanAmount: 40000 }), [
            {
                id: "l",
                lineOfBusiness: "life",
                status: "active",
                insurerName: null,
                endDate: new Date("2027-01-01"),
                acordData: { _version: 3, lifeAndInvestment: { deathBenefit: 5000 } },
            },
        ])
        const debt = result.risks.find((r) => r.riskId === "life_debt")!
        expect(debt.dimensions.find((d) => d.dimension === "limit")?.verdict).toBe("failed")
        expect(debt.state).toBe("partially_protected")
    })
})

/**
 * The combinatorial sweep.
 *
 * Every profile axis crossed with several wallet shapes — around 470 cases. The
 * hand-picked personas above are the situations someone thought of; this is the
 * one that keeps finding the situations nobody did. Four separate anchoring
 * holes surfaced here and nowhere else, each the same shape: a node's existence
 * condition drawn tighter than the applicability condition of the risk that
 * anchors to it, so the risk applied to a real person and pointed at nothing in
 * their life.
 *
 * `professional_liability` needed a job title the risk did not require.
 * `landlord_letting` reserved property 1 as "the home" for people who rent.
 * `employer_liability` demanded `ownsBusiness` from someone who had declared
 * five employees. `income_interruption` demanded a salary figure from someone
 * who had only said they were employed.
 */
describe("no risk anywhere in the space applies without anchoring", () => {
    const AXES: Record<string, unknown[]> = {
        residenceType: ["rented", "owned", "family", null],
        propertiesOwned: [0, 1, 3],
        rentsOutProperty: [false, true],
        vehiclesCount: [0, 1, 2],
        hasPets: [false, true],
        dependentsCount: [0, 2],
        childrenCount: [0, 3],
        employmentStatus: ["employed", "self_employed", "retired", "student", null],
        ownsBusiness: [false, true],
        businessEmployees: [0, 5],
        mortgageAmount: [null, 150000],
        hasLoans: [false, true],
        loanAmount: [null, 20000],
        travelsFrequently: [false, true],
        cyberExposure: ["low", "moderate", "high"],
        valuablesValue: [0, 5000, 50000],
        ownsBoat: [false, true],
        activities: [[], ["skiing"]],
        chronicConditions: [null, ["diabetes"]],
        annualIncome: [null, 0, 30000, 200000],
        savingsAmount: [null, 0, 400000],
        dateOfBirth: [null, new Date("1950-01-01"), new Date("2006-01-01")],
        maritalStatus: [null, "single", "married", "divorced"],
        retirementPlanning: [true, false],
    }

    const WALLETS: ProtectingPolicy[][] = [
        [],
        [policy({ perils: ["fire", "earthquake", "flood", "theft"], sumInsured: 250000 })],
        [policy({ perils: ["fire"], sumInsured: null })],
        // Nothing readable at all — the commonest real wallet, and the only
        // shape that produces `unknown`.
        [policy()],
        [policy({ id: "m", lineOfBusiness: "motor", perils: ["liability"], sumInsured: 1000000 })],
        [policy({ id: "e", status: "expired", perils: ["fire"], coverageEndDate: new Date("2020-01-01") })],
    ]

    it("holds across every axis value and wallet shape", () => {
        const failures: string[] = []
        const seen = new Set<string>()
        let cases = 0

        for (const [axis, values] of Object.entries(AXES)) {
            for (const value of values) {
                for (const [w, wallet] of WALLETS.entries()) {
                    cases++
                    const tag = `${axis}=${JSON.stringify(value)}/w${w}`
                    const { graph, assessments, risks } = bind(
                        { [axis]: value, answeredFields: [...ALL_ANSWERED, "chronicConditions"] },
                        wallet
                    )
                    const nodeIds = new Set(graph.nodes.map((n) => n.id))
                    const applicable = new Set(
                        assessments.filter((a) => a.applicability === "applicable").map((a) => a.riskId)
                    )

                    for (const risk of risks) {
                        seen.add(risk.state)
                        if (!applicable.has(risk.riskId)) failures.push(`${tag}: ${risk.riskId} bound but not applicable`)
                        if (!risk.anchorNodeIds.length) failures.push(`${tag}: ${risk.riskId} anchors to nothing`)
                        if (!risk.evidence.some((e) => e.kind === "declared_fact")) failures.push(`${tag}: ${risk.riskId} cites no fact`)
                        if (risk.state !== "protected" && !risk.evidence.some((e) => ["absence", "derived", "market_rule"].includes(e.kind)))
                            failures.push(`${tag}: ${risk.riskId} is ${risk.state} unexplained`)
                        if ((risk.state === "unprotected") !== (risk.protectedBy.length === 0))
                            failures.push(`${tag}: ${risk.riskId} state and cover disagree`)
                        for (const id of risk.anchorNodeIds) {
                            if (!nodeIds.has(id)) failures.push(`${tag}: ${risk.riskId} anchors to missing ${id}`)
                        }
                    }

                    for (const edge of graph.edges) {
                        if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) failures.push(`${tag}: dangling ${edge.type}`)
                    }
                }
            }
        }

        // Guards the sweep itself: a future edit that quietly narrows the axes
        // would turn this from a search into a rubber stamp.
        expect(cases).toBeGreaterThan(300)
        expect([...seen].sort()).toEqual([...RISK_STATES].sort())
        expect([...new Set(failures)].slice(0, 20)).toEqual([])
    })
})

/**
 * The fuzz.
 *
 * Three thousand randomly-generated profiles and wallets, from a fixed seed so a
 * failure reproduces exactly. It exists because the two sweeps above both vary a
 * profile from a *complete* baseline, and the interesting real case is the
 * opposite: someone who answered a scattered handful of questions and skipped
 * the rest.
 *
 * That is precisely what it caught — a customer who answered the letting
 * question and skipped ownership and residence held `landlord_letting` with no
 * property anywhere in their graph to point at. Neither sweep could generate
 * that shape, because both always answered everything.
 */
describe("fuzz: partially-answered profiles behave", () => {
    const FIELDS = [
        "dateOfBirth", "maritalStatus", "childrenCount", "dependentsCount", "hasPets",
        "vehiclesCount", "residenceType", "propertiesOwned", "rentsOutProperty",
        "ownsBusiness", "employmentStatus", "businessEmployees", "annualIncome",
        "savingsAmount", "mortgageAmount", "hasLoans", "loanAmount", "travelsFrequently",
        "activities", "valuablesValue", "cyberExposure", "retirementPlanning",
        "chronicConditions", "petsCount", "occupation", "ownsBoat",
    ]

    // Fuzz sweep — same CI-timing story as the catalog sweep in
    // life-context-risk-engine.test.ts; assertion unchanged.
    it("never leaves an applicable risk pointing at nothing", { timeout: 30_000 }, () => {
        let seed = 20260804
        const rnd = () => {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff
            return seed / 0x7fffffff
        }
        const pick = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)]

        const failures: string[] = []
        for (let n = 0; n < 3000; n++) {
            const p = {
                // The realistic case: some questions answered, most not.
                answeredFields: FIELDS.filter(() => rnd() > 0.25),
                dateOfBirth: pick([null, new Date("1950-01-01"), new Date("1985-01-01"), new Date("2006-01-01")]),
                maritalStatus: pick([null, "single", "married", "divorced", "widowed"]),
                childrenCount: pick([0, 1, 3, -1, 2.5]),
                dependentsCount: pick([0, 1, 4]),
                hasPets: pick([true, false, null]),
                petsCount: pick([0, 1, 2, 15, -1, null]),
                vehiclesCount: pick([0, 1, 3, 50, -1, null]),
                residenceType: pick([null, "rented", "owned", "family"]),
                propertiesOwned: pick([0, 1, 2, 20, -3, null]),
                rentsOutProperty: pick([true, false, null]),
                ownsBusiness: pick([true, false]),
                businessEmployees: pick([0, 1, 25, -1, null]),
                employmentStatus: pick([null, "employed", "self_employed", "retired", "student", "unemployed"]),
                annualIncome: pick([null, 0, -100, 15000, 90000, 10_000_000, NaN]),
                savingsAmount: pick([null, 0, 5000, 900000]),
                mortgageAmount: pick([null, 0, 50000, 900000]),
                hasLoans: pick([true, false]),
                loanAmount: pick([null, 0, 3000, 200000]),
                travelsFrequently: pick([true, false]),
                activities: pick([[], ["skiing"], ["motorsport", "diving", "hunting"]]),
                valuablesValue: pick([0, 1000, 5000, 500000]),
                cyberExposure: pick([null, "low", "moderate", "high"]),
                retirementPlanning: pick([true, false]),
                chronicConditions: pick([null, [], ["diabetes"], ["σαρκοείδωση", "asthma"]]),
                occupation: pick([null, "", "δικηγόρος", "a".repeat(200)]),
                ownsBoat: pick([true, false]),
            }

            const wallet = Array.from({ length: Math.floor(rnd() * 4) }, (_, i) => ({
                id: `p${i}`,
                lineOfBusiness: pick(["home", "motor", "life", "health", "travel", "pet", "boat", "renters", "", null]),
                status: pick(["active", "expired", "cancelled", "analyzing"]),
                insurerName: pick([null, "", "ΕΘΝΙΚΗ", "Interamerican"]),
                // An unparseable date is not hypothetical for an imported wallet, and
                // `calendarDaysUntil` throws rather than answering on one.
                endDate: pick([null, new Date("2020-01-01"), new Date("2027-01-01"), new Date("invalid")]),
                acordData: pick([
                    null,
                    undefined,
                    {},
                    [],
                    "string",
                    42,
                    { coverage: { perils: ["fire"], sumInsured: 1000 } },
                    { coverage: { perils: [], sumInsured: -5 } },
                    { coverage: { perils: ["fire", "earthquake", "flood", "theft"], territories: ["greece"], sumInsured: 300000 } },
                    { coverage: { perils: [1, 2, 3], sumInsured: NaN } },
                    { coverage: { sumInsured: "not a number" } },
                ]),
            }))

            const result = assembleRiskGraph(p, wallet as any)
            const nodeIds = new Set(result.graph.nodes.map((n) => n.id))
            for (const risk of result.risks) {
                if (!risk.anchorNodeIds.length) failures.push(`#${n}: ${risk.riskId} anchors to nothing`)
                if (!risk.evidence.some((e) => e.kind === "declared_fact")) failures.push(`#${n}: ${risk.riskId} cites no fact`)
                if ((risk.state === "unprotected") !== (risk.protectedBy.length === 0))
                    failures.push(`#${n}: ${risk.riskId} state and cover disagree`)
                for (const id of risk.anchorNodeIds) {
                    if (!nodeIds.has(id)) failures.push(`#${n}: ${risk.riskId} anchors to missing ${id}`)
                }
                for (const e of risk.evidence) {
                    if (!e.statement.el || !e.statement.en) failures.push(`#${n}: ${risk.riskId} evidence missing a language`)
                    if (/NaN|undefined|Infinity|\[object/.test(e.statement.el + e.statement.en))
                        failures.push(`#${n}: ${risk.riskId} broken copy: ${e.statement.en}`)
                }
            }
            for (const edge of result.graph.edges) {
                if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) failures.push(`#${n}: dangling ${edge.type}`)
            }
        }

        expect([...new Set(failures)].slice(0, 20)).toEqual([])
    })
})

describe("summary counts things, not policies", () => {
    it("reports assets, obligations and dependants from the graph", () => {
        const { graph } = bind({
            propertiesOwned: 2,
            residenceType: "owned",
            vehiclesCount: 1,
            childrenCount: 2,
            dependentsCount: 2,
            mortgageAmount: 100000,
        })
        const summary = graphSummary(graph)
        expect(summary.assets).toBe(3) // two properties, one vehicle
        expect(summary.obligations).toBe(1) // the mortgage
        expect(summary.dependants).toBe(2)
        expect(summary.nodeCount).toBeGreaterThan(summary.assets)
    })
})
