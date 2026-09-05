import { describe, expect, it, vi } from "vitest"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"
import { orderByProvenance, partitionByProvenance, isClassified, provenanceOf } from "@/lib/gaps/provenance"
import { selectFreePreviewGapIds, groupGapsByCoverageArea, type GapReportItem } from "@/lib/wallet/gap-report"

/**
 * F1 (PW-TRANSPARENCY-02 close-out) — finding order is deterministic.
 *
 * With every authored slug in one provenance class, ordering used to fall
 * through to the caller's order, which is the definitions table's row order:
 * unstable across environments and deploys. The rule: provenance class first
 * (B3), then the authored catalogue's declared order within a class, then a
 * stable identity tiebreak. The same fixture must produce an identical ordered
 * result when the rows arrive reversed — at every site that orders or slices
 * findings. The probe below is an ordering that reads row order; it fails the
 * same check, which is how this guard is proven to bite.
 */
const slugs = AUTHORED_GAP_DEFINITIONS.filter((d) => d.lineOfBusiness === "home").map((d) => d.slug)
const items = (order: readonly string[]): GapReportItem[] =>
    order.map((slug, i) => ({
        id: `id-${slug}`,
        slug,
        duplicateIds: [],
        severity: (["low", "critical", "medium", "high"] as const)[i % 4],
        content: { titleEl: `Τίτλος ${i}`, titleEn: `Title ${i}`, known: true, coverageArea: "property", mechanic: "exclusion" } as any,
        aiExplanation: null,
        aiExplanationEl: null,
        aiSuggestion: null,
        aiSuggestionEl: null,
    }))

// F5 classified some slugs, so the expected order is CLASS first (B3), then the
// catalogue's declared order within each class — stated here independently of
// the comparator under test.
const expected = [...slugs.filter((x) => isClassified(provenanceOf(x))), ...slugs.filter((x) => !isClassified(provenanceOf(x)))]

const forward = items(slugs)
const reversed = items([...slugs].reverse())

describe("finding order does not depend on row order", () => {
    it("orderByProvenance: reversed input → identical order", () => {
        const a = orderByProvenance(forward, (x) => x.slug).map((x) => x.slug)
        const b = orderByProvenance(reversed, (x) => x.slug).map((x) => x.slug)
        expect(b).toEqual(a)
        // and that order IS the catalogue's declared order within the class
        expect(a).toEqual(expected)
    })

    it("partitionByProvenance: each group keeps the same order under reversal", () => {
        const a = partitionByProvenance(forward, (x) => x.slug)
        const b = partitionByProvenance(reversed, (x) => x.slug)
        expect(b.underReview.map((x) => x.slug)).toEqual(a.underReview.map((x) => x.slug))
    })

    it("the free preview selects the same ids in the same order under reversal", () => {
        expect([...selectFreePreviewGapIds(reversed, 3)]).toEqual([...selectFreePreviewGapIds(forward, 3)])
    })

    it("coverage-area groups keep the same within-area order under reversal", () => {
        const a = groupGapsByCoverageArea(forward).flatMap((g) => g.items.map((x) => x.slug))
        const b = groupGapsByCoverageArea(reversed).flatMap((g) => g.items.map((x) => x.slug))
        expect(b).toEqual(a)
    })

    it("the accessor orders live rows by class then catalogue order, whatever the database returns", async () => {
        vi.resetModules()
        const rows = (order: readonly string[]) => order.map((slug, i) => ({ id: `g-${slug}`, policyId: "p1", status: "open", detectedAt: new Date(2026, 8, 1 + i), definition: { slug } }))
        const findMany = vi.fn()
        vi.doMock("@/lib/db", () => ({ db: { gapInstance: { findMany } } }))
        const { readLiveGapRows } = await import("@/lib/gaps/gap-rows")
        findMany.mockResolvedValueOnce(rows(slugs))
        const a = (await readLiveGapRows({ scope: "disclosed", where: { policyId: "p1" } })).map((r) => r.definition.slug)
        findMany.mockResolvedValueOnce(rows([...slugs].reverse()))
        const b = (await readLiveGapRows({ scope: "disclosed", where: { policyId: "p1" } })).map((r) => r.definition.slug)
        expect(b).toEqual(a)
        expect(a).toEqual(expected)
        vi.doUnmock("@/lib/db")
    })

    it("PROBE: an ordering that reads row order fails the reversal check", () => {
        const byRowOrder = <T,>(xs: readonly T[]) => [...xs]
        expect(byRowOrder(reversed).map((x) => x.slug)).not.toEqual(byRowOrder(forward).map((x) => x.slug))
    })
})
