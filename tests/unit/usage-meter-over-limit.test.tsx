import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UsageMeter } from '@/components/monetization/UsageMeter'

/**
 * Being OVER the cap is a real state, not an edge case. FREE_POLICY_LIMIT is 1,
 * so any free account that downgraded from Plus — or that had policies added
 * before the cap changed — renders "2 / 1" on its dashboard. Reproduced on the
 * seeded policyholder, who holds two policies on the free plan.
 *
 * The bar width was already clamped, but aria-valuenow was not, so the meter
 * shipped aria-valuenow="2" against aria-valuemax="1" — outside the range ARIA
 * requires valuenow to sit in.
 */
describe('UsageMeter over the limit', () => {
    it('keeps aria-valuenow inside [valuemin, valuemax]', () => {
        render(<UsageMeter label="Policies" used={2} limit={1} />)
        const bar = screen.getByRole('progressbar')
        const now = Number(bar.getAttribute('aria-valuenow'))
        const min = Number(bar.getAttribute('aria-valuemin'))
        const max = Number(bar.getAttribute('aria-valuemax'))
        expect(now).toBeGreaterThanOrEqual(min)
        expect(now).toBeLessThanOrEqual(max)
    })

    it('still announces the true figure via aria-valuetext', () => {
        // Clamping valuenow must not hide the overage from a screen reader.
        render(<UsageMeter label="Policies" used={2} limit={1} />)
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '2 / 1')
    })

    it('still shows the true figure visually', () => {
        // The figure is now composed of two instrumented spans («2» / «1»),
        // so match on the parent's combined text rather than one text node.
        render(<UsageMeter label="Policies" used={2} limit={1} />)
        expect(
            screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === '2 / 1')
        ).toBeTruthy()
    })

    it('is named, so it is not announced as a bare "2 of 1"', () => {
        render(<UsageMeter label="Policies" used={2} limit={1} />)
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Policies')
    })

    it('behaves normally under the limit', () => {
        render(<UsageMeter label="Policies" used={1} limit={3} />)
        const bar = screen.getByRole('progressbar')
        expect(bar.getAttribute('aria-valuenow')).toBe('1')
        expect(bar.getAttribute('aria-valuetext')).toBe('1 / 3')
    })

    it('renders no bar at all when the plan is unlimited', () => {
        render(<UsageMeter label="Policies" used={7} limit={null} />)
        expect(screen.queryByRole('progressbar')).toBeNull()
        expect(screen.getByText('7 · ∞')).toBeTruthy()
    })
})
