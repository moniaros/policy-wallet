import { describe, it, expect, vi } from "vitest"
vi.mock("@/lib/logger", () => ({ logger: vi.fn() }))
import { composePolicies, composeFindings, composeRenderable, currentDocument, type ComposePolicy, type ComposeGap } from "@/lib/app/compose"
import { GAP_SENTENCES } from "@/lib/app/gap-copy"
import { AUTHORED_GAP_DEFINITIONS } from "@/lib/gaps/authored-catalogue"

const now = new Date("2026-08-30T10:00:00Z")
const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000)
const doc = (id: string, over: Partial<ComposePolicy["documents"][number]> = {}) => ({ id, documentKind: "policy_schedule", effectiveFrom: null, effectiveTo: null, uploadedAt: new Date("2026-01-01"), supersededById: null, ...over })
const policy = (id: string, lob: string, over: Partial<ComposePolicy> = {}): ComposePolicy => ({
    id, lineOfBusiness: lob, insurerName: "Interamerican", policyNumber: `P-${id}`, status: "active", endDate: inDays(200), acordData: {}, lastAnalyzedAt: new Date("2026-08-01"), documents: [doc(`d-${id}`)], ...over,
})
const gap = (id: string, policyId: string | null, slug: string, ops: Array<{ operator: string; field?: string; fields?: string[] }>, over: Partial<ComposeGap> = {}): ComposeGap => ({
    id, policyId, ruleId: slug, ruleInputs: {}, engineVersion: "rules-1", definition: { slug, lineOfBusiness: "home", detectionLogic: { rules: ops.map((o) => ({ type: "acord_field_check", ...o })), operator: "AND" } }, ...over,
})

describe("compose — findings from what the engine decided", () => {
    it("every authored rule has an authored sentence in both languages (no rule can be shown as English or generic prose)", () => {
        for (const d of AUTHORED_GAP_DEFINITIONS) {
            const s = GAP_SENTENCES[d.slug]
            expect(s, `${d.slug} has no sentence`).toBeTruthy()
            expect(s.el).toContain("{asset}")
            expect(s.en).toContain("{asset}")
        }
    })
    it("an is_false rule is a GAP with a section source; a missing rule is a REVIEW worded 'not recorded'", () => {
        const home = policy("h1", "home", { acordData: { property: { address: "Κηφισιάς 12" } } })
        const health = policy("k1", "health")
        const composed = composePolicies([home, health], "el", now)
        const findings = composeFindings(composed, new Map([["h1", home], ["k1", health]]), [
            gap("g1", "h1", "no_flood_cover", [{ operator: "is_false", field: "property.floodCoverageIncluded" }]),
            gap("g2", "k1", "missing_hospital_class", [{ operator: "missing", field: "health.hospitalClass" }]),
        ], null, "el")
        const flood = findings.find((f) => f.id === "gap:g1")!
        expect(flood.kind).toBe("gap")
        expect(flood.object.assetLabel).toMatch(/Κατοικία · Κηφισιάς 12/)
        expect(flood.source.documentId).toBe("d-h1")
        expect(flood.source.locator).toEqual({ kind: "section", section: "coverages", found: false })
        expect(GAP_SENTENCES.no_flood_cover.el).toBe("Στο {asset} δεν βρήκα κάλυψη πλημμύρας.")
        const cls = findings.find((f) => f.id === "gap:g2")!
        expect(cls.kind).toBe("review")
        expect(GAP_SENTENCES.missing_hospital_class.el).toMatch(/καταγεγραμμέν/)
        expect(cls.source.locator).toEqual({ kind: "section", section: "schedule", found: false })
    })
    it("uses a recorded page + snippet when the extraction has one for the rule's field", () => {
        const home = policy("h1", "home", { acordData: { extraction: { sources: { "property.floodCoverageIncluded": { page: 4, snippet: "Πλημμύρα: δεν καλύπτεται" } } } } })
        const composed = composePolicies([home], "el", now)
        const [f] = composeFindings(composed, new Map([["h1", home]]), [gap("g1", "h1", "no_flood_cover", [{ operator: "is_false", field: "property.floodCoverageIncluded" }])], null, "el")
        expect(f.source.locator).toEqual({ kind: "page", page: 4, snippet: "Πλημμύρα: δεν καλύπτεται" })
    })
    it("expiries inside 45 days are findings of kind expiry; the motor sentence carries the uninsured-on-the-road date", () => {
        const car = policy("m1", "motor", { endDate: inDays(8), acordData: { vehicle: { plateNumber: "ΙΚΖ-4821" } } })
        const far = policy("m2", "motor", { endDate: inDays(90) })
        const composed = composePolicies([car, far], "el", now)
        const findings = composeFindings(composed, new Map([["m1", car], ["m2", far]]), [], null, "el")
        expect(findings).toHaveLength(1)
        expect(findings[0]).toMatchObject({ kind: "expiry", tier: "now", daysUntilExpiry: 8 })
        expect(findings[0].sentence.key).toBe("app.finding.sentence.expiryMotor")
        expect(findings[0].object.assetLabel).toMatch(/ΙΚΖ-4821/)
    })
    it("a gap on an expired policy, on a policy with no document, or on a rule with no sentence is not composed — logged, not shown", () => {
        const log = vi.fn()
        const expired = policy("x1", "home", { endDate: inDays(-10) })
        const noDoc = policy("n1", "home", { documents: [] })
        const okay = policy("o1", "home")
        const composed = composePolicies([expired, noDoc, okay], "el", now)
        const findings = composeFindings(composed, new Map([["x1", expired], ["n1", noDoc], ["o1", okay]]), [
            gap("g1", "x1", "no_flood_cover", [{ operator: "is_false", field: "property.floodCoverageIncluded" }]),
            gap("g2", "n1", "no_flood_cover", [{ operator: "is_false", field: "property.floodCoverageIncluded" }]),
            gap("g3", "o1", "some_unauthored_slug", [{ operator: "is_false", field: "x" }]),
            gap("g4", null, "mortgage_no_life", [{ operator: "is_false", field: "x" }]),
        ], null, "el", log)
        expect(findings).toHaveLength(0)
        expect(log).toHaveBeenCalledTimes(3)
        expect(composeRenderable(findings)).toHaveLength(0)
    })
    it("why-you appears only when the user ENTERED the fact the rule rests on", () => {
        const home = policy("h1", "home")
        const composed = composePolicies([home], "el", now)
        const g = gap("g1", "h1", "no_flood_cover", [{ operator: "is_false", field: "property.floodCoverageIncluded" }])
        const without = composeFindings(composed, new Map([["h1", home]]), [g], { answeredFields: [], ownsHome: true, vehiclesCount: 0, dependentsCount: 0 }, "el")
        expect(without[0].whyYou).toBeNull()
        const withFact = composeFindings(composed, new Map([["h1", home]]), [g], { answeredFields: ["ownsHome"], ownsHome: true, vehiclesCount: 0, dependentsCount: 0 }, "el")
        expect(withFact[0].whyYou).toMatchObject({ key: "app.finding.why.ownsHome", profileField: "ownsHome" })
        expect(withFact[0].tier).toBe("now")
        expect(without[0].tier).toBe("later")
    })
    it("othersSearched counts the OTHER live policies in the same family, and is omitted when there are none", () => {
        const a = policy("a", "home"); const b = policy("b", "home"); const c = policy("c", "motor")
        const composed = composePolicies([a, b, c], "el", now)
        const [f] = composeFindings(composed, new Map([["a", a], ["b", b], ["c", c]]), [gap("g1", "a", "no_flood_cover", [{ operator: "is_false", field: "property.floodCoverageIncluded" }])], null, "el")
        expect(f.source.othersSearched).toBe(1)
        const [g] = composeFindings(composePolicies([a, c], "el", now), new Map([["a", a], ["c", c]]), [gap("g1", "a", "no_flood_cover", [{ operator: "is_false", field: "property.floodCoverageIncluded" }])], null, "el")
        expect(g.source.othersSearched).toBeUndefined()
    })
    it("the current document is the newest schedule that nothing supersedes", () => {
        const docs = [doc("old", { supersededById: "new" }), doc("new", { effectiveFrom: new Date("2026-06-01") }), doc("terms", { documentKind: "terms_and_conditions", effectiveFrom: new Date("2026-07-01") })]
        expect(currentDocument(docs)!.id).toBe("new")
        expect(currentDocument([])).toBeNull()
    })
})
