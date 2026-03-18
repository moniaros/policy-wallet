import { describe, expect, it } from "vitest"
import { getLegalContent, LEGAL_CONTENT_VERSION } from "@/lib/legal/legal-content"
import { LEGAL_POLICY_VERSIONS } from "@/lib/compliance/consent"

function sectionIds(document: { sections: Array<{ id: string }> }) {
    return document.sections.map((section) => section.id)
}

describe("legal content parity", () => {
    it("keeps terms section ids aligned between Greek and English", () => {
        const el = getLegalContent("el")
        const en = getLegalContent("en")
        expect(sectionIds(el.terms)).toEqual(sectionIds(en.terms))
    })

    it("keeps privacy section ids aligned between Greek and English", () => {
        const el = getLegalContent("el")
        const en = getLegalContent("en")
        expect(sectionIds(el.privacy)).toEqual(sectionIds(en.privacy))
    })

    it("keeps non-empty sections in both languages", () => {
        const el = getLegalContent("el")
        const en = getLegalContent("en")

        for (const section of el.terms.sections) {
            expect(section.paragraphs.length).toBeGreaterThan(0)
        }
        for (const section of en.terms.sections) {
            expect(section.paragraphs.length).toBeGreaterThan(0)
        }
        for (const section of el.privacy.sections) {
            expect(section.paragraphs.length).toBeGreaterThan(0)
        }
        for (const section of en.privacy.sections) {
            expect(section.paragraphs.length).toBeGreaterThan(0)
        }
    })

    it("serves normalized Greek legal text (no mojibake)", () => {
        const el = getLegalContent("el")
        expect(el.terms.title).toBe("Όροι Χρήσης")
        expect(el.privacy.title).toBe("Πολιτική Απορρήτου")
    })

    it("aligns consent terms/privacy versions with legal content version", () => {
        expect(LEGAL_POLICY_VERSIONS.terms).toBe(LEGAL_CONTENT_VERSION)
        expect(LEGAL_POLICY_VERSIONS.privacy).toBe(LEGAL_CONTENT_VERSION)
    })
})
