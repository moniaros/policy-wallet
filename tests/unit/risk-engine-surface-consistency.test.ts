import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"
import { buildRiskProfilePrompt } from "@/lib/services/ai/prompts"
import { contextCompleteness, toLifeContext } from "@/lib/services/gap-engine/life-context"
import { assessRisks } from "@/lib/services/gap-engine/risk-assessment"
import { answeredFieldsFrom } from "@/components/coverage/RiskProfileWizard"

/**
 * The customer's dashboard, their advisor's playbook and the AI prompt all
 * describe the same person. These guard that they keep describing them the SAME
 * way.
 *
 * Every finding here came from validating a surface other than the one being
 * changed: each was a second, older answer to a question the engine had since
 * settled, left behind because nothing forced the two to agree.
 */

const OPPORTUNITY = readFileSync("lib/services/gap-engine/opportunity-scoring.ts", "utf-8")
const PLAYBOOK = readFileSync("lib/services/gap-engine/agent-playbook.ts", "utf-8")

describe("advisor surfaces read the same profile the customer does", () => {
    it("profile completeness has exactly one definition", () => {
        // The opportunity engine carried its own six-nullable-field count, so a
        // client who had carefully answered "no" to every boolean read as 0%
        // complete to their advisor and ~100% to themselves.
        expect(OPPORTUNITY).toMatch(/contextCompleteness\(toLifeContext\(/)
        expect(
            OPPORTUNITY,
            "the opportunity engine is counting profile fields itself again"
        ).not.toMatch(/profile\.smokingStatus != null/)
    })

    it("the playbook resolves residence rather than reading the legacy boolean", () => {
        // `residenceType` is what the wizard and questionnaire now write. Reading
        // `profile.ownsHome` meant a declared home owner still looked like a
        // non-owner to their advisor.
        expect(PLAYBOOK).toMatch(/toLifeContext\(clientProfile/)
        expect(
            PLAYBOOK,
            "the playbook is reading profile.ownsHome directly again"
        ).not.toMatch(/ownsHome: profile\?\.ownsHome/)
    })

    it("an unanswered profile is equally unknown to both sides", () => {
        const ctx = toLifeContext(null)
        expect(contextCompleteness(ctx)).toBe(0)
    })
})

describe("the dashboard does not render a verdict it does not have", () => {
    const HOME = readFileSync("app/(protected)/dashboard/PolicyholderHome.tsx", "utf-8")
    const ENGINE = readFileSync("lib/services/gap-engine/index.ts", "utf-8")

    it("the cached score carries whether it is determinate", () => {
        // The insights page was taught to say "not enough information"; the
        // dashboard — the more-visited surface — kept rendering the raw cached
        // number, because the cached shape had no way to express the difference.
        expect(ENGINE).toMatch(/indeterminate: cached\.assessmentCoverage != null/)
        expect(ENGINE).toMatch(/assessmentCoverage: score\.assessmentCoverage/)
    })

    it("an indeterminate score reaches StatTiles as null, not as a number", () => {
        expect(HOME).toMatch(/cachedScore\.indeterminate/)
        // StatTiles already renders `null` as "score unavailable" with the right
        // copy — the fix is to give it null, not to invent a second empty state.
        expect(HOME).toMatch(/\? null/)
    })
})

describe("the AI prompt never states a fact nobody gave it", () => {
    const empty: any = {
        maritalStatus: null, dependentsCount: null, employmentStatus: null,
        ownsHome: null, mortgageAmount: null, hasPets: null, vehiclesCount: null,
        annualIncome: null, occupation: null, travelsFrequently: null, hasLoans: null,
        loanAmount: null, smokingStatus: null, dateOfBirth: null, lifeEvents: null,
        gender: null, heightCm: null, weightKg: null, chronicConditions: null,
        familyMedicalHistory: null, drivingRecord: null, activityLevel: null,
    }

    it("renders every unanswered field as unknown, including the lists", () => {
        const prompt = buildRiskProfilePrompt(empty, [])
        for (const field of [
            "Owns home", "Vehicles", "Has pets", "Travels frequently", "Has loans",
            "Dependents", "Life events", "Chronic conditions", "Family medical history",
        ]) {
            const line = prompt.split("\n").find((l) => l.startsWith(`- ${field}:`))
            expect(line, `no line for ${field}`).toBeTruthy()
            expect(line, `${field} asserts a value nobody supplied`).toMatch(/Unknown/)
        }
    })

    it("distinguishes 'asked, answered none' from 'never asked'", () => {
        // `[]` is a declaration; `null` is silence. Rendering both as "None
        // reported" told the model the person had declared themselves free of
        // chronic conditions when nobody had raised the subject.
        const declaredNone = buildRiskProfilePrompt({ ...empty, chronicConditions: [] }, [])
        expect(
            declaredNone.split("\n").find((l) => l.startsWith("- Chronic conditions:"))
        ).toContain("None reported")

        const neverAsked = buildRiskProfilePrompt(empty, [])
        expect(
            neverAsked.split("\n").find((l) => l.startsWith("- Chronic conditions:"))
        ).toContain("Unknown")
    })

    it("carries the applicability rule that outranks the rest", () => {
        const prompt = buildRiskProfilePrompt(empty, [])
        expect(prompt).toMatch(/Applicability — the rule that outranks the rest/)
        expect(prompt).toMatch(/no declared pet is not a pet-insurance gap/)
        expect(prompt).toMatch(/Do not assume the answer is "no"/)
    })

    it("never emits a broken interpolation", () => {
        for (const profile of [empty, { ...empty, dependentsCount: 2, ownsHome: true, mortgageAmount: 150000 }]) {
            const prompt = buildRiskProfilePrompt(profile, [])
            expect(prompt).not.toMatch(/undefined|NaN|\[object/)
        }
    })
})


describe("a skipped question stays a question", () => {
    it("does not report a blank select as answered", () => {
        // Rendering a control is not the same as answering it.
        const answered = answeredFieldsFrom({
            residenceType: "",
            cyberExposure: "",
            annualIncome: "",
            maritalStatus: "married",
        })
        expect(answered).toContain("maritalStatus")
        expect(answered).not.toContain("residenceType")
        expect(answered).not.toContain("cyberExposure")
        expect(answered).not.toContain("annualIncome")
    })

    it("does report an untouched checkbox as answered — leaving it alone IS the answer", () => {
        const answered = answeredFieldsFrom({})
        for (const definite of ["hasPets", "ownsBoat", "ownsBusiness", "rentsOutProperty", "travelsFrequently"]) {
            expect(answered, `${definite} must count as answered`).toContain(definite)
        }
    })

    it("separates 'not an owner' from 'a tenant'", () => {
        // Leaving the ownership checkbox unticked IS a declaration — this person
        // does not own their home — so the buildings risk is correctly dismissed.
        // It says nothing about whether they RENT: a family-owned or
        // employer-provided home is neither. Dismissing the tenant-contents risk
        // on that basis would be a conclusion the data cannot carry.
        const answered = answeredFieldsFrom({ residenceType: "", maritalStatus: "single" })
        const ctx = toLifeContext({ answeredFields: answered, maritalStatus: "single" } as any)
        const byId = new Map(assessRisks(ctx, []).map((a) => [a.riskId, a]))
        expect(byId.get("home_building_damage")!.status).toBe("not_applicable")
        expect(byId.get("home_contents_tenant")!.status).toBe("needs_review")

        // Answering the question resolves it either way.
        const tenant = toLifeContext({
            answeredFields: answeredFieldsFrom({ residenceType: "rented" }),
            residenceType: "rented",
        } as any)
        expect(
            new Map(assessRisks(tenant, []).map((a) => [a.riskId, a])).get("home_contents_tenant")!.status
        ).toBe("opportunity")

        const family = toLifeContext({
            answeredFields: answeredFieldsFrom({ residenceType: "family" }),
            residenceType: "family",
        } as any)
        expect(
            new Map(assessRisks(family, []).map((a) => [a.riskId, a])).get("home_contents_tenant")!.status
        ).toBe("not_applicable")
    })
})
