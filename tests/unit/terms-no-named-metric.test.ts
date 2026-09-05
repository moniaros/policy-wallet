import { describe, expect, it } from "vitest"
import { getLegalContent, LEGAL_DOC_META } from "@/lib/legal/legal-content"

/**
 * The Terms of Use name no product metric.
 *
 * Terms §8 used to list «οι βαθμολογίες προστασίας» / "protection scores"
 * among the things the AI produces. The protection score was removed from
 * the customer-facing product in Aug 2026 (PW-MOBILE-TRANSFORM-01, H-001)
 * and whether any score exists at all is still an open owner decision
 * (PW-TRANSPARENCY-02, human track item 5). A contract that names a specific
 * metric has to be amended every time that decision moves; one that names
 * none does not. So the rule is not "name the right metric" — it is "name no
 * metric" (PW-TRANSPARENCY-02 amendment 01, A1.1).
 *
 * The matcher is hoisted so the probe below exercises the expression the
 * guard runs, not a copy.
 */
const NAMED_METRIC =
    /βαθμολογ|σκορ\b|\bscore|δείκτ(ης|η|ες|ών)|\bindex\b|\brating\b|risk dna|ποσοστό (προστασίας|επάρκειας|κάλυψης)|coverage (score|index)/iu

function termsText(language: "el" | "en"): string[] {
    const terms = getLegalContent(language).terms
    const out: string[] = [terms.title]
    for (const section of terms.sections) {
        out.push(section.title, ...section.paragraphs)
        if (section.table) {
            out.push(...section.table.headers)
            for (const row of section.table.rows) out.push(...row)
        }
    }
    return out
}

describe("the Terms of Use name no product metric (A1.1)", () => {
    it("is proven red on the sentence it was written to remove", () => {
        expect(NAMED_METRIC.test("Οι αναλύσεις συμβολαίων, ο εντοπισμός κενών κάλυψης, οι βαθμολογίες προστασίας")).toBe(true)
        expect(NAMED_METRIC.test("Policy analyses, coverage-gap detection, protection scores and related highlights")).toBe(true)
        // And green on the replacement, so a pass means something.
        expect(NAMED_METRIC.test("Οι αναλύσεις συμβολαίων, ο εντοπισμός κενών κάλυψης και οι σχετικές επισημάνσεις")).toBe(false)
    })

    it.each(["el", "en"] as const)("%s Terms contain no named metric in any section", (language) => {
        const offenders = termsText(language).filter((text) => NAMED_METRIC.test(text))
        expect(offenders, `named metric in ${language} Terms:\n${offenders.join("\n")}`).toEqual([])
    })

    it("bumped the Terms revision when §8 changed (both locales share LEGAL_DOC_META)", () => {
        const meta = LEGAL_DOC_META.terms
        expect(meta).toBeDefined()
        // The revision that carried the score sentence was GR-GA-2026.07 / 2026-07-20.
        expect(meta!.version > "GR-GA-2026.07").toBe(true)
        expect(meta!.lastUpdatedIso >= "2026-09-05").toBe(true)
    })
})
