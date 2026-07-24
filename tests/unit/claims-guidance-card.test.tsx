import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { ClaimsGuidanceCard } from '@/components/wallet/policy-detail/ClaimsGuidanceCard'

/**
 * The card's ordered list is either the branch bundle's claimsSteps or the four
 * generic fallbacks. The affordances (call insurer / policy number / deadlines)
 * used to be pinned to step indices 1-3, so a bundle with a different step count
 * silently dropped them — they now live in their own panels below the list.
 */
const COPY = {
    claimsTitle: 'Claims',
    claimsSubtitle: 'Step by step.',
    claimStep1Title: 'Document what happened',
    claimStep1Desc: 'Take photos.',
    claimStep2Title: 'Call your insurer as soon as possible',
    claimStep2Desc: 'Early notice helps.',
    claimStep3Title: 'Have your details ready',
    claimStep3Desc: 'Policy number and ID.',
    claimStep4Title: 'Mind the deadlines',
    claimStep4Desc: 'Late claims can be rejected.',
    claimNoDeadlines: 'No specific deadlines were detected.',
    claimWhatYouNeedTitle: 'What you will need',
    claimDeadlinesTitle: 'Deadlines from your policy',
    claimNeedHelp: 'Not sure about something?',
    claimAskAiCta: 'Ask AI about claims',
    claimAskAgentCta: 'Ask my agent',
    claimsDisclaimer: 'General guidance, not legal advice.',
    claimsPhoneUnknown: 'No claims number found — it is on your policy schedule.',
    contactInsurer: 'Call',
    policyNumberLabel: 'Policy number',
}

function renderCard(props: Partial<React.ComponentProps<typeof ClaimsGuidanceCard>> = {}) {
    return render(
        <ClaimsGuidanceCard
            lang="en"
            insurerName="Test Insurer"
            policyNumber="POL-123"
            insurerPhone="2101234567"
            deadlines={[]}
            hasAgent={false}
            copy={COPY}
            onCallInsurer={vi.fn()}
            {...props}
        />
    )
}

describe('ClaimsGuidanceCard', () => {
    it('falls back to the four generic steps when branchSteps is absent', () => {
        renderCard()

        expect(screen.getByText(COPY.claimStep1Title)).toBeInTheDocument()
        expect(screen.getByText(COPY.claimStep2Title)).toBeInTheDocument()
        expect(screen.getByText(COPY.claimStep3Title)).toBeInTheDocument()
        expect(screen.getByText(COPY.claimStep4Title)).toBeInTheDocument()
        // Their descriptions render too — the fallback keeps title + desc pairs.
        expect(screen.getByText(COPY.claimStep1Desc)).toBeInTheDocument()
        expect(screen.getByText(COPY.claimStep4Desc)).toBeInTheDocument()
    })

    it('falls back when branchSteps is an empty array', () => {
        renderCard({ branchSteps: [] })
        expect(screen.getByText(COPY.claimStep1Title)).toBeInTheDocument()
        expect(screen.getByText(COPY.claimStep4Title)).toBeInTheDocument()
    })

    it('renders branch steps instead of the generic four when provided', () => {
        renderCard({ branchSteps: ['Report the crash', 'Keep the green card handy'] })

        expect(screen.getByText('Report the crash')).toBeInTheDocument()
        expect(screen.getByText('Keep the green card handy')).toBeInTheDocument()
        expect(screen.queryByText(COPY.claimStep1Title)).not.toBeInTheDocument()
        expect(screen.queryByText(COPY.claimStep4Title)).not.toBeInTheDocument()
    })

    it('keeps the affordances at any step count (decoupled from step indices)', () => {
        // Two steps only — under the old index-pinned layout the call button,
        // policy number and deadlines block would all have disappeared.
        renderCard({ branchSteps: ['One', 'Two'] })

        expect(screen.getByText(COPY.claimWhatYouNeedTitle)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Call/ })).toBeInTheDocument()
        expect(screen.getByText('POL-123')).toBeInTheDocument()
        expect(screen.getByText(COPY.claimDeadlinesTitle)).toBeInTheDocument()
        expect(screen.getByText(COPY.claimNoDeadlines)).toBeInTheDocument()
    })

    it('renders extracted deadlines distinctly from the editorial steps', () => {
        renderCard({
            branchSteps: ['One'],
            deadlines: [
                {
                    type: 'claim_deadline',
                    summary: { en: 'Report within 8 days', el: 'Δήλωση εντός 8 ημερών' },
                    value: '8 days',
                } as any,
            ],
        })

        expect(screen.getByText(COPY.claimDeadlinesTitle)).toBeInTheDocument()
        expect(screen.getByText(/Report within 8 days/)).toBeInTheDocument()
        expect(screen.queryByText(COPY.claimNoDeadlines)).not.toBeInTheDocument()
    })
})
