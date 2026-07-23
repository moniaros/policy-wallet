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

/**
 * #F8FAFC is exactly --color-neutral-50, so a raw `bg-[#F8FAFC]` page background
 * is the token bg-neutral-50 written the long way — it does not flip or re-tune
 * with the palette. Four B2B screens had it (client detail, insights, activity,
 * dashboard); this keeps a fifth from appearing.
 */
describe('B2B screens use the page-background token, not the raw hex', () => {
    it('has no bg-[#F8FAFC] under the agent surface', () => {
        const files = [...tsx('app/(protected)'), ...tsx('components/agent')]
        const offenders = files.filter((f) => readFileSync(f, 'utf-8').includes('bg-[#F8FAFC]'))
        expect(offenders, `raw F8FAFC background in:\n${offenders.join('\n')}`).toEqual([])
    })
})
