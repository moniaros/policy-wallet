/**
 * PW-CONTENT-01 Goal 4 — three states, three sentences, none interchangeable:
 * pre-plan (the run predates the check plan; B0/V3), unauthored branch (no
 * checks exist for this type; B1.5) and stale catalogue (checks were added
 * after this run; Goal 4). Asserted textually in both languages and by the
 * state attribute each surface stamps.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import React from "react"
import { render } from "@testing-library/react"
import { CoverageComposition } from "@/components/gaps/CoverageComposition"
import { getTranslations } from "@/lib/i18n"

const PHRASES = {
    el: { prePlan: /προηγείται του σχεδίου ελέγχων/, unauthored: /Δεν έχουν οριστεί ακόμη έλεγχοι/, stale: /Έχουν προστεθεί έλεγχοι/ },
    en: { prePlan: /predates the check plan/, unauthored: /No checks have been (authored|defined)/, stale: /Checks have been added/ },
} as const

describe("Goal 4 — the three states are textually distinct", () => {
    it.each(["el", "en"] as const)("%s: each sentence carries its own phrase and none of the others'", (lang) => {
        const t = getTranslations(lang)
        const sentences = {
            prePlan: t.composition.prePlan,
            unauthored: t.gapProvenance.unassessed,
            stale: t.composition.staleCatalogue,
        }
        const keys = Object.keys(sentences) as Array<keyof typeof sentences>
        for (const k of keys) {
            expect(sentences[k], `${lang} ${k}`).toMatch(PHRASES[lang][k])
            for (const other of keys) if (other !== k) expect(sentences[k], `${lang} ${k} must not read like ${other}`).not.toMatch(PHRASES[lang][other])
        }
        expect(new Set(Object.values(sentences)).size).toBe(3)
    })
    it("the component stamps pre_plan and stale_catalogue distinctly; the unauthored state is the card's own attribute", () => {
        const copy = getTranslations("el").composition
        const pre = render(<CoverageComposition composition={{ kind: "pre_plan", lineOfBusiness: "motor", runFinishedAt: null, runDateLabel: "5 Σεπτεμβρίου 2026" }} copy={copy} />)
        expect(pre.container.querySelector('[data-composition-state="pre_plan"]')).not.toBeNull()
        expect(pre.container.querySelector('[data-composition-state="stale_catalogue"]')).toBeNull()
        const stale = render(<CoverageComposition composition={{ kind: "composition", lineOfBusiness: "motor", catalogueVersion: "a", stale: { runCatalogueVersion: "a", currentCatalogueVersion: "b", runDateLabel: "21 Αυγούστου 2026" }, coverage: { checked: 2, covered: 1, notCovered: 1, indeterminate: 0, items: [] }, recording: { checked: 1, recorded: 1, notRecorded: 0, items: [] }, unclassified: [], undeclaredInputs: [] }} copy={copy} />)
        expect(stale.container.querySelector('[data-composition-state="stale_catalogue"]')).not.toBeNull()
        expect(stale.container.querySelector('[data-composition-state="pre_plan"]')).toBeNull()
        expect(readFileSync("app/(protected)/wallet/[id]/AnalysisCard.tsx", "utf8")).toMatch(/data-assessment-state="unauthored"/)
        const report = readFileSync("lib/services/reports/savings-report.ts", "utf8")
        expect(report).toMatch(/data-composition-state="pre_plan"/)
        expect(report).toMatch(/data-composition-state="stale_catalogue"/)
    })
})
