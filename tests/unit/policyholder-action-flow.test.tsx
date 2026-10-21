import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { getTranslations } from '@/lib/i18n'
import { RecommendationCards } from '@/components/coverage/RecommendationCards'
import { deriveClaimDeadlines } from '@/lib/wallet/policy-detail'
import { provenanceOf } from '@/lib/gaps/provenance'
import { currentReminders, reminderSubjectKey } from '@/lib/notifications/task-reminders'
import { HashDisclosure } from '@/components/ui/HashDisclosure'

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'en', t: getTranslations('en') }) }))
afterEach(() => { cleanup(); window.location.hash = ''; vi.restoreAllMocks() })

describe('policyholder correctness and task continuity', () => {
    it('does not infer protection from an empty list', () => {
        const view = render(<RecommendationCards recommendations={[]} language="en" tier="pro" hasPolicies profileIncomplete={false} />)
        expect(view.getByText('No open actions')).toBeTruthy()
        expect(view.container.textContent).not.toMatch(/well covered/i)
    })
    it('gives the incomplete-profile state a real destination', () => {
        const view = render(<RecommendationCards recommendations={[]} language="en" tier="pro" hasPolicies profileIncomplete />)
        expect(view.getByRole('link', { name: 'Complete your risk profile' }).getAttribute('href')).toBe('/protection#risk-profile-wizard')
    })
    it('keeps contract withdrawal out of claims guidance even when the extraction tag is wrong', () => {
        const conditions = [
            { conditionType: 'claim_deadline', summary: { el: 'Υπαναχώρηση εντός 30 ημερών', en: 'Withdrawal within 30 days' } },
            { conditionType: 'notification_obligation', summary: { el: 'Δικαίωμα εναντίωσης', en: 'Right of objection' } },
            { conditionType: 'claim_deadline', summary: { el: 'Αναγγελία ζημιάς εντός 8 ημερών', en: 'Notify a claim within 8 days' } },
        ]
        expect(deriveClaimDeadlines(conditions)).toEqual([conditions[2]])
        expect(conditions).toHaveLength(3) // no destructive reclassification of the document
    })
    it('does not classify a missing phone number as a legal duty', () => {
        expect(provenanceOf('missing_accident_declaration_phone')).toBe('under_review')
        expect(provenanceOf('moto_missing_accident_declaration_phone')).toBe('under_review')
    })
    it('groups only exact reminder subjects, leaving other events and the history intact', () => {
        const rows = [
            { id: 'new', reminder_key: reminderSubjectKey('collaboration_action_overdue', 'a') },
            { id: 'other', reminder_key: reminderSubjectKey('collaboration_action_overdue', 'b') },
            { id: 'old', reminder_key: reminderSubjectKey('collaboration_action_overdue', 'a') },
            { id: 'renewal1', reminder_key: reminderSubjectKey('renewal_milestone', 'p') },
            { id: 'renewal2', reminder_key: reminderSubjectKey('renewal_milestone', 'p') },
        ]
        expect(currentReminders(rows).map(r => r.id)).toEqual(['new', 'other', 'renewal1', 'renewal2'])
        expect(rows).toHaveLength(5)
        expect(reminderSubjectKey('collaboration_action_overdue', null)).toBeNull()
    })
    it('opens the native disclosure on fragment navigation', () => {
        Element.prototype.scrollIntoView = vi.fn()
        const view = render(<HashDisclosure id="risk-profile-wizard" summary="Profile"><input aria-label="Goal" /></HashDisclosure>)
        expect(view.container.querySelector('details')?.open).toBe(false)
        window.location.hash = '#risk-profile-wizard'
        fireEvent(window, new Event('hashchange'))
        expect(view.container.querySelector('details')?.open).toBe(true)
        expect(view.getByLabelText('Goal')).toBeTruthy()
    })
})
