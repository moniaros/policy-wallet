import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { BASIC_MILESTONES, RENEWAL_MILESTONES } from '@/lib/renewals/milestones'
import { BASIC_REMINDER_LABEL, BASIC_WHEN, LADDER_LABEL, LADDER_LIST, LADDER_RANGE } from '@/lib/renewals/reminder-copy'

/**
 * PW-C02-D16 (owner, 2026-10-22): every reminder-offset claim is COMPOSED from the constants the
 * scheduler uses (lib/renewals/milestones.ts → lib/renewals/reminder-copy.ts). A typed «30 ημέρες
 * πριν» / «από 90 έως 3» cannot drift from RENEWAL_MILESTONES only by luck; this fails on the literal.
 * Universe: every .ts/.tsx under app, components and lib; quoted literals and JSX text that talk about
 * a reminder and state a rung number.
 */
const ROOTS = ['app', 'components', 'lib']
const EXCLUDED: Array<[RegExp, string]> = [
    [/^lib\/renewals\//, 'the constants and the composing module'],
    [/^lib\/services\/renewal\.service\.ts$/, 'the scheduler itself (internal strings and comments)'],
    [/^app\/\(protected\)\/renewals\//, 'the AGENT expiry list window (types 90 = the cron window literal, renewal.service.ts:115): queued as AGENT-LIST-WINDOW-CONSTANT'],
    [/^lib\/legal\//, 'retention periods in the privacy notice, not reminder offsets'],
    [/^app\/api\//, 'API handlers'],
    [/^lib\/notifications\//, 'notification registry/internal copy (own guards)'],
]

// The CLASS: any promise to tell the customer something before a date (reminder, alert, notify, email).
const REMIND = /υπενθυμ|υπενθύμ|remind|ειδοποι|ενημερώσ|θα λάβετε|alert|notif|let you know|email you|we email|we will email|στέλνουμε email|email πριν/i
const RUNG = /(?<![\d.,])(90|60|30|15|7|3)(?![\d.,])/
const LITERAL = /(["'`])(?:(?!\1)[^\n\\]|\\.)*[ \t](?:(?!\1)[^\n\\]|\\.)*\1/g

function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name)
        if (statSync(p).isDirectory()) walk(p, out)
        else if (/\.(ts|tsx)$/.test(name)) out.push(p)
    }
    return out
}
function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

export function typedOffsets(src: string): string[] {
    const code = stripComments(src)
    const quoted = (code.match(LITERAL) ?? [])
        .map((s) => s.slice(1, -1))
        // template interpolations are composed values: remove them before looking for a typed number
        .map((t) => t.replace(/\$\{[^}]*\}/g, ' ').replace(/\{\w+\}/g, ' '))
        .filter((t) => !/[{}]|=>| = /.test(t))
    const jsx = [...code.matchAll(/>([^<>{}\n]*[A-Za-zΑ-Ωα-ω][^<>{}\n]*)</g)].map((m) => m[1])
    return [...quoted, ...jsx].filter((t) => REMIND.test(t) && RUNG.test(t))
}

describe('reminder offsets are composed from the scheduler constants (PW-C02-D16)', () => {
    it('no source file types a reminder offset', () => {
        const files = ROOTS.flatMap((r) => walk(r)).filter((f) => !EXCLUDED.some(([re]) => re.test(f)))
        expect(files.length).toBeGreaterThan(500)
        const bad = files.flatMap((f) => typedOffsets(readFileSync(f, 'utf-8')).map((s) => `${f}: ${s.slice(0, 110)}`))
        expect(bad).toEqual([])
    })

    it('probe: every probe line is flagged on its own', () => {
        const probe = readFileSync('tests/fixtures/guard-probes/reminder-offset-typed.ts.txt', 'utf-8')
        const lines = probe.split('\n').filter((l) => l.startsWith('export const'))
        expect(lines.length).toBe(8)
        for (const line of lines) expect(typedOffsets(line).length, line).toBeGreaterThanOrEqual(1)
    })

    it('the composed phrases carry exactly the scheduler constants', () => {
        expect(LADDER_RANGE.en).toBe(`from ${Math.max(...RENEWAL_MILESTONES)} to ${Math.min(...RENEWAL_MILESTONES)} days ahead`)
        expect(LADDER_LIST.en).toContain(RENEWAL_MILESTONES.join(', ').replace(/, (\d+)$/, ' and $1'))
        expect(BASIC_WHEN.en).toContain(String(Math.max(...BASIC_MILESTONES)))
        expect(LADDER_LABEL.el).toContain(`από ${Math.max(...RENEWAL_MILESTONES)} έως ${Math.min(...RENEWAL_MILESTONES)}`)
        expect(BASIC_REMINDER_LABEL.el).toContain(`έως ${Math.max(...BASIC_MILESTONES)} ημέρες`)
    })
})
