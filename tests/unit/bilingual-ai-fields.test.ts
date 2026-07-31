/**
 * WP-09 — a gap row must never claim a translation it does not have.
 *
 * Gap rows carry paired columns (aiExplanation / aiExplanationEl). The pipeline
 * normally returns { en, el }, but a provider can return a single string — and
 * the code handling that case wrote THE SAME STRING INTO BOTH columns. The row
 * then looked fully translated to any completeness check, while a Greek reader
 * was served English text presented as Greek.
 *
 * That is the worst shape a localisation bug can take: invisible in the data,
 * visible only to the user. A single string is a single-language answer; we
 * know which language was requested, so it goes in that column alone and the
 * renderers fall back to the gap definition's own localized description.
 */
import { describe, expect, it } from "vitest"
import { bilingualFields } from "@/lib/services/bilingual-ai-fields"

describe("bilingualFields", () => {
    it("splits a bilingual payload across both columns", () => {
        expect(bilingualFields("aiExplanation", { en: "Not covered", el: "Δεν καλύπτεται" }, "el"))
            .toEqual({ aiExplanation: "Not covered", aiExplanationEl: "Δεν καλύπτεται" })
    })

    it("puts a single Greek-run answer in the Greek column ONLY", () => {
        const fields = bilingualFields("aiExplanation", "Δεν καλύπτεται", "el")

        expect(fields.aiExplanationEl).toBe("Δεν καλύπτεται")
        expect(fields.aiExplanation).toBeNull()
    })

    it("puts a single English-run answer in the English column ONLY", () => {
        const fields = bilingualFields("aiExplanation", "Not covered", "en")

        expect(fields.aiExplanation).toBe("Not covered")
        expect(fields.aiExplanationEl).toBeNull()
    })

    it("never writes identical text into both columns", () => {
        // The precise regression: same string in both, row looks complete.
        for (const language of ["en", "el"] as const) {
            const fields = bilingualFields("aiExplanation", "Same text", language)
            const values = Object.values(fields).filter(Boolean)
            expect(values).toHaveLength(1)
        }
    })

    it("treats a missing or blank answer as absent in both languages", () => {
        expect(bilingualFields("aiSuggestion", null, "el")).toEqual({
            aiSuggestion: null,
            aiSuggestionEl: null,
        })
        expect(bilingualFields("aiSuggestion", "   ", "en")).toEqual({
            aiSuggestion: null,
            aiSuggestionEl: null,
        })
    })

    it("keeps a half-filled bilingual payload half-filled rather than duplicating", () => {
        expect(bilingualFields("aiExplanation", { en: "Only English" }, "el")).toEqual({
            aiExplanation: "Only English",
            aiExplanationEl: null,
        })
    })

    it("derives the Greek column name from the base, matching the schema", () => {
        expect(Object.keys(bilingualFields("aiSuggestion", "x", "en")).sort()).toEqual([
            "aiSuggestion",
            "aiSuggestionEl",
        ])
    })
})
