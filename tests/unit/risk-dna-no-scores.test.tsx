/**
 * F2 (PW-TRANSPARENCY-02 close-out, B1.6 DECIDED): no Risk DNA dimension
 * score renders anywhere — no 0-100 reading, no threshold-coloured bar, no
 * trend arrow, no "improved by N", no "would move your score by N points" —
 * and no averaged customer score on the agent KPI strip, no household index in
 * the advisor book. Where the numbers sat, the B3 disclosed-findings treatment
 * renders instead. Acceptance: threshold-coloured dimension numbers rendered
 * anywhere: 0.
 *
 * The scan enumerates every .tsx under app/ and components/ (never a list of
 * known files) and ships with a committed probe proven to turn it red.
 */
import { describe, expect, it } from "vitest"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { fireEvent, render } from "@testing-library/react"
import { RiskDnaPanel, type DimensionView } from "@/components/risk-dna/RiskDnaPanel"
import { getTranslations } from "@/lib/i18n"

function walk(dir: string): string[] {
    if (!existsSync(dir)) return []
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) return name === "node_modules" ? [] : walk(p)
        return p.endsWith(".tsx") ? [p] : []
    })
}

/** A dimension number, its bar, its threshold colour, or a score derivative — rendered. */
const SCORE_RENDER_PATTERNS: Array<{ re: RegExp; why: string }> = [
    { re: /data-fact=["']riskDimension\.score["']/, why: "the dimension's 0-100 reading" },
    { re: /\{dimension\.score\}/, why: "the dimension's score interpolated" },
    { re: /barTone\(/, why: "a bar coloured by threshold" },
    { re: /role=["']meter["'][^>]*aria-valuenow=\{[^}]*score/, why: "a meter driven by a score" },
    { re: /ifActioned\.(statement|points)/, why: "the 'would move your score by N points' line" },
    { re: /(\{|:\s*)household\.healthIndex\}/, why: "the household index (0-100) rendered" },
    { re: /portfolioCompleteness/, why: "the agent KPI strip's averaged protection score" },
]

export function rendersDimensionScore(src: string): string | null {
    for (const { re, why } of SCORE_RENDER_PATTERNS) if (re.test(src)) return why
    return null
}

describe("F2 — Risk DNA dimension scores render nowhere", () => {
    const files = [...walk("app"), ...walk("components")]

    it("enumerates a meaningful universe", () => {
        expect(files.length).toBeGreaterThan(50)
    })

    it("no .tsx under app/ or components/ renders a dimension score, its bar, its colour or a derivative", () => {
        const offenders = files.map((f) => [f, rendersDimensionScore(readFileSync(f, "utf8"))] as const).filter(([, why]) => why)
        expect(offenders, "score renders").toEqual([])
    })

    it("the probe turns the scan red", () => {
        const probe = readFileSync("tests/fixtures/guard-probes/risk-dna-score-render.tsx.txt", "utf8")
        expect(rendersDimensionScore(probe)).toBeTruthy()
    })

    it("the count-key registry no longer carries the score fact, and carries the disclosed treatment", () => {
        const src = readFileSync("lib/instrumentation/count-keys.ts", "utf8")
        expect(src).not.toMatch(/["']riskDimension\.score["']/)
        expect(src).not.toMatch(/["']agent\.portfolioCompleteness["']/)
        expect(src).toMatch(/["']riskDimension\.provenance["']/)
    })
})

describe("F2 — the panel renders the B3 disclosed treatment where the numbers were", () => {
    const dimension = (over: Partial<DimensionView>): DimensionView => ({
        id: "family",
        label: { el: "Οικογένεια", en: "Family" },
        question: { el: "Ερώτηση;", en: "Question?" },
        score: 42,
        coarse: false,
        confidence: "medium",
        confidenceLimit: null,
        trend: "worsening",
        trendDelta: -5,
        urgency: "soon",
        whatChanged: { el: "Οικογένεια: πτώση κατά 5 από τον προηγούμενο έλεγχο.", en: "Family fell by 5 since we last looked." },
        whyItMatters: { el: "Γιατί έχει σημασία.", en: "Why it matters." },
        nextAction: { el: "Επόμενο βήμα.", en: "Next step." },
        ifActioned: { points: 7, statement: { el: "Η κάλυψη αυτού θα μετακινούσε το σκορ προστασίας σας κατά περίπου 7 μονάδες.", en: "Answering this would move your protection score by about 7 points." } },
        openCount: 1,
        applicableCount: 3,
        risks: [],
        ...over,
    })

    it.each(["el", "en"] as const)("%s: no number, no meter, no delta, no points — the under-review label and the disclosure instead", (lang) => {
        const provenance = getTranslations(lang).provenance
        const { container } = render(<RiskDnaPanel language={lang} dimensions={[dimension({}), dimension({ id: "health", label: { el: "Υγεία", en: "Health" }, score: 91 })]} />)
        fireEvent.click(container.querySelector("button[aria-expanded]")!)
        const text = container.textContent ?? ""
        expect(container.querySelector('[data-fact="riskDimension.score"]')).toBeNull()
        expect(container.querySelector('[role="meter"]')).toBeNull()
        expect(text).not.toMatch(/\b42\b|\b91\b/)
        expect(text).not.toMatch(/πτώση κατά|fell by|μονάδες|points/)
        const pills = container.querySelectorAll('[data-fact="riskDimension.provenance"]')
        expect(pills.length).toBe(2)
        for (const pill of pills) expect(pill.textContent).toBe(provenance.underReview)
        expect(container.querySelector('[data-fact="riskDimension.disclosure"]')?.textContent).toBe(provenance.underReviewDisclosure)
        // No status colour class near the pill — text only (B3).
        for (const pill of pills) expect(pill.className).not.toMatch(/status-(success|warning|danger)/)
    })

    it("a dimension that does not apply is listed, not scored", () => {
        const { container } = render(<RiskDnaPanel language="el" dimensions={[dimension({}), dimension({ id: "pets", label: { el: "Κατοικίδια", en: "Pets" }, score: null })]} />)
        expect(container.querySelectorAll('[data-fact="riskDimension.provenance"]').length).toBe(1)
        expect(container.textContent).toContain("Δεν σας αφορούν: Κατοικίδια")
        expect(container.textContent).not.toMatch(/βαθμολογ/)
    })
})
