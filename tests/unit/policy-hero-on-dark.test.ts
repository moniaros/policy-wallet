import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getStatusColor, getStatusColorOnDark, type PolicyStatus } from '@/lib/policy-status'

/**
 * Status-chip palettes: the two are not interchangeable, and the policy page
 * has now used both.
 *
 * PolicyHero was dark in BOTH themes (`bg-[#111111]`, no `dark:` variant in the
 * file) while being handed the paired light/dark palette, so in light mode a
 * `bg-green-50` / `text-green-700` chip — styling meant for a white page —
 * rendered on a black slab. The audit missed it because /wallet/[id] is a
 * dynamic route and dynamic routes were excluded from every sweep.
 *
 * Goal 2 replaced that hero with `PolicyHead`, a THEMED `.pw-card`, which
 * inverts the requirement. Both halves are asserted below so the next move in
 * either direction is caught: the on-dark palette must stay complete (it is
 * still used by other always-dark surfaces), and the head must take the themed
 * one from `getStatusColor` rather than a local map.
 */
const STATUSES: PolicyStatus[] = [
    'active',
    'expiring_soon',
    'expired',
    'unknown_duration',
    'action_needed',
    'cancelled',
]

describe('status chips on the always-dark policy hero', () => {
    it('covers every status', () => {
        for (const s of STATUSES) {
            const c = getStatusColorOnDark(s)
            expect(c.bg, s).toBeTruthy()
            expect(c.text, s).toBeTruthy()
            expect(c.border, s).toBeTruthy()
        }
    })

    it('never carries a dark: variant — the surface is dark in both themes', () => {
        for (const s of STATUSES) {
            const c = getStatusColorOnDark(s)
            const all = `${c.bg} ${c.text} ${c.border}`
            expect(all, `${s} must not switch on theme`).not.toContain('dark:')
        }
    })

    it('never uses a light-page tint that would sit on the black hero', () => {
        // -50/-100 solid tints are white-page styling; on #111111 they read as
        // a pale blob. Translucent overlays (/10, /15) are the hero's idiom.
        for (const s of STATUSES) {
            const { bg } = getStatusColorOnDark(s)
            expect(bg, `${s}: ${bg}`).not.toMatch(/\b(bg-[a-z]+-(50|100))(?!\/)/)
        }
    })

    it('keeps the themed palette paired, for real page surfaces', () => {
        // getStatusColor still serves pw-card / bg-white dark:bg-neutral-800.
        for (const s of STATUSES) {
            const c = getStatusColor(s)
            expect(`${c.bg} ${c.text} ${c.border}`, s).toContain('dark:')
        }
    })

    /**
     * The mirror of the original assertion, for the surface that replaced the
     * hero.
     *
     * PolicyHero was `#111111` in both themes and therefore had to be handed
     * `getStatusColorOnDark`. Goal 2 replaced it with `PolicyHead`, a themed
     * `.pw-card` — so the correct palette INVERTED, and wiring the on-dark one
     * here would reproduce the original defect with the colours swapped: light
     * chip styling is right, on-dark styling would be a near-black chip on a
     * white card. The status chip must also take its colour from the single
     * source rather than a map local to the component.
     */
    it('the policy head takes the THEMED palette, from the one source', () => {
        const view = readFileSync('components/wallet/PolicyDetailsClientView.tsx', 'utf8')
        const head = view.slice(view.indexOf('<PolicyHead'), view.indexOf('<PolicyHead') + 1400)
        expect(head, 'the head is a themed card — it needs getStatusColor, not the on-dark pair')
            .toContain('statusColor={statusColor}')
        expect(head).not.toContain('statusColorOnDark')

        const src = readFileSync('components/wallet/policy-detail/PolicyHead.tsx', 'utf8')
        const code = src.replace(/\/\*[\s\S]*?\*\//g, '')
        expect(code, 'the chip must not hardcode its own status colours')
            .not.toMatch(/(bg-(green|amber|red|emerald)-\d{2,3})/)
    })
})
