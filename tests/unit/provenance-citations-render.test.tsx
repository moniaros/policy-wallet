/**
 * F5 (PW-TRANSPARENCY-02 close-out): a requirement is classified ONLY with a
 * citation, and every classified requirement renders its citation at every
 * render site — the findings card, the coverage-insights card, the agent
 * insights pill, the report, the home attention list and the digest email.
 *
 * Two arms:
 *  1. the map: every non-under_review entry names a law/article in both
 *     languages, and nothing is 'market' in this pass;
 *  2. the render sites, enumerated from disk: any file that renders a slug's
 *     provenance class (calls provenanceLabel( or renders data-provenance=)
 *     must go through a citation helper or carry a citation field. Probe committed.
 */
import { describe, expect, it } from "vitest"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { render } from "@testing-library/react"
import { GAP_PROVENANCE, provenanceCitation, provenanceOf, isClassified } from "@/lib/gaps/provenance"
import { provenanceLabelWithCitation } from "@/components/gaps/provenance-label"
import { GapCard } from "@/components/wallet/gap-report/GapCard"
import { AttentionList } from "@/components/dashboard/home/AttentionList"
import { getTranslations } from "@/lib/i18n"

function walk(dir: string): string[] {
    if (!existsSync(dir)) return []
    return readdirSync(dir).flatMap((name) => {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) return name === "node_modules" ? [] : walk(p)
        return /\.(tsx?|mjs)$/.test(p) ? [p] : []
    })
}

const LABEL_MODULE = "components/gaps/provenance-label.ts"
/**
 * Reasoned exemptions — a file that renders a CLASS with no slug at hand.
 * GapReportList renders a section heading per provenance class over cards
 * that each carry the citation (GapCard, asserted below); the heading itself
 * names no requirement, so it has nothing to cite.
 */
const CLASS_HEADING_ONLY: Record<string, string> = {
    "components/wallet/gap-report/GapReportList.tsx": "section heading per class; every card under it renders its citation (GapCard render test)",
}
const CITATION_HELPERS = /provenanceLabelWithCitation\(|provenanceCitation\(|recommendationCitation\(|\.citation\b|\bcitation\??:/

/** A file that shows a slug's class without its citation. */
export function rendersClassWithoutCitation(src: string): boolean {
    const showsClass = /provenanceLabel\(/.test(src) || /data-provenance=\{/.test(src)
    return showsClass && !CITATION_HELPERS.test(src)
}

describe("F5 — the map: classified means cited", () => {
    it("every classified entry cites a law/article in both languages, with reviewer and date; nothing is market", () => {
        const entries = Object.entries(GAP_PROVENANCE)
        expect(entries.length).toBe(29)
        for (const [slug, e] of entries) {
            expect(e.provenance, slug).not.toBe("market")
            if (e.provenance === "under_review") {
                expect(e.citation, slug).toBeNull()
            } else {
                expect(e.citation?.el, slug).toMatch(/άρθρο/)
                expect(e.citation?.en, slug).toMatch(/Article/)
                expect(e.reviewedBy, slug).toBeTruthy()
                expect(e.reviewedAt, slug).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            }
        }
        const classified = entries.filter(([, e]) => isClassified(e.provenance)).map(([s]) => s)
        expect(classified.sort()).toEqual(["insured_value_above_declared", "insured_value_below_rebuild_cost", "missing_microchip_number"])
    })

    it("the label helper renders class + citation for a classified slug and the class alone otherwise", () => {
        const copy = getTranslations("el").provenance
        expect(provenanceLabelWithCitation("insured_value_above_declared", "el", copy)).toBe(`${copy.legislative} · ${provenanceCitation("insured_value_above_declared")!.el}`)
        expect(provenanceLabelWithCitation("no_fire_cover", "el", copy)).toBe(copy.underReview)
        expect(provenanceOf("no_fire_cover")).toBe("under_review")
    })
})

describe("F5 — every render site of a class renders the citation (enumerated from disk)", () => {
    const files = [...walk("app"), ...walk("components"), ...walk("lib")].filter((f) => f !== LABEL_MODULE && !(f in CLASS_HEADING_ONLY))

    it("every exemption still exists on disk and still only renders a heading", () => {
        for (const f of Object.keys(CLASS_HEADING_ONLY)) {
            expect(existsSync(f), f).toBe(true)
            const src = readFileSync(f, "utf8")
            expect(src, `${f} now has a slug at hand — route it through provenanceLabelWithCitation`).not.toMatch(/provenanceLabelWithCitation\(|provenanceLabel\(/)
        }
    })

    it("no file shows a slug's provenance class without a citation helper or field", () => {
        const offenders = files.filter((f) => rendersClassWithoutCitation(readFileSync(f, "utf8")))
        expect(offenders).toEqual([])
    })

    it("the probe turns the scan red", () => {
        expect(rendersClassWithoutCitation(readFileSync("tests/fixtures/guard-probes/provenance-label-without-citation.tsx.txt", "utf8"))).toBe(true)
    })

    it("the known sites are among the enumerated ones and carry the citation (a floor, not the guard)", () => {
        for (const f of [
            "components/wallet/gap-report/GapCard.tsx",
            "components/coverage/CoverageInsightsClient.tsx",
            "app/(protected)/insights/InsightsClient.tsx",
            "lib/services/reports/savings-report.ts",
            "components/dashboard/home/AttentionList.tsx",
            "lib/email/templates/weekly-digest.ts",
        ]) {
            expect(files, f).toContain(f)
            expect(CITATION_HELPERS.test(readFileSync(f, "utf8")), f).toBe(true)
        }
    })
})

describe("F5 — rendered", () => {
    const copy = getTranslations("el")
    const item = (slug: string) => ({
        id: `id-${slug}`, slug, duplicateIds: [], severity: null,
        content: { titleEl: "Τίτλος", titleEn: "Title", known: true, coverageArea: "property", mechanic: "exclusion" } as any,
        aiExplanation: null, aiExplanationEl: null, aiSuggestion: null, aiSuggestionEl: null,
    }) as any
    const cardCopy = { mechanicChip: { exclusion: "Εξαίρεση" }, validationChip: { probable: "Πιθανό" }, expand: "+", collapse: "−", recommendation: "Σύσταση", hide: "Απόκρυψη", sending: "…", notifyAgent: "Ενημέρωση" }

    it("GapCard: a classified finding shows the law and article; an under-review one shows no citation line", () => {
        const a = render(<GapCard item={item("insured_value_above_declared")} lang="el" copy={cardCopy} onIgnore={() => {}} onNotify={() => {}} ignoring={false} notifying={false} />)
        expect(a.container.querySelector('[data-fact="gap.citation"]')?.textContent).toContain("2496/1997")
        expect(a.container.querySelector('[data-fact="gap.citation"]')?.textContent).toContain(copy.provenance.legislative)
        const b = render(<GapCard item={item("no_fire_cover")} lang="el" copy={cardCopy} onIgnore={() => {}} onNotify={() => {}} ignoring={false} notifying={false} />)
        expect(b.container.querySelector('[data-fact="gap.citation"]')).toBeNull()
    })

    it("AttentionList: an item carrying a citation renders it; one without renders none", () => {
        const base = { ruleId: "r", area: undefined, reason: null, reasonCountKey: undefined, urgency: "medium", urgencyLabel: "Μεσαία", timingLabel: null } as any
        const { container } = render(<AttentionList items={[{ ...base, id: "1", title: "Α", citation: "Ν. 2496/1997, άρθρο 17" }, { ...base, id: "2", title: "Β", citation: null }]} totalCount={2} language="el" labels={{ kicker: "Χρειάζονται προσοχή", viewAll: "Όλες", emptyTitle: "—", emptyBody: "—", priorityNote: "—" }} />)
        const lines = container.querySelectorAll('[data-fact="gap.citation"]')
        expect(lines.length).toBe(1)
        expect(lines[0].textContent).toContain("2496/1997")
    })
})
