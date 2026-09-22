import { render, screen, fireEvent } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { el as translations } from '@/lib/i18n/translations/el'
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ language: 'el', t: translations }) }))
import { ActionQueueCard } from '@/components/agent/ActionQueueCard'
import { PortfolioHealth } from '@/components/agent/PortfolioHealth'

it('shows pending source review without inventing a deadline or commission', () => {
    const onAction = vi.fn()
    const item = { id: 'review-p', type: 'finding_review' as const, clientId: 'c', clientName: 'Demo customer', description: '', dueDate: '', urgency: 'medium' as const, oneTapAction: 'review_findings' as const, findingCount: 2, policyId: 'p' }
    render(<ActionQueueCard items={[item]} revenueAtRisk={0} onAction={onAction} hasClients />)
    expect(screen.getByText('2 ευρήματα χρειάζονται έλεγχο πηγής')).toBeVisible()
    expect(screen.getByText('Χωρίς προθεσμία')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Έλεγχος ευρημάτων' }))
    expect(onAction).toHaveBeenCalledWith(item)
})
it('does not equate a policy on file with a complete customer profile', () => {
    render(<PortfolioHealth health={{ totalClients: 2, coverageGapPercent: 0, completeProfilePercent: 100, atRiskCount: 0, customersWithGaps: 0, customersWithPolicies: 2, customersWithPendingFindings: 1 }} />)
    expect(screen.getByText('Πελάτες με ασφαλιστήρια')).toBeVisible()
    expect(screen.getByText('Πελάτες με ευρήματα υπό έλεγχο')).toBeVisible()
    expect(screen.queryByText('100%')).not.toBeInTheDocument()
    expect(screen.getByText(/Μηδενικά ευρήματα δεν σημαίνουν πλήρη κάλυψη/)).toBeVisible()
})
