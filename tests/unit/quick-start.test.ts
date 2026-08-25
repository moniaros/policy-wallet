import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import {
    QUICK_START_QUESTIONS,
    firstInsight,
    quickStartComplete,
    quickStartPatch,
} from "@/lib/services/onboarding/quick-start"
import { toLifeContext } from "@/lib/services/gap-engine/life-context"
import { assessRisks } from "@/lib/services/gap-engine/risk-assessment"

/**
 * Guards for the first thirty seconds.
 *
 * The product asked for a policy PDF before it would say anything, which is the
 * wrong way round for one whose thesis is that it understands your life rather
 * than your paperwork. These tests defend the two things that make the opener
 * worth having: that every answer changes the outcome, and that the outcome is
 * true.
 */

const NOW = new Date("2026-08-05")

describe("three questions, and every one of them counts", () => {
    it("asks exactly three, answerable without looking anything up", () => {
        // A question that sends someone to find a document has already lost
        // them — the failure mode of the wizard this sits in front of.
        expect(QUICK_START_QUESTIONS).toHaveLength(3)
        for (const question of QUICK_START_QUESTIONS) {
            expect(question.prompt.el.length).toBeGreaterThan(0)
            expect(question.options.length).toBeGreaterThanOrEqual(2)
            for (const option of question.options) {
                expect(option.label.el.length).toBeGreaterThan(0)
                expect(option.label.en.length).toBeGreaterThan(0)
            }
        }
    })

    it("changes the headline when any answer changes", () => {
        // The earlier draft asked about "dependants" without asking about
        // children, and the risk that needs it requires both — so a customer
        // with three children saw the identical finding to one with none, and
        // two of their three answers appeared to do nothing.
        const renter = firstInsight({ residence: "rented", children: "0", vehicles: "0" }, NOW)
        const parent = firstInsight({ residence: "rented", children: "2", vehicles: "0" }, NOW)
        const owner = firstInsight({ residence: "owned", children: "0", vehicles: "0" }, NOW)

        expect(renter?.riskId).toBeTruthy()
        expect(parent?.riskId).toBe("life_dependents")
        expect(owner?.riskId).toBe("home_building_damage")
        expect(new Set([renter!.riskId, parent!.riskId, owner!.riskId]).size).toBe(3)
    })

    it("marks the facts KNOWN, not merely set", () => {
        // Everywhere else in the engine `answeredFields` is what separates "no"
        // from "never asked". Three answers have to make three facts known, or
        // they are indistinguishable from defaults.
        const patch = quickStartPatch({ residence: "owned", children: "1", vehicles: "2" })
        const answered = patch.answeredFields as string[]
        expect(answered).toContain("residenceType")
        expect(answered).toContain("childrenCount")
        expect(answered).toContain("dependentsCount")
        expect(answered).toContain("vehiclesCount")
        expect(patch.propertiesOwned).toBe(1)
        expect(patch.vehiclesCount).toBe(2)
    })

    it("reads an income only where the question asserted one", () => {
        // "Children who depend on you" asserts there is something to depend on.
        // "No" asserts nothing about whether there is an income.
        expect(quickStartPatch({ children: "2" }).employmentStatus).toBe("employed")
        expect(quickStartPatch({ children: "0" }).employmentStatus).toBeUndefined()
    })

    it("treats the dependant count as a floor, never an overstatement", () => {
        // Someone may also support a parent. Understating can only make us say
        // less than is true; the full wizard refines it.
        const patch = quickStartPatch({ children: "3" })
        expect(patch.dependentsCount).toBe(3)
        expect(patch.childrenCount).toBe(3)
    })
})

describe("the payoff is true", () => {
    it("never accuses a driver of having no compulsory cover", () => {
        // At this point the wallet is empty because we have NOT LOOKED, not
        // because they are uninsured. Motor cover is compulsory and enforced in
        // Greece, so opening with that accusation is both very likely false and
        // the fastest possible way to lose someone.
        for (const residence of ["rented", "owned", "family"]) {
            for (const children of ["0", "1", "3"]) {
                const insight = firstInsight({ residence, children, vehicles: "2" }, NOW)
                expect(insight?.riskId).not.toBe("motor_liability")
                expect(insight?.riskId).not.toBe("boat_liability")
            }
        }
    })

    it("says only what the answers imply, checked against the engine", () => {
        // Derived, not authored: the headline has to be a risk the real
        // assessment calls applicable for exactly these answers.
        const answers = { residence: "owned", children: "2", vehicles: "1" }
        const insight = firstInsight(answers, NOW)!
        const ctx = toLifeContext(quickStartPatch(answers) as any, NOW)
        const match = assessRisks(ctx, []).find((a) => a.riskId === insight.riskId)!
        expect(match.applicability).toBe("applicable")
        expect(insight.headline).toEqual(match.name)
        expect(insight.detail).toEqual(match.expectedImpact)
    })

    it("counts the other applicable risks honestly", () => {
        const answers = { residence: "owned", children: "2", vehicles: "1" }
        const insight = firstInsight(answers, NOW)!
        const ctx = toLifeContext(quickStartPatch(answers) as any, NOW)
        const applicable = assessRisks(ctx, []).filter((a) => a.applicability === "applicable")
        expect(insight.alsoFound).toBe(applicable.length - 1)
    })

    it("is bilingual and never leaks a placeholder", () => {
        for (const residence of ["rented", "owned", "family"]) {
            for (const children of ["0", "1", "2", "3"]) {
                for (const vehicles of ["0", "1", "2"]) {
                    const insight = firstInsight({ residence, children, vehicles }, NOW)
                    if (!insight) continue
                    for (const text of [
                        insight.headline.en, insight.headline.el,
                        insight.detail.en, insight.detail.el,
                        insight.because.en, insight.because.el,
                    ]) {
                        expect(text.length).toBeGreaterThan(0)
                        expect(text).not.toMatch(/undefined|NaN|\[object/)
                    }
                    expect(insight.alsoFound).toBeGreaterThanOrEqual(0)
                }
            }
        }
    })

    it("returns nothing rather than inventing a finding", () => {
        // A customer the answers imply nothing about is a real customer.
        expect(firstInsight({}, NOW)).toBeNull()
    })
})

describe("the opener is mobile-first and honest on screen", () => {
    const UI = readFileSync("components/onboarding/QuickStart.tsx", "utf-8")

    it("asks one question per screen, not a form", () => {
        // A form says "fill this in and we will get back to you"; a question
        // says someone is listening.
        expect(UI).toMatch(/questions\[step\]/)
        expect(UI).not.toMatch(/<form\b/)
    })

    it("never lays out two columns", () => {
        const bare = [...UI.matchAll(/(?:^|\s)grid-cols-(\d+)/g)].filter((m) => Number(m[1]) > 1)
        expect(bare.map((m) => m[0].trim())).toEqual([])
    })

    it("holds the WCAG 2.5.8 touch floor on every control", () => {
        const chunks = UI.split(/<button\b/).slice(1)
        expect(chunks.length).toBeGreaterThan(0)
        for (const chunk of chunks) {
            const tag = chunk.slice(0, chunk.indexOf(">\n") + 1 || 600)
            expect(tag, `control without a tap floor`).toMatch(/min-h-11/)
        }
    })

    it("describes progress once rather than per segment", () => {
        expect(UI).toMatch(/role="progressbar"/)
        expect(UI).toMatch(/aria-valuenow/)
    })

    it("says plainly that we have not seen their policies", () => {
        // Without this the customer infers we checked their cover and found it
        // wanting, which is not what happened.
        expect(UI).toMatch(/have not yet seen what your policies cover/)
    })

    it("disappears once its own three questions are answered", () => {
        // Gating on the health index meant it never disappeared: three answers
        // out of twenty-four factors is about a fifth of the picture, and the
        // index refuses to report below a third — so the customer answered,
        // the page reloaded, and asked them the same three questions again.
        const page = readFileSync("app/(protected)/protection/page.tsx", "utf-8")
        expect(page).toMatch(/quickStartComplete/)
        expect(page).not.toMatch(/needsQuickStart = intelligence\.health\.index === null/)

        const answered = toLifeContext(
            quickStartPatch({ residence: "rented", children: "0", vehicles: "0" }) as any,
            NOW
        )
        expect(quickStartComplete(answered)).toBe(true)
        expect(quickStartComplete(toLifeContext({ answeredFields: [] } as any, NOW))).toBe(false)
    })

    it("is not satisfied by a partial answer set", () => {
        const partial = toLifeContext(quickStartPatch({ residence: "owned" }) as any, NOW)
        expect(quickStartComplete(partial)).toBe(false)
    })

    it("never overwrites an answer already given properly", () => {
        // The three answers are coarse by design — "I own my home" becomes one
        // property, and the dependant count is a floor from the children. A
        // mutation must not rely on the UI to be safe.
        const action = readFileSync("app/(protected)/protection/quick-start-actions.ts", "utf-8")
        expect(action).toMatch(/!previously\.includes\(column\)/)
        expect(action).toMatch(/update: \{ \.\.\.fresh/)
    })

    it("re-runs the engine before the page re-reads it", () => {
        // The page renders from the profile the action just wrote, so a
        // background run would race it and the answers would appear inert.
        const action = readFileSync("app/(protected)/protection/quick-start-actions.ts", "utf-8")
        expect(action).toMatch(/await refreshProtectionScore\(/)
    })
})
