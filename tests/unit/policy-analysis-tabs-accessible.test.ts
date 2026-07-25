import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The policy-detail PolicyAnalysisTabs "Analysis / Insights" toggle was two bare
 * <button>s — no role tab/tablist, no aria-selected, no tab↔panel relationship.
 * Refactored to the shared useTabs hook, matching CoverageTabView and
 * ClientDetailView (role tablist/tab, aria-selected, aria-controls, roving
 * tabindex + arrow keys, role="tabpanel" body). The insights tab keeps its
 * disabled state when there's no ACORD data.
 */
const SRC = readFileSync('app/(protected)/wallet/[id]/PolicyAnalysisTabs.tsx', 'utf-8')

describe('PolicyAnalysisTabs has real, accessible tab semantics', () => {
    it('uses useTabs, a labelled tablist, tabProps and panelProps', () => {
        expect(SRC).toContain('useTabs(')
        expect(SRC).toMatch(/role="tablist"/)
        expect(SRC).toMatch(/aria-label=\{t\.wallet\.analysisTabsLabel\}/)
        expect(SRC).toContain("{...tabProps('gaps')}")
        expect(SRC).toContain("{...tabProps('insights')}")
        expect(SRC).toContain('{...panelProps}')
    })

    it('no longer wires the tabs as bare onClick buttons', () => {
        expect(SRC).not.toMatch(/onClick=\{\(\) => setActiveTab\(/)
    })
})
