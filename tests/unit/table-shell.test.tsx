import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TableShell } from '@/components/ui/TableShell'

/**
 * The defect this guards: the app had 36 `overflow-x-auto` wrappers and none was
 * focusable, so the columns past the viewport edge were unreachable without a
 * pointer (WCAG 2.1.1).
 */
describe('TableShell', () => {
    it('is reachable by keyboard, so the horizontal scroll can actually be used', () => {
        render(
            <TableShell label="Renewals">
                <table><tbody><tr><td>row</td></tr></tbody></table>
            </TableShell>
        )
        const region = screen.getByRole('region', { name: 'Renewals' })
        expect(region.getAttribute('tabindex')).toBe('0')
    })

    it('actually scrolls horizontally', () => {
        render(<TableShell label="Team"><div /></TableShell>)
        expect(screen.getByRole('region', { name: 'Team' }).className).toContain('overflow-x-auto')
    })

    it('is a named landmark rather than an anonymous div', () => {
        render(<TableShell label="Commissions"><div /></TableShell>)
        expect(screen.getByRole('region', { name: 'Commissions' })).toBeTruthy()
    })

    it('shows a focus ring — a focusable region with no visible focus is its own defect', () => {
        render(<TableShell label="Customers"><div /></TableShell>)
        expect(screen.getByRole('region', { name: 'Customers' }).className).toContain('focus-visible:ring-2')
    })

    it('renders its children', () => {
        render(<TableShell label="Opportunities"><span>cell</span></TableShell>)
        expect(screen.getByText('cell')).toBeTruthy()
    })
})
