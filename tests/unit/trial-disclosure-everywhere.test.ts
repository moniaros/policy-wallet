import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { trialDisclosure } from '@/lib/pricing/trial-disclosure'
import { DEFAULT_PLAN_FACTS } from '@/lib/pricing/plan-defaults'

/**
 * PW-C02-D10 (owner, 2026-10-22): Family keeps its trial and every surface that SELLS it
 * discloses it — length and price from the plan row, via `trialDisclosure`.
 * A surface that sells = a file that starts a checkout. The universe is enumerated from the
 * filesystem (app, components, lib); a new buyer that forgets the disclosure fails here.
 */
const ROOTS = ['app', 'components', 'lib']
const STARTS_CHECKOUT = /\/api\/v1\/billing\/checkout|\bupgradeSubscription\(|\bcreateCheckoutSession\(/
const DISCLOSES = /\btrialDisclosure\b/

// path -> reason a checkout caller does not itself render the sentence.
const EXEMPT: Record<string, string> = {
    'app/api/v1/billing/checkout/route.ts': 'server route: the sentence is set on the Stripe session in lib/billing.ts (asserted below)',
    'app/(protected)/account/actions.ts': 'server action definition, no rendering',
    'app/(public)/pricing/PricingPageClient.tsx': 'posts the checkout for the cards; PricingCard renders the sentence (asserted below)',
    'app/(protected)/agent/pricing/AgentPricingClient.tsx': 'agent plans carry no trial (trial_days 0 on every agent row)',
    'app/(protected)/upgrade/page.tsx': 'renders PricingComparison, which discloses (asserted below)',
    'app/api/stripe/checkout/route.ts': 'deprecated route with no caller; it grants the trial only to a first subscription',
    'app/api-docs/page.tsx': 'developer documentation of the endpoint path, sells nothing',
    'components/settings/sections/PlanSection.tsx': 'annual switch of an EXISTING subscriber; the re-trial it triggers is PW-ENTITLE-01 item 1',
}

function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) walk(p, out)
        else if (/\.(ts|tsx)$/.test(name)) out.push(p)
    }
    return out
}

export function sellsWithoutDisclosure(path: string, src: string): boolean {
    return STARTS_CHECKOUT.test(src) && !DISCLOSES.test(src) && !(path in EXEMPT)
}

describe('every surface that sells Family discloses the trial (PW-C02-D10)', () => {
    const files = ROOTS.flatMap((r) => walk(r))

    it('every checkout caller discloses the trial or is exempt with a reason', () => {
        const offenders = files.filter((f) => sellsWithoutDisclosure(f, readFileSync(f, 'utf-8')))
        expect(offenders).toEqual([])
    })

    it('the exemptions still exist (no stale entries)', () => {
        for (const path of Object.keys(EXEMPT)) {
            expect(files, `${path} is exempt but no longer exists`).toContain(path)
        }
    })

    it('probe: the detector flags a seller with no disclosure', () => {
        const probe = readFileSync('tests/fixtures/guard-probes/trial-undisclosed-checkout.tsx.txt', 'utf-8')
        expect(sellsWithoutDisclosure('probe.tsx', probe)).toBe(true)
    })

    it('the delegated surfaces really disclose: the pricing card, the Stripe session, the confirmation page', () => {
        for (const f of [
            'components/pricing/PricingCard.tsx',
            'lib/billing.ts',
            'app/auth/signup/confirmation/page.tsx',
            'components/account/PricingComparison.tsx',
            'components/monetization/UpgradeModal.tsx',
            'components/monetization/CarriedPlanCard.tsx',
        ]) {
            expect(readFileSync(f, 'utf-8'), `${f} sells Family and must render trialDisclosure`).toMatch(DISCLOSES)
        }
    })

    it('the sentence is read from the plan row: Family 14 days / 8,99 € monthly, 79 € annual; Plus (no trial) discloses nothing', () => {
        const fam = DEFAULT_PLAN_FACTS.find((p) => p.tierKey === 'pro')!
        const plus = DEFAULT_PLAN_FACTS.find((p) => p.tierKey === 'plus')!
        expect(trialDisclosure(fam.trialDays, fam.monthlyEur, 'monthly')?.el)
            .toMatch(/^Δωρεάν δοκιμή 14 ημερών\. Μετά χρεώνεται 8,99\s€ τον μήνα, εκτός αν ακυρώσετε πριν λήξει\.$/)
        expect(trialDisclosure(fam.trialDays, fam.annualEur!, 'annual')?.el).toMatch(/79\s€ τον χρόνο/)
        expect(trialDisclosure(plus.trialDays, plus.monthlyEur, 'monthly')).toBeNull()
    })

    it('no "new subscribers only" qualifier while the code gives the trial to everyone (H-028)', () => {
        const src = readFileSync('lib/pricing/trial-disclosure.ts', 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '')
        expect(src).not.toMatch(/νέοι συνδρομητές|new subscribers/i)
    })
})
