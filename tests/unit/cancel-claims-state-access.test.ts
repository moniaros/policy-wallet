import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { CANCEL_ANYTIME } from '@/lib/marketing/cancellation-statement'

/**
 * PW-C02-D15 (owner, 2026-10-22, H-030): cancelling works in the app and ends the subscription at
 * the END of the paid period; there is no downgrade and no plan switch to a smaller plan.
 *   - a «cancel any time» claim is kept only where the SAME string says access continues to the end
 *     of the paid period (so every surface composes it from lib/marketing/cancellation-statement.ts);
 *   - no customer-facing string offers a downgrade or a switch to a smaller plan.
 * Universe: every .ts/.tsx under app, components and lib, quoted literals and JSX text.
 */
const ROOTS = ['app', 'components', 'lib']
const EXCLUDED = [
    /^lib\/marketing\/cancellation-statement\.ts$/, // the source: the consequence is its sibling constant (asserted below)
    /^app\/api-docs\//,
    /^lib\/admin\//,
    /^app\/\(protected\)\/admin\//,
    /^components\/admin\//,
]

// The CLASS: a cancel/stop verb or noun within a few words of a time qualifier, in either language.
const CANCEL_CLAIM = /(ακ[υύ]ρ\S*|σταματάτε|cancel\w*)[^.\n]{0,40}(όποτε|οποτεδήποτε|ανά πάσα στιγμή|any ?time|at any time|whenever)/i
// «διακόψετε τη συνδρομή όποτε θέλετε»: stopping something else (an access grant, a notification) is not this claim.
const STOP_SUBSCRIPTION = /διακ[οό][πψ]\S*[^.\n]{0,30}(συνδρομ|ανανέωσ|πλάν|πρόγραμμ)[^.\n]{0,40}(όποτε|οποτεδήποτε|ανά πάσα στιγμή)/i
const CONSEQUENCE = /έως το τέλος|μέχρι το τέλος|τέλος της τρέχουσας περιόδου|until the end|to the end of|end of the current billing period/i
const DOWNGRADE_CLAIM = /υποβαθμίσετε|υποβάθμιση (πλάνου|προγράμματος|συνδρομής)|υποβάθμι\S*[^.\n]{0,25}(πλάν|πρόγραμμ)|downgrad\w*|αλλάξετε (το )?(πλάνο|πρόγραμμα)|change (your )?plan|switch plans?|switch to a (smaller|cheaper|lower)|αλλάξετε (το )?πλάνο|μετάβαση σε μικρότερο πλάνο|move (down )?to a (smaller|cheaper|lower) plan/i

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

/** Rendered sentences only: a mis-paired quote span carries code punctuation. */
function sentences(src: string): string[] {
    const code = stripComments(src)
    // template interpolations are composed values (the shared statement): remove them before reading the sentence
    const quoted = (code.match(LITERAL) ?? []).map((s) => s.slice(1, -1).replace(/\$\{[^}]*\}/g, ' ').replace(/\{\w+\}/g, ' ')).filter((t) => !/[{}]|=>| = /.test(t))
    const jsx = [...code.matchAll(/>([^<>{}\n]*[A-Za-zΑ-Ωα-ω][^<>{}\n]*)</g)].map((m) => m[1])
    return [...quoted, ...jsx]
}

export function cancelViolations(src: string): string[] {
    return sentences(src).filter((t) => ((CANCEL_CLAIM.test(t) || STOP_SUBSCRIPTION.test(t)) && !CONSEQUENCE.test(t)) || DOWNGRADE_CLAIM.test(t))
}

describe('cancel claims say what cancelling does; no downgrade is offered (H-030)', () => {
    it('no customer surface states a cancel claim without its consequence, or offers a downgrade', () => {
        const files = ROOTS.flatMap((r) => walk(r)).filter((f) => !EXCLUDED.some((re) => re.test(f)))
        expect(files.length).toBeGreaterThan(500)
        const bad = files.flatMap((f) => cancelViolations(readFileSync(f, 'utf-8')).map((s) => `${f}: ${s.slice(0, 100)}`))
        expect(bad).toEqual([])
    })

    it('probe: every probe line is flagged on its own', () => {
        const probe = readFileSync('tests/fixtures/guard-probes/cancel-claim.ts.txt', 'utf-8')
        const lines = probe.split('\n').filter((l) => l.startsWith('export const'))
        expect(lines.length).toBe(13)
        for (const line of lines) expect(cancelViolations(line).length, line).toBeGreaterThanOrEqual(1)
    })

    it('the shared statement carries both the claim and its consequence, in both languages', () => {
        for (const lang of ['el', 'en'] as const) {
            expect(CANCEL_ANYTIME[lang]).toMatch(CANCEL_CLAIM)
            expect(CANCEL_ANYTIME[lang]).toMatch(CONSEQUENCE)
        }
    })
})
