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
