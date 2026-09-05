import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The savings/branded report is a client-facing (and agent-branded) insurance
 * document with a `language` param, but ~90% of it was hardcoded English — a
 * Greek advisor handed a Greek client a report reading "Coverage Snapshot /
 * Covered / Not Covered / Exclusions" in English. It also leaked the raw
 * lineOfBusiness code and raw severity enum, and hardcoded €.
 *
 * The generator is a .ts template literal (lint:i18n-changed doesn't see it), so
 * this pins it: every heading/label position must interpolate (start with `${`),
 * never a bare English word.
 */
const SRC = readFileSync('lib/services/reports/savings-report.ts', 'utf-8')

describe('savings/branded report is fully localised', () => {
    it('no heading (<h1|2|3>) begins with a bare English word', () => {
        const bare = [...SRC.matchAll(/<h[1-3]>([A-Za-z][^${<]*)/g)].map((m) => m[1].trim())
        expect(bare, `hardcoded English headings:\n${bare.join('\n')}`).toEqual([])
    })

    it('no meta-label begins with a bare English word', () => {
        const bare = [...SRC.matchAll(/class="meta-label">([A-Za-z][^${<]*)/g)].map((m) => m[1].trim())
        expect(bare, `hardcoded English meta-labels:\n${bare.join('\n')}`).toEqual([])
    })

    it('the Type field resolves lineOfBusiness to a label, and no severity word is printed (B1)', () => {
        expect(SRC).toContain('normalizeBranch(metadata.lineOfBusiness).label[language]')
        expect(SRC).not.toMatch(/gapSeverityLabel|badge-\$\{g\.severity/)
        // Premium goes through formatCurrency, not a hardcoded € literal.
        expect(SRC).not.toMatch(/€\$\{Number\(metadata\.premiumAmount\)/)
    })

    it('the <html lang> attribute follows the report language', () => {
        expect(SRC).toContain('<html lang="${language}">')
    })
})
