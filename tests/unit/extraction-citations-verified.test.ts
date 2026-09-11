import { describe, it, expect } from "vitest"

import { verifyExtractionSources } from "@/lib/services/ai/extraction-citations"
import { enrichExtractionPayload } from "@/lib/services/ai/extraction-enrichment"
import { StoredAcordDataSchema } from "@/lib/schemas/acord-envelope"

/**
 * PW-PROVENANCE-01 W1-02. A citation is checked against the document's own
 * text: found → `verified: true` (on the cited page, or on `verifiedPage`);
 * absent from pages we read far enough → `verified: false`; otherwise left
 * as it came. Detected, never assumed — and never refuted beyond our reach.
 */

const local = (pages: string[], pageCount = pages.length) => ({ pages, sampledPages: pages.length, pageCount })
const PAGES = [
    "ΑΣΦΑΛΙΣΤΗΡΙΟ ΣΥΜΒΟΛΑΙΟ ΑΥΤΟΚΙΝΗΤΟΥ. Ασφαλιστής: Interamerican. Αριθμός συμβολαίου 1234567.",
    "Οδική Βοήθεια: Καλύπτεται. Θραύση κρυστάλλων: Καλύπτεται έως 1.500 €. Ολικά ασφάλιστρα: 420,00 €.",
]

describe("verifyExtractionSources — detected from the document, never assumed", () => {
    it("a snippet found on the cited page is verified, with tonos, case and spacing ignored", () => {
        const out = verifyExtractionSources(
            { "acordData.vehicle.hasRoadsideAssistance": { page: 2, snippet: "οδικη βοηθεια:  καλυπτεται" } },
            local(PAGES)
        )
        expect(out?.["acordData.vehicle.hasRoadsideAssistance"]).toEqual({ page: 2, snippet: "οδικη βοηθεια:  καλυπτεται", verified: true })
    })

    it("a snippet found on another page is verified there, and the cited page is kept", () => {
        const out = verifyExtractionSources({ insurerName: { page: 2, snippet: "Ασφαλιστής: Interamerican" } }, local(PAGES))
        expect(out?.insurerName).toEqual({ page: 2, snippet: "Ασφαλιστής: Interamerican", verified: true, verifiedPage: 1 })
    })

    it("punctuation the model dropped or added does not refute a real quote", () => {
        const out = verifyExtractionSources({ premiumAmount: { page: 2, snippet: "Ολικά ασφάλιστρα 420 00 €" } }, local(PAGES))
        expect(out?.premiumAmount?.verified).toBe(true)
    })

    it("a snippet nowhere in a fully-read document is refuted", () => {
        const out = verifyExtractionSources({ policyNumber: { page: 1, snippet: "Αριθμός συμβολαίου 9999999" } }, local(PAGES))
        expect(out?.policyNumber).toEqual({ page: 1, snippet: "Αριθμός συμβολαίου 9999999", verified: false })
    })

    it("a snippet citing a page beyond the pages read is left unverified — not refuted", () => {
        const out = verifyExtractionSources({ endDate: { page: 30, snippet: "Λήξη: 31/12/2026" } }, local(PAGES, 40))
        expect(out?.endDate).toEqual({ page: 30, snippet: "Λήξη: 31/12/2026" })
    })

    it("no cited page, partial read, not found: unverifiable; fully read: refuted", () => {
        expect(verifyExtractionSources({ x: { snippet: "nowhere" } }, local(PAGES, 40))?.x).toEqual({ snippet: "nowhere" })
        expect(verifyExtractionSources({ x: { snippet: "nowhere" } }, local(PAGES))?.x).toEqual({ snippet: "nowhere", verified: false })
    })

    it("no local text (a scan, a photo) or no snippet: entries pass through untouched", () => {
        const sources = { insurerName: { page: 1, snippet: "Interamerican" }, endDate: { page: 2 } }
        expect(verifyExtractionSources(sources, null)).toBe(sources)
        expect(verifyExtractionSources(sources, local([]))).toBe(sources)
        expect(verifyExtractionSources(sources, local(PAGES))?.endDate).toEqual({ page: 2 })
        expect(verifyExtractionSources(null, local(PAGES))).toBeNull()
    })
})

describe("the enrichment stores the verified citation, and the stored schema accepts it", () => {
    const payload = {
        insurerName: "Interamerican",
        policyNumber: "1234567",
        lineOfBusiness: "motor",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        premiumAmount: 420,
        extractionSources: {
            insurerName: { page: 1, snippet: "Ασφαλιστής: Interamerican" },
            policyNumber: { page: 1, snippet: "Αριθμός συμβολαίου 9999999" },
            "acordData.vehicle.glassBreakage": { page: 2, snippet: "Θραύση κρυστάλλων: Καλύπτεται" },
        },
    }

    it("with local text: verified marks land under extraction.sources", () => {
        const { acordData } = enrichExtractionPayload(payload as any, undefined, "gemini", local(PAGES))
        const sources = acordData.extraction.sources
        expect(sources.insurerName.verified).toBe(true)
        expect(sources.policyNumber.verified).toBe(false)
        expect(sources["acordData.vehicle.glassBreakage"].verified).toBe(true)
        const parsed = StoredAcordDataSchema.safeParse(acordData)
        expect(parsed.success, JSON.stringify(parsed.error?.issues ?? [], null, 1)).toBe(true)
    })

    it("without local text: nothing is claimed either way", () => {
        const { acordData } = enrichExtractionPayload(payload as any, undefined, "gemini")
        expect(acordData.extraction.sources.insurerName.verified).toBeUndefined()
        expect(acordData.extraction.sources.policyNumber.verified).toBeUndefined()
    })
})
