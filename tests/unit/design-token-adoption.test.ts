import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function tsx(dir: string, acc: string[] = []): string[] {
    for (const e of readdirSync(dir)) {
        const p = join(dir, e)
        if (statSync(p).isDirectory()) tsx(p, acc)
        else if (p.endsWith('.tsx')) acc.push(p)
    }
    return acc
}
// Customer-facing surface. Admin is an internal tool held to a lighter bar.
const FILES = [...tsx('components'), ...tsx('app/(protected)')].filter(
    (f) => !/\/admin\/|\.test\./.test(f)
)

/**
 * The type ladder (--text-* → text-body/lead/title…) and density steps
 * (pw-pad*) were built to end the 1,083-arbitrary-size / 5-ad-hoc-padding drift.
 * This proves they stayed adopted: an audit found exactly ONE arbitrary text
 * size (a 9px notification-badge count, below the ladder's decorative floor by
 * design) and ZERO arbitrary pixel paddings across the whole customer surface.
 * A regression here means someone reintroduced off-ladder values.
 */
describe('design-token adoption stays near-total', () => {
    it('has no arbitrary pixel padding (density steps are used instead)', () => {
        const offenders: string[] = []
        for (const f of FILES) {
            const src = readFileSync(f, 'utf-8')
            const hits = src.match(/\b(p|px|py|pt|pb|pl|pr)-\[[0-9]+px\]/g)
            if (hits) offenders.push(`${f}: ${hits.join(', ')}`)
        }
        expect(offenders, `arbitrary pixel padding:\n${offenders.join('\n')}`).toEqual([])
    })

    it('keeps arbitrary text sizes to the known badge exception only', () => {
        const offenders: string[] = []
        for (const f of FILES) {
            const src = readFileSync(f, 'utf-8')
            for (const m of src.matchAll(/text-\[([0-9.]+(?:px|rem))\]/g)) {
                // 0.5625rem (9px) is the notification-count badge, below the
                // decorative kicker (10px) floor on purpose.
                if (m[1] === '0.5625rem') continue
                offenders.push(`${f}: text-[${m[1]}]`)
            }
        }
        expect(offenders, `off-ladder text sizes:\n${offenders.join('\n')}`).toEqual([])
    })
})
