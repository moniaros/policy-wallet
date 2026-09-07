/**
 * The one primary action of «Καλύψεις & κενά» — a decision table, tested as
 * a table. Every row is a state a real wallet reaches; the order is the order
 * in which a person can act.
 */

import { describe, expect, it } from "vitest"

import { chooseProtectionNextStep, type ProtectionNextStepFacts } from "@/lib/protection/next-step"
import { familyOfBranch, parseFamilyFilter, parseStatusFilter } from "@/lib/protection/coverage-families"

const base: ProtectionNextStepFacts = {
    inForcePolicyCount: 2,
    analysedPolicyCount: 2,
    deepAnalysisAllowed: true,
    summary: { finding: 0, noPolicy: 0, notChecked: 0, appearsCovered: 2 },
    classifiedFindingCount: 0,
    unknownFactorCount: 0,
    recommendationCount: 0,
}

describe("chooseProtectionNextStep — first match wins", () => {
    const cases: Array<[string, Partial<ProtectionNextStepFacts>, string, string]> = [
        ["nothing in force → add the first policy", { inForcePolicyCount: 0 }, "add_first", "/wallet/add"],
        ["held but never analysed, allowed → analyse", { analysedPolicyCount: 0 }, "analyse", "#analyse"],
        ["held but never analysed, tier-locked → unlock", { analysedPolicyCount: 0, deepAnalysisAllowed: false }, "unlock", "/upgrade?reason=feature_locked"],
        ["a branch with a finding → see my gaps", { summary: { ...base.summary, finding: 1 } }, "gaps", "#gaps"],
        ["an expected branch with no policy → see my gaps", { summary: { ...base.summary, noPolicy: 1 } }, "gaps", "#gaps"],
        ["a classified finding even without a branch flag → see my gaps", { classifiedFindingCount: 1 }, "gaps", "#gaps"],
        ["only unchecked branches and open questions → answer", { summary: { ...base.summary, notChecked: 1 }, unknownFactorCount: 3 }, "answer", "#life"],
        ["everything checked, recommendations open → see them", { recommendationCount: 4 }, "recommendations", "/recommendations"],
        ["everything checked, nothing open → grow the wallet", {}, "add_more", "/wallet/add"],
    ]
    for (const [name, over, id, href] of cases) {
        it(name, () => {
            const step = chooseProtectionNextStep({ ...base, ...over })
            expect(step.id).toBe(id)
            expect(step.href).toBe(href)
        })
    }

    it("quotes the number of questions only on the answer step", () => {
        expect(chooseProtectionNextStep({ ...base, summary: { ...base.summary, notChecked: 1 }, unknownFactorCount: 3 }).count).toBe(3)
        expect(chooseProtectionNextStep({ ...base, recommendationCount: 4 }).count).toBeNull()
    })
})

describe("coverage families — one vocabulary, allow-listed filters", () => {
    it("places every writable top-level branch in exactly one family, from the area's domain", () => {
        expect(familyOfBranch("home")).toBe("property")
        expect(familyOfBranch("renters")).toBe("property")
        expect(familyOfBranch("health")).toBe("health")
        expect(familyOfBranch("life")).toBe("family")
        expect(familyOfBranch("motor")).toBe("mobility")
        // The domain calls these lifestyle; a second table saying otherwise is what the domains guard forbids.
        expect(familyOfBranch("travel")).toBe("other")
        expect(familyOfBranch("pet")).toBe("other")
        expect(familyOfBranch("nonsense")).toBe("other")
    })

    it("parses the two filter params against allow-lists and falls back silently", () => {
        expect(parseFamilyFilter("health")).toBe("health")
        expect(parseFamilyFilter(["mobility", "x"])).toBe("mobility")
        expect(parseFamilyFilter("drop table")).toBe("all")
        expect(parseFamilyFilter(undefined)).toBe("all")
        expect(parseStatusFilter("finding")).toBe("finding")
        expect(parseStatusFilter("covered")).toBeNull()
        expect(parseStatusFilter(undefined)).toBeNull()
    })
})
