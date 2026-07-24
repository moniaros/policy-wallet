import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { buildQaPrompt } from '@/lib/services/ai/prompts'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const PROMPTS = strip(readFileSync('lib/services/ai/prompts.ts', 'utf-8'))

const prompt = () =>
    buildQaPrompt(
        {
            insurerName: 'ΕΘΝΙΚΗ',
            policyNumber: 'P-1',
            lineOfBusiness: 'motor',
            startDate: new Date('2026-01-01'),
            endDate: new Date('2027-01-01'),
            premiumAmount: 400,
            coverageSummary: '',
        } as any,
        'Καλύπτομαι για κλοπή στο εξωτερικό;'
    )

/**
 * The interactive Q&A is where a policyholder types "am I covered if my car is
 * stolen abroad?". Its system prompt opened:
 *
 *     "You are an insurance advisor helping a policyholder..."
 *
 * ασφαλιστικός σύμβουλος is a licensed intermediary role in Greece (IDD,
 * ν. 4583/2018), and a model told it is an advisor advises. The risk-profile
 * prompt in the same file already gets this right — "informational
 * insurance-analysis assistant", plus an explicit instruction not to give
 * personalised insurance advice. The interactive surface, the one that actually
 * takes free-text questions about someone's cover, did not.
 */
describe('the Q&A prompt does not cast the model as a regulated adviser', () => {
    it('no longer calls it an insurance advisor', () => {
        expect(prompt()).not.toMatch(/You are an insurance advisor/i)
    })

    it('frames it as informational, like the risk-profile prompt does', () => {
        expect(prompt()).toMatch(/informational assistant/i)
    })

    it('instructs it not to advise', () => {
        const p = prompt()
        expect(p).toMatch(/not giving insurance advice/i)
        expect(p.replace(/\s+/g, ' ')).toMatch(/must not tell the reader what to buy, change, cancel or claim/i)
    })

    it('the risk-profile prompt still holds the same line', () => {
        expect(PROMPTS).toMatch(/informational insurance-analysis assistant/)
        expect(PROMPTS).toMatch(/do not give personalized financial or insurance advice/)
    })
})

/**
 * "If the question is about coverage, state clearly what IS covered and what is
 * NOT" instructed categorical assertions from EXTRACTED data. The rest of the
 * product is careful that absence of extracted detail is not absence of cover —
 * the exclusions card says so outright — while this told the model to answer
 * "no, that is not covered" from a JSON blob that may simply not mention it.
 */
describe('the Q&A prompt keeps "not mentioned" apart from "not covered"', () => {
    it('drops the categorical instruction', () => {
        expect(prompt()).not.toMatch(/state clearly what IS covered and what is NOT/i)
    })

    it('names all three cases explicitly', () => {
        const p = prompt()
        expect(p).toMatch(/does not mention it/i)
        expect(p.replace(/\s+/g, ' ')).toMatch(/do not conclude it is not covered/i)
    })

    it('forbids inferring cover from market convention', () => {
        expect(prompt().replace(/\s+/g, ' ')).toMatch(/Never infer cover from market convention/i)
    })

    it('points anything actionable at the wording and the insurer', () => {
        const p = prompt()
        expect(p).toMatch(/full policy wording/i)
        expect(p.replace(/\s+/g, ' ')).toMatch(/a reading of the document, not the contract/i)
    })

    it('still carries the policy data and the question', () => {
        const p = prompt()
        expect(p).toMatch(/ΕΘΝΙΚΗ/)
        expect(p).toMatch(/Καλύπτομαι για κλοπή στο εξωτερικό;/)
    })
})

/**
 * The daily allowance is a paid feature's meter. `setHours(0,0,0,0)` is midnight
 * in the RUNTIME zone — UTC on Vercel — so it reset at 03:00 Athens.
 */
describe('metered allowances reset on the reader clock, not the server clock', () => {
    const METERS = [
        'app/(protected)/wallet/actions.ts',        // AI questions/day, analyses/day, usage/month
        'app/(protected)/account/actions.ts',       // usage/month
        'lib/subscription-entitlements.ts',         // the entitlement meter itself
    ]

    it('no meter opens its window at the runtime midnight', () => {
        const offenders = METERS.filter((f) => /setHours\(0, ?0, ?0, ?0\)/.test(strip(readFileSync(f, 'utf-8'))))
        expect(offenders, `server-midnight meters:\n${offenders.join('\n')}`).toEqual([])
    })

    it('they use the shared Athens boundaries', () => {
        for (const f of METERS) {
            expect(strip(readFileSync(f, 'utf-8')), f).toMatch(/startOfAthens(Day|Month)\(/)
        }
    })

    it('the month boundary is the start of the Athens month', async () => {
        const { startOfAthensMonth } = await import('@/lib/policy-status')
        // 00:30 Athens on 1 August is still 31 July in UTC — the case a
        // setDate(1)+setHours(0,0,0,0) meter gets wrong in both directions.
        expect(startOfAthensMonth(new Date('2026-07-31T21:30:00Z')).toISOString())
            .toBe('2026-07-31T21:00:00.000Z')
        expect(startOfAthensMonth(new Date('2026-08-15T09:00:00Z')).toISOString())
            .toBe('2026-07-31T21:00:00.000Z')
        // Winter offset.
        expect(startOfAthensMonth(new Date('2026-01-15T09:00:00Z')).toISOString())
            .toBe('2025-12-31T22:00:00.000Z')
    })
})
