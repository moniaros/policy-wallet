import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/db", () => ({ db: { gapDefinition: { findMany: vi.fn() } } }))

import { evaluateGapLogic, hasEvaluableRule } from "@/lib/gap-detection"

/**
 * The rule evaluator, exercised.
 *
 * Until Aug 2026 nothing called these functions with real inputs. The only
 * "tests" read the source as a string and asserted substrings, which cannot
 * catch a wrong answer — and the wrong answer this file exists for is the
 * expensive one: treating a field the extractor never mentioned as proof that
 * the cover is absent.
 *
 * A coverage gap is a claim about someone's insurance. "We did not read
 * anything about leishmaniasis" and "your dog is not covered for
 * leishmaniasis" are different claims, and only one of them is safe to make
 * from silence.
 */

const policy = (acordData: unknown) =>
    ({
        id: "pol_1",
        lineOfBusiness: "pet",
        coverageSummary: null,
        insurerName: "Test",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2027-01-01"),
        acordData,
    }) as any

const def = (detectionLogic: unknown) => ({ detectionLogic }) as any

describe("unknown is not the same as absent", () => {
    const leishmania = def({
        rules: [{ type: "acord_field_check", field: "pet.leishmaniaCovered", operator: "is_false" }],
        operator: "AND",
    })

    it("flags the gap when the document says the cover is absent", () => {
        expect(evaluateGapLogic(policy({ pet: { leishmaniaCovered: false } }), leishmania)).toBe(true)
    })

    it("does NOT flag when the extraction never mentioned it", () => {
        // The field is simply missing — the schema no longer defaults it to
        // false, and the evaluator no longer reads absence as a "no".
        expect(evaluateGapLogic(policy({ pet: {} }), leishmania)).toBe(false)
        expect(evaluateGapLogic(policy({}), leishmania)).toBe(false)
    })

    it("does not flag when the cover is present", () => {
        expect(evaluateGapLogic(policy({ pet: { leishmaniaCovered: true } }), leishmania)).toBe(false)
    })
})

describe("all_false — 'you need all of these to qualify'", () => {
    // The ENFIA discount needs fire AND earthquake AND flood.
    const enfia = def({
        rules: [
            {
                type: "acord_field_check",
                field: "property",
                fields: [
                    "property.fireCoverageIncluded",
                    "property.earthquakeCoverageIncluded",
                    "property.floodCoverageIncluded",
                ],
                operator: "all_false",
            },
        ],
        operator: "AND",
    })

    it("flags when one of the three is explicitly absent", () => {
        const p = policy({
            property: {
                fireCoverageIncluded: true,
                earthquakeCoverageIncluded: false,
                floodCoverageIncluded: true,
            },
        })
        expect(evaluateGapLogic(p, enfia)).toBe(true)
    })

    it("does NOT flag when a field is merely unknown", () => {
        // Two confirmed present, one never extracted: we cannot yet say the
        // policy fails to qualify, and saying so would be a fabricated finding.
        const p = policy({
            property: { fireCoverageIncluded: true, earthquakeCoverageIncluded: true },
        })
        expect(evaluateGapLogic(p, enfia)).toBe(false)
    })

    it("does not flag when all three are present", () => {
        const p = policy({
            property: {
                fireCoverageIncluded: true,
                earthquakeCoverageIncluded: true,
                floodCoverageIncluded: true,
            },
        })
        expect(evaluateGapLogic(p, enfia)).toBe(false)
    })
})

describe("missing — for fields where absence IS the finding", () => {
    const coordination = def({
        rules: [
            { type: "acord_field_check", field: "health.coordinationCentre.phone", operator: "missing" },
        ],
        operator: "AND",
    })

    it("flags when the number is not recorded", () => {
        expect(evaluateGapLogic(policy({ health: {} }), coordination)).toBe(true)
    })

    it("does not flag when it is recorded", () => {
        const p = policy({ health: { coordinationCentre: { phone: "+30 210 0000000" } } })
        expect(evaluateGapLogic(p, coordination)).toBe(false)
    })
})

describe("is_true requires an explicit true", () => {
    const rule = def({ type: "acord_field_check", field: "vehicle.hasRoadsideAssistance", operator: "is_true" })

    it("is true only when the field says so", () => {
        expect(evaluateGapLogic(policy({ vehicle: { hasRoadsideAssistance: true } }), rule)).toBe(true)
        expect(evaluateGapLogic(policy({ vehicle: {} }), rule)).toBe(false)
        expect(evaluateGapLogic(policy({ vehicle: { hasRoadsideAssistance: false } }), rule)).toBe(false)
    })
})

describe("AND / OR composition", () => {
    const both = (operator: "AND" | "OR") =>
        def({
            operator,
            rules: [
                { type: "acord_field_check", field: "pet.leishmaniaCovered", operator: "is_false" },
                { type: "acord_field_check", field: "pet.dentalCovered", operator: "is_false" },
            ],
        })

    it("AND needs every rule to fire", () => {
        const one = policy({ pet: { leishmaniaCovered: false, dentalCovered: true } })
        const two = policy({ pet: { leishmaniaCovered: false, dentalCovered: false } })
        expect(evaluateGapLogic(one, both("AND"))).toBe(false)
        expect(evaluateGapLogic(two, both("AND"))).toBe(true)
    })

    it("OR needs only one", () => {
        const one = policy({ pet: { leishmaniaCovered: false, dentalCovered: true } })
        expect(evaluateGapLogic(one, both("OR"))).toBe(true)
    })
})

describe("what counts as a rule at all", () => {
    it("accepts a real rule", () => {
        expect(hasEvaluableRule(def({ rules: [{ type: "acord_field_check" }] }))).toBe(true)
        expect(hasEvaluableRule(def({ type: "always" }))).toBe(true)
    })

    // These two shapes are the whole reason detection drifted: a question for a
    // model, and the marker the AI stamped on definitions it minted for itself.
    // Neither can be evaluated, and both used to fall through to `false`
    // silently — indistinguishable from "we checked and found nothing".
    it("rejects a natural-language question", () => {
        expect(hasEvaluableRule(def({ check: "Does the policy cover earthquake?" }))).toBe(false)
    })

    it("rejects an AI-minted definition", () => {
        expect(hasEvaluableRule(def({ source: "ai_clarity_pipeline" }))).toBe(false)
    })

    it("rejects nothing at all", () => {
        expect(hasEvaluableRule(def(null))).toBe(false)
        expect(hasEvaluableRule(def({}))).toBe(false)
    })
})
