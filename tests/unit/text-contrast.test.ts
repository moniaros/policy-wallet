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
const FILES = [...tsx('components'), ...tsx('app')].filter((f) => !/\.test\./.test(f))

/**
 * Measured WCAG AA contrast of black-on-white at each Tailwind opacity step:
 *   /40 = 2.85  /45 = 3.36  /50 = 3.95   -> FAIL 4.5:1 (normal text)
 *   /55 = 4.74  /60 = 5.74               -> PASS
 * 186 instances of the failing steps were in use, on text-kicker (10px) and
 * text-micro (11px) — small body text, which needs the full 4.5:1. The project's
 * a11y gate logs contrast findings rather than failing on them, so this had gone
 * unaddressed. Lifted to the nearest passing step; this keeps it that way.
 */
describe('muted text meets WCAG AA contrast', () => {
    it('uses no black text opacity below /55 on TEXT-bearing elements', () => {
        // Icons and a decorative breadcrumb "/" legitimately sit lower — WCAG
        // exempts pure decoration. This checks elements that carry words.
        const offenders: string[] = []
        for (const f of FILES) {
            const src = readFileSync(f, 'utf-8')
            for (const m of src.matchAll(
                /<(p|h[1-6]|label)\b[^>]*className="([^"]*text-black\/(?:[0-4][0-9]?|50)\b[^"]*)"[^>]*>/g
            )) {
                const after = src.slice(m.index! + m[0].length, m.index! + m[0].length + 40)
                if (/^\s*<[A-Z]/.test(after)) continue // icon-only child
                offenders.push(`${f}: <${m[1]}> ${m[2].slice(0, 45)}`)
            }
        }
        expect(offenders, `below-AA muted TEXT:\n${offenders.join('\n')}`).toEqual([])
    })
})
