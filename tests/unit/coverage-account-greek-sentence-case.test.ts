import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The main greek-sentence-case guard scans `el: '…'` inline maps. These core B2C
 * components carry Greek in patterns it misses — `lang === "el" ? "…"`,
 * `t("…","…")`, and local copy objects — and Title Case had hidden there
 * («Βαθμολογία Προστασίας», «Προτάσεις Κάλυψης», «Προφίλ Κινδύνου», «Μηνιαία
 * Χρήση»…). Scan ALL Greek string literals with the same restart-aware per-word
 * check. (Scoped to these B2C files; B2B agent pages keep their own casing.)
 */
const GU = 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩΆΈΉΊΌΎΏ'
const RESTARTS = ['.', '!', '?', ':', '·', '|', '—', '–', '&', ',', ';']
const PROPER = new Set(['Tokens', 'Token', 'PolicyWallet', 'AI', 'PDF', 'Πορτοφόλι', 'Πορτοφολιού'])

const FILES = [
    'components/coverage/ProtectionScoreCard.tsx',
    'components/coverage/RecommendationCards.tsx',
    'components/coverage/RiskProfileWizard.tsx',
    'components/account/TokenUsageCard.tsx',
]

function titleCaseGreek(src: string): string[] {
    const offenders: string[] = []
    for (const m of src.matchAll(/(['"`])((?:[^\\]|\\.)*?)\1/g)) {
        const val = m[2]
        if (!/[Ά-ώ]/.test(val)) continue
        if (/[[\]{}<>=]|\/\//.test(val)) continue // skip code-looking literals
        let atStart = true
        for (const tok of val.split(/\s+/)) {
            const core = tok.replace(/^[«"'(]+|[»"')]+$/g, '')
            if (!atStart && core.length > 2 && GU.includes(core[0]) && !PROPER.has(core) && core !== core.toUpperCase()) {
                offenders.push(val.slice(0, 50))
                break
            }
            atStart = RESTARTS.some((r) => tok.endsWith(r))
        }
    }
    return offenders
}

describe('core B2C coverage/account components use sentence-case Greek', () => {
    for (const f of FILES) {
        it(f, () => {
            expect(titleCaseGreek(readFileSync(f, 'utf-8')), `Title Case in ${f}`).toEqual([])
        })
    }
})
