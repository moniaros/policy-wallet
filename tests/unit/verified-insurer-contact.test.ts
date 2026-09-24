import { describe, it, expect } from "vitest"
import { matchVerifiedCallCentre, type CatalogueInsurer } from "@/lib/wallet/verified-insurer-contact"

const V = { callCenter: "verified_2026" }
const ROWS: CatalogueInsurer[] = [
    { name: "Εθνική Ασφαλιστική", nameEn: "Ethniki Insurance", legalNameEl: "Η ΕΘΝΙΚΗ Α.Ε.Ε.Γ.Α.", callCenter: "+30 210 909 9000", fieldConfidence: V },
    { name: "Interamerican", nameEn: "Interamerican", legalNameEl: "INTERAMERICAN Ελληνική Ασφαλιστική Εταιρία Ζημιών Α.Ε.", callCenter: "+30 210 946 2000", fieldConfidence: V },
    { name: "Anytime", nameEn: "Anytime", legalNameEl: "εμπορικό σήμα της INTERAMERICAN", callCenter: null, fieldConfidence: { callCenter: "unverified" } },
    { name: "Allianz Ευρωπαϊκή Πίστη", nameEn: "Allianz Europaiki Pisti", legalNameEl: "Allianz Ευρωπαϊκή Πίστη Μονοπρόσωπη Α.Α.Ε.", callCenter: "+30 210 699 9999", fieldConfidence: { callCenter: "stale" } },
    { name: "NN Hellas", nameEn: "NN Hellas", legalNameEl: "ΝΝ Ελληνική", callCenter: "+30 210 950 6000", fieldConfidence: V },
]

describe("verified insurer call centre — conservative fallback (owner decision 2026-09-24)", () => {
    it("matches every live spelling of Εθνική to its verified call centre", () => {
        for (const name of ["ΕΘΝΙΚΗ", "ΕΘΝΙΚΗ ΑΣΦΑΛΙΣΤΙΚΗ", "ΕΘΝΙΚΗ Η ΠΡΩΤΗ ΑΣΦΑΛΙΣΤΙΚΗ", "Η ΕΘΝΙΚΗ"]) {
            expect(matchVerifiedCallCentre(ROWS, name), name).toEqual({ insurer: "Εθνική Ασφαλιστική", phone: "+30 210 909 9000" })
        }
    })
    it("never returns a number that is not verified_2026", () => {
        expect(matchVerifiedCallCentre(ROWS, "Allianz Ευρωπαϊκή Πίστη")).toBeNull()
    })
    it("a brand inside another insurer's legal name does not steal the match", () => {
        expect(matchVerifiedCallCentre(ROWS, "INTERAMERICAN")?.insurer).toBe("Interamerican")
    })
    it("placeholders, generic words and unknown names give nothing", () => {
        for (const name of ["__PENDING_EXTRACTION__", "Ασφαλιστική Εταιρεία", "Example Insurance Company Ltd", "", null]) {
            expect(matchVerifiedCallCentre(ROWS, name), String(name)).toBeNull()
        }
    })
    it("two different insurers matching equally → nothing (no guessing)", () => {
        const twins: CatalogueInsurer[] = [
            { name: "Alpha Ασφαλιστική", nameEn: null, legalNameEl: null, callCenter: "1", fieldConfidence: V },
            { name: "Alpha Insurance", nameEn: null, legalNameEl: null, callCenter: "2", fieldConfidence: V },
        ]
        expect(matchVerifiedCallCentre(twins, "ALPHA")).toBeNull()
    })
})
