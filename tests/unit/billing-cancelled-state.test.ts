import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

/**
 * A cancelled subscription keeps its period-end date; what changes is the
 * promise attached to it. The billing card once printed "{renewsOn} {date}"
 * unconditionally, so a user who had CANCELLED read "renews on" — the opposite
 * of what was happening.
 *
 * The plan section now branches on `autoRenew` directly rather than on the
 * derived `next_billing_date`, which is the same decision one step closer to
 * the source.
 */
const SRC = readFileSync('components/settings/sections/PlanSection.tsx', 'utf-8')

describe('the plan card tells a cancelled subscriber when access ends, not "renews on"', () => {
    it('derives the renew/end decision from autoRenew', () => {
        expect(SRC).toMatch(/const willRenew = Boolean\(data\.subscription\?\.autoRenew\)/)
    })

    it('branches between renewsOn and endsOn on that flag', () => {
        expect(SRC).toMatch(/willRenew \?[^]*t\.billing\.renewsOn[^]*:[^]*t\.billing\.endsOn/)
    })

    it('only shows the renewal/end date for PAID plans', () => {
        // A free account carries a placeholder subscription row with a period
        // end; showing it would tell a free user their access "ends" in 30 days.
        expect(SRC).toMatch(/data\.subscription && data\.isPaid && \(/)
    })

    it('t.billing.endsOn exists in both languages', () => {
        expect((en.billing as unknown as Record<string, string>).endsOn).toBeTruthy()
        expect((el.billing as unknown as Record<string, string>).endsOn).toBeTruthy()
        expect((el.billing as unknown as Record<string, string>).endsOn).toMatch(/[Α-Ωα-ω]/) // actually Greek
    })
})
