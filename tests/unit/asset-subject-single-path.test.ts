/**
 * "Do these two policies cover the same thing?" is asked in ONE place.
 *
 * `duplicate_coverage_*` is the most dangerous finding this engine produces.
 * Its own docblock states the asymmetry: missing a real duplicate costs someone
 * a premium, while inventing one can cost them their cover — and for motor,
 * third-party liability is compulsory, so "keeping one may be enough" is advice
 * to break the law.
 *
 * `portfolio-rules.insuredSubject` carried a hand-rolled second copy of the
 * line→field map and had already drifted from the primitive:
 *
 *   - it never rejected the extractor's unreadable MASKS, so two motor policies
 *     whose plates both came back «(XXXX)» keyed on the same subject and were
 *     reported as one vehicle insured twice. Measured: three of the four mask
 *     forms collapsed.
 *   - it knew nothing about pets or vessels, both of which the extraction does
 *     capture, so genuine duplicates there were never found at all.
 *
 * The map now lives once, in `lib/wallet/policy-identity.ts`.
 */
import { describe, expect, it } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { policyAssetSubjectKey } from "../../lib/wallet/policy-identity"
import { insuredSubject } from "../../lib/services/gap-engine/portfolio-rules"

const subject = (lineOfBusiness: string, acordData: any) =>
    policyAssetSubjectKey({ lineOfBusiness, acordData } as any)

describe("an unreadable value is the ABSENCE of a subject, never a shared one", () => {
    // lib/wallet/unreadable-value.ts — the extractor's masks for "could not read".
    for (const mask of ["(XXXX)", "????", "N/A", "(????)", "XXXX"]) {
        it(`two plates reading ${mask} are not the same vehicle`, () => {
            expect(subject("motor", { vehicle: { plateNumber: mask } })).toBeNull()
        })
    }

    it("nor is a policy-identity sentinel", () => {
        expect(subject("motor", { vehicle: { plateNumber: "__PENDING_EXTRACTION__" } })).toBeNull()
    })

    it("a masked address is not a shared home", () => {
        expect(subject("home", { property: { address: "(XXXX)" } })).toBeNull()
    })
})

describe("what IS a subject", () => {
    it("a real plate, compared without whitespace or case", () => {
        const a = subject("motor", { vehicle: { plateNumber: "ΑΒΕ 1234" } })
        const b = subject("motor", { vehicle: { plateNumber: " ΑΒΕ1234 " } })
        expect(a).toBeTruthy()
        expect(a).toBe(b)
    })

    it("KNOWN LIMIT: a hyphen is not stripped, so «ΑΒΕ-1234» misses «ΑΒΕ 1234»", () => {
        // Recorded, not fixed here. Greek plates are printed both ways and these
        // are one vehicle, so this is a MISSED duplicate. Widening the match is a
        // sensitivity change and this rule's docblock is explicit about the
        // asymmetry — missing a duplicate costs a premium, inventing one can cost
        // someone their (compulsory) cover — so it belongs in its own decision,
        // not folded into a fix about mask rejection.
        expect(subject("motor", { vehicle: { plateNumber: "ΑΒΕ-1234" } })).not.toBe(
            subject("motor", { vehicle: { plateNumber: "ΑΒΕ 1234" } })
        )
    })

    it("never folds Greek capitals into Latin — two vehicles, not one", () => {
        // «ΑΒΕ» (Greek) and «ABE» (Latin) render identically and are different
        // registrations. Folding them asserts one asset where there may be two.
        expect(subject("motor", { vehicle: { plateNumber: "ΑΒΕ1234" } })).not.toBe(
            subject("motor", { vehicle: { plateNumber: "ABE1234" } })
        )
    })

    it("the FULL address, not the display short form", () => {
        // Same street line, different city, is two homes.
        expect(subject("home", { property: { address: "Κηφισίας 12, Αθήνα" } })).not.toBe(
            subject("home", { property: { address: "Κηφισίας 12, Λάρισα" } })
        )
    })

    it("pets and vessels, which the old engine copy could not see at all", () => {
        expect(subject("pet", { pet: { name: "Λούκυ" } })).toBeTruthy()
        expect(subject("boat", { marineVessel: { registryNumber: "GR-7788" } })).toBeTruthy()
    })
})

describe("what is deliberately NOT a subject", () => {
    it("travel — a display identifier, but two trips to «Ευρώπη» are two trips", () => {
        expect(subject("travel", { travel: { destinationScope: "Ευρώπη" } })).toBeNull()
    })

    it("health, life, cyber, business and pension carry no subject at all", () => {
        for (const lob of ["health", "life", "cyber", "business", "pension"]) {
            expect.soft(subject(lob, { insured: { name: "Χ" }, policyNumber: "P-1" }), lob).toBeNull()
        }
    })
})

describe("the engine does not keep its own copy", () => {
    it("insuredSubject delegates to the primitive, value for value", () => {
        const cases: Array<[string, any]> = [
            ["motor", { vehicle: { plateNumber: "ΑΒΕ1234" } }],
            ["motor", { vehicle: { plateNumber: "(XXXX)" } }],
            ["home", { property: { address: "Ερμού 12, Αθήνα" } }],
            ["pet", { pet: { name: "Λούκυ" } }],
            ["travel", { travel: { destinationScope: "Ευρώπη" } }],
            ["health", {}],
        ]
        for (const [lob, acord] of cases) {
            expect.soft(
                insuredSubject({ id: "x", lineOfBusiness: lob, acordData: acord } as any),
                lob
            ).toBe(subject(lob, acord))
        }
    })

    it("no file outside the primitive reads an asset-identity field directly", () => {
        // Enumerated from the filesystem, not a list: the drift this guard exists
        // for happened because a second copy was written somewhere nobody looked.
        const walk = (dir: string): string[] =>
            readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
                const full = join(dir, e.name)
                if (e.isDirectory()) return walk(full)
                return /\.tsx?$/.test(e.name) ? [full] : []
            })
        const ALLOWED = new Set([
            "lib/wallet/policy-identity.ts", // the primitive itself
        ])
        const FIELD = /acordData\??\.(vehicle\??\.plateNumber|property\??\.address|pet\??\.name|marineVessel\??\.registryNumber)/
        const offenders = ["lib/services/gap-engine", "lib/wallet"]
            .flatMap(walk)
            .filter((f) => !ALLOWED.has(f) && !f.includes(".test."))
            .filter((f) => FIELD.test(readFileSync(f, "utf-8")))
        expect(
            offenders,
            `these read an asset-identity field directly instead of using ` +
                `policyAssetSubjectKey / policyAssetIdentifier:\n  ${offenders.join("\n  ")}`
        ).toEqual([])
    })
})
