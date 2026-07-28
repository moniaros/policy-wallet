import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { getStatusColor, getStatusColorOnDark, type PolicyStatus } from '@/lib/policy-status'

/**
 * PolicyHero is dark in BOTH themes (bg-[#111111], text-white, border-white/15
 * — not a single `dark:` variant in the file). It was being handed the paired
 * light/dark status palette, so in light mode a `bg-green-50` / `text-green-700`
 * chip — styling meant for a white page — rendered on a black slab.
 *
 * The audit never caught it because /wallet/[id] is a dynamic route and dynamic
 * routes were excluded from every sweep.
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

    it('PolicyHero is not wired back to the themed palette', () => {
        const view = readFileSync('components/wallet/PolicyDetailsClientView.tsx', 'utf8')
        const hero = view.slice(view.indexOf('<PolicyHero'), view.indexOf('<PolicyHero') + 1200)
        expect(hero).toContain('statusColor={statusColorOnDark}')
    })
})
