import { describe, expect, it } from "vitest"
import { getLegalContent, LEGAL_CONTENT_VERSION, type LegalDocumentKind } from "@/lib/legal/legal-content"
import { LEGAL_POLICY_VERSIONS } from "@/lib/compliance/consent"

const DOCUMENT_KINDS: LegalDocumentKind[] = ["terms", "privacy", "cookies", "subprocessors"]

function sectionIds(document: { sections: Array<{ id: string }> }) {
    return document.sections.map((section) => section.id)
}

describe("legal content parity", () => {
    it.each(DOCUMENT_KINDS)("keeps %s section ids aligned between Greek and English", (kind) => {
        const el = getLegalContent("el")
        const en = getLegalContent("en")
        expect(sectionIds(el[kind])).toEqual(sectionIds(en[kind]))
    })

    it.each(DOCUMENT_KINDS)("keeps non-empty %s sections in both languages", (kind) => {
        for (const language of ["el", "en"] as const) {
            for (const section of getLegalContent(language)[kind].sections) {
                expect(section.paragraphs.length).toBeGreaterThan(0)
            }
        }
    })

    it.each(DOCUMENT_KINDS)("keeps %s table shapes aligned between Greek and English", (kind) => {
        const elSections = getLegalContent("el")[kind].sections
        const enSections = getLegalContent("en")[kind].sections
        for (let i = 0; i < elSections.length; i += 1) {
            const elTable = elSections[i].table
            const enTable = enSections[i].table
            expect(Boolean(elTable)).toBe(Boolean(enTable))
            if (elTable && enTable) {
                expect(elTable.headers.length).toBe(enTable.headers.length)
                expect(elTable.rows.length).toBe(enTable.rows.length)
                for (const row of [...elTable.rows, ...enTable.rows]) {
                    expect(row.length).toBe(elTable.headers.length)
                }
            }
        }
    })

    it("serves normalized Greek legal text (no mojibake)", () => {
        const el = getLegalContent("el")
        expect(el.terms.title).toBe("Όροι Χρήσης")
        expect(el.privacy.title).toBe("Πολιτική Απορρήτου")
        expect(el.cookies.title).toBe("Πολιτική Cookies")
        expect(el.subprocessors.title).toBe("Υπο-εκτελούντες Επεξεργασίας")
    })

    it("lists every subprocessor in both languages", () => {
        for (const language of ["el", "en"] as const) {
            const list = getLegalContent(language).subprocessors.sections.find(
                (section) => section.id === "subprocessor_list"
            )
            expect(list?.table?.rows).toHaveLength(9)
            // Provider names are brand names — identical in both languages.
            expect(list?.table?.rows.map((row) => row[0])).toEqual([
                "Supabase",
                "Vercel",
                "Stripe",
                "Brevo",
                "Upstash",
                "Google (Gemini API)",
                "Google (Google Analytics)",
                "Anthropic",
                "OpenAI",
            ])
        }
    })

    it("aligns consent terms/privacy versions with legal content version", () => {
        expect(LEGAL_POLICY_VERSIONS.terms).toBe(LEGAL_CONTENT_VERSION)
        expect(LEGAL_POLICY_VERSIONS.privacy).toBe(LEGAL_CONTENT_VERSION)
    })

    it("ships the new legal pages free of unresolved entity placeholders", () => {
        // /cookies and /subprocessors ship as FINAL: unlike the parked
        // privacy/terms rewrite, they must contain no bracketed TODO markers.
        for (const language of ["el", "en"] as const) {
            for (const kind of ["cookies", "subprocessors"] as const) {
                const serialized = JSON.stringify(getLegalContent(language)[kind])
                expect(serialized).not.toContain("ΣΥΜΠΛΗΡΩΣΤΕ")
                expect(serialized).not.toContain("TO BE COMPLETED")
                expect(serialized).not.toContain("TO BE SET BY")
            }
        }
    })
})
