import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The CoverageTabView "What's covered" / "What's not covered" toggle was two bare
 * <button>s: a screen reader announced them as unrelated buttons with no selected
 * state and no tab/panel relationship. It now uses the shared useTabs hook (role
 * tablist/tab, aria-selected, aria-controls, roving tabindex + arrow keys) and a
 * role="tabpanel" body — matching ClientDetailView's accessible tabs.
 */
const SRC = readFileSync('components/wallet/coverage-details/CoverageTabView.tsx', 'utf-8')

describe('CoverageTabView has real, accessible tab semantics', () => {
    it('uses the shared useTabs hook and a labelled tablist', () => {
        expect(SRC).toContain('useTabs(')
        expect(SRC).toMatch(/role="tablist"/)
        expect(SRC).toMatch(/aria-label=\{copy\.coverageTabsLabel\}/)
    })

    it('the tab buttons get tabProps and the body gets panelProps', () => {
        expect(SRC).toContain('{...tabProps("covered")}')
        expect(SRC).toContain('{...tabProps("not_covered")}')
        expect(SRC).toContain('{...panelProps}')
    })

    it('no longer wires the tabs as bare onClick buttons', () => {
        expect(SRC).not.toMatch(/onClick=\{\(\) => setActiveTab\(/)
    })
})
