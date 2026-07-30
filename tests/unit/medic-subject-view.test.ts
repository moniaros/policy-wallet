/**
 * GDPR Art. 15 projection of the MEDIC snapshot. Two properties matter and are
 * pinned here: everything about the SUBJECT survives (the export must not
 * quietly under-disclose), and no third-party NAME ever does (Art. 15(4)).
 */

import { describe, it, expect } from 'vitest'
import { toSubjectQualificationView } from '@/lib/medic/subject-view'
import type { MedicData } from '@/lib/medic/types'

const full: MedicData = {
    pain: {
        category: 'coverage_gap',
        summary: 'Ακάλυπτος σεισμός στην κατοικία',
        severity: 'high',
        validationState: 'confirmed',
        gapInstanceIds: ['g1', 'g2'],
    },
    metrics: { valueAtRisk: 180000, targetOutcome: 'Πλήρης κάλυψη κατοικίας' },
    criteria: [
        { key: 'idd', label: 'IDD demands & needs', compliance: true, mandatory: true, met: true },
        { key: 'price', label: 'Τιμή', met: false },
    ],
    decisionProcess: { compellingEvent: 'Λήξη ασφαλιστηρίου', compellingEventAt: '2026-09-12' },
    stakeholders: [
        { name: 'Μαρία Παπαδοπούλου', stance: 'economic_buyer', party: 'household', identified: true, evidenceRef: 'note:η σύζυγος αποφασίζει' },
        { name: 'Γιώργος Λογιστής', stance: 'influencer', party: 'accountant' },
    ],
}

describe('toSubjectQualificationView', () => {
    it('discloses everything about the subject', () => {
        const view = toSubjectQualificationView(full)!
        expect(view.pain?.summary).toBe('Ακάλυπτος σεισμός στην κατοικία')
        expect(view.pain?.severity).toBe('high')
        expect(view.pain?.validationState).toBe('confirmed')
        expect(view.pain?.gapInstanceIds).toEqual(['g1', 'g2'])
        expect(view.metrics?.valueAtRisk).toBe(180000)
        expect(view.metrics?.targetOutcome).toBe('Πλήρης κάλυψη κατοικίας')
        expect(view.criteria).toEqual([
            { label: 'IDD demands & needs', met: true, compliance: true },
            { label: 'Τιμή', met: false, compliance: false },
        ])
        expect(view.decisionProcess?.compellingEventAt).toBe('2026-09-12')
    })

    it('withholds every third-party name and evidence pointer (Art. 15(4))', () => {
        const view = toSubjectQualificationView(full)!
        const serialized = JSON.stringify(view)
        expect(serialized).not.toContain('Μαρία')
        expect(serialized).not.toContain('Παπαδοπούλου')
        expect(serialized).not.toContain('Γιώργος')
        expect(serialized).not.toContain('η σύζυγος αποφασίζει')
        expect(view.thirdPartyNamesWithheld).toBe(true)
    })

    it('still discloses the SHAPE of the stakeholder map', () => {
        const view = toSubjectQualificationView(full)!
        expect(view.stakeholders).toEqual([
            { stance: 'economic_buyer', party: 'household', identified: true },
            { stance: 'influencer', party: 'accountant', identified: false },
        ])
    })

    it('reports no withholding when there are no stakeholders', () => {
        const view = toSubjectQualificationView({ pain: { summary: 'x' } })!
        expect(view.stakeholders).toEqual([])
        expect(view.thirdPartyNamesWithheld).toBe(false)
    })

    it('is malformed-safe — never throws on junk', () => {
        expect(toSubjectQualificationView(null)).toBeNull()
        expect(toSubjectQualificationView(undefined)).toBeNull()
        expect(toSubjectQualificationView('nope')).toBeNull()
        expect(toSubjectQualificationView([1, 2])).toBeNull()
        const partial = toSubjectQualificationView({ stakeholders: 'broken', criteria: null })!
        expect(partial.stakeholders).toEqual([])
        expect(partial.criteria).toEqual([])
    })

    it('leaks no name even when a stance is unexpected', () => {
        const odd = { stakeholders: [{ name: 'Κρυφό Όνομα', stance: 'unknown_role' }] }
        const view = toSubjectQualificationView(odd)!
        expect(JSON.stringify(view)).not.toContain('Κρυφό Όνομα')
        expect(view.stakeholders[0].stance).toBe('unknown_role')
    })
})
