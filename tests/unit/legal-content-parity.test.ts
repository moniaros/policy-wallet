import { describe, expect, it } from "vitest"
import { getLegalContent, LEGAL_CONTENT_VERSION, type LegalDocumentKind } from "@/lib/legal/legal-content"
import { LEGAL_POLICY_VERSIONS } from "@/lib/compliance/consent"
import { LEGAL_ENTITY } from "@/lib/legal/entity-placeholders"

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

    it("ships every legal page free of unresolved entity placeholders", () => {
        // The whole legal set is now GA: no document may carry a bracketed TODO
        // marker, and no page may re-introduce a DRAFT version string.
        for (const language of ["el", "en"] as const) {
            for (const kind of DOCUMENT_KINDS) {
                const serialized = JSON.stringify(getLegalContent(language)[kind])
                expect(serialized).not.toContain("ΣΥΜΠΛΗΡΩΣΤΕ")
                expect(serialized).not.toContain("TO BE COMPLETED")
                expect(serialized).not.toContain("TO BE SET BY")
                expect(serialized).not.toContain("νομικό σύμβουλο")
                expect(serialized).not.toContain("legal counsel")
            }
        }
        expect(LEGAL_CONTENT_VERSION).not.toContain("DRAFT")
    })

    it("states the real corporate identity in the controller and provider sections", () => {
        const el = getLegalContent("el")
        const en = getLegalContent("en")

        const elController = el.privacy.sections.find((s) => s.id === "controller")?.paragraphs.join(" ") ?? ""
        const elProvider = el.terms.sections.find((s) => s.id === "provider")?.paragraphs.join(" ") ?? ""
        const enController = en.privacy.sections.find((s) => s.id === "controller")?.paragraphs.join(" ") ?? ""
        const enProvider = en.terms.sections.find((s) => s.id === "provider")?.paragraphs.join(" ") ?? ""

        for (const text of [elController, elProvider]) {
            expect(text).toContain("Insurance Martech Ι.Κ.Ε.")
            expect(text).toContain(LEGAL_ENTITY.el.gemi)
        }
        for (const text of [enController, enProvider]) {
            expect(text).toContain("Insurance Martech IKE")
            expect(text).toContain(LEGAL_ENTITY.en.gemi)
        }

        // The DPO mailbox must be reachable from the privacy policy in both languages.
        expect(elController).toContain(LEGAL_ENTITY.el.dpoEmail)
        expect(enController).toContain(LEGAL_ENTITY.en.dpoEmail)
    })

    it("caps liability at 12 months of fees and preserves the mandatory carve-outs", () => {
        const elLiability = getLegalContent("el").terms.sections.find((s) => s.id === "liability")
        const enLiability = getLegalContent("en").terms.sections.find((s) => s.id === "liability")
        const elText = elLiability?.paragraphs.join(" ") ?? ""
        const enText = enLiability?.paragraphs.join(" ") ?? ""

        expect(elText).toContain("δώδεκα (12) μήνες")
        expect(enText).toContain("twelve (12) months")

        // Carve-outs that cannot be excluded under Greek/EU law.
        for (const carveOut of ["απάτη", "δόλο", "βαριά αμέλεια", "θάνατο ή σωματική βλάβη"]) {
            expect(elText).toContain(carveOut)
        }
        for (const carveOut of ["fraud", "wilful misconduct", "gross negligence", "death or personal injury"]) {
            expect(enText).toContain(carveOut)
        }
    })

    it("names the courts of Chios as the competent venue", () => {
        expect(getLegalContent("el").terms.sections.find((s) => s.id === "law_venue")?.paragraphs.join(" ")).toContain(
            "Δικαστήρια Χίου"
        )
        expect(getLegalContent("en").terms.sections.find((s) => s.id === "law_venue")?.paragraphs.join(" ")).toContain(
            "Chios"
        )
    })
})
