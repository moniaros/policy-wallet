import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import {
    LIFE_EVENT_REGISTRY,
    getLifeEvent,
    lifeEventIds,
    declarableLifeEvents,
    magnitudePrompt,
} from "@/lib/services/life-events/registry"
import { applyLifeEvent, applyLifeEvents, mergeApplied, checkDependencies } from "@/lib/services/life-events/apply"
import { EVENT_DOMAINS, EVENT_KINDS, EVENT_SENSITIVITIES, EVENT_URGENCIES } from "@/lib/services/life-events/types"
import { CONTEXT_FACTORS, toLifeContext, totalDependents } from "@/lib/services/gap-engine/life-context"
import { RISK_CATALOG } from "@/lib/services/gap-engine/risk-catalog"
import { assessRisks, openFindings } from "@/lib/services/gap-engine/risk-assessment"
import { fingerprintAssessment } from "@/lib/services/life-events/risk-profile-version"
import { calculateScoreFromAssessments } from "@/lib/services/gap-engine/protection-score"

/**
 * The Life Event Engine.
 *
 * The founding rule is that events write to CONTEXT and never to
 * recommendations — so most of these assert the *shape* of the engine rather
 * than the behaviour of any one event. A rule enforced by structure survives
 * authors who have not read the spec.
 */

const occurrence = (definitionId: string, over: Record<string, unknown> = {}) => ({
    definitionId,
    occurredAt: new Date("2026-06-01"),
    source: "customer_declared" as const,
    confidence: "high" as const,
    magnitude: null,
    ...over,
})

describe("the registry is data, and complete", () => {
    it("covers every event the brief requires", () => {
        const required = [
            "marriage", "divorce", "birth", "child_leaves_home",
            "property_purchase", "property_sale", "mortgage", "renting",
            "vehicle_purchase", "motorcycle_purchase", "boat_purchase",
            "pet_adoption", "business_creation", "hired_employees", "retirement",
            "income_increase", "travel_frequency_increase", "high_value_purchase",
            "health_change",
        ]
        for (const id of required) {
            expect(getLifeEvent(id), `${id} is missing from the registry`).toBeDefined()
        }
    })

    it("has unique ids and valid enum values throughout", () => {
        const ids = lifeEventIds()
        expect(new Set(ids).size).toBe(ids.length)
        for (const e of LIFE_EVENT_REGISTRY) {
            expect(EVENT_DOMAINS, `${e.id} domain`).toContain(e.domain)
            expect(EVENT_KINDS, `${e.id} kind`).toContain(e.kind)
            expect(EVENT_SENSITIVITIES, `${e.id} sensitivity`).toContain(e.sensitivity)
            expect(EVENT_URGENCIES, `${e.id} urgency`).toContain(e.urgency)
            expect(e.window.days, `${e.id} window`).toBeGreaterThan(0)
            expect(e.detection.length, `${e.id} has no detection source`).toBeGreaterThan(0)
        }
    })

    it("writes only to real context factors and real profile columns", () => {
        // The engine's vocabulary is closed. A typo here would mean a delta that
        // silently settles nothing.
        const validColumns = new Set([
            "maritalStatus", "childrenCount", "dependentsCount", "hasPets", "petsCount",
            "vehiclesCount", "residenceType", "propertiesOwned", "rentsOutProperty",
            "ownsBoat", "ownsBusiness", "businessEmployees", "employmentStatus",
            "annualIncome", "savingsAmount", "mortgageAmount", "hasLoans", "loanAmount",
            "travelsFrequently", "activities", "valuablesValue", "cyberExposure",
            "retirementPlanning", "chronicConditions", "dateOfBirth", "occupation",
        ])
        for (const e of LIFE_EVENT_REGISTRY) {
            for (const d of e.contextDelta) {
                expect(CONTEXT_FACTORS, `${e.id}: unknown factor "${d.factor}"`).toContain(d.factor)
                expect(validColumns, `${e.id}: unknown column "${d.column}"`).toContain(d.column)
            }
        }
    })

    it("references only risks that exist in the catalog", () => {
        const known = new Set(RISK_CATALOG.map((r) => r.id))
        for (const e of LIFE_EVENT_REGISTRY) {
            for (const id of [...e.introduces, ...e.retires]) {
                expect(known, `${e.id} references unknown risk "${id}"`).toContain(id)
            }
        }
    })

    it("declares only events that exist as dependencies and reversals", () => {
        const ids = new Set(lifeEventIds())
        for (const e of LIFE_EVENT_REGISTRY) {
            for (const d of e.dependsOn) {
                if (d.kind !== "requires_event") continue
                expect(ids, `${e.id} depends on unknown event "${d.target}"`).toContain(d.target)
            }
            for (const r of e.reversedBy) {
                expect(ids, `${e.id} is reversed by unknown event "${r}"`).toContain(r)
            }
        }
    })

    it("has an acyclic prerequisite graph", () => {
        const seen = new Map<string, number>()
        const walk = (id: string, stack: string[]): void => {
            if (stack.includes(id)) throw new Error(`cycle: ${[...stack, id].join(" → ")}`)
            if (seen.get(id) === 1) return
            const def = getLifeEvent(id)
            for (const d of def?.dependsOn ?? []) {
                if (d.kind === "requires_event") walk(d.target, [...stack, id])
            }
            seen.set(id, 1)
        }
        expect(() => lifeEventIds().forEach((id) => walk(id, []))).not.toThrow()
    })

    it("can express risk REDUCTION, not only accumulation", () => {
        // A model with no disposals is a ratchet: it can add exposure forever and
        // never remove any, so "you need less cover now" becomes unsayable.
        const retiring = LIFE_EVENT_REGISTRY.filter((e) => e.retires.length > 0)
        expect(retiring.length).toBeGreaterThanOrEqual(4)
        expect(LIFE_EVENT_REGISTRY.some((e) => e.kind === "disposal")).toBe(true)
    })
})

describe("events write to context, never to recommendations", () => {
    it("exposes no field in which a product or severity could be written", () => {
        // The guarantee is structural: there is nowhere for a product-trigger to
        // live, so an author cannot introduce one by forgetting the rule.
        const forbidden = ["product", "premium", "insurer", "severity", "recommendation", "price"]
        for (const e of LIFE_EVENT_REGISTRY) {
            for (const key of Object.keys(e)) {
                expect(
                    forbidden.some((f) => key.toLowerCase().includes(f)),
                    `${e.id} carries a product-shaped field "${key}"`
                ).toBe(false)
            }
        }
    })

    it("`introduces` is a possibility, not a promise — the catalog still decides", () => {
        // marriage introduces life_dependents, but a married person with nobody
        // depending on their income still has no life-cover need.
        const ctx = toLifeContext({
            answeredFields: ["maritalStatus", "dependentsCount", "childrenCount", "employmentStatus"],
            maritalStatus: "married",
            dependentsCount: 0,
            childrenCount: 0,
            employmentStatus: "employed",
        } as any)
        const life = assessRisks(ctx, []).find((a) => a.riskId === "life_dependents")
        expect(getLifeEvent("marriage")!.introduces).toContain("life_dependents")
        expect(life!.status).toBe("not_applicable")
    })
})

describe("applying an event", () => {
    it("increments from the current value, not from zero", () => {
        const first = applyLifeEvent(occurrence("birth"), { childrenCount: 1, dependentsCount: 2 })
        expect(first.patch.childrenCount).toBe(2)
        expect(first.patch.dependentsCount).toBe(3)
    })

    it("settles the factor so the risk leaves needs_review", () => {
        // Without answeredFields an event can change a value and still leave the
        // engine saying "we have not asked".
        const applied = applyLifeEvent(occurrence("pet_adoption"), null)
        expect(applied.answeredColumns).toContain("hasPets")

        const ctx = toLifeContext({
            ...applied.patch,
            answeredFields: applied.answeredColumns,
        } as any)
        expect(assessRisks(ctx, []).find((a) => a.riskId === "pet_costs")!.status).not.toBe(
            "needs_review"
        )
    })

    it("never drives a counter negative", () => {
        const applied = applyLifeEvent(occurrence("vehicle_disposal"), { vehiclesCount: 0 })
        expect(applied.patch.vehiclesCount).toBe(0)
    })

    it("skips rather than guesses when a magnitude is missing", () => {
        // Writing 0 for "you took out a mortgage" would be a declaration that
        // there is no debt.
        const applied = applyLifeEvent(occurrence("mortgage"), null)
        expect(applied.patch.mortgageAmount).toBeUndefined()
        expect(applied.skipped.map((s) => s.reason)).toContain("no_value_supplied")
    })

    it("uses the supplied magnitude when there is one", () => {
        const applied = applyLifeEvent(occurrence("mortgage", { magnitude: 180000 }), null)
        expect(applied.patch.mortgageAmount).toBe(180000)
    })

    it("lets an inferred event mark a factor known but never assert its value", () => {
        const applied = applyLifeEvent(
            occurrence("property_purchase", { source: "profile_delta", confidence: "medium" }),
            null
        )
        expect(applied.patch.residenceType).toBeUndefined()
        expect(applied.answeredColumns).toContain("residenceType")
        expect(applied.skipped.map((s) => s.reason)).toContain("inferred_may_not_assert")
    })

    it("applies a sequence cumulatively", () => {
        const results = applyLifeEvents(
            [occurrence("birth"), occurrence("birth"), occurrence("birth")],
            null
        )
        expect(results[2].patch.childrenCount).toBe(3)
        expect(mergeApplied(results).patch.childrenCount).toBe(3)
    })

    it("refuses a non-finite magnitude rather than writing it", () => {
        // `increment` already went through a numeric coercion; `set` took the
        // value on trust and wrote NaN or Infinity into the profile, where every
        // downstream comparison against it silently returns false.
        for (const magnitude of [NaN, Infinity, -Infinity]) {
            const applied = applyLifeEvent(occurrence("mortgage", { magnitude }), null)
            expect(applied.patch.mortgageAmount, `wrote ${magnitude}`).toBeUndefined()
            expect(applied.skipped.map((s) => s.reason)).toContain("not_a_finite_number")
        }
    })

    it("survives a hostile or degenerate profile", () => {
        const cases: Array<Record<string, unknown> | null> = [
            null,
            {},
            { childrenCount: "three", dependentsCount: [] },
            { vehiclesCount: Number.MAX_SAFE_INTEGER },
        ]
        for (const profile of cases) {
            for (const definition of LIFE_EVENT_REGISTRY) {
                const applied = applyLifeEvent(
                    occurrence(definition.id, { magnitude: 1000 }),
                    profile
                )
                for (const [column, value] of Object.entries(applied.patch)) {
                    if (typeof value !== "number") continue
                    expect(Number.isFinite(value), `${definition.id}.${column}`).toBe(true)
                    expect(value, `${definition.id}.${column} is negative`).toBeGreaterThanOrEqual(0)
                }
            }
        }
    })

    it("reports an unknown event instead of throwing", () => {
        const applied = applyLifeEvent(occurrence("not_a_real_event"), null)
        expect(applied.skipped[0].reason).toBe("unknown_event")
        expect(applied.patch).toEqual({})
    })

    it("health changes mark the factor asked without writing Art. 9 data", () => {
        // The condition list is special-category and is written only through the
        // explicitly consented surface — never as a side effect of an event.
        const applied = applyLifeEvent(occurrence("health_change"), null)
        expect(applied.patch).toEqual({})
        expect(applied.answeredColumns).toContain("chronicConditions")
        expect(getLifeEvent("health_change")!.sensitivity).toBe("special_category")
    })
})

describe("dependencies", () => {
    it("reports a missing prerequisite so the caller can backfill it", () => {
        // Someone declaring a child leaving home HAS a child; the missing
        // antecedent is our gap, not theirs.
        const check = checkDependencies("child_leaves_home", [])
        expect(check.satisfied).toBe(false)
        expect(check.missing[0].target).toBe("birth")
    })

    it("is satisfied once the prerequisite is on record", () => {
        expect(checkDependencies("child_leaves_home", ["birth"]).satisfied).toBe(true)
    })
})

describe("events move the assessment", () => {
    const base = {
        answeredFields: [
            "dateOfBirth", "maritalStatus", "childrenCount", "dependentsCount", "hasPets",
            "vehiclesCount", "residenceType", "propertiesOwned", "rentsOutProperty", "ownsBoat",
            "ownsBusiness", "employmentStatus", "businessEmployees", "annualIncome",
            "savingsAmount", "mortgageAmount", "hasLoans", "travelsFrequently", "activities",
            "valuablesValue", "cyberExposure", "retirementPlanning", "chronicConditions",
        ],
        dateOfBirth: new Date("1992-01-01"),
        maritalStatus: "single", childrenCount: 0, dependentsCount: 0, hasPets: false,
        vehiclesCount: 0, residenceType: "rented", propertiesOwned: 0, rentsOutProperty: false,
        ownsBoat: false, ownsBusiness: false, employmentStatus: "employed", businessEmployees: 0,
        annualIncome: 30000, savingsAmount: 15000, mortgageAmount: null, hasLoans: false,
        travelsFrequently: false, activities: [], valuablesValue: 0, cyberExposure: "low",
        retirementPlanning: false, chronicConditions: [],
    }

    it("a birth makes the life risk applicable where it was not", () => {
        const before = assessRisks(toLifeContext(base as any), [])
        expect(before.find((a) => a.riskId === "life_dependents")!.status).toBe("not_applicable")

        const applied = applyLifeEvent(occurrence("birth"), base)
        const after = assessRisks(
            toLifeContext({ ...base, ...applied.patch } as any),
            []
        )
        expect(after.find((a) => a.riskId === "life_dependents")!.status).toBe("protection_gap")
    })

    it("buying a property moves the exposure from tenant to owner", () => {
        const applied = applyLifeEvent(occurrence("property_purchase"), base)
        const after = assessRisks(toLifeContext({ ...base, ...applied.patch } as any), [])
        expect(after.find((a) => a.riskId === "home_building_damage")!.status).toBe("protection_gap")
        expect(after.find((a) => a.riskId === "home_contents_tenant")!.status).toBe("not_applicable")
    })

    it("a disposal REMOVES exposure — the reduction case", () => {
        const owner = { ...base, vehiclesCount: 1 }
        expect(
            assessRisks(toLifeContext(owner as any), []).find((a) => a.riskId === "motor_liability")!.status
        ).toBe("protection_gap")

        const applied = applyLifeEvent(occurrence("vehicle_disposal"), owner)
        const after = assessRisks(toLifeContext({ ...owner, ...applied.patch } as any), [])
        expect(after.find((a) => a.riskId === "motor_liability")!.status).toBe("not_applicable")
    })

    it("every registry event either changes the assessment or explains why not", () => {
        // An event that moves nothing is legitimate (a licence, a renovation) but
        // must be deliberate: it declares no introduces and no retires.
        for (const definition of LIFE_EVENT_REGISTRY) {
            const inert = definition.introduces.length === 0 && definition.retires.length === 0
            const hasDelta = definition.contextDelta.length > 0
            expect(
                hasDelta || inert,
                `${definition.id} claims to change risks but writes no context`
            ).toBe(true)
        }
    })
})

describe("risk profile versioning", () => {
    const ctxOf = (p: any) => toLifeContext(p)
    const assessAndScore = (profile: any, policies: any[] = []) => {
        const assessments = assessRisks(ctxOf(profile), policies)
        const lobs = [...new Set(policies.map((p: any) => p.lineOfBusiness.toLowerCase()))] as string[]
        return { assessments, score: calculateScoreFromAssessments(assessments, lobs, []) }
    }

    it("fingerprints identical assessments identically", () => {
        const a = assessAndScore({ answeredFields: [], hasPets: true })
        const b = assessAndScore({ answeredFields: [], hasPets: true })
        expect(fingerprintAssessment(a.assessments, a.score)).toBe(
            fingerprintAssessment(b.assessments, b.score)
        )
    })

    it("fingerprints a changed assessment differently", () => {
        const before = assessAndScore({ answeredFields: ["hasPets"], hasPets: false })
        const after = assessAndScore({ answeredFields: ["hasPets"], hasPets: true })
        expect(fingerprintAssessment(before.assessments, before.score)).not.toBe(
            fingerprintAssessment(after.assessments, after.score)
        )
    })

    it("ignores prose so rewording a risk does not manufacture a version", () => {
        // A version is a claim that the customer's position changed. Editing an
        // explanation must not make that claim.
        const { assessments, score } = assessAndScore({ answeredFields: ["hasPets"], hasPets: true })
        const reworded = assessments.map((a) => ({
            ...a,
            riskExplanation: { en: "totally different text", el: "εντελώς διαφορετικό κείμενο" },
            whyItApplies: { en: "different", el: "διαφορετικό" },
        }))
        expect(fingerprintAssessment(reworded, score)).toBe(fingerprintAssessment(assessments, score))
    })

    it("changes when cover changes, not only when exposure does", () => {
        const profile = { answeredFields: ["vehiclesCount"], vehiclesCount: 1 }
        const uncovered = assessAndScore(profile)
        const covered = assessAndScore(profile, [{ lineOfBusiness: "motor", status: "active" }])
        expect(fingerprintAssessment(uncovered.assessments, uncovered.score)).not.toBe(
            fingerprintAssessment(covered.assessments, covered.score)
        )
    })
})

describe("the declarable surface", () => {
    it("offers every customer-declarable event", () => {
        expect(declarableLifeEvents().length).toBe(
            LIFE_EVENT_REGISTRY.filter((e) =>
                e.detection.some((d) => d.source === "customer_declared")
            ).length
        )
    })

    it("asks for an amount exactly where a delta needs one", () => {
        expect(magnitudePrompt("mortgage")).not.toBeNull()
        expect(magnitudePrompt("hired_employees")).not.toBeNull()
        expect(magnitudePrompt("income_increase")).not.toBeNull()
        // Deltas carrying their own literal need nothing from the reader.
        expect(magnitudePrompt("marriage")).toBeNull()
        expect(magnitudePrompt("birth")).toBeNull()
    })

    it("is bilingual throughout", () => {
        for (const e of LIFE_EVENT_REGISTRY) {
            for (const field of ["label", "description"] as const) {
                expect(e[field].el.length, `${e.id}.${field}.el`).toBeGreaterThan(3)
                expect(e[field].en.length, `${e.id}.${field}.en`).toBeGreaterThan(3)
                expect(e[field].el).not.toBe(e[field].en)
            }
        }
    })
})


describe("declared effects match real behaviour", () => {
    // `introduces` and `retires` are documentation until something checks them.
    // Every finding below was a real defect found by writing this: a disposal
    // that could never retire anything, a sale that left the risk open, and a
    // letting flag with no property behind it.
    const SUPPORT = {
        employmentStatus: "self_employed", annualIncome: 40000, savingsAmount: 1000,
        chronicConditions: ["diabetes"], drivingRecord: "accidents", occupation: "Αρχιτέκτονας",
    }
    const SUPPORT_ANSWERED = [
        "employmentStatus", "annualIncome", "savingsAmount", "chronicConditions", "drivingRecord",
    ]

    it("every claimed `introduces` is reachable in a supportive context", () => {
        for (const def of LIFE_EVENT_REGISTRY) {
            if (def.introduces.length === 0) continue
            const applied = applyLifeEvent(occurrence(def.id, { magnitude: 150000 }), SUPPORT)
            const ctx = toLifeContext({
                ...SUPPORT, ...applied.patch,
                answeredFields: [...SUPPORT_ANSWERED, ...applied.answeredColumns],
            } as any)
            const assessed = new Map(assessRisks(ctx, []).map((a) => [a.riskId, a]))
            for (const riskId of def.introduces) {
                expect(
                    assessed.get(riskId)?.status,
                    `${def.id} claims to introduce ${riskId}, which is unreachable`
                ).not.toBe("not_applicable")
            }
        }
    })

    // Each setup makes the target risk APPLY, so the disposal has something to
    // retire. A setup that fails to do so is itself a finding.
    const RETIRE_SETUPS: Record<string, Record<string, unknown>> = {
        child_leaves_home: {
            childrenCount: 1, dependentsCount: 1, employmentStatus: "employed", annualIncome: 30000,
        },
        property_sale: { residenceType: "owned", propertiesOwned: 1, rentsOutProperty: true },
        vehicle_disposal: { vehiclesCount: 1, drivingRecord: "accidents" },
        mortgage_cleared: { mortgageAmount: 100000, hasLoans: false, loanAmount: null },
        property_purchase: { residenceType: "rented" },
        retirement: {
            employmentStatus: "self_employed", annualIncome: 40000, savingsAmount: 1000,
            ownsBusiness: false,
        },
    }

    it("every claimed `retires` actually retires the risk", () => {
        for (const def of LIFE_EVENT_REGISTRY) {
            if (def.retires.length === 0) continue
            const setup = RETIRE_SETUPS[def.id]
            expect(setup, `${def.id} retires ${def.retires.join(", ")} but has no test setup`).toBeDefined()

            const answered = Object.keys(setup)
            const before = new Map(
                assessRisks(toLifeContext({ ...setup, answeredFields: answered } as any), []).map(
                    (a) => [a.riskId, a]
                )
            )
            const applied = applyLifeEvent(occurrence(def.id), setup)
            const after = new Map(
                assessRisks(
                    toLifeContext({
                        ...setup, ...applied.patch,
                        answeredFields: [...answered, ...applied.answeredColumns],
                    } as any),
                    []
                ).map((a) => [a.riskId, a])
            )

            for (const riskId of def.retires) {
                expect(
                    before.get(riskId)?.status,
                    `${def.id}: setup does not make ${riskId} apply, so the claim is untested`
                ).not.toBe("not_applicable")
                expect(
                    after.get(riskId)?.status,
                    `${def.id} claims to retire ${riskId} but it survives the event`
                ).toBe("not_applicable")
            }
        }
    })

    it("a grown child stops being a dependant without stopping being a child", () => {
        // The max(dependents, children) this replaced made `child_leaves_home`
        // inert: the one event whose purpose is to REDUCE cover could never
        // retire the risk it targets.
        const setup = {
            childrenCount: 1, dependentsCount: 1,
            employmentStatus: "employed", annualIncome: 30000,
        }
        const applied = applyLifeEvent(occurrence("child_leaves_home"), setup)
        expect(applied.patch.childrenCount, "they are still your child").toBeUndefined()

        const ctx = toLifeContext({
            ...setup, ...applied.patch,
            answeredFields: [...Object.keys(setup), ...applied.answeredColumns],
        } as any)
        expect(totalDependents(ctx)).toBe(0)
        expect(ctx.childrenCount).toBe(1)
    })

    it("a letting flag with no property behind it is stale data, not an exposure", () => {
        const sold = toLifeContext({
            rentsOutProperty: true, propertiesOwned: 0, residenceType: "owned",
            answeredFields: ["rentsOutProperty", "propertiesOwned", "residenceType"],
        } as any)
        const assessed = new Map(assessRisks(sold, []).map((a) => [a.riskId, a]))
        expect(assessed.get("landlord_letting")!.status).toBe("not_applicable")
        expect(assessed.get("home_building_damage")!.status).toBe("not_applicable")
    })
})

describe("a version records what actually caused it", () => {
    const ENGINE = readFileSync("lib/services/gap-engine/index.ts", "utf-8")
    const CRON = readFileSync("app/api/v1/jobs/protection-score-refresh/route.ts", "utf-8")

    it("does not stamp every automatic recalculation as a policy change", () => {
        // `trigger` is the one column that explains a score movement. Hardcoding
        // it meant a questionnaire submission and a nightly cron both appeared in
        // the history as policy changes, which is worse than no history.
        expect(ENGINE).toMatch(/trigger: opts\?\.trigger \?\? "policy_change"/)
    })

    it("the cron says cron and a profile update says profile update", () => {
        expect(CRON).toMatch(/trigger: "cron"/)
        expect(ENGINE).toMatch(/trigger: RunGapEngineOptions\["trigger"\] = "profile_update"/)
    })
})

describe("new personal-data stores are wired into the DSR paths", () => {
    // Third occurrence of this defect class in this codebase: a store holding
    // personal data added without Art. 15 export or erasure wiring. Asserted
    // here so the next one fails at CI rather than at a subject-access request.
    const EXPORT = readFileSync("lib/services/compliance.service.ts", "utf-8")
    const ERASURE = readFileSync("lib/services/gdpr-erasure.service.ts", "utf-8")

    it.each(["lifeEventInstance", "riskProfileVersion"])(
        "%s is disclosed in the Art. 15 export",
        (model) => {
            expect(EXPORT, `${model} is absent from the subject-access export`).toContain(
                `db.${model}.findMany`
            )
        }
    )

    it.each(["lifeEventInstance", "riskProfileVersion"])(
        "%s is deleted on erasure",
        (model) => {
            // The erasure model is anonymize-in-place — the User row survives, so
            // ON DELETE CASCADE never fires and a store left off this list would
            // outlive the request that asked for it to go.
            expect(ERASURE, `${model} survives erasure`).toContain(
                `tx.${model}.deleteMany({ where: { userId } })`
            )
        }
    )

    it("life events reach the export with their applied patch, not just their id", () => {
        // The patch is what we actually wrote about the person; disclosing the
        // event id alone would be a partial answer.
        const block = EXPORT.slice(EXPORT.indexOf("db.lifeEventInstance.findMany"))
        expect(block.slice(0, 600)).toContain("appliedPatch: true")
    })
})
