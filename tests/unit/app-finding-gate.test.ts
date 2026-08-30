import { describe, it, expect, vi } from "vitest"

vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))
import { logger } from "@/lib/logger"
import { toRenderableFinding, renderableFindings, findingHash, FindingSchema } from "@/lib/app/finding"

const valid = (): any => ({
    id: "f1",
    hash: findingHash("pol-1", "flood", "home_flood_missing"),
    kind: "gap",
    tier: "now",
    object: { policyId: "pol-1", assetLabel: "Κατοικία · Κηφισιά" },
    sentence: { key: "app.finding.home.flood.missing", params: { asset: "Κατοικία · Κηφισιά" } },
    source: {
        documentId: "doc-1",
        documentLabel: "Ασφαλιστήριο κατοικίας",
        locator: { kind: "section", section: "coverages", found: false },
        othersSearched: 29,
    },
    ruleId: "home_flood_missing",
})

describe("the specificity gate", () => {
    it("passes a finding with a concrete object and a document source", () => {
        expect(toRenderableFinding(valid())).not.toBeNull()
    })
    it("rejects a finding without a document — and says so in the log", () => {
        const f = valid()
        ;(f.source as { documentId: string }).documentId = ""
        expect(toRenderableFinding(f)).toBeNull()
        expect(logger).toHaveBeenCalled()
    })
    it("rejects a finding that names no policy and no person", () => {
        const f = valid()
        f.object = { policyId: null, assetLabel: "generic" }
        expect(toRenderableFinding(f)).toBeNull()
    })
    it("rejects an empty asset label", () => {
        const f = valid()
        f.object = { policyId: "pol-1", assetLabel: "   " }
        expect(toRenderableFinding(f)).toBeNull()
    })
    it("rejects free text where a message key belongs", () => {
        const f = valid() as Record<string, unknown>
        f.sentence = "Αυτό το σημείο επηρεάζει το επίπεδο προστασίας σας."
        expect(toRenderableFinding(f)).toBeNull()
    })
    it("accepts a page locator only with a real page number and a bounded snippet", () => {
        const f = valid()
        f.source.locator = { kind: "page", page: 4, snippet: "Πλημμύρα: δεν καλύπτεται" } as never
        expect(toRenderableFinding(f)).not.toBeNull()
        f.source.locator = { kind: "page", page: 0 } as never
        expect(toRenderableFinding(f)).toBeNull()
        f.source.locator = { kind: "page", page: 2, snippet: "x".repeat(241) } as never
        expect(toRenderableFinding(f)).toBeNull()
    })
    it("why-you is optional but never generic: it must name the profile field it rests on", () => {
        const f = valid() as Record<string, unknown>
        f.whyYou = { key: "app.finding.why.dependants", params: { n: 2 } }
        expect(toRenderableFinding(f)).toBeNull()
        f.whyYou = { key: "app.finding.why.dependants", params: { n: 2 }, profileField: "dependentsCount" }
        expect(toRenderableFinding(f)).not.toBeNull()
    })
    it("filters a batch, keeping only what passes", () => {
        const bad = valid()
        ;(bad.source as { documentId: string }).documentId = ""
        expect(renderableFindings([valid(), bad, {}])).toHaveLength(1)
    })
    it("the schema carries no severity field at all", () => {
        expect(Object.keys(FindingSchema.shape)).not.toContain("severity")
        expect(Object.keys(FindingSchema.shape)).not.toContain("urgency")
    })
})

describe("findingHash", () => {
    it("is deterministic and inspectable", () => {
        expect(findingHash("Pol 1", "Flood", "home_flood")).toBe("pol_1|flood|home_flood")
        expect(findingHash(null, "life_dependants", "mortgage_no_life")).toBe("profile|life_dependants|mortgage_no_life")
    })
})
