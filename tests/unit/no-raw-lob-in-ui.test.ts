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

describe('no raw lineOfBusiness code is rendered as UI text', () => {
    it('every component render of lineOfBusiness resolves it to a label', () => {
        const files = [
            ...globSync('components/**/*.tsx'),
            ...globSync('app/**/*.tsx'),
        ].filter((f) => !f.includes('.test.'))

        const offenders: string[] = []
        for (const file of files) {
            readFileSync(file, 'utf-8').split('\n').forEach((line, i) => {
                // Skip lines already routed through a label resolver.
                if (/normalizeBranch|policyTypes|\.label\b|branchFamilyId/.test(line)) return
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
