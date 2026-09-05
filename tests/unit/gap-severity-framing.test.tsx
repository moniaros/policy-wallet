import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { CoverageGapsWidget } from '@/components/dashboard/home/CoverageGapsWidget'

/**
 * The gap engine treats severity as a profile-based priority — the gap report
 * itself omits it, its code calling severities "unvalidated placeholders". Yet
 * the dashboard headlines "3 critical" gaps with a red dot. Presenting an
 * internal priority as a definitive risk verdict is the exact "misleading metric
 * without explained methodology" the product must avoid, so the widget states
 * plainly what the levels are.
 */
describe('dashboard gap severity is framed honestly', () => {
    const LABELS = {
        kicker: 'Coverage gaps',
        noGaps: 'No gaps',
        provenance: { legislative: 'legal', contractual: 'contractual', market: 'market' },
        underReviewOmitted: 'Findings under review are not counted here.',
        underReviewLink: 'See them',
        note: 'Priorities are based on your profile — not a definitive risk assessment.', groupLabel: "Open findings by priority",
    }

    it('shows the not-a-risk-assessment note whenever severities are shown', () => {
        render(<CoverageGapsWidget counts={{ legislative: 3, contractual: 1, market: 0, underReview: 0 }} labels={LABELS} />)
        expect(screen.getByText(/not a definitive risk assessment/i)).toBeTruthy()
        expect(screen.getByText(/3 legal/)).toBeTruthy()
    })

    it('does not show the note when there are no gaps to qualify', () => {
        render(<CoverageGapsWidget counts={{ legislative: 0, contractual: 0, market: 0, underReview: 0 }} labels={LABELS} />)
        expect(screen.queryByText(/not a definitive risk assessment/i)).toBeNull()
    })

    it('keeps the severityNote copy in both languages', () => {
        for (const [f, needle] of [
            ['lib/i18n/translations/el.ts', /δεν αποτελούν οριστική αξιολόγηση κινδύνου/],
            ['lib/i18n/translations/en.ts', /not a definitive risk assessment/],
        ] as const) {
            expect(readFileSync(f, 'utf-8')).toMatch(needle)
        }
    })
})
