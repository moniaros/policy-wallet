import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { getPolicyStatusView, resolvePolicyStatusKey } from '@/lib/wallet/policy-status-view'
import { getTranslations } from '@/lib/i18n'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * The /agent (Σύμβουλος) page speaks the wallet's status vocabulary — because it
 * no longer has one of its own.
 *
 * History, in order:
 *   1. `mapStatus` existed as two byte-identical copies, one in /agent and one
 *      in /account, both dividing milliseconds — so between 21:00 UTC and Athens
 *      midnight a policy still in force rendered "action needed".
 *   2. The copies became one file (lib/wallet/map-policy-card-status.ts) on the
 *      Athens calendar. The CLOCK now agreed with the wallet; the VOCABULARY did
 *      not: it had no 'expired' state, so a lapsed policy left /agent as
 *      'action_needed' — «Απαιτείται ενέργεια» on Σύμβουλος, «Ληγμένο» on the
 *      wallet, same policy, same day.
 *   3. P1-10 deleted the file. /agent passes the RAW stored status (the wallet
 *      page's contract) and every rendering derives through getPolicyStatusView.
 *
 * The migration ledger — every state of the deleted vocabulary, and where it
 * landed (asserted below, one case per row):
 *
 *   old 'active'          (days ≥ 30, clean row)  → 'active'
 *   old 'expiring_soon'   (0 ≤ days < 30)         → 'expiring_soon'
 *   old 'action_needed'   arm 1: stored cancelled → 'cancelled'   (own state again)
 *   old 'action_needed'   arm 2: days < 0         → 'expired'     (the P1-10 defect)
 *   old 'incomplete'      declared, NEVER produced — dead vocabulary; the stored
 *                         'incomplete' ingestion state → 'action_needed' (needs-review)
 *   day 30 exactly        old said 'active'       → 'expiring_soon' (the canonical
 *                         resolver's ≤30 window wins; deliberately narrower than
 *                         the 45-day monitoring watch, per its own guard)
 *
 * States the old vocabulary could not say at all, now available to /agent:
 * 'expired', 'cancelled', 'unknown_duration', 'analyzing'.
 */
describe('Σύμβουλος speaks the wallet status vocabulary', () => {
    const NOW = new Date('2026-08-24T12:00:00Z')
    const row = (overrides: Record<string, unknown> = {}) => ({
        // DB-shaped, exactly as /agent's query returns it.
        status: 'active',
        policyNumber: 'PN-77',
        insurerName: 'Interamerican',
        endDate: new Date('2027-08-01T00:00:00Z'),
        ...overrides,
    })

    it('a lapsed policy renders «ΛΗΓΜΕΝΟ» — the wallet word — never «ΑΠΑΙΤΕΙΤΑΙ ΕΝΕΡΓΕΙΑ»', async () => {
        // The rendered proof: raw stored 'active', cover lapsed months ago,
        // flowed through the single pipeline into the one status pill.
        const { render } = await import('@testing-library/react')
        const { StatusPill } = await import('@/components/ui/StatusPill')
        const t = getTranslations('el')

        const view = getPolicyStatusView(row({ endDate: new Date('2026-03-01T00:00:00Z') }), t, NOW)
        const { container } = render(createElement(StatusPill, { tone: view.tone, label: view.label }))

        expect(container.textContent).toContain(t.policyStatus.expired) // ΛΗΓΜΕΝΟ
        expect(container.textContent).not.toContain(t.policyStatus.actionNeeded)
        expect(view.key).toBe('expired')
        // Expiry is a calendar fact, not an emergency — amber, never the alarm colour.
        expect(view.tone).toBe('warning')
    })

    it('the ledger: every state of the deleted vocabulary lands somewhere explicit', () => {
        // old 'active' → active (days ≥ 30, clean row)
        expect(resolvePolicyStatusKey(row(), NOW)).toBe('active')
        // old 'expiring_soon' → expiring_soon (17 days out)
        expect(resolvePolicyStatusKey(row({ endDate: new Date('2026-09-10T00:00:00Z') }), NOW)).toBe('expiring_soon')
        // old 'action_needed', arm 1 (stored cancelled) → cancelled — its own state again
        expect(resolvePolicyStatusKey(row({ status: 'cancelled', endDate: new Date('2030-01-01T00:00:00Z') }), NOW)).toBe('cancelled')
        // old 'action_needed', arm 2 (lapsed) → expired — the P1-10 defect
        expect(resolvePolicyStatusKey(row({ endDate: new Date('2026-03-01T00:00:00Z') }), NOW)).toBe('expired')
        // old 'incomplete' was declared but unreachable; the stored ingestion state
        // surfaces as needs-review once the calendar has nothing more urgent to say
        expect(resolvePolicyStatusKey(row({ status: 'incomplete' }), NOW)).toBe('action_needed')
        // day 30 exactly: old map said 'active' (< 30); the canonical ≤30 window wins
        expect(resolvePolicyStatusKey(row({ endDate: new Date('2026-09-23T00:00:00Z') }), NOW)).toBe('expiring_soon')
    })

    it('keeps the Athens calendar the deleted map was fixed onto', () => {
        // 15:00 Athens on the final day of cover — still in force, expiring.
        const endsToday = row({ endDate: new Date('2026-08-24T00:00:00Z') })
        expect(resolvePolicyStatusKey(endsToday, new Date('2026-08-24T12:00:00Z'))).toBe('expiring_soon')
        // 00:30 Athens on the 25th — still the 24th in UTC — genuinely lapsed.
        expect(resolvePolicyStatusKey(endsToday, new Date('2026-08-24T21:30:00Z'))).toBe('expired')
        // 21:30 UTC while the policy ends TOMORROW: the millisecond maths called
        // this -1; the calendar says one day left.
        const endsTomorrow = row({ endDate: new Date('2026-08-25T00:00:00Z') })
        expect(resolvePolicyStatusKey(endsTomorrow, new Date('2026-08-24T21:30:00Z'))).toBe('expiring_soon')
    })

    it('the adviser surface owns no status pipeline of its own (Grafí G10: /agent 301s to /adviser)', () => {
        // The old /agent page shipped the RAW stored status to AgentClient. That
        // surface is now a redirect stub; /adviser renders share state (who sees
        // what) and no lifecycle vocabulary at all — so the invariant this guard
        // exists for (no third status pipeline) holds by construction, and the
        // assertions pin exactly that.
        const stub = strip(readFileSync('app/(protected)/agent/page.tsx', 'utf-8'))
        expect(stub).toMatch(/redirect\("\/adviser"\)/)
        for (const f of ['app/(protected)/adviser/AdviserScreen.tsx', 'lib/app/adviser-model.ts']) {
            const src = strip(readFileSync(f, 'utf-8'))
            expect(src, `${f}: a status pipeline appeared on the adviser surface`).not.toMatch(/map-policy-card-status|mapPolicyCardStatus|function mapStatus\(|resolvePolicyStatusKey|getPolicyStatusView/)
        }
    })
})

/**
 * A Green Card is the document a driver hands over at a border. `Math.floor` on
 * a fractional negative made one valid until tonight come out at -1, so the
 * policy page told them it had expired while it had not.
 */
describe('the Green Card status counts calendar days', () => {
    /**
     * This asserted the literal expression `calendarDaysUntil(expiry, new Date())`
     * appeared in the source. It caught nothing a rename could not break, and a
     * rename did break it — while the behaviour it exists to protect was intact.
     * Assert the badge the driver actually reads instead.
     *
     * The bug: dividing milliseconds and flooring gave Math.floor(-0.5) = -1 on
     * the card's own last valid day, so a Green Card good until tonight showed
     * "expired" — at a border, the difference between driving and not.
     */
    it('does not call a card expired on its final valid day', async () => {
        const { render } = await import('@testing-library/react')
        const { MotorCoverageDetails } = await import('@/components/wallet/coverage-details/MotorCoverageDetails')
        const { getTranslations } = await import('@/lib/i18n')
        const { vi } = await import('vitest')
        const copy = getTranslations('el').coverageDetails

        vi.useFakeTimers()
        try {
            // 15:00 Athens on 1 March 2027 — the card is valid all day.
            vi.setSystemTime(new Date('2027-03-01T13:00:00Z'))
            const { createElement } = await import('react')
            const { container } = render(
                createElement(MotorCoverageDetails, {
                    acordData: { vehicle: { greenCardExpiryDate: '2027-03-01' } } as any,
                    language: 'el',
                })
            )
            expect(container.textContent).toContain(copy.expiringSoon)
            expect(container.textContent).not.toContain(copy.expired)
        } finally {
            vi.useRealTimers()
        }
    })
})
