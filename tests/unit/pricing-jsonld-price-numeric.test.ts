import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { buildPublicPricingContent } from '@/lib/pricing/pricing-view-model'
import { buildSyntheticCatalog } from '@/lib/pricing/plan-catalog'
import { softwareApplicationJsonLd } from '@/lib/seo/jsonld'

/**
 * PW-CONTENT-02 A3 — the pricing JSON-LD carries a NUMBER, and it is the plan's.
 *
 * Prices used to be the string «€4.99», parsed back with a regex in the two
 * pricing pages' JSON-LD. Rendering Greek prices as «4,99 €» (A4) would have made
 * that regex produce "499" — a structured-data offer a hundred times the real
 * price, invisible on the page. Two arms:
 *   1. SOURCE — every file under app/ that builds `softwareApplicationJsonLd`
 *      offers must take the price from `pricing.monthly.value` and may not
 *      parse, strip or coerce a formatted string (enumerated from the tree).
 *   2. BEHAVIOUR — over the live catalogue the offer's `price` is a finite
 *      number equal to the catalogue's `monthlyEur`, with `priceCurrency` EUR.
 * Probe: tests/fixtures/guard-probes/jsonld-price-parsed.tsx.txt must turn arm 1 red.
 */
function files(dir: string): string[] {
    if (!existsSync(dir)) return []
    return readdirSync(dir).flatMap((n) => {
        const p = join(dir, n)
        if (/(^|\/)(node_modules|\.next)\//.test(p + '/')) return []
        return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) ? [p] : []
    })
}
function sourceOffenders(path: string, text: string): string[] {
    if (!/softwareApplicationJsonLd\s*\(/.test(text) || /export function softwareApplicationJsonLd/.test(text)) return []
    const bad: string[] = []
    if (!/pricing\.monthly\.value/.test(text)) bad.push(`${path}: offer price does not come from pricing.monthly.value`)
    text.split('\n').forEach((line, i) => {
        if (/\bprice\s*:/.test(line) && /\.replace\(|parseFloat|parseInt|Number\(|String\(|\.toFixed|\.toString|\.amount|`\$\{/.test(line)) bad.push(`${path}:${i + 1}  ${line.trim()}`)
    })
    return bad
}

describe('pricing JSON-LD price is a number and equals the plan config (A3)', () => {
    it('source arm — no pricing page parses a formatted price back into a number', () => {
        const all = files('app').map((p) => ({ p, t: readFileSync(p, 'utf-8') })).filter((f) => /softwareApplicationJsonLd\s*\(/.test(f.t))
        expect(all.length, 'the guard must see the pricing pages').toBeGreaterThanOrEqual(2)
        const bad = all.flatMap((f) => sourceOffenders(f.p, f.t))
        expect(bad, bad.join('\n')).toEqual([])
    })

    it('probe — the parsed-string shape turns the source arm red', () => {
        const probe = readFileSync('tests/fixtures/guard-probes/jsonld-price-parsed.tsx.txt', 'utf-8')
        expect(sourceOffenders('probe', probe).length).toBeGreaterThan(0)
    })

    it('behaviour arm — every offer price is a finite number equal to the catalogue, in EUR', () => {
        const catalog = buildSyntheticCatalog()
        const content = buildPublicPricingContent(catalog, { available: true, reason: null })
        for (const audience of ['policyholder', 'agent'] as const) {
            const offers = content[audience].plans.filter((p) => !p.isContactPlan).map((p) => ({ name: p.name.el, price: p.pricing.monthly.value }))
            const ld = softwareApplicationJsonLd(offers) as { offers: { price: unknown; priceCurrency: string; name: string }[] }
            for (const [i, offer] of ld.offers.entries()) {
                const plan = content[audience].plans.filter((p) => !p.isContactPlan)[i]
                const planId = plan.checkoutPlanId ?? (plan.key === 'free' ? 'ph-free' : plan.key)
                const row = catalog.find((c) => c.id === planId)
                expect(typeof offer.price, `${offer.name} price must be a number`).toBe('number')
                expect(Number.isFinite(offer.price as number)).toBe(true)
                expect(offer.price, `${offer.name} price must equal the catalogue`).toBe(row?.monthlyEur)
                expect(offer.priceCurrency).toBe('EUR')
            }
        }
    })
})
