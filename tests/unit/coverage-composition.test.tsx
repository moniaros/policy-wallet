import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { render } from "@testing-library/react"
import {
    classifyRuleQuestion,
    composeFindings,
    compositionSums,
    currentCatalogueVersion,
    declaredInputs,
    type Composition,
} from "@/lib/gaps/composition"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { CoverageComposition } from "@/components/gaps/CoverageComposition"
import { el } from "@/lib/i18n/translations/el"
import { en } from "@/lib/i18n/translations/en"

/**
 * B2 — two questions, two denominators (PW-TRANSPARENCY-02 amendment 01).
 *
 * Over every authored branch, with the run's plan at the current catalogue
 * version, this pins:
 *   - A₁ + B₁ + C₁ = N₁ and A₂ + B₂ = N₂ on a systematically ablated fixture;
 *   - a non-firing coverage rule is never `covered` while an input it reads is
 *     absent or mistyped;
 *   - a rule without statically declarable inputs is `indeterminate`, listed;
 *   - N₁ = 0 renders nothing (the B1.5 state renders instead);
 *   - a catalogue mismatch renders the mismatch sentence, never numbers;
 *   - the component shows every denominator, every non-zero segment, no
 *     percentage, no verdict adjective; and it is mounted only on the two
 *     in-product findings cards — never in email, push or the report.
 */
const VERSION = currentCatalogueVersion()
const VERDICT = /Καλή|Εντάξει|Επαρκής|Προστατευμέν|adequate|\bgood\b|\bfine\b|all clear/i

/** A value of the type each rule reads, for every input path of every rule. */
function setPath(target: Record<string, unknown>, path: string, value: unknown) {
    const parts = path.split(".")
    let cursor: Record<string, unknown> = target
    for (const part of parts.slice(0, -1)) {
        cursor[part] = (cursor[part] as Record<string, unknown> | undefined) ?? {}
        cursor = cursor[part] as Record<string, unknown>
    }
    cursor[parts[parts.length - 1]] = value
}

function fullFixture(branch: string): { acord: Record<string, unknown>; inputs: string[] } {
    const acord: Record<string, unknown> = {}
    const inputs: string[] = []
    for (const d of AUTHORED_GAP_DEFINITIONS.filter((d) => d.lineOfBusiness === branch)) {
        const logic = d.detectionLogic as { rules: Array<{ type: string; operator?: string; field?: string; fields?: string[]; referenceField?: string }> }
        for (const rule of logic.rules) {
            const paths = rule.fields?.length ? rule.fields : rule.field ? [rule.field] : []
            for (const p of paths) {
                inputs.push(p)
                if (rule.type === "date_within_days") setPath(acord, p, "2030-01-01")
                else if (rule.operator === "value_drift") setPath(acord, p, 10000)
                else if (rule.operator === "missing" || rule.operator === "all_missing") setPath(acord, p, p.endsWith("beneficiaries") ? [{ name: "x" }] : "recorded")
                else setPath(acord, p, true)
            }
            if (rule.referenceField) {
                inputs.push(rule.referenceField)
                setPath(acord, rule.referenceField, 10000)
            }
        }
    }
    return { acord, inputs: [...new Set(inputs)] }
}

function planFor(branch: string) {
    return { slugs: AUTHORED_GAP_DEFINITIONS.filter((d) => d.lineOfBusiness === branch).map((d) => d.slug), catalogueVersion: VERSION }
}

const BRANCHES = [...new Set(AUTHORED_GAP_DEFINITIONS.map((d) => d.lineOfBusiness))]

describe("rule questions and inputs", () => {
    it("every authored rule is classifiable and declares its inputs; 20 coverage, 9 recording", () => {
        const questions = AUTHORED_GAP_DEFINITIONS.map((d) => classifyRuleQuestion(d.detectionLogic))
        expect(questions.filter((q) => q === "coverage")).toHaveLength(20)
        expect(questions.filter((q) => q === "recording")).toHaveLength(9)
        expect(questions).not.toContain("unknown")
        for (const d of AUTHORED_GAP_DEFINITIONS) expect(declaredInputs(d.detectionLogic), d.slug).not.toBeNull()
    })

    it("an operator whose inputs are not declarable is unknown / undeclared, never covered", () => {
        expect(classifyRuleQuestion({ rules: [{ type: "low_limit", threshold: 100 }] })).toBe("unknown")
        expect(declaredInputs({ rules: [{ type: "low_limit", threshold: 100 }] })).toBeNull()
        expect(classifyRuleQuestion({ rules: [{ type: "acord_field_check", operator: "is_false", field: "a" }, { type: "acord_field_check", operator: "missing", field: "b" }] })).toBe("unknown")
    })
})

describe("the two lines sum, on every authored branch, under systematic ablation", () => {
    for (const branch of BRANCHES) {
        it(`${branch}: full fixture → every coverage rule covered, every recording rule recorded`, () => {
            const { acord } = fullFixture(branch)
            const c = composeFindings({ lineOfBusiness: branch, acordData: acord, firedSlugs: [], attempted: planFor(branch), now: new Date("2026-09-05") })
            expect(c.kind).toBe("composition")
            if (c.kind !== "composition") return
            expect(compositionSums(c)).toBe(true)
            expect(c.coverage.checked + c.recording.checked).toBe(planFor(branch).slugs.length)
            expect(c.coverage.indeterminate).toBe(0)
            expect(c.coverage.notCovered).toBe(0)
            expect(c.recording.notRecorded).toBe(0)
            expect(c.unclassified).toEqual([])
            expect(c.undeclaredInputs).toEqual([])
        })

        it(`${branch}: ablating any one input never yields covered for a rule that reads it; sums hold`, () => {
            const { acord, inputs } = fullFixture(branch)
            for (const path of inputs) {
                const ablated = JSON.parse(JSON.stringify(acord)) as Record<string, unknown>
                setPath(ablated, path, undefined)
                const c = composeFindings({ lineOfBusiness: branch, acordData: ablated, firedSlugs: [], attempted: planFor(branch), now: new Date("2026-09-05") })
                expect(c.kind).toBe("composition")
                if (c.kind !== "composition") return
                expect(compositionSums(c), `${branch} ablating ${path}`).toBe(true)
                for (const item of c.coverage.items) {
                    if (item.inputs.includes(path)) expect(item.outcome, `${item.slug} with ${path} absent`).toBe("indeterminate")
                }
            }
        })

        it(`${branch}: fired slugs land in not_covered / not_recorded and nothing else moves`, () => {
            const { acord } = fullFixture(branch)
            const slugs = planFor(branch).slugs
            const c = composeFindings({ lineOfBusiness: branch, acordData: acord, firedSlugs: slugs, attempted: planFor(branch), now: new Date("2026-09-05") })
            if (c.kind !== "composition") throw new Error("expected composition")
            expect(compositionSums(c)).toBe(true)
            expect(c.coverage.notCovered).toBe(c.coverage.checked)
            expect(c.recording.notRecorded).toBe(c.recording.checked)
        })
    }

    it("a wrong-typed input is indeterminate, and a past expiry date is outside the rule's window", () => {
        const { acord } = fullFixture("motor")
        setPath(acord, "vehicle.glassBreakage", "yes")
        setPath(acord, "vehicle.greenCardExpiryDate", "2020-01-01")
        const c = composeFindings({ lineOfBusiness: "motor", acordData: acord, firedSlugs: [], attempted: planFor("motor"), now: new Date("2026-09-05") })
        if (c.kind !== "composition") throw new Error("expected composition")
        expect(c.coverage.items.find((i) => i.slug === "no_glass_breakage_cover")).toMatchObject({ outcome: "indeterminate", reason: "input_wrong_type" })
        expect(c.coverage.items.find((i) => i.slug === "green_card_expiring")).toMatchObject({ outcome: "indeterminate", reason: "outside_rule_window" })
        expect(compositionSums(c)).toBe(true)
    })

    it("no extraction at all: every coverage rule indeterminate (C₁ = N₁), recording rules stay recorded unless fired", () => {
        const c = composeFindings({ lineOfBusiness: "home", acordData: null, firedSlugs: [], attempted: planFor("home") })
        if (c.kind !== "composition") throw new Error("expected composition")
        expect(c.coverage.indeterminate).toBe(c.coverage.checked)
        expect(compositionSums(c)).toBe(true)
    })

    it("an undeclared-input rule in the plan is indeterminate and listed", () => {
        const defs = [...AUTHORED_GAP_DEFINITIONS, { slug: "synthetic_low_limit", detectionLogic: { rules: [{ type: "low_limit", threshold: 100 }] } }]
        const c = composeFindings({
            lineOfBusiness: "home",
            acordData: fullFixture("home").acord,
            firedSlugs: [],
            attempted: { slugs: [...planFor("home").slugs, "synthetic_low_limit"], catalogueVersion: VERSION },
            definitions: defs,
        })
        if (c.kind !== "composition") throw new Error("expected composition")
        // `low_limit` is unclassifiable by question, so it is reported, not counted.
        expect(c.unclassified).toEqual(["synthetic_low_limit"])
        expect(compositionSums(c)).toBe(true)
    })

    it("N₁ = 0 (unauthored branch) and no run produce no composition; a newer catalogue is a dated flag on the composition, never a withheld one (Goal 4)", () => {
        expect(composeFindings({ lineOfBusiness: "renters", acordData: {}, firedSlugs: [], attempted: { slugs: [], catalogueVersion: VERSION } }).kind).toBe("unauthored")
        expect(composeFindings({ lineOfBusiness: "motor", acordData: {}, firedSlugs: [], attempted: null }).kind).toBe("no_run")
        const mismatch = composeFindings({ lineOfBusiness: "motor", acordData: {}, firedSlugs: [], attempted: { slugs: planFor("motor").slugs, catalogueVersion: "0000000000000000" } })
        if (mismatch.kind !== "composition") throw new Error("Goal 4: a stale catalogue must still compose")
        expect(mismatch.stale).toMatchObject({ currentCatalogueVersion: VERSION, runCatalogueVersion: "0000000000000000" })
        // the denominator is the RUN's plan, not the current catalogue
        expect(mismatch.coverage.checked + mismatch.recording.checked).toBe(planFor("motor").slugs.length)
    })
})

describe("the component", () => {
    const partial: Composition = {
        kind: "composition",
        lineOfBusiness: "motor",
        catalogueVersion: VERSION,
        stale: null,
        coverage: { checked: 4, covered: 2, notCovered: 1, indeterminate: 1, items: [] },
        recording: { checked: 2, recorded: 1, notRecorded: 1, items: [] },
        unclassified: [],
        undeclaredInputs: [],
    }

    it("renders both denominators, every non-zero segment, no percentage and no verdict adjective, in both locales", () => {
        for (const copy of [el.composition, en.composition]) {
            const { container, unmount } = render(<CoverageComposition composition={partial} copy={copy} />)
            const text = container.textContent ?? ""
            expect(container.querySelector('[data-count="composition.coverageChecked"]')?.textContent).toContain("4")
            expect(container.querySelector('[data-count="composition.recordingChecked"]')?.textContent).toContain("2")
            expect(container.querySelector('[data-count="composition.indeterminate"]')?.textContent).toContain("1")
            expect(text).not.toMatch(/%/)
            expect(text).not.toMatch(VERDICT)
            unmount()
        }
    })

    it("hides the indeterminate segment only when it is zero, and names an all-indeterminate line", () => {
        const none = render(<CoverageComposition composition={{ ...partial, coverage: { checked: 3, covered: 2, notCovered: 1, indeterminate: 0, items: [] } }} copy={el.composition} />)
        expect(none.container.querySelector('[data-count="composition.indeterminate"]')).toBeNull()
        none.unmount()
        const all = render(<CoverageComposition composition={{ ...partial, coverage: { checked: 3, covered: 0, notCovered: 0, indeterminate: 3, items: [] } }} copy={el.composition} />)
        expect(all.container.querySelector('[data-count="composition.indeterminate"]')?.textContent).toContain("3")
        expect(all.container.querySelector('[data-count="composition.coverageChecked"]')?.textContent).toContain("3")
        all.unmount()
    })

    it("renders nothing for unauthored / no-run, and a stale catalogue renders the lines PLUS one dated sentence (Goal 4)", () => {
        expect(render(<CoverageComposition composition={{ kind: "unauthored", lineOfBusiness: "renters" }} copy={el.composition} />).container.textContent).toBe("")
        const m = render(<CoverageComposition composition={{ ...partial, stale: { runCatalogueVersion: "a", currentCatalogueVersion: "b", runDateLabel: "21 Αυγούστου 2026" } }} copy={el.composition} />)
        expect(m.container.querySelector('[data-count="composition.coverageChecked"]')?.textContent).toContain("4")
        const stale = m.container.querySelector('[data-composition-state="stale_catalogue"]')
        expect(stale?.textContent).toContain("21 Αυγούστου 2026")
        expect(stale?.textContent).toMatch(/Έχουν προστεθεί έλεγχοι/)
    })

    it("is mounted on the two in-product findings surfaces and nowhere outbound", () => {
        expect(readFileSync("app/(protected)/wallet/[id]/AnalysisCard.tsx", "utf8")).toMatch(/<CoverageComposition/)
        expect(readFileSync("app/(protected)/wallet/[id]/page.tsx", "utf8")).toMatch(/composeFindings\(/)
        expect(readFileSync("app/(protected)/customers/[id]/policy/[policyId]/page.tsx", "utf8")).toMatch(/composeFindings\(/)
        for (const f of ["lib/services/reports/savings-report.ts", "lib/email/templates/weekly-digest.ts", "lib/notifications/dispatch.ts"]) {
            expect(readFileSync(f, "utf8"), f).not.toMatch(/composeFindings|CoverageComposition/)
        }
    })
})
