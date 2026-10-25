import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Round 6 (owner, 2026-10-22): Family's interactive Q&A is BOUNDED by the shared monthly token budget
 * (the gate asks for 15,000 tokens of headroom per question, app/(protected)/wallet/actions.ts:1778, and the
 * answer's actual tokens are recorded against the same row) until QA-BUDGET-SPLIT ships. No customer-facing
 * string may promise questions without a bound: «απεριόριστες ερωτήσεις», "unlimited questions", «ρωτάτε
 * ελεύθερα», "ask freely", "ask anything" / «ρωτήστε οτιδήποτε», «ερωτήσεις χωρίς όριο».
 * (`unlimited_ai_questions` is an internal feature key, never a rendered string: it has no space.)
 * Universe: every .ts/.tsx under app, components and lib; quoted literals and JSX text.
 */
const ROOTS = ['app', 'components', 'lib']
const EXCLUDED = [/^app\/api-docs\//, /^lib\/admin\//, /^app\/\(protected\)\/admin\//, /^components\/admin\//]

// questionnaires (ερωτηματολόγια) are an agent feature, not Q&A; a word must not swallow the full stop after it
const QUESTION = '(ερωτ(?!ηματολ)[^\\s.,;]*|question(?!naire)\\w*|q&a)'
const UNBOUNDED = '(απεριόρ[^\\s.,;]*|unlimited|χωρίς όριο|no limit|ελεύθερα|freely|anything|οτιδήποτε|any number of|όσες θέλετε|όσες ερωτήσεις|as many|as often|whenever|όποτε|ό,τι θέλετε|οσεσδήποτε)'
const CLAIM = new RegExp(`${UNBOUNDED}[^.\\n]{0,40}${QUESTION}|${QUESTION}[^.\\n]{0,40}${UNBOUNDED}|ask (the (AI|assistant) )?${UNBOUNDED}|ρωτ[^\\s.,;]* ${UNBOUNDED}|ρωτάτε ${UNBOUNDED}`, 'i')
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

export function unboundedQuestionClaims(src: string): string[] {
    const code = stripComments(src)
    const quoted = (code.match(LITERAL) ?? []).map((s) => s.slice(1, -1).replace(/\$\{[^}]*\}/g, ' ')).filter((t) => !/[{}]|=>| = /.test(t))
    const jsx = [...code.matchAll(/>([^<>{}\n]*[A-Za-zΑ-Ωα-ω][^<>{}\n]*)</g)].map((m) => m[1])
    return [...quoted, ...jsx].filter((t) => CLAIM.test(t))
}

describe('no customer-facing string promises unbounded Q&A', () => {
    it('no source file promises unlimited / free-for-all questions', () => {
        const files = ROOTS.flatMap((r) => walk(r)).filter((f) => !EXCLUDED.some((re) => re.test(f)))
        expect(files.length).toBeGreaterThan(500)
        const bad = files.flatMap((f) => unboundedQuestionClaims(readFileSync(f, 'utf-8')).map((s) => `${f}: ${s.slice(0, 110)}`))
        expect(bad).toEqual([])
    })

    it('probe: every probe line is flagged on its own', () => {
        const probe = readFileSync('tests/fixtures/guard-probes/unlimited-questions.ts.txt', 'utf-8')
        const lines = probe.split('\n').filter((l) => l.startsWith('export const'))
        expect(lines.length).toBe(11)
        for (const line of lines) expect(unboundedQuestionClaims(line).length, line).toBeGreaterThanOrEqual(1)
    })

    it('the claim is not made about plan config either: Family questionsPerDay null renders no count claim', () => {
        const src = readFileSync('lib/marketing/plan-claims.ts', 'utf-8')
        // interactiveQA is a capability (boolean) in the public claim table; no question COUNT is ever derived from questionsPerDay
        expect(src).not.toMatch(/questionsPerDay/)
    })
})
