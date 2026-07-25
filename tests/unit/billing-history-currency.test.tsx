import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BillingHistory } from '@/components/account/BillingHistory'

/**
 * The billing history hard-rolled `€{amount.toFixed(2)}` — English format for
 * everyone, and it IGNORED the invoice's own `currency` field. Two defects:
 *   - a Greek user saw "€12.99" instead of "12,99 €";
 *   - a non-EUR invoice was still stamped "€".
 * Now via formatCurrency(amount, language, { currency, decimals: 2 }) — localised,
 * currency-accurate, and cents preserved (decimals:2 — the helper defaults to 0,
 * which would have rounded €12.99 to "13 €").
 */
const invoice = (over: Partial<{ amount: number; currency: string }> = {}) => ({
    id: 'inv_1',
    date: new Date('2024-06-15T10:00:00Z'),
    amount: 12.99,
    currency: 'EUR',
    status: 'paid' as const,
    ...over,
})

describe('billing history renders money localised, with cents, in the invoice currency', () => {
    it('Greek: "12,99 €" — not "€12.99", not rounded "13 €"', () => {
        render(<BillingHistory invoices={[invoice()]} language="el" />)
        expect(screen.getByText(/12,99\s*€/)).toBeInTheDocument()
        expect(screen.queryByText(/€12\.99/)).toBeNull()
        expect(screen.queryByText(/(^|\s)13\s*€/)).toBeNull() // cents not dropped
    })

    it('English: "€12.99"', () => {
        render(<BillingHistory invoices={[invoice()]} language="en" />)
        expect(screen.getByText(/€12\.99/)).toBeInTheDocument()
    })

    it('respects a non-EUR invoice currency (no hardcoded €)', () => {
        render(<BillingHistory invoices={[invoice({ currency: 'GBP', amount: 12.5 })]} language="el" />)
        expect(screen.getByText(/£/)).toBeInTheDocument()
        expect(screen.queryByText(/12,50\s*€/)).toBeNull()
    })
})
