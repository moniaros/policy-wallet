import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import {
    toLifeContext,
    contextCompleteness,
    CONTEXT_FACTORS,
    type LifeContext,
} from "@/lib/services/gap-engine/life-context"
import { RISK_CATALOG } from "@/lib/services/gap-engine/risk-catalog"
import {
    assessRisks,
    assessRisk,
    openFindings,
    scorableRisks,
    relevantLines,
} from "@/lib/services/gap-engine/risk-assessment"
import { calculateScoreFromAssessments } from "@/lib/services/gap-engine/protection-score"
import { buildBranchOverview } from "@/lib/insurance/branch-page"
import { normalizeBranch } from "@/lib/insurance/taxonomy"

/**
 * Guards for the Life Context Risk Assessment Engine.
 *
 * The audit (docs/audits/risk-engine-context-awareness-2026-08.md) found the old
 * engine recommending cover for exposures its customers did not have — a renter
 * shown a home gap, a pet owner shown a cyber gap, a 72-year-old shown a critical
 * life gap. Those were not authoring mistakes in individual rules; they came from
 * the shape of the engine. These tests pin the shape.
 */

const ALL_ANSWERED = [
    "dateOfBirth", "maritalStatus", "childrenCount", "dependentsCount", "hasPets",
    "vehiclesCount", "residenceType", "propertiesOwned", "rentsOutProperty",
    "ownsBusiness", "employmentStatus", "businessEmployees", "annualIncome",
    "savingsAmount", "mortgageAmount", "hasLoans", "loanAmount", "travelsFrequently",
    "activities", "valuablesValue", "cyberExposure", "retirementPlanning",
    "isBuildingManager",
]

/** A fully-answered profile that owns nothing and is responsible for nobody. */
function bareProfile(overrides: Record<string, unknown> = {}) {
    return {
        answeredFields: ALL_ANSWERED,
        dateOfBirth: new Date("1990-01-01"),
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
        annualIncome: 20000,
        savingsAmount: 20000,
        mortgageAmount: null,
        hasLoans: false,
        loanAmount: null,
        travelsFrequently: false,
        activities: [],
        valuablesValue: 0,
        cyberExposure: "low",
        retirementPlanning: true,
        isBuildingManager: false,
        ...overrides,
    } as any
}

const ctxOf = (p: unknown) => toLifeContext(p as any, new Date("2026-08-04"))

describe("no exposure, no recommendation", () => {
    // The mission's own examples, and the reason the engine was rebuilt.
    it.each([
        ["a pet", "pet_costs", { hasPets: false }],
        ["a vehicle", "motor_liability", { vehiclesCount: 0 }],
        ["a business", "business_assets_interruption", { ownsBusiness: false }],
        ["employees", "employer_liability", { businessEmployees: 0 }],
        ["a let property", "landlord_letting", { rentsOutProperty: false }],
        ["owned property", "home_building_damage", { residenceType: "rented", propertiesOwned: 0 }],
        ["travel", "travel_abroad", { travelsFrequently: false }],
        ["declared cyber exposure", "cyber_fraud", { cyberExposure: "low" }],
        ["high-risk activities", "activity_injury", { activities: [] }],
        ["valuables", "valuables_loss", { valuablesValue: 0 }],
    ])("without %s, %s is not_applicable and never recommended", (_label, riskId, overrides) => {
        const assessments = assessRisks(ctxOf(bareProfile(overrides)), [])
        const risk = assessments.find((a) => a.riskId === riskId)
        expect(risk?.status).toBe("not_applicable")
        expect(risk?.applicability).toBe("not_applicable")
        expect(openFindings(assessments).map((a) => a.riskId)).not.toContain(riskId)
    })

    it("a not_applicable risk never reaches the protection score", () => {
        const assessments = assessRisks(ctxOf(bareProfile()), [])
        const scored = scorableRisks(assessments).map((a) => a.riskId)
        for (const a of assessments) {
            if (a.status === "not_applicable") expect(scored).not.toContain(a.riskId)
        }
    })
})

describe("unknown is not the same as no", () => {
    it("an empty profile makes every gated risk needs_review, not a gap", () => {
        const assessments = assessRisks(toLifeContext(null), [])
        const gated = assessments.filter((a) => {
            const def = RISK_CATALOG.find((r) => r.id === a.riskId)!
            return def.requires.length > 0
        })
        expect(gated.length).toBeGreaterThan(10)
        for (const a of gated) {
            expect(a.status).toBe("needs_review")
        }
        // The headline consequence: nothing is asserted about a stranger.
        expect(
            openFindings(assessments).filter((a) => a.status === "protection_gap")
        ).toHaveLength(0)
    })

    it("a declared 'no' is knowledge; an untouched default is not", () => {
        const declared = ctxOf(bareProfile({ hasPets: false }))
        expect(declared.known.pets).toBe(true)

        const silent = toLifeContext({ hasPets: false, answeredFields: [] } as any)
        expect(silent.known.pets).toBe(false)
    })

    it("a non-default value counts as an answer without answeredFields (legacy rows)", () => {
        // Backwards compatibility: profiles written before answeredFields existed
        // must keep exactly the knownness their data implies, with no backfill.
        const legacy = toLifeContext({ hasPets: true, vehiclesCount: 2 } as any)
        expect(legacy.known.pets).toBe(true)
        expect(legacy.known.vehicles).toBe(true)
        expect(legacy.known.savings).toBe(false)
    })

    it("completeness measures answered factors, not non-null columns", () => {
        expect(contextCompleteness(toLifeContext(null))).toBe(0)
        expect(contextCompleteness(ctxOf(bareProfile()))).toBeGreaterThan(90)
    })
})

describe("cover is consulted last, and only for risks that apply", () => {
    it("holding the line marks the risk already_covered, not a gap", () => {
        const ctx = ctxOf(bareProfile({ vehiclesCount: 1 }))
        const assessments = assessRisks(ctx, [{ lineOfBusiness: "motor", status: "active" }])
        const motor = assessments.find((a) => a.riskId === "motor_liability")
        expect(motor?.status).toBe("already_covered")
    })

    it("a child branch answers its parent's risk (a motorbike is insured)", () => {
        const ctx = ctxOf(bareProfile({ vehiclesCount: 1 }))
        const assessments = assessRisks(ctx, [{ lineOfBusiness: "motorbike", status: "active" }])
        expect(assessments.find((a) => a.riskId === "motor_liability")?.status).toBe(
            "already_covered"
        )
    })

    it("an expired policy does not count as cover", () => {
        const ctx = ctxOf(bareProfile({ vehiclesCount: 1 }))
        const assessments = assessRisks(ctx, [{ lineOfBusiness: "motor", status: "expired" }])
        expect(assessments.find((a) => a.riskId === "motor_liability")?.status).toBe(
            "protection_gap"
        )
    })

    it("cover held outside PolicyWallet suppresses the gap at reduced confidence", () => {
        const ctx = ctxOf(
            bareProfile({ vehiclesCount: 1, coverHeldElsewhere: ["motor"] })
        )
        const motor = assessRisks(ctx, []).find((a) => a.riskId === "motor_liability")
        expect(motor?.status).toBe("already_covered")
        expect(motor?.confidence).not.toBe("high")
    })
})

describe("insurance must be an appropriate mitigation", () => {
    it("a 72-year-old is not told to close a life gap", () => {
        const ctx = ctxOf(
            bareProfile({
                dateOfBirth: new Date("1954-01-01"),
                dependentsCount: 1,
                employmentStatus: "employed",
            })
        )
        const life = assessRisks(ctx, []).find((a) => a.riskId === "life_dependents")
        // The risk applies — but the market will not answer it, so it is a
        // conversation, not a gap to close.
        expect(life?.applicability).toBe("applicable")
        expect(life?.status).toBe("needs_review")
        expect(life?.eligibilityNote).not.toBeNull()
    })

    it("a retiree with dependents has no income-replacement gap", () => {
        const ctx = ctxOf(
            bareProfile({ employmentStatus: "retired", dependentsCount: 1 })
        )
        expect(assessRisks(ctx, []).find((a) => a.riskId === "life_dependents")?.status).toBe(
            "not_applicable"
        )
    })

    it("a chronic condition is not sold cover that excludes it", () => {
        const ctx = ctxOf(bareProfile({ chronicConditions: ["diabetes"] }))
        const risk = assessRisks(ctx, []).find((a) => a.riskId === "chronic_condition_costs")
        expect(risk?.status).toBe("opportunity")
        expect(risk?.priority).not.toBe("critical")
        // The pre-existing exclusion must be on the card, in both languages.
        expect(risk?.eligibilityNote?.en).toMatch(/pre-existing/i)
        expect(risk?.eligibilityNote?.el).toMatch(/προϋπάρχουσες/)
    })

    it("family history escalates an existing life need and never creates one", () => {
        const noBeneficiary = ctxOf(
            bareProfile({ familyMedicalHistory: ["cancer"] })
        )
        const assessments = assessRisks(noBeneficiary, [])
        // Nobody depends on them and there is no debt — nobody suffers the loss.
        expect(assessments.find((a) => a.riskId === "life_dependents")?.status).toBe(
            "not_applicable"
        )
        expect(assessments.find((a) => a.riskId === "life_debt")?.status).toBe("not_applicable")
        expect(RISK_CATALOG.find((r) => r.id === "family_history_no_life")).toBeUndefined()

        // With a beneficiary, it raises the priority instead.
        const withDeps = (fh: string[] | null) =>
            assessRisk(
                RISK_CATALOG.find((r) => r.id === "life_dependents")!,
                ctxOf(bareProfile({ dependentsCount: 1, familyMedicalHistory: fh, savingsAmount: 0 })),
                []
            ).priority
        expect(withDeps(["cancer"])).toBe("critical")
    })
})

describe("materiality drives priority", () => {
    it("EUR 900 of debt and EUR 300,000 of debt are not the same finding", () => {
        const at = (loanAmount: number) =>
            assessRisks(
                ctxOf(bareProfile({ hasLoans: true, loanAmount })),
                []
            ).find((a) => a.riskId === "life_debt")!

        expect(at(900).priority).toBe("low")
        expect(at(50_000).priority).toBe("high")
        expect(at(300_000).priority).toBe("critical")
    })

    it("occupation decides professional liability priority", () => {
        const priorityFor = (occupation: string) =>
            assessRisks(
                ctxOf(bareProfile({ employmentStatus: "self_employed", occupation })),
                []
            ).find((a) => a.riskId === "professional_liability")!.priority

        expect(priorityFor("Αρχιτέκτονας")).toBe("high")
        expect(priorityFor("Surgeon")).toBe("high")
        expect(priorityFor("Barista")).toBe("medium")
    })
})

describe("priority ranks by what is actually at stake", () => {
    it("a discretionary risk never outranks the essential band", () => {
        // `discretionary` means the loss is survivable. Before the cap,
        // health_access_delay — private treatment SPEED, when ΕΟΠΥΥ already
        // covers the treatment — escalated to `high` for a self-employed person
        // with family medical history, ranking level with an entirely uninsured
        // business and above an employer's liability for four staff.
        const ctx = ctxOf(
            bareProfile({
                dateOfBirth: new Date("1970-01-01"),
                employmentStatus: "self_employed",
                dependentsCount: 3,
                familyMedicalHistory: ["cancer"],
                chronicConditions: ["diabetes"],
                savingsAmount: 500,
                ownsBusiness: true,
                businessEmployees: 4,
                travelsFrequently: true,
                activities: ["climbing"],
                valuablesValue: 40_000,
                cyberExposure: "high",
                hasPets: true,
            })
        )
        for (const a of assessRisks(ctx, [])) {
            if (a.kind !== "discretionary") continue
            expect(
                ["medium", "low"],
                `${a.riskId} is discretionary but ranked ${a.priority}`
            ).toContain(a.priority)
        }
    })

    it("every essential risk can still reach the top of the ranking", () => {
        const ctx = ctxOf(
            bareProfile({ vehiclesCount: 1, dependentsCount: 2, mortgageAmount: 250_000 })
        )
        const criticals = assessRisks(ctx, []).filter((a) => a.priority === "critical")
        expect(criticals.length).toBeGreaterThan(0)
        expect(criticals.every((a) => a.kind === "essential")).toBe(true)
    })
})

describe("every recommendation answers the six questions", () => {
    it("open findings carry risk, why, impact, priority, solution and confidence", () => {
        const ctx = ctxOf(
            bareProfile({
                vehiclesCount: 1,
                hasPets: true,
                dependentsCount: 2,
                residenceType: "owned",
                propertiesOwned: 1,
                mortgageAmount: 120_000,
            })
        )
        const findings = openFindings(assessRisks(ctx, []))
        expect(findings.length).toBeGreaterThan(3)

        for (const f of findings) {
            for (const field of [
                "riskExplanation",
                "whyItApplies",
                "expectedImpact",
                "suggestedSolution",
            ] as const) {
                expect(f[field].en.length, `${f.riskId}.${field}.en`).toBeGreaterThan(20)
                expect(f[field].el.length, `${f.riskId}.${field}.el`).toBeGreaterThan(20)
            }
            expect(["critical", "high", "medium", "low"]).toContain(f.priority)
            expect(["high", "medium", "low"]).toContain(f.confidence)
        }
    })

    it("catalog copy is bilingual and never leaks an English string into Greek", () => {
        const ctx = ctxOf(bareProfile({ vehiclesCount: 1, dependentsCount: 1 }))
        for (const risk of RISK_CATALOG) {
            expect(risk.name.el, `${risk.id} has no Greek name`).toBeTruthy()
            expect(risk.name.el).not.toBe(risk.name.en)
            const explanation = risk.riskExplanation(ctx)
            expect(explanation.el, `${risk.id} riskExplanation.el`).toBeTruthy()
            expect(explanation.el).not.toBe(explanation.en)
        }
    })

    it("money is grouped for the language of the sentence carrying it", () => {
        const ctx = ctxOf(bareProfile({ mortgageAmount: 150_000 }))
        const why = RISK_CATALOG.find((r) => r.id === "life_debt")!.whyItApplies(ctx)
        // Greek uses "." for thousands; an English-grouped 150,000 reads as 150.
        expect(why.el).toContain("150.000")
        expect(why.en).toContain("150,000")
    })
})

describe("the protection score reflects only relevant risks", () => {
    it("excludes not_applicable and needs_review from expected lines", () => {
        const ctx = ctxOf(bareProfile({ vehiclesCount: 1 }))
        const assessments = assessRisks(ctx, [{ lineOfBusiness: "motor", status: "active" }])
        const lines = relevantLines(assessments)

        expect(lines).toContain("motor")
        for (const absent of ["pet", "cyber", "business", "travel", "home"]) {
            expect(lines, `${absent} is not this customer's risk`).not.toContain(absent)
        }
    })

    it("a renter with a car is not shown a home or cyber gap on the branch map", () => {
        // The audit's headline false positive, reproduced exactly.
        const ctx = ctxOf(bareProfile({ vehiclesCount: 1, residenceType: "rented" }))
        const policies = [{ lineOfBusiness: "motor", status: "active" }]
        const score = calculateScoreFromAssessments(assessRisks(ctx, policies), ["motor"], [])

        const tiles = buildBranchOverview(
            policies.map((p, i) => ({
                id: String(i),
                lineOfBusiness: p.lineOfBusiness,
                status: p.status,
                endDate: null,
            })),
            score.expectedLines
        )
        const gapTiles = tiles.filter((t) => t.state === "not_held").map((t) => t.branch.id)
        expect(gapTiles).not.toContain("cyber")
        expect(gapTiles).not.toContain("travel")
        expect(gapTiles).not.toContain("pet")
    })

    it("a covered risk answered by another line does not paint its own tile", () => {
        // valuables_loss is written against `gadget` but answered by a home policy.
        const ctx = ctxOf(
            bareProfile({ residenceType: "owned", propertiesOwned: 1, valuablesValue: 30_000 })
        )
        const assessments = assessRisks(ctx, [{ lineOfBusiness: "home", status: "active" }])
        expect(assessments.find((a) => a.riskId === "valuables_loss")?.status).toBe(
            "already_covered"
        )
        expect(relevantLines(assessments)).not.toContain("gadget")
    })

    it("one uncovered discretionary risk cannot zero a category", () => {
        // Health contains exactly one discretionary risk (private treatment
        // speed). At full weight, everyone with only ΕΟΠΥΥ scored 0 / Critical.
        const assessments = assessRisks(toLifeContext(null), [])
        const score = calculateScoreFromAssessments(assessments, [], [])
        expect(score.categoryScores.health.score).toBeGreaterThan(0)
        expect(score.overallScore).toBeGreaterThan(0)
    })

    it("a well-covered household scores far above an uncovered one", () => {
        const profile = {
            dependentsCount: 3,
            childrenCount: 3,
            residenceType: "owned",
            propertiesOwned: 1,
            mortgageAmount: 300_000,
            annualIncome: 45_000,
            savingsAmount: 10_000,
        }
        const ctx = ctxOf(bareProfile(profile))
        const covered = calculateScoreFromAssessments(
            assessRisks(ctx, [
                { lineOfBusiness: "life", status: "active" },
                { lineOfBusiness: "home", status: "active" },
                { lineOfBusiness: "health", status: "active" },
            ]),
            ["life", "home", "health"],
            []
        ).overallScore
        const uncovered = calculateScoreFromAssessments(
            assessRisks(ctx, []),
            [],
            []
        ).overallScore

        expect(covered).toBeGreaterThan(75)
        expect(covered - uncovered).toBeGreaterThan(30)
    })
})

describe("insurance is one option, not the frame", () => {
    it("every risk offers at least one mitigation that is not insurance", () => {
        // Before the ladder existed, all 21 suggestedSolution entries named an
        // insurance product — not because that was the judgement, but because it
        // was the only field an author could write in. A model that can only
        // express `transfer` is quoting, not advising.
        const ctx = ctxOf(
            bareProfile({
                vehiclesCount: 1, hasPets: true, dependentsCount: 2, ownsBoat: true,
                residenceType: "owned", propertiesOwned: 2, rentsOutProperty: true,
                mortgageAmount: 120_000, ownsBusiness: true, businessEmployees: 3,
                employmentStatus: "self_employed", travelsFrequently: true,
                activities: ["climbing"], valuablesValue: 40_000, cyberExposure: "high",
                chronicConditions: ["diabetes"], drivingRecord: "accidents",
                savingsAmount: 5_000,
            })
        )
        for (const risk of RISK_CATALOG) {
            const mitigations = risk.mitigations(ctx)
            expect(mitigations.length, `${risk.id} offers nothing at all`).toBeGreaterThan(0)
            const nonInsurance = mitigations.filter((m) => m.kind !== "transfer")
            expect(
                nonInsurance.length,
                `${risk.id} offers only insurance — avoid, reduce or retain must be considered first`
            ).toBeGreaterThan(0)
        }
    })

    it("names an insurance line only on transfer options", () => {
        const ctx = ctxOf(bareProfile({ hasPets: true, vehiclesCount: 1 }))
        for (const risk of RISK_CATALOG) {
            for (const m of risk.mitigations(ctx)) {
                if (m.kind !== "transfer") {
                    expect(m.line, `${risk.id}: a ${m.kind} option names an insurance line`).toBeUndefined()
                }
            }
        }
    })

    it("every mitigation is written in both languages", () => {
        const ctx = ctxOf(bareProfile({ hasPets: true, ownsBoat: true, vehiclesCount: 1 }))
        for (const risk of RISK_CATALOG) {
            for (const m of risk.mitigations(ctx)) {
                for (const field of ["label", "detail"] as const) {
                    expect(m[field].el.length, `${risk.id}.${m.kind}.${field}.el`).toBeGreaterThan(3)
                    expect(m[field].en.length, `${risk.id}.${m.kind}.${field}.en`).toBeGreaterThan(3)
                    expect(m[field].el).not.toBe(m[field].en)
                }
            }
        }
    })

    it("states the exposure in the customer's own numbers where it has them", () => {
        // "Two pets" beats "you have pets" — the brief's example is literally
        // "Customer owns two dogs."
        const counted = ctxOf(bareProfile({ hasPets: true, petsCount: 2 }))
        const why = RISK_CATALOG.find((r) => r.id === "pet_costs")!.whyItApplies(counted)
        expect(why.en).toContain("2 pets")
        expect(why.el).toContain("2 κατοικίδια")

        // And degrades to the boolean rather than inventing a number.
        const uncounted = ctxOf(bareProfile({ hasPets: true }))
        const fallback = RISK_CATALOG.find((r) => r.id === "pet_costs")!.whyItApplies(uncounted)
        expect(fallback.en).not.toMatch(/\d/)
    })
})

describe("no recommendation rests on a missing product", () => {
    it("no risk justifies itself by the absence of cover", () => {
        // The `no_health` failure mode, asserted rather than remembered: a
        // whyItApplies that talks about what the customer does not HOLD instead
        // of what they are exposed to.
        const ctx = ctxOf(bareProfile({ hasPets: true, vehiclesCount: 1, dependentsCount: 1 }))
        const productAbsence = /\b(no|without|lack(s|ing)?|missing|do not have|don't have)\b[^.]{0,40}\b(polic|cover|insurance|ασφαλιστήριο|κάλυψη)/i
        for (const risk of RISK_CATALOG) {
            const why = risk.whyItApplies(ctx)
            expect(why.en, `${risk.id} justifies itself by a missing product`).not.toMatch(productAbsence)
        }
    })

    it("the advisor prompt is not a protection finding", () => {
        // `no_agent_connected` described no loss. It occupied a recommendation
        // slot, counted in gapCount and dragged the score, purely because the
        // customer had not connected an advisor.
        const source = readFileSync("lib/services/gap-engine/portfolio-rules.ts", "utf-8")
        const pushes = source.slice(source.indexOf("export function evaluatePortfolioRules"))
        expect(pushes).not.toMatch(/gaps\.push\(noAgent\)/)
        expect(pushes).not.toMatch(/gaps\.push\(unclear\)/)
    })
})

describe("catalog integrity", () => {
    it("risk ids are unique", () => {
        const ids = RISK_CATALOG.map((r) => r.id)
        expect(new Set(ids).size).toBe(ids.length)
    })

    it("every risk is gated on a declared exposure, not on silence", () => {
        // The engine's founding rule, asserted structurally. `health_access_delay`
        // is the single deliberate exception: waiting for treatment is an
        // exposure every resident carries, so it needs no qualifying fact.
        const UNIVERSAL = new Set(["health_access_delay"])
        for (const risk of RISK_CATALOG) {
            if (UNIVERSAL.has(risk.id)) continue
            expect(
                risk.requires.length,
                `${risk.id} decides applicability with no required fact, so "never asked" reads as "does not apply"`
            ).toBeGreaterThan(0)
        }
    })

    it("an unasked health question is not an answer of 'no conditions'", () => {
        const unasked = toLifeContext({ answeredFields: [] } as any)
        expect(
            assessRisks(unasked, []).find((a) => a.riskId === "chronic_condition_costs")!.status
        ).toBe("needs_review")

        const declaredNone = ctxOf(bareProfile({ chronicConditions: [] }))
        expect(
            assessRisks(declaredNone, []).find((a) => a.riskId === "chronic_condition_costs")!.status
        ).toBe("not_applicable")
    })

    it("every declared factor is a real context factor", () => {
        for (const risk of RISK_CATALOG) {
            for (const factor of [...risk.requires, ...(risk.supports ?? [])]) {
                expect(CONTEXT_FACTORS, `${risk.id} requires unknown factor ${factor}`).toContain(
                    factor
                )
            }
        }
    })

    // Exhaustive 18,432-combination sweep: ~1s locally but repeatedly over
    // the 5s default on CI's shared runners, where it blocked a production
    // deploy. The assertion is unchanged — only the budget is realistic.
    it("no risk is permanently shadowed — every one can reach a user", { timeout: 30_000 }, () => {
        // `income_no_protection` fired internally and was masked by a life rule
        // on the same line across all 18,432 profile combinations. A scored,
        // labelled category had no reachable rule and nobody noticed. This sweeps
        // the profile space and asserts every catalog entry surfaces somewhere.
        const bools = [false, true]
        const axes = {
            employmentStatus: ["employed", "self_employed", "retired"],
            residenceType: ["owned", "rented"],
            hasPets: bools,
            rentsOutProperty: bools,
            ownsBoat: bools,
            ownsBusiness: bools,
            vehiclesCount: [0, 1],
            // Cover varies INDEPENDENTLY of ownership. Always insuring the car
            // would make motor_liability look unreachable when it is the
            // catalog's most reachable risk — the sweep would be testing itself.
            insured: bools,
            dependentsCount: [0, 2],
            mortgageAmount: [0, 200_000],
            travelsFrequently: bools,
        }

        let combos: Array<Record<string, unknown>> = [{}]
        for (const [key, values] of Object.entries(axes)) {
            combos = combos.flatMap((c) => values.map((v) => ({ ...c, [key]: v })))
        }

        const reachable = new Set<string>()
        for (const combo of combos) {
            const { insured, ...profileAxes } = combo
            const ctx = ctxOf(
                bareProfile({
                    ...profileAxes,
                    propertiesOwned: profileAxes.residenceType === "owned" ? 2 : 0,
                    businessEmployees: profileAxes.ownsBusiness ? 3 : 0,
                    drivingRecord: "accidents",
                    activities: ["skiing"],
                    cyberExposure: "high",
                    valuablesValue: 30_000,
                    chronicConditions: ["diabetes"],
                    retirementPlanning: false,
                    isBuildingManager: true,
                    savingsAmount: 500,
                })
            )
            const policies =
                Number(profileAxes.vehiclesCount) > 0 && insured
                    ? [{ lineOfBusiness: "motor", status: "active" }]
                    : []
            for (const a of openFindings(assessRisks(ctx, policies))) reachable.add(a.riskId)
        }

        const unreachable = RISK_CATALOG.map((r) => r.id).filter((id) => !reachable.has(id))
        expect(unreachable, `these risks can never surface: ${unreachable.join(", ")}`).toEqual([])
    })

    it("every risk that names a covering line uses a known branch id", () => {
        // A typo here would silently mean "nothing ever covers this".
        for (const risk of RISK_CATALOG) {
            for (const lob of [risk.lineOfBusiness, ...(risk.alsoCoveredBy ?? [])]) {
                expect(
                    normalizeBranch(lob).id,
                    `${risk.id}: "${lob}" does not resolve to a real branch`
                ).toBe(lob)
            }
        }
    })
})
