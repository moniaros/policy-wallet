import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

/**
 * A cancelled subscription has next_billing_date === null (account/actions.ts
 * only sets it when autoRenew). The billing card showed "{renewsOn}
 * {formatDate(next_billing_date)}" unconditionally — so a user who had CANCELLED
 * read "Billing renews on —", the opposite of what's happening. It must instead
 * say when access ENDS.
 */
const SRC = readFileSync('components/account/Billing.tsx', 'utf-8')

describe('billing card tells a cancelled subscriber when access ends, not "renews on —"', () => {
    it('branches on next_billing_date between renewsOn and endsOn', () => {
        // The renews/ends decision keys off next_billing_date (null ⇒ not renewing).
        expect(SRC).toMatch(/currentSubscription\.next_billing_date\s*\n?\s*\?[^]*t\.billing\.renewsOn[^]*:[^]*t\.billing\.endsOn/)
        // The ends branch dates from current_period_end, which is always present.
        expect(SRC).toContain('t.billing.endsOn} ${formatDate(currentSubscription.current_period_end)')
    })

    it('t.billing.endsOn exists in both languages', () => {
        expect((en.billing as Record<string, string>).endsOn).toBeTruthy()
        expect((el.billing as Record<string, string>).endsOn).toBeTruthy()
        expect((el.billing as Record<string, string>).endsOn).toMatch(/[Α-Ωα-ω]/) // actually Greek
    })
})
