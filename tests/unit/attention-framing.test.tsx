import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'
import { AttentionList, type AttentionItem } from '@/components/dashboard/home/AttentionList'

const LABELS = {
    kicker: 'Needs your attention',
    viewAll: 'View all',
    emptyTitle: 'Nothing needs your attention right now',
    emptyBody: 'Based on the policies and answers we have.',
    priorityNote: 'Priorities are based on your profile — not a definitive risk assessment.',
}

const item = (overrides: Partial<AttentionItem> = {}): AttentionItem => ({
    id: 'r1',
    ruleId: 'life_dependents',
    title: 'Your household may be exposed if your income stops',
    reason: 'You told us two people depend on your income.',
    urgency: 'high',
    urgencyLabel: 'High priority',
    timingLabel: null,
    ...overrides,
})

function renderList(items: AttentionItem[], totalCount = items.length) {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <AttentionList items={items} totalCount={totalCount} language="en" labels={LABELS} />
            </TranslationsProvider>
        </LanguageProvider>
    )
}

/**
 * The attention list is an advice surface: every finding renders as
 * risk → why → next step, priority labels never appear without the qualifier
 * that stops them reading as a risk verdict, and a finding with no deadline
 * shows NO timing chip — an invented deadline is the sales pattern this
 * product's copy tests exist to keep out.
 */
describe('what needs my attention — framing', () => {
    it('renders the risk and the personal reason — and no severity chip (B1)', () => {
        renderList([item()])
        expect(screen.getByText(/income stops/)).toBeTruthy()
        expect(screen.getByText(/two people depend/)).toBeTruthy()
        expect(screen.queryByText('High priority'), 'B1: no severity chip on the attention list').toBeNull()
    })

    it('always shows the priority qualifier when findings render', () => {
        renderList([item()])
        expect(screen.getByText(/not a definitive risk assessment/)).toBeTruthy()
    })

    it('shows no timing chip for a finding with no deadline', () => {
        const { container } = renderList([item({ timingLabel: null })])
        expect(container.textContent).not.toMatch(/Act now|Within weeks|Within months/)
    })

    it('shows the timing chip only when the verdict carries one', () => {
        renderList([item({ timingLabel: 'Within weeks' })])
        expect(screen.getByText('Within weeks')).toBeTruthy()
    })

    it('offers «view all» only when the list is truncated', () => {
        // Everything already on screen: a view-all here is the hero CTA's
        // destination offered a second time — the §11 duplicate-action defect
        // measured on /dashboard (four bare /protection offers in content).
        renderList([item()], 1)
        expect(screen.queryByText(LABELS.viewAll)).toBeNull()

        // A truncated list: view-all is the continuation of THIS list.
        renderList([item()], 4)
        expect(screen.getByText(LABELS.viewAll)).toBeTruthy()
    })

    it('empty state is positive and states its evidence boundary', () => {
        renderList([])
        expect(screen.getByText(LABELS.emptyTitle)).toBeTruthy()
        expect(screen.getByText(/Based on the policies and answers we have/)).toBeTruthy()
        // No qualifier note without findings to qualify.
        expect(screen.queryByText(/not a definitive risk assessment/)).toBeNull()
    })
})
