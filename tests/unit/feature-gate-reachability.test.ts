import { describe, it, expect } from 'vitest'
import { readFileSync, globSync } from 'node:fs'
import { FEATURE_GATES } from '@/lib/monetization/feature-gates'
import { UPGRADE_COPY_EN } from '@/lib/monetization/upgrade-copy.en'
import { UPGRADE_COPY_EL } from '@/lib/monetization/upgrade-copy.el'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * The capability is real and currently runs for everyone; whether the finding
 * should sit behind a plan is a pricing decision, not a cleanup, so the unused
 * gate stays and is declared here rather than silently tolerated.
 */
const KNOWN_UNGATED = new Set(['duplicate_coverage_detection'])

/**
 * `family_portfolio` was a gate with full sales copy — "See and organize your
 * whole family's policies together", four benefits, a primary CTA reading
 * "Enable family portfolio", priced at Pro — and nothing implemented it. No page
 * gated on it, no component offered it, no plan granted it.
 *
 * It was unreachable, so it was never shown; a single
 * `<UpgradePrompt featureKey="family_portfolio">` would have rendered a paid
 * promise for a feature that does not exist. This is the guard that stops the
 * next one being added.
 */
describe('every paid feature the product gates is a feature it has', () => {
    const keys = Object.keys(FEATURE_GATES)

    it('has gates to check', () => {
        expect(keys.length).toBeGreaterThanOrEqual(10)
    })

    it('every gate is applied by some surface', () => {
        const sources = [
            ...globSync('lib/**/*.ts'),
            ...globSync('app/**/*.ts'),
            ...globSync('app/**/*.tsx'),
            ...globSync('components/**/*.tsx'),
        ]
            .filter((f) => !f.includes('feature-gates.ts') && !f.includes('upgrade-copy'))
            .map((f) => strip(readFileSync(f, 'utf-8')))
            .join('\n')

        const unreachable = keys.filter(
            (k) => !KNOWN_UNGATED.has(k) && !sources.includes(`"${k}"`) && !sources.includes(`'${k}'`)
        )
        expect(unreachable, `gates nothing applies:\n${unreachable.join('\n')}`).toEqual([])
    })

    it('family_portfolio is gone from the gates and from both copy files', () => {
        expect(keys).not.toContain('family_portfolio')
        expect(Object.keys(UPGRADE_COPY_EN)).not.toContain('family_portfolio')
        expect(Object.keys(UPGRADE_COPY_EL)).not.toContain('family_portfolio')
    })

    it('every remaining gate has upgrade copy in both languages', () => {
        for (const key of keys) {
            expect(UPGRADE_COPY_EN[key as keyof typeof UPGRADE_COPY_EN], `en copy for ${key}`).toBeTruthy()
            expect(UPGRADE_COPY_EL[key as keyof typeof UPGRADE_COPY_EL], `el copy for ${key}`).toBeTruthy()
        }
    })

    it('and no copy advertises a feature with no gate behind it', () => {
        const orphanCopy = Object.keys(UPGRADE_COPY_EN).filter((k) => !keys.includes(k))
        expect(orphanCopy, `sales copy with no gate:\n${orphanCopy.join('\n')}`).toEqual([])
    })
})
