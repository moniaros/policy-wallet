import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { render } from "@testing-library/react"
import { composeFindings, type Composition } from "@/lib/gaps/composition"
import { CoverageComposition } from "@/components/gaps/CoverageComposition"
import { el } from "@/lib/i18n/translations/el"
import { en } from "@/lib/i18n/translations/en"

/**
 * V3 (PW-TRANSPARENCY-02 verification) — findings from a run that predates the
 * catalogue plan are a THIRD B2 state, distinct from the composition and from
 * the B1.5 unauthored-branch state. Such a run has a completed analysis but no
 * attempted-rules plan, so what was checked cannot be stated: the state names
 * the run date and says exactly that. It never renders a composition, a partial
 * composition or a zero.
 *
 * Surfaces that render findings: B2C policy detail and the analysis tab (both
 * through AnalysisCard), the agent client policy view (AnalysisCard again), and
 * the report generator. Count of surfaces rendering findings with neither a
 * composition nor this state: 0.
 */
describe("the pre-plan state", () => {
    it("a completed run with no attempted plan is `pre_plan`, dated; no run at all stays `no_run`", () => {
        const pre = composeFindings({
            lineOfBusiness: "motor",
            acordData: { vehicle: { glassBreakage: true } },
            firedSlugs: ["missing_accident_declaration_phone"],
            attempted: null,
            completedRun: { finishedAt: "2026-09-05T00:03:01.873Z", dateLabel: "5 Σεπτεμβρίου 2026" },
        })
        expect(pre.kind).toBe("pre_plan")
        if (pre.kind !== "pre_plan") return
        expect(pre.runDateLabel).toBe("5 Σεπτεμβρίου 2026")
        expect(composeFindings({ lineOfBusiness: "motor", acordData: {}, firedSlugs: [], attempted: null }).kind).toBe("no_run")
        // With a plan the state is the composition, whatever completedRun says.
        const withPlan = composeFindings({ lineOfBusiness: "renters", acordData: {}, firedSlugs: [], attempted: { slugs: [], catalogueVersion: "x" }, completedRun: { finishedAt: new Date() } })
        expect(withPlan.kind).toBe("unauthored")
    })

    it("renders the dated sentence and nothing countable — no composition line, no count, no zero — in both locales", () => {
        const state: Composition = { kind: "pre_plan", lineOfBusiness: "motor", runFinishedAt: "2026-09-05T00:03:01.873Z", runDateLabel: "5 Σεπτεμβρίου 2026" }
        for (const copy of [el.composition, en.composition]) {
            const { container, unmount } = render(<CoverageComposition composition={state} copy={copy} />)
            const node = container.querySelector('[data-fact="composition.prePlan"]')
            expect(node).not.toBeNull()
            expect(node!.textContent).toContain("5 Σεπτεμβρίου 2026")
            expect(container.querySelector("[data-count]")).toBeNull()
            expect(container.querySelector('[data-fact="composition.coverage"], [data-fact="composition.recording"], [data-fact="composition.lines"]')).toBeNull()
            expect(node!.textContent!.replace("5 Σεπτεμβρίου 2026", "")).not.toMatch(/\d/)
            unmount()
        }
        // The unauthored state is a different state and still renders nothing here.
        expect(render(<CoverageComposition composition={{ kind: "unauthored", lineOfBusiness: "renters" }} copy={el.composition} />).container.textContent).toBe("")
    })

    it("every surface that renders findings routes the completed run into the state: both policy pages, the findings card, the report", () => {
        expect(readFileSync("app/(protected)/wallet/[id]/page.tsx", "utf8")).toMatch(/completedRun:/)
        expect(readFileSync("app/(protected)/customers/[id]/policy/[policyId]/page.tsx", "utf8")).toMatch(/completedRun:/)
        // AnalysisCard renders the composition component, which owns the state; the
        // analysis tab renders AnalysisCard.
        expect(readFileSync("app/(protected)/wallet/[id]/AnalysisCard.tsx", "utf8")).toMatch(/<CoverageComposition/)
        expect(readFileSync("app/(protected)/wallet/[id]/PolicyAnalysisTabs.tsx", "utf8")).toMatch(/<AnalysisCard/)
        const report = readFileSync("lib/services/reports/savings-report.ts", "utf8")
        expect(report).toMatch(/data-composition-state="pre_plan"/)
        for (const route of ["app/api/v1/policies/[id]/savings-report/route.ts", "app/api/v1/agent/policies/[id]/branded-report/route.ts"]) {
            expect(readFileSync(route, "utf8"), route).toMatch(/prePlan/)
        }
    })
})
