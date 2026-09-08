/**
 * PW-CONTENT-01 Goal 4 — the composition is always computed against the
 * catalogue version the run recorded, never against a version the run did not
 * attempt; where the current catalogue is newer, every findings surface says
 * so in one dated line and offers re-analysis.
 *
 * Fixture: a completed run whose plan is catalogue version A (a subset of the
 * motor rules), the current catalogue being B with two more motor rules. The
 * denominator must be A's count; the stale line must name the run date.
 * Asserted on the shared composition, the component both policy pages mount,
 * and the report generator both report routes call. Probe committed.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import React from "react"
import { render } from "@testing-library/react"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { composeFindings, describeCatalogueStaleness, currentCatalogueVersion, compositionSums } from "@/lib/gaps/composition"
import { CoverageComposition } from "@/components/gaps/CoverageComposition"
import { generateSavingsReportHtml } from "@/lib/services/reports/savings-report"
import { getTranslations } from "@/lib/i18n"

const motor = AUTHORED_GAP_DEFINITIONS.filter((d) => d.lineOfBusiness === "motor").map((d) => d.slug)
const planA = motor.slice(0, motor.length - 2) // version A attempted two rules fewer than today's catalogue
const runA = { slugs: planA, catalogueVersion: "aaaaaaaaaaaaaaaa" }
const DATE = "21 Αυγούστου 2026"

/** The wrong way — a denominator read from the current catalogue. */
export function readsDenominatorFromCurrentCatalogue(src: string): boolean {
    return /AUTHORED_GAP_DEFINITIONS\s*\.filter\([\s\S]{0,160}?lineOfBusiness[\s\S]{0,160}?\)\s*\.length/.test(src)
}

describe("Goal 4 — denominator = the run's plan, whatever the current catalogue", () => {
    it("fixture sanity: the current catalogue has two more motor rules than plan A", () => {
        expect(motor.length - planA.length).toBe(2)
        expect(currentCatalogueVersion()).not.toBe(runA.catalogueVersion)
    })
    it("composes against plan A and flags staleness with the run date", () => {
        const c = composeFindings({ lineOfBusiness: "motor", acordData: {}, firedSlugs: [], attempted: runA, completedRun: { finishedAt: "2026-08-21T10:00:00Z", dateLabel: DATE } })
        if (c.kind !== "composition") throw new Error("must compose")
        expect(c.coverage.checked + c.recording.checked).toBe(planA.length)
        expect(c.stale).toEqual({ runCatalogueVersion: runA.catalogueVersion, currentCatalogueVersion: currentCatalogueVersion(), runDateLabel: DATE })
        expect(compositionSums(c)).toBe(true)
        // a run on the current catalogue is not stale
        const fresh = composeFindings({ lineOfBusiness: "motor", acordData: {}, firedSlugs: [], attempted: { slugs: motor, catalogueVersion: currentCatalogueVersion() } })
        if (fresh.kind !== "composition") throw new Error("must compose")
        expect(fresh.stale).toBeNull()
    })
    it.each(["el", "en"] as const)("%s: the component renders the version-A lines AND the dated stale sentence", (lang) => {
        const c = composeFindings({ lineOfBusiness: "motor", acordData: {}, firedSlugs: [], attempted: runA, completedRun: { finishedAt: "2026-08-21T10:00:00Z", dateLabel: DATE } })
        const { container } = render(<CoverageComposition composition={c} copy={getTranslations(lang).composition} />)
        expect(container.querySelector('[data-count="composition.coverageChecked"]')?.textContent).toMatch(new RegExp(String(c.kind === "composition" ? c.coverage.checked : -1)))
        const stale = container.querySelector('[data-composition-state="stale_catalogue"]')
        expect(stale?.textContent).toContain(DATE)
        expect(stale?.textContent).toMatch(lang === "el" ? /νέα ανάλυση/ : /new analysis/)
    })
    it("the report generator carries the same stale line (both report routes call it with describeCatalogueStaleness)", () => {
        const stale = describeCatalogueStaleness(runA, DATE)
        expect(stale?.runDateLabel).toBe(DATE)
        expect(describeCatalogueStaleness({ slugs: motor, catalogueVersion: currentCatalogueVersion() }, DATE)).toBeNull()
        expect(describeCatalogueStaleness(null, DATE)).toBeNull() // pre-plan: nothing to be stale
        const html = generateSavingsReportHtml({ metadata: {}, gapResults: [] }, new Date().toISOString(), "el", undefined, [], null, null, stale ? { dateLabel: stale.runDateLabel } : null)
        expect(html).toMatch(/data-composition-state="stale_catalogue"/)
        expect(html).toContain(DATE)
        // Both reports build their inputs in ONE place now (PW-BRIDGE-01 C-03/C-04),
        // so the staleness is asserted where it is computed, and the routes are
        // asserted to use it. Re-pointed, never deleted.
        expect(readFileSync("lib/services/reports/report-context.ts", "utf8")).toMatch(
            /describeCatalogueStaleness\(run\.attemptedRules/
        )
        for (const route of ["app/api/v1/agent/policies/[id]/branded-report/route.ts", "app/api/v1/policies/[id]/savings-report/route.ts"]) {
            const src = readFileSync(route, "utf8")
            expect(src, route).toMatch(/buildReportContext\(/)
            expect(src, route).toMatch(/ctx\.staleCatalogue/)
        }
        for (const page of ["app/(protected)/wallet/[id]/page.tsx", "app/(protected)/customers/[id]/policy/[policyId]/page.tsx"]) {
            const src = readFileSync(page, "utf8")
            expect(src, page).toMatch(/composeFindings\(/)
            expect(src, page).toMatch(/dateLabel: formatProvenanceDate\(/)
        }
    })
    it("the composition module never reads its denominator from the current catalogue; the probe does", () => {
        expect(readsDenominatorFromCurrentCatalogue(readFileSync("lib/gaps/composition.ts", "utf8"))).toBe(false)
        expect(readsDenominatorFromCurrentCatalogue(readFileSync("tests/fixtures/guard-probes/composition-current-catalogue-denominator.ts.txt", "utf8"))).toBe(true)
        expect(readFileSync("lib/gaps/composition.ts", "utf8")).not.toMatch(/catalogue_mismatch/)
    })
})
