import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

/**
 * A policy's `lineOfBusiness` is a raw taxonomy code (`income_protection`). Some
 * components rendered it directly as visible text — the renewals table's LOB
 * column, a questionnaire-template subtitle, the batch-upload review chip's
 * fallback, the comparison selection line — so a user saw "income_protection"
 * instead of "Income Protection". Every render must resolve it via
 * normalizeBranch(...).label (or the t.policyTypes label map).
 *
 * This flags a `{…lineOfBusiness}` / `${…lineOfBusiness}` render on a POLICY-DATA
 * object. Translation/label/error objects (t, ac, c, copy, roleCopy, gt,
 * fieldErrors…) are excluded — their `.lineOfBusiness` is a field LABEL, not a
 * code — as are lines already routed through a label resolver.
 */
const LABEL_OBJECT_ROOTS = new Set([
    't', 'ac', 'c', 'gt', 'copy', 'roleCopy', 'fieldErrors', 'errors', 'labels', 'tr', 'i18n', 'uiText', 'detailsCopy',
])

/** The raw-code renders on one line, if any — empty when the line is clean. */
function rawLobRenderHits(line: string): string[] {
    // Skip lines already routed through a label resolver.
    if (/normalizeBranch|policyTypes|\.label\b|branchFamilyId/.test(line)) return []
    const hits: string[] = []
    // A `{ … .lineOfBusiness }` expression. We then classify by the char
    // before the opening `{`: `=` means an ATTRIBUTE binding
    // (value={code}, key={code}, id=…) where the raw code is correct and
    // NOT visible text — skip those. `>` / whitespace / `$` (template) is
    // a text position — flag it.
    for (const m of line.matchAll(/\{[^{}]*\.lineOfBusiness\s*\}/g)) {
        const before = line[m.index! - 1]
        if (before === '=') continue // attribute binding, not visible text
        const root = (m[0].match(/[A-Za-z_$][\w$]*/) || [''])[0]
        if (LABEL_OBJECT_ROOTS.has(root)) continue
        hits.push(m[0])
    }
    return hits
}

describe('no raw lineOfBusiness code is rendered as UI text', () => {
    it('every component render of lineOfBusiness resolves it to a label', () => {
        const files = [
            ...globSync('components/**/*.tsx'),
            ...globSync('app/**/*.tsx'),
        ].filter((f) => !f.includes('.test.'))

        const offenders: string[] = []
        for (const file of files) {
            readFileSync(file, 'utf-8').split('\n').forEach((line, i) => {
                if (rawLobRenderHits(line).length > 0) {
                    offenders.push(`${file}:${i + 1}  ${line.trim()}`)
                }
            })
        }

        expect(files.length).toBeGreaterThan(50) // sanity: the glob matched
        expect(
            offenders,
            `raw lineOfBusiness code rendered as UI text (use normalizeBranch(...).label):\n${offenders.join('\n')}`,
        ).toEqual([])
    })
})

/**
 * RED-PROOF (Phase 6 guard audit): the line matcher against the AUTHENTIC
 * pre-fix renders (727394a4 removed exactly these), and the shapes that must
 * stay silent. KNOWN LIMIT, on the record: the matcher requires the dot form
 * `x.lineOfBusiness` inside the braces, so a bare destructured `{lob}` render
 * is invisible — the tree was swept for that shape during the audit and the
 * only instances are the /admin taxonomy pages, which show the raw code
 * deliberately (in font-mono, beside the resolved label).
 */
describe('the render matcher is proven on authentic sources', () => {
    it('flags the renders that shipped', () => {
        // The renewals table LOB column.
        expect(rawLobRenderHits('<td className="py-2 px-4 text-stone-900 dark:text-stone-100">{row.lineOfBusiness}</td>')).toHaveLength(1)
        // The questionnaire-template subtitle.
        expect(rawLobRenderHits('{tpl.lineOfBusiness} · {tpl.questions.length} {t.questions} · {tpl.instanceCount} {t.sentCount}')).toHaveLength(1)
        // The comparison selection line (template-string position).
        expect(rawLobRenderHits('        {r.lineOfBusiness}')).toHaveLength(1)
    })

    it('stays silent on attribute bindings, label objects and resolver lines', () => {
        // An attribute binding is a legitimate raw-code use.
        expect(rawLobRenderHits('<select value={policy.lineOfBusiness} onChange={onChange}>')).toEqual([])
        // A translation-object field is a LABEL, not a code.
        expect(rawLobRenderHits('{t.collaboration.proposals.lineOfBusiness}')).toEqual([])
        // Routed through the resolver.
        expect(rawLobRenderHits('{normalizeBranch(row.lineOfBusiness).label.el}')).toEqual([])
        // The label-map fallback line mentions policyTypes, so it is skipped.
        expect(rawLobRenderHits('{t.policyTypes?.[policy.data.lineOfBusiness as keyof typeof t.policyTypes] || policy.data.lineOfBusiness}')).toEqual([])
    })
})
