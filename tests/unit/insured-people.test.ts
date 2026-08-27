import { describe, it, expect } from 'vitest'
import { deriveInsuredNames } from '@/lib/wallet/insured-people'

/**
 * The card is headed «Ασφαλισμένα πρόσωπα» / "Insured people" and its list
 * merged `acordData.beneficiaries` in with the insured.
 *
 * A δικαιούχος is not an ασφαλισμένος. On a life policy the beneficiary is by
 * construction normally NOT the insured — the insured is dead when it pays. So
 * a spouse named as beneficiary was listed as a person the policy covers, when
 * they have no cover under that contract at all.
 */
describe('who the policy covers', () => {
    it('does not list a beneficiary as an insured person', () => {
        const acord = {
            insured: { name: 'Γιώργος Παπαδόπουλος' },
            beneficiaries: [{ name: 'Μαρία Παπαδοπούλου', percentage: 100 }],
        }
        const names = deriveInsuredNames(acord)
        expect(names).toContain('Γιώργος Παπαδόπουλος')
        expect(names).not.toContain('Μαρία Παπαδοπούλου')
    })

    it('leaves a life policy with only its insured, not its payees', () => {
        const acord = {
            insured: { name: 'Γιώργος Παπαδόπουλος' },
            policyholder: { name: 'Γιώργος Παπαδόπουλος' },
            beneficiaries: [
                { name: 'Μαρία Παπαδοπούλου', percentage: 60 },
                { name: 'Ελένη Παπαδοπούλου', percentage: 40 },
            ],
        }
        expect(deriveInsuredNames(acord)).toEqual(['Γιώργος Παπαδόπουλος'])
    })

    it('shows nothing rather than a payee when only beneficiaries were extracted', () => {
        // Better an empty "no insured names found" than a wrong name under a
        // heading that says the policy covers them.
        expect(deriveInsuredNames({ beneficiaries: [{ name: 'Μαρία' }] })).toEqual([])
    })

    it('still lists everyone genuinely insured', () => {
        const acord = {
            insured: { name: 'Γιώργος' },
            insureds: [{ name: 'Άννα' }, { firstName: 'Νίκος', lastName: 'Δήμου' }],
        }
        const names = deriveInsuredNames(acord)
        expect(names).toEqual(expect.arrayContaining(['Γιώργος', 'Άννα', 'Νίκος Δήμου']))
    })

    it('deduplicates the same person reached by two paths', () => {
        const acord = {
            insured: { name: 'Γιώργος Παπαδόπουλος' },
            policyholder: { name: 'Γιώργος Παπαδόπουλος' },
        }
        expect(deriveInsuredNames(acord)).toEqual(['Γιώργος Παπαδόπουλος'])
    })

    it('builds a name from the split customer fields', () => {
        expect(deriveInsuredNames({ customerName: 'Γιώργος', customerSurname: 'Παπαδόπουλος' }))
            .toEqual(['Γιώργος Παπαδόπουλος'])
    })

    it('is empty, not crashing, on nothing', () => {
        expect(deriveInsuredNames(null)).toEqual([])
        expect(deriveInsuredNames({})).toEqual([])
        expect(deriveInsuredNames({ insured: { name: '   ' } })).toEqual([])
    })
})

/**
 * A renewal restates the insured. It must UPDATE the name, not add a person.
 *
 * `insured.name`, `policyholder.name`, the legacy `policy.insuredName` and the
 * customerName/customerSurname pair are four keys holding ONE party. Unioning
 * them was invisible while the extractor wrote the same string to each. A
 * renewal breaks that: mergeAcordData writes the new value over the keys the
 * new document speaks to and leaves the rest, so the card listed the customer's
 * old name and their new one as two covered people.
 */
describe("a renewal updates the insured, it does not add one", () => {
    it("keeps ONE person when the renewal updated only some of the keys", () => {
        const names = deriveInsuredNames({
            insured: { name: "Ιωάννα Παπαδοπούλου" }, // the renewal wrote this
            policyholder: { name: "Ιωάννα Γεωργίου" }, // stale: maiden name
            customerName: "Ιωάννα",
            customerSurname: "Γεωργίου",
        })
        expect(names).toEqual(["Ιωάννα Παπαδοπούλου"])
    })

    it("prefers insured.name over every other single-party key", () => {
        expect(
            deriveInsuredNames({
                insured: { name: "Α" },
                policyholder: { name: "Β" },
                policy: { insuredName: "Γ" },
                customerName: "Δ",
                customerSurname: "Ε",
            })
        ).toEqual(["Α"])
    })

    it("falls down the chain when the preferred key is silent", () => {
        expect(deriveInsuredNames({ policyholder: { name: "Β" }, policy: { insuredName: "Γ" } })).toEqual(["Β"])
        expect(deriveInsuredNames({ policy: { insuredName: "Γ" } })).toEqual(["Γ"])
        expect(deriveInsuredNames({ customerName: "Δ", customerSurname: "Ε" })).toEqual(["Δ Ε"])
    })

    it("treats the same name in different case or accents as one person", () => {
        // Greek schedules print names accented, unaccented and in full capitals.
        const names = deriveInsuredNames({
            insured: { name: "Ιωάννης Μονιάρος" },
            insureds: [{ name: "ΙΩΑΝΝΗΣ ΜΟΝΙΑΡΟΣ" }, { name: "Ιωαννης Μονιαρος" }],
        })
        expect(names).toEqual(["Ιωάννης Μονιάρος"])
    })

    it("still lists genuinely different people from insureds[]", () => {
        // The fix must not collapse a real family policy into one name.
        const names = deriveInsuredNames({
            insured: { name: "Ιωάννης Μονιάρος" },
            insureds: [{ name: "Ιωάννης Μονιάρος" }, { firstName: "Μαρία", lastName: "Μονιάρου" }],
        })
        expect(names).toEqual(["Ιωάννης Μονιάρος", "Μαρία Μονιάρου"])
    })

    it("still refuses to call a beneficiary an insured person", () => {
        const names = deriveInsuredNames({
            insured: { name: "Γιώργος" },
            beneficiaries: [{ name: "Μαρία", share: 100 }],
        })
        expect(names).toEqual(["Γιώργος"])
    })
})
