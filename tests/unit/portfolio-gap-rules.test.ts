import { describe, it, expect } from 'vitest'
import {
    evaluatePortfolioRules,
    buildProfileGapEvidence,
    type PortfolioPolicyFacts,
} from '@/lib/services/gap-engine/portfolio-rules'

const NOW = new Date('2026-07-10T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000

function policy(overrides: Partial<PortfolioPolicyFacts> = {}): PortfolioPolicyFacts {
    return {
        id: 'pol-1',
        lineOfBusiness: 'motor',
        status: 'active',
        insurerName: 'Interamerican',
        policyNumber: 'MOT-001',
        startDate: new Date(NOW.getTime() - 300 * DAY),
        endDate: new Date(NOW.getTime() + 300 * DAY),
        acordData: null,
        ...overrides,
    }
}

const ctx = (hasAgent = true) => ({ hasAgent, now: NOW })

function ruleIds(gaps: ReturnType<typeof evaluatePortfolioRules>): string[] {
    return gaps.map((g) => g.ruleId)
}

describe('motor_expiring_soon', () => {
    it('fires high severity within 30 days and cites the policy + date', () => {
        const gaps = evaluatePortfolioRules(
            [policy({ endDate: new Date(NOW.getTime() + 20 * DAY) })],
            ctx()
        )
        const gap = gaps.find((g) => g.ruleId === 'motor_expiring_soon')
        expect(gap).toBeDefined()
        expect(gap!.severity).toBe('high')
        expect(gap!.evidence.en).toContain('Interamerican (MOT-001)')
        expect(gap!.evidence.en).toContain('20 days')
        expect(gap!.reviewHref).toBe('/wallet/pol-1')
    })

    it('escalates to critical within 7 days', () => {
        const gaps = evaluatePortfolioRules(
            [policy({ endDate: new Date(NOW.getTime() + 5 * DAY) })],
            ctx()
        )
        expect(gaps.find((g) => g.ruleId === 'motor_expiring_soon')!.severity).toBe('critical')
    })

    it('does not fire for far-off expiry, expired, or non-motor policies', () => {
        const farOff = evaluatePortfolioRules([policy({ endDate: new Date(NOW.getTime() + 60 * DAY) })], ctx())
        const expired = evaluatePortfolioRules([policy({ endDate: new Date(NOW.getTime() - DAY) })], ctx())
        const home = evaluatePortfolioRules(
            [policy({ lineOfBusiness: 'home', endDate: new Date(NOW.getTime() + 10 * DAY) })],
            ctx()
        )
        expect(ruleIds(farOff)).not.toContain('motor_expiring_soon')
        expect(ruleIds(expired)).not.toContain('motor_expiring_soon')
        expect(ruleIds(home)).not.toContain('motor_expiring_soon')
    })

    it('picks the soonest-expiring motor policy', () => {
        const gaps = evaluatePortfolioRules(
            [
                policy({ id: 'later', endDate: new Date(NOW.getTime() + 25 * DAY) }),
                policy({ id: 'sooner', policyNumber: 'MOT-002', endDate: new Date(NOW.getTime() + 6 * DAY) }),
            ],
            ctx()
        )
        const gap = gaps.find((g) => g.ruleId === 'motor_expiring_soon')!
        expect(gap.reviewHref).toBe('/wallet/sooner')
    })
})

describe('health_low_coverage', () => {
    const health = (annualLimit: number | undefined) =>
        policy({
            id: 'health-1',
            lineOfBusiness: 'health',
            policyNumber: 'HL-001',
            acordData: annualLimit !== undefined ? { health: { annualLimit } } : { health: {} },
        })

    it('fires medium under €100k and cites the extracted limit', () => {
        const gaps = evaluatePortfolioRules([health(60_000)], ctx())
        const gap = gaps.find((g) => g.ruleId === 'health_low_coverage')
        expect(gap).toBeDefined()
        expect(gap!.severity).toBe('medium')
        expect(gap!.evidence.en).toContain('60,000')
        expect(gap!.reviewHref).toBe('/wallet/health-1')
    })

    it('fires high under €30k', () => {
        const gaps = evaluatePortfolioRules([health(15_000)], ctx())
        expect(gaps.find((g) => g.ruleId === 'health_low_coverage')!.severity).toBe('high')
    })

    it('does not fire at or above €100k or when no limit was extracted', () => {
        expect(ruleIds(evaluatePortfolioRules([health(150_000)], ctx()))).not.toContain('health_low_coverage')
        expect(ruleIds(evaluatePortfolioRules([health(undefined)], ctx()))).not.toContain('health_low_coverage')
    })
})

describe('duplicate_coverage', () => {
    // Same LOB is NOT duplication: two motor policies are normally two cars, two
    // home policies two properties. The rule now needs the same insured SUBJECT.
    const withPlate = (over: Record<string, unknown>, plate: string) => ({
        ...policy(over),
        acordData: { vehicle: { plateNumber: plate } },
    })

    it('fires when two policies name the same plate, citing both', () => {
        const gaps = evaluatePortfolioRules(
            [
                withPlate({ id: 'a', policyNumber: 'MOT-001' }, 'ΙΖΡ-1234'),
                withPlate({ id: 'b', policyNumber: 'MOT-002', insurerName: 'Ethniki' }, 'ΙΖΡ-1234'),
            ],
            ctx()
        )
        const gap = gaps.find((g) => g.ruleId === 'duplicate_coverage_motor')
        expect(gap).toBeDefined()
        expect(gap!.evidence.en).toContain('MOT-001')
        expect(gap!.evidence.en).toContain('Ethniki (MOT-002)')
        expect(gap!.reviewHref).toBe('/wallet')
    })

    it('does NOT fire for two cars — the defect this replaces', () => {
        const gaps = evaluatePortfolioRules(
            [
                withPlate({ id: 'a', policyNumber: 'MOT-001' }, 'ΙΖΡ-1234'),
                withPlate({ id: 'b', policyNumber: 'MOT-002' }, 'ΑΒΓ-9876'),
            ],
            ctx()
        )
        // The old rule told a two-car household it was paying twice and that
        // "keeping one may be enough" — third-party cover being compulsory,
        // acting on that leaves a vehicle uninsured.
        expect(ruleIds(gaps).filter((r) => r.startsWith('duplicate_coverage'))).toHaveLength(0)
    })

    it('does not assert duplication when no subject is stated', () => {
        const gaps = evaluatePortfolioRules(
            [policy({ id: 'a', policyNumber: 'H-1' }), policy({ id: 'b', policyNumber: 'H-2' })],
            ctx()
        )
        expect(ruleIds(gaps).filter((r) => r.startsWith('duplicate_coverage'))).toHaveLength(0)
    })

    it('matches a plate regardless of spacing and case', () => {
        const gaps = evaluatePortfolioRules(
            [
                withPlate({ id: 'a', policyNumber: 'MOT-001' }, ' ιζρ-1234 '),
                withPlate({ id: 'b', policyNumber: 'MOT-002' }, 'ΙΖΡ1234'),
            ],
            ctx()
        )
        // Different separators, same vehicle: normalising only whitespace and
        // case is deliberate — stripping the dash too would merge genuinely
        // different plates.
        expect(ruleIds(gaps).filter((r) => r.startsWith('duplicate_coverage'))).toHaveLength(0)
    })

    it('fires for two policies on the same property address', () => {
        const atAddress = (over: Record<string, unknown>, address: string) => ({
            ...policy({ ...over, lineOfBusiness: 'home' }),
            acordData: { property: { address } },
        })
        const gaps = evaluatePortfolioRules(
            [
                atAddress({ id: 'a', policyNumber: 'H-1' }, 'Ερμού 12, Αθήνα'),
                atAddress({ id: 'b', policyNumber: 'H-2' }, 'ερμού 12,  αθήνα'),
            ],
            ctx()
        )
        expect(gaps.find((g) => g.ruleId === 'duplicate_coverage_home')).toBeDefined()
    })

    it('does not fire for a flat and a holiday house', () => {
        const atAddress = (over: Record<string, unknown>, address: string) => ({
            ...policy({ ...over, lineOfBusiness: 'home' }),
            acordData: { property: { address } },
        })
        const gaps = evaluatePortfolioRules(
            [
                atAddress({ id: 'a', policyNumber: 'H-1' }, 'Ερμού 12, Αθήνα'),
                atAddress({ id: 'b', policyNumber: 'H-2' }, 'Παραλία 3, Άνδρος'),
            ],
            ctx()
        )
        expect(ruleIds(gaps).filter((r) => r.startsWith('duplicate_coverage'))).toHaveLength(0)
    })

    it('does not fire for non-overlapping periods or different LOBs', () => {
        const sequential = evaluatePortfolioRules(
            [
                policy({ id: 'a', startDate: new Date('2025-01-01'), endDate: new Date('2026-01-01') }),
                policy({ id: 'b', startDate: new Date('2026-06-01'), endDate: new Date('2027-06-01') }),
            ],
            ctx()
        )
        const mixed = evaluatePortfolioRules(
            [policy({ id: 'a' }), policy({ id: 'b', lineOfBusiness: 'home' })],
            ctx()
        )
        expect(ruleIds(sequential).filter((r) => r.startsWith('duplicate_coverage'))).toHaveLength(0)
        expect(ruleIds(mixed).filter((r) => r.startsWith('duplicate_coverage'))).toHaveLength(0)
    })

    it('ignores inactive policies', () => {
        const gaps = evaluatePortfolioRules(
            [policy({ id: 'a' }), policy({ id: 'b', status: 'inactive' })],
            ctx()
        )
        expect(ruleIds(gaps).filter((r) => r.startsWith('duplicate_coverage'))).toHaveLength(0)
    })
})

describe('unclear_exclusions', () => {
    it('fires for analyzed policies with no extracted exclusions and links to the policy page', () => {
        const gaps = evaluatePortfolioRules(
            [policy({ acordData: { extraction: { source: 'gemini' }, exclusions: [] } })],
            ctx()
        )
        const gap = gaps.find((g) => g.ruleId === 'unclear_exclusions')
        expect(gap).toBeDefined()
        expect(gap!.severity).toBe('low')
        expect(gap!.reviewHref).toBe('/wallet/pol-1')
    })

    it('does not fire for unanalyzed policies or ones with exclusions', () => {
        const unanalyzed = evaluatePortfolioRules([policy({ acordData: null })], ctx())
        const withExclusions = evaluatePortfolioRules(
            [policy({ acordData: { extraction: {}, exclusions: ['Racing'] } })],
            ctx()
        )
        expect(ruleIds(unanalyzed)).not.toContain('unclear_exclusions')
        expect(ruleIds(withExclusions)).not.toContain('unclear_exclusions')
    })
})

describe('no_agent_connected', () => {
    it('fires when there is no agent and at least one active policy', () => {
        const gaps = evaluatePortfolioRules([policy()], ctx(false))
        const gap = gaps.find((g) => g.ruleId === 'no_agent_connected')
        expect(gap).toBeDefined()
        expect(gap!.evidence.en).toContain('1 active policy')
        expect(gap!.reviewHref).toBe('/agent')
    })

    it('does not fire with an agent or with an empty wallet', () => {
        expect(ruleIds(evaluatePortfolioRules([policy()], ctx(true)))).not.toContain('no_agent_connected')
        expect(ruleIds(evaluatePortfolioRules([], ctx(false)))).not.toContain('no_agent_connected')
    })
})

describe('evidence hygiene', () => {
    it('never quotes placeholder identifiers', () => {
        const gaps = evaluatePortfolioRules(
            [
                policy({
                    insurerName: '__PENDING_EXTRACTION__',
                    policyNumber: 'PENDING-123',
                    endDate: new Date(NOW.getTime() + 10 * DAY),
                }),
            ],
            ctx(false)
        )
        for (const gap of gaps) {
            expect(gap.evidence.en).not.toContain('__PENDING_EXTRACTION__')
            expect(gap.evidence.en).not.toContain('PENDING-123')
            expect(gap.evidence.el).not.toContain('PENDING-123')
        }
    })
})

describe('home_no_earthquake', () => {
    it('fires when the analyzed property section shows no earthquake cover', () => {
        const gaps = evaluatePortfolioRules(
            [policy({ lineOfBusiness: 'home', acordData: { property: { earthquakeCoverageIncluded: false } } })],
            ctx()
        )
        const gap = gaps.find((g) => g.ruleId === 'home_no_earthquake')
        expect(gap).toBeDefined()
        expect(gap!.severity).toBe('medium')
        expect(gap!.evidence.el).toContain('δεν εντόπισε κάλυψη σεισμού')
        expect(gap!.reviewHref).toBe('/wallet/pol-1')
    })

    it('does not fire when earthquake is covered, un-analyzed, or non-home', () => {
        const covered = evaluatePortfolioRules(
            [policy({ lineOfBusiness: 'home', acordData: { property: { earthquakeCoverageIncluded: true } } })],
            ctx()
        )
        const unanalyzed = evaluatePortfolioRules([policy({ lineOfBusiness: 'home', acordData: null })], ctx())
        const motor = evaluatePortfolioRules(
            [policy({ lineOfBusiness: 'motor', acordData: { property: { earthquakeCoverageIncluded: false } } })],
            ctx()
        )
        expect(ruleIds(covered)).not.toContain('home_no_earthquake')
        expect(ruleIds(unanalyzed)).not.toContain('home_no_earthquake')
        expect(ruleIds(motor)).not.toContain('home_no_earthquake')
    })

    it('normalizes legacy property lines to home', () => {
        const gaps = evaluatePortfolioRules(
            [policy({ lineOfBusiness: 'property', acordData: { property: { earthquakeCoverageIncluded: false } } })],
            ctx()
        )
        expect(ruleIds(gaps)).toContain('home_no_earthquake')
    })
})

describe('motor_no_roadside', () => {
    it('fires when the analyzed vehicle section shows no roadside assistance', () => {
        const gaps = evaluatePortfolioRules(
            [policy({ acordData: { vehicle: { hasRoadsideAssistance: false } } })],
            ctx()
        )
        const gap = gaps.find((g) => g.ruleId === 'motor_no_roadside')
        expect(gap).toBeDefined()
        expect(gap!.severity).toBe('medium')
        expect(gap!.evidence.el).toContain('δεν εντόπισε οδική βοήθεια')
        expect(gap!.reviewHref).toBe('/wallet/pol-1')
    })

    it('does not fire when roadside exists, un-analyzed, or inactive', () => {
        const covered = evaluatePortfolioRules(
            [policy({ acordData: { vehicle: { hasRoadsideAssistance: true } } })],
            ctx()
        )
        const unanalyzed = evaluatePortfolioRules([policy({ acordData: null })], ctx())
        const cancelled = evaluatePortfolioRules(
            [policy({ status: 'cancelled', acordData: { vehicle: { hasRoadsideAssistance: false } } })],
            ctx()
        )
        expect(ruleIds(covered)).not.toContain('motor_no_roadside')
        expect(ruleIds(unanalyzed)).not.toContain('motor_no_roadside')
        expect(ruleIds(cancelled)).not.toContain('motor_no_roadside')
    })
})

describe('buildProfileGapEvidence', () => {
    it('cites the profile fact for known rules', () => {
        const content = buildProfileGapEvidence('homeowner_no_home', 'home', 3)
        expect(content.evidence.en).toContain('3 active policies')
        expect(content.evidence.en).toContain('own your home')
        expect(content.evidence.el).toContain('ιδιόκτητη κατοικία')
        expect(content.reviewHref).toBeNull()
    })

    it('falls back to a generic portfolio scan for unknown rules', () => {
        const content = buildProfileGapEvidence('some_new_rule', 'travel', 1)
        expect(content.evidence.en).toContain('1 active policy')
        expect(content.evidence.en).toContain('travel')
    })
})

/**
 * Motor is the compulsory line. `endDate > now` dropped a policy expiring TODAY
 * from three hours into the day it still covered — the one day the renewal still
 * matters — because end dates are stored at midnight UTC.
 */
describe('motor_expiring_soon covers the last day', () => {
    const withEnd = (end: string) => ({
        ...policy({ id: 'm', policyNumber: 'MOT-1' }),
        endDate: new Date(end),
    })
    const at = (iso: string) => ({ hasAgent: true, now: new Date(iso) })
    const rule = (end: string, nowIso: string) =>
        evaluatePortfolioRules([withEnd(end)], at(nowIso)).find((g) => g.ruleId === 'motor_expiring_soon')

    it('still fires on the final day of cover', () => {
        const gap = rule('2026-07-24T00:00:00Z', '2026-07-24T09:00:00Z')
        expect(gap).toBeDefined()
        expect(gap!.severity).toBe('critical')
        expect(gap!.evidence.en).toMatch(/— today\./)
        expect(gap!.evidence.el).toMatch(/— σήμερα\./)
    })

    it('says tomorrow rather than "in 1 days"', () => {
        const gap = rule('2026-07-25T00:00:00Z', '2026-07-24T09:00:00Z')
        expect(gap!.evidence.en).toMatch(/— tomorrow\./)
        expect(gap!.evidence.el).toMatch(/— αύριο\./)
    })

    it('stops once the policy has actually lapsed', () => {
        expect(rule('2026-07-23T00:00:00Z', '2026-07-24T09:00:00Z')).toBeUndefined()
    })

    it('counts the window on the Athens calendar', () => {
        // 00:30 Athens on 25 July is still 24 July in UTC.
        const gap = rule('2026-08-24T00:00:00Z', '2026-07-24T21:30:00Z')
        expect(gap).toBeDefined()
        expect(gap!.evidence.en).toMatch(/in 30 days/)
    })

    it('dates the policy in Athens, not the runtime zone', () => {
        // An Athens-midnight end instant must not render as the previous day.
        const gap = rule('2026-07-24T21:00:00Z', '2026-07-24T09:00:00Z')
        expect(gap!.evidence.en).toMatch(/25\/07\/2026/)
    })
})
