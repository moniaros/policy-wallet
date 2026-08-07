import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { LifeChangeDiscovery } from '@/components/landing/LifeChangeDiscovery'
import { LIFE_CHANGE_EFFECTS } from '@/lib/marketing/positioning'

/**
 * The hero interaction must not need JavaScript.
 *
 * It used to hold its selection in React state, so the chips were painted long
 * before they worked — measured against production at 843ms on fast 4G with 4x
 * CPU throttling and 2,420ms on slow 4G with 6x. They are the first control on
 * the page, so that window is exactly when someone taps. Rewritten on
 * checkboxes and a `:has()` rule, the same measurement reads under 100ms.
 *
 * Two properties are easy to undo by accident, and both are load-bearing:
 * the component must stay off the client bundle, and the reveal rules must
 * stay inside `@supports selector(:has(*))` so a browser without `:has()`
 * falls back to showing every line rather than none.
 */
describe('the life-change discovery runs without JavaScript', () => {
    const source = readFileSync('components/landing/LifeChangeDiscovery.tsx', 'utf-8')

    it('is a server component — no client bundle, no hydration wait', () => {
        expect(source).not.toMatch(/^\s*["']use client["']/m)
        expect(source).not.toContain('useState')
    })

    it('hides the effect lines only inside an @supports :has() guard', () => {
        // Without the guard, a browser that cannot match :has() would apply the
        // display:none and never be able to undo it — a permanently dead control.
        const guarded = source.match(/@supports selector\(:has\(\*\)\)\{[\s\S]*?data-lc-effect\]\{display:none\}/)
        expect(guarded, 'the display:none must sit inside @supports selector(:has(*))').not.toBeNull()
    })

    it('renders every chip and every effect line in the server markup', () => {
        const html = renderToStaticMarkup(<LifeChangeDiscovery locale="el" />)
        for (const entry of LIFE_CHANGE_EFFECTS) {
            expect(html, `chip missing: ${entry.change.el}`).toContain(entry.change.el)
            expect(html, `effect missing: ${entry.effect.el}`).toContain(entry.effect.el)
        }
        // One checkbox per chip, each paired to its own reveal rule.
        const boxes = html.match(/type="checkbox"/g) ?? []
        expect(boxes).toHaveLength(LIFE_CHANGE_EFFECTS.length)
        for (let i = 0; i < LIFE_CHANGE_EFFECTS.length; i++) {
            expect(html, `no reveal rule for chip ${i}`).toContain(
                `#life-changes:has(#lc-${i}:checked) [data-lc-effect="${i}"]`
            )
        }
    })

    it('keeps the English markup complete too', () => {
        const html = renderToStaticMarkup(<LifeChangeDiscovery locale="en" />)
        for (const entry of LIFE_CHANGE_EFFECTS) {
            expect(html).toContain(entry.change.en)
            expect(html).toContain(entry.effect.en)
        }
    })
})
