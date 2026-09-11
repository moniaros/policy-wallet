/**
 * PW-CONTENT-01 Goal 5 — acceptance: renters and home-contents policies no
 * longer render the unauthored-branch state; the composition renders with a
 * correct denominator and A₁ + B₁ + C₁ === N₁ on every fixture.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { composeFindings, compositionSums, currentCatalogueVersion } from "@/lib/gaps/composition"
import { WRITE_BRANCH_IDS, normalizeBranch } from "@/lib/insurance/taxonomy"
import { branchFamilyOf, FAMILY_DEFAULT_BRANCH } from "@/lib/ingestion/types"

const plan = (lob: string) => ({ slugs: AUTHORED_GAP_DEFINITIONS.filter((d) => d.lineOfBusiness === lob).map((d) => d.slug), catalogueVersion: currentCatalogueVersion() })

describe("Goal 5 — renters is a write branch", () => {
    it("is writable, declarable, in the home family, and the prompt routes it to the property section", () => {
        expect(WRITE_BRANCH_IDS as readonly string[]).toContain("renters")
        expect(normalizeBranch("renters").writeEnabled).toBe(true)
        expect(branchFamilyOf("renters")).toBe("home")
        expect(FAMILY_DEFAULT_BRANCH.home).toBe("home") // a detected home-family document still defaults to home; renters is declared
        expect(readFileSync("lib/services/ai/prompts.ts", "utf8")).toMatch(/renters .*property section/i)
    })
})

describe("Goal 5 — composition on the new branches", () => {
    it("renters: eight rules, a real denominator, sums hold on a typical contents policy", () => {
        expect(plan("renters").slugs.length).toBe(8)
        const typical = { property: { contentsVsStructure: "contents-only", insuredValue: 20000, fireCoverageIncluded: true, earthquakeCoverageIncluded: false, theftCoverageLimit: 3000 } }
        const c = composeFindings({ lineOfBusiness: "renters", acordData: typical, firedSlugs: ["renters_no_earthquake_cover", "renters_valuables_not_itemised", "renters_no_technical_assistance_phone"], attempted: plan("renters") })
        expect(c.kind).toBe("composition")
        if (c.kind !== "composition") return
        expect(c.coverage.checked + c.recording.checked).toBe(8)
        expect(compositionSums(c)).toBe(true)
        expect(c.stale).toBeNull()
    })
    it("renters: an empty plan would still be the unauthored state — the new rules are what remove it", () => {
        expect(composeFindings({ lineOfBusiness: "renters", acordData: {}, firedSlugs: [], attempted: { slugs: [], catalogueVersion: currentCatalogueVersion() } }).kind).toBe("unauthored")
    })
    it("home: the contents questions join the home plan and the sums still hold", () => {
        const slugs = plan("home").slugs
        for (const s of ["home_scope_not_recorded", "home_insured_value_not_recorded", "home_valuables_not_itemised"]) expect(slugs).toContain(s)
        const c = composeFindings({ lineOfBusiness: "home", acordData: { property: { contentsVsStructure: "both", insuredValue: 180000, estimatedRebuildCost: 200000, fireCoverageIncluded: true } }, firedSlugs: ["home_valuables_not_itemised"], attempted: plan("home") })
        if (c.kind !== "composition") throw new Error("home must compose")
        expect(c.coverage.checked + c.recording.checked).toBe(slugs.length)
        expect(compositionSums(c)).toBe(true)
    })
})
