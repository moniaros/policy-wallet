import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { ProtectionMonitorCard, type MonitorSignalView } from '@/components/dashboard/home/ProtectionMonitorCard'

const LABELS = {
    kicker: 'Protection monitor',
    notYetAssessed: 'No assessment yet',
    detailsLink: 'Open the full picture',
}

const signal = (overrides: Partial<MonitorSignalView> = {}): MonitorSignalView => ({
    id: 'cover_lapsing',
    label: 'Cover about to lapse',
    verdict: 'clear',
    verdictLabel: 'Clear',
    detail: null,
    action: null,
    ...overrides,
})

const HOME = readFileSync('app/(protected)/dashboard/PolicyholderHome.tsx', 'utf-8')

/**
 * The monitor's honesty contract:
 *
 *  - every signal renders even when clear — a watch that only appears when
 *    something is wrong cannot be told apart from a watch that is broken;
 *  - "Last checked" comes only from a real ProtectionScore.computedAt; an
 *    account the engine never scored gets the honest "no assessment yet";
 *  - signals are computed only for entitled accounts, and the upsell card
 *    contains no verdicts — selling the capability, not faking its output.
 */
describe('protection monitor — rendering honesty', () => {
    it('renders clear signals as results, not as absence', () => {
        render(
            <ProtectionMonitorCard
                signals={[
                    signal(),
                    signal({ id: 'critical_open', label: 'Serious exposures open', verdict: 'clear' }),
                ]}
                lastCheckedLabel="Last checked 11 Aug 2026"
                labels={LABELS}
            />
        )
        expect(screen.getByText('Cover about to lapse')).toBeTruthy()
        expect(screen.getByText('Serious exposures open')).toBeTruthy()
        expect(screen.getAllByText('Clear').length).toBe(2)
        expect(screen.getByText('Last checked 11 Aug 2026')).toBeTruthy()
    })

    it('says "no assessment yet" instead of inventing a timestamp', () => {
        render(<ProtectionMonitorCard signals={[signal()]} lastCheckedLabel={null} labels={LABELS} />)
        expect(screen.getByText('No assessment yet')).toBeTruthy()
        expect(screen.queryByText(/Last checked/)).toBeNull()
    })

    it('labels verdicts with text, never colour alone', () => {
        render(
            <ProtectionMonitorCard
                signals={[signal({ verdict: 'action', verdictLabel: 'Action needed', detail: '1 policy ends within 45 days.' })]}
                lastCheckedLabel={null}
                labels={LABELS}
            />
        )
        expect(screen.getByText('Action needed')).toBeTruthy()
    })
})

describe('protection monitor — gating in the dashboard', () => {
    it('computes signals only behind the advancedAnalytics entitlement', () => {
        expect(HOME).toMatch(/advancedAnalytics === true/)
        // The assembly call sits inside the entitlement branch.
        expect(HOME).toMatch(/monitorEntitled && \(hasPolicies \|\| recentVersions\.length > 0\)/)
    })

    it('the last-checked label derives from the real score row', () => {
        expect(HOME).toMatch(/cachedScore\s*\?\s*home\.monitorLastChecked/)
    })

    it('non-entitled accounts get the capability card, never fabricated signals', () => {
        expect(HOME).toMatch(/featureKey="protection_monitoring"/)
        // The upsell branch renders UpgradeTriggerCard, not ProtectionMonitorCard.
        expect(HOME).not.toMatch(/ProtectionMonitorCard[\s\S]{0,400}featureKey="protection_monitoring"[\s\S]{0,400}<\/ProtectionMonitorCard>/)
    })
})
