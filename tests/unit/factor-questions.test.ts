import { describe, expect, it } from "vitest"

import { AREA_IDS, areaForRisk } from "@/lib/protection/domains"
import {
    FACTOR_QUESTIONS,
    INCOME_DEPENDENCY_FACTOR,
    engineColumnsFor,
    questionForFactor,
    questionsForArea,
    type FactorQuestion,
} from "@/lib/protection/factor-questions"
import { CONTEXT_FACTORS, FACTOR_COLUMNS, type ContextFactorKey } from "@/lib/services/gap-engine/life-context"
import { RISK_CATALOG } from "@/lib/services/gap-engine/risk-catalog"

/**
 * One question per context factor — docs/planning/PERSONAL_RISK_PROFILE.md §E:
 * "each unknown factor of an activated area's risks maps to one question
 * component (factor → column(s), input type, Greek prompt, why we ask, Art. 9
 * flag)". The universe is CONTEXT_FACTORS itself, read from the engine, so a
 * factor added there without a question fails here.
 */

const byFactor = new Map(FACTOR_QUESTIONS.map((q) => [q.factor, q]))
const nonEmpty = (s: string) => typeof s === "string" && s.trim().length > 0
const GREEK = /[Ͱ-Ͽ]/

describe("every context factor has a question", () => {
    it("covers all of CONTEXT_FACTORS plus income dependency, once each", () => {
        expect(CONTEXT_FACTORS.length).toBeGreaterThanOrEqual(17)
        expect(FACTOR_QUESTIONS.map((q) => q.factor)).toEqual([...CONTEXT_FACTORS, INCOME_DEPENDENCY_FACTOR])
        expect(byFactor.size).toBe(FACTOR_QUESTIONS.length)
        for (const factor of CONTEXT_FACTORS) expect(questionForFactor(factor)?.factor).toBe(factor)
    })

    it.each(FACTOR_QUESTIONS.map((q) => [q.factor, q] as const))("%s carries el+en prompt, why and a short noun", (_factor, q) => {
        for (const field of ["prompt", "why", "shortNoun"] as const) {
            expect(nonEmpty(q[field].el), `${q.factor}.${field}.el`).toBe(true)
            expect(nonEmpty(q[field].en), `${q.factor}.${field}.en`).toBe(true)
            expect(GREEK.test(q[field].el), `${q.factor}.${field}.el is not Greek`).toBe(true)
            expect(GREEK.test(q[field].en), `${q.factor}.${field}.en contains Greek`).toBe(false)
        }
    })

    it("only `health` is special-category data", () => {
        expect(FACTOR_QUESTIONS.filter((q) => q.specialCategory).map((q) => q.factor)).toEqual(["health"])
    })

    it("the health prompt says answering is optional, and the why says what it is for", () => {
        const health = byFactor.get("health")!
        expect(health.prompt.el).toMatch(/προαιρετική/)
        expect(health.prompt.en).toMatch(/optional/i)
        expect(health.why.el).toMatch(/συγκατάθεσ/)
        expect(health.why.en).toMatch(/consent/i)
    })

    it("every question writes a column the engine reads for that factor", () => {
        for (const q of FACTOR_QUESTIONS) {
            expect(q.columns.length, q.factor).toBeGreaterThan(0)
            const allowed = engineColumnsFor(q.factor)
            for (const column of q.columns) expect(allowed, `${q.factor} writes ${column}`).toContain(column)
        }
        // The engine's table is the authority, read from the module — not retyped here.
        for (const factor of CONTEXT_FACTORS) expect(engineColumnsFor(factor)).toBe(FACTOR_COLUMNS[factor])
        expect(engineColumnsFor(INCOME_DEPENDENCY_FACTOR)).toEqual(["incomeDependency"])
    })

    it("choice inputs carry options with both labels; free inputs carry none", () => {
        for (const q of FACTOR_QUESTIONS) {
            if (q.input === "single" || q.input === "multi") {
                expect(q.options?.length, q.factor).toBeGreaterThan(0)
                for (const o of q.options ?? []) {
                    expect(nonEmpty(o.value), `${q.factor}.${o.value}`).toBe(true)
                    expect(nonEmpty(o.label.el), `${q.factor}.${o.value}.el`).toBe(true)
                    expect(nonEmpty(o.label.en), `${q.factor}.${o.value}.en`).toBe(true)
                }
            } else {
                expect(q.options, q.factor).toBeUndefined()
            }
        }
        expect(byFactor.get("incomeDependency")!.options!.map((o) => o.value)).toEqual(["primary", "shared", "minor"])
        expect(byFactor.get("hobbies")!.options!.map((o) => o.value)).toContain("none")
        expect(byFactor.get("health")!.options!.map((o) => o.value)).toContain("none")
    })

    it("each question's areas come from the catalogue through the domain table", () => {
        for (const q of FACTOR_QUESTIONS) {
            expect(q.area.length, `${q.factor} belongs to no area`).toBeGreaterThan(0)
            for (const a of q.area) expect(AREA_IDS).toContain(a)
        }
        for (const factor of CONTEXT_FACTORS) {
            const expected = new Set(
                RISK_CATALOG.filter((r) => r.requires.includes(factor) || (r.supports ?? []).includes(factor))
                    .map((r) => areaForRisk(r.id)?.id)
                    .filter(Boolean)
            )
            expect(new Set(byFactor.get(factor)!.area), factor).toEqual(expected)
        }
        expect([...byFactor.get(INCOME_DEPENDENCY_FACTOR)!.area]).toEqual(["household", "income"])
        expect(byFactor.get("health")!.area).toEqual(["health"])
    })
})

describe("questionsForArea", () => {
    const factors = (qs: FactorQuestion[]) => qs.map((q) => q.factor)

    it("keeps the caller's order — the area's requires-first order", () => {
        const order: ContextFactorKey[] = ["dependents", "children", "income", "age", "maritalStatus", "savings"]
        expect(factors(questionsForArea("household", order))).toEqual(order)
        expect(factors(questionsForArea("household", [...order].reverse()))).toEqual([...order].reverse())
    })

    it("asks one question per written column — residence and tenancy share `residenceType`", () => {
        expect(factors(questionsForArea("residence", ["residence", "tenancy", "propertyOwnership"]))).toEqual(["residence", "propertyOwnership"])
        expect(factors(questionsForArea("residence", ["tenancy", "residence"]))).toEqual(["tenancy"])
    })

    it("drops a factor none of the area's risks need", () => {
        expect(factors(questionsForArea("mobility", ["vehicles", "pets"]))).toEqual(["vehicles"])
    })

    it("asks the health question only inside the health area", () => {
        expect(factors(questionsForArea("health", ["health", "age"]))).toEqual(["health", "age"])
        expect(factors(questionsForArea("income", ["health"]))).toEqual([])
    })

    it("can ask income dependency in the household and income areas", () => {
        expect(factors(questionsForArea("household", [INCOME_DEPENDENCY_FACTOR]))).toEqual([INCOME_DEPENDENCY_FACTOR])
        expect(factors(questionsForArea("mobility", [INCOME_DEPENDENCY_FACTOR]))).toEqual([])
    })
})
