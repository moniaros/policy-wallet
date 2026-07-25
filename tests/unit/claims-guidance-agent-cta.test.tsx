import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClaimsGuidanceCard } from '@/components/wallet/policy-detail/ClaimsGuidanceCard'

/**
 * The claims screen is opened after a loss — the wording must be exact. The
 * "Ask my agent" CTA is possessive, but it was rendered UNCONDITIONALLY (only
 * its href changed: "#agent" when linked, "/agent" when not). So a policyholder
 * with NO advisor saw a button claiming they have one ("Ask my agent"), routing
 * to the find-an-advisor page. The label must be conditional on hasAgent.
 */

// next/link → a plain <a> so we can read the href in jsdom.
vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a>,
}))

const copy = {
    claimsTitle: 'If you need to make a claim',
    claimsSubtitle: 'A calm, step-by-step guide.',
    claimStep1Title: 's1', claimStep1Desc: 'd1',
    claimStep2Title: 's2', claimStep2Desc: 'd2',
    claimStep3Title: 's3', claimStep3Desc: 'd3',
    claimStep4Title: 's4', claimStep4Desc: 'd4',
    claimNoDeadlines: 'No deadlines detected.',
    claimWhatYouNeedTitle: 'What you will need',
    claimDeadlinesTitle: 'Deadlines from your policy',
    claimNeedHelp: 'Not sure about something?',
    claimAskAiCta: 'Ask AI about claims',
    claimAskAgentCta: 'Ask my agent',
    claimFindAgentCta: 'Find an agent',
    claimsDisclaimer: 'General guidance, not legal advice.',
    contactInsurer: 'Contact insurer',
    claimsPhoneUnknown: 'We did not find a claims number.',
    policyNumberLabel: 'Policy no.',
}

const base = {
    lang: 'en' as const,
    insurerName: 'Acme',
    policyNumber: 'P-1',
    insurerPhone: '',
    deadlines: [],
    branchSteps: undefined,
    copy,
    onCallInsurer: () => {},
}

describe('ClaimsGuidanceCard advisor CTA is honest about whether the user has an advisor', () => {
    it('with a linked advisor: shows "Ask my agent" and links to the on-page #agent section', () => {
        render(<ClaimsGuidanceCard {...base} hasAgent={true} />)
        const link = screen.getByRole('link', { name: 'Ask my agent' })
        expect(link).toHaveAttribute('href', '#agent')
        expect(screen.queryByText('Find an agent')).toBeNull()
    })

    it('with NO advisor: drops the false possessive — shows "Find an agent" routing to /agent', () => {
        render(<ClaimsGuidanceCard {...base} hasAgent={false} />)
        const link = screen.getByRole('link', { name: 'Find an agent' })
        expect(link).toHaveAttribute('href', '/agent')
        // The possessive claim must not appear for someone with no advisor.
        expect(screen.queryByText('Ask my agent')).toBeNull()
    })
})
