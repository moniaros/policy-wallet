/**
 * Every row in the wallet carries something that tells it apart.
 *
 * Two policies of the same line at the same insurer rendered identically —
 * «Interamerican · Αυτοκίνητο · 09/02/2027 · ΕΝΕΡΓΟ» — and 12 of 30 rows in the
 * measured fixture sit in a duplicate group. `policyRowIdentity` answers "what
 * distinguishes THIS row" for every line, where `policyAssetIdentifier` answers
 * it only for lines that insure a thing.
 */
import { describe, expect, it } from "vitest"
import {
    policyRowIdentity,
    policyAssetSubjectKey,
    type PolicyRowIdentitySource,
} from "../../lib/wallet/policy-identity"

const row = (lineOfBusiness: string, acordData: any, policyNumber?: string) =>
    policyRowIdentity({ lineOfBusiness, acordData, policyNumber } as PolicyRowIdentitySource)

describe("the asset comes first, for lines that insure a thing", () => {
    it("motor → the plate", () => {
        expect(row("motor", { vehicle: { plateNumber: "ΙΚΖ-4821" } })).toEqual({
            value: "ΙΚΖ-4821",
            kind: "asset",
        })
    })

    it("home → the street line, not the whole postal string", () => {
        expect(row("home", { property: { address: "Κηφισίας 12, Αθήνα 115 23" } }).value).toBe(
            "Κηφισίας 12"
        )
    })

    it("home falls back to the property's shape when no address was extracted", () => {
        // `property.address` is populated in NO home policy in either database —
        // the schema field had no `.describe()`, so the extractor was never told
        // to look. The hint is added, but it cannot reach policies already
        // stored and never re-analysed.
        expect(row("home", { property: { type: "Διαμέρισμα", squareMeters: 85 } }).value).toBe(
            "Διαμέρισμα 85 τ.μ."
        )
    })

    it("COMMERCIAL MARINE resolves — the old branch was unreachable", () => {
        // `marine_hull|cargo|crew` all carry `parentId: 'business'`, so the
        // previous `family.startsWith('marine')` test could never be true and
        // every commercial marine policy fell through to null while the
        // marine_hull pack was populating `marineVessel` all along.
        for (const lob of ["marine_hull", "marine_cargo", "marine_crew"]) {
            expect.soft(row(lob, { marineVessel: { registryNumber: "GR-7788" } }).value, lob).toBe(
                "GR-7788"
            )
        }
    })

    it("...without dragging in `money`, which shares the business family", () => {
        expect(row("money", { marineVessel: { registryNumber: "GR-7788" } }).kind).not.toBe("asset")
    })
})

describe("health and life name the insured person", () => {
    it("uses insured.name", () => {
        expect(row("health", { insured: { name: "Ιωάννης Μονιάρος" } })).toEqual({
            value: "Ιωάννης Μονιάρος",
            kind: "person",
        })
    })

    it("falls to policyholder.name, one party in precedence — never a union", () => {
        // Unioning these keys is what listed one person twice on the detail page
        // when a renewal restated the name (lib/wallet/insured-people.ts).
        expect(row("life", { policyholder: { name: "Μαρία Π." } }).value).toBe("Μαρία Π.")
        expect(row("life", { insured: { name: "Α" }, policyholder: { name: "Β" } }).value).toBe("Α")
    })

    it("NEVER a beneficiary — a δικαιούχος is not an ασφαλισμένος", () => {
        // On a life policy the beneficiary is by construction NOT the insured.
        // A row reading «Ζωή · Μαρία» would tell the customer Μαρία is covered
        // when Μαρία is merely who gets paid.
        const r = row("life", { beneficiaries: [{ name: "Μαρία" }] }, "L-1")
        expect(r.value).not.toBe("Μαρία")
        expect(r.kind).toBe("number")
    })

    it("never an insuredPersons role label", () => {
        // That array is a class schedule — "master", "chief engineer" — whose
        // names the schema drops on purpose.
        const r = row("health", { insuredPersons: [{ role: "master", count: 2 }] }, "H-1")
        expect(r.value).toBe("H-1")
    })

    it("blanks a fixture/sentinel name rather than rendering it", () => {
        expect(row("health", { insured: { name: "E2E Policyholder" } }, "H-2").kind).toBe("number")
    })
})

describe("the policy number is the last resort, not the first", () => {
    it("carries lines that have no identifier at all", () => {
        for (const lob of ["cyber", "business", "pension"]) {
            expect.soft(row(lob, null, "P-1"), lob).toEqual({ value: "P-1", kind: "number" })
        }
    })

    it("a masked plate falls through instead of rendering the mask as data", () => {
        expect(row("motor", { vehicle: { plateNumber: "(XXXX)" } }, "M-7")).toEqual({
            value: "M-7",
            kind: "number",
        })
    })

    it("a PENDING- sentinel is not an identifier", () => {
        expect(row("cyber", null, "PENDING-1750000000000")).toEqual({ value: null, kind: "none" })
    })

    it("says nothing rather than guessing when nothing exists", () => {
        expect(row("pension", null)).toEqual({ value: null, kind: "none" })
    })
})

describe("a person name must never become a duplicate-coverage SUBJECT", () => {
    it("health and life still carry no subject key", () => {
        // Display identity and subject identity are different questions. If a
        // name became a subject, two family members' health policies would be
        // reported as one person insured twice — and the finding tells them to
        // drop one.
        for (const lob of ["health", "life", "cyber", "business", "pension"]) {
            expect.soft(
                policyAssetSubjectKey({ lineOfBusiness: lob, acordData: { insured: { name: "Χ" } } } as any),
                lob
            ).toBeNull()
        }
    })

    it("the home SUBJECT ignores the shape fallback — two 85 m² flats are two homes", () => {
        expect(
            policyAssetSubjectKey({
                lineOfBusiness: "home",
                acordData: { property: { type: "Διαμέρισμα", squareMeters: 85 } },
            } as any)
        ).toBeNull()
    })
})
