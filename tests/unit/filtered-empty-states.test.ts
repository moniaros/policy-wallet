import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

const tab = readFileSync('components/agent/tabs/ClientPoliciesTab.tsx', 'utf-8')

/**
 * "This client has no policies" and "your filters match nothing" are different
 * states needing different responses, and only the first was handled.
 *
 * Both filter dropdowns list only values present in the data, which is why this
 * looks safe at a glance — but they COMBINE. A client holding an active motor
 * policy and an expired health one offers type ∈ {motor, health} and status ∈
 * {active, expired}; picking motor + expired matches nothing. The agent got a
 * blank strip under the filters with no explanation and no way back.
 *
 * Reproduced in the browser against two seeded policies before fixing: 2 rows
 * unfiltered → 0 rows on motor+expired → message shown → 2 rows after clearing.
 */
describe('a filter combination that matches nothing explains itself', () => {
    it('branches on the filtered list, not only the source list', () => {
        expect(tab).toMatch(/policies\.length === 0/)          // no policies at all
        expect(tab).toMatch(/filteredPolicies\.length === 0/)  // filters match nothing
    })

    it('offers a way out of the dead end', () => {
        expect(tab).toMatch(/setFilterLob\(null\); setFilterStatus\(null\)/)
        expect(tab).toMatch(/t\.emptyStates\.clearFilters/)
    })

    it('has the copy in both languages', () => {
        expect(el.emptyStates.clientPolicies.noFilterMatch).toBeTruthy()
        expect(en.emptyStates.clientPolicies.noFilterMatch).toBeTruthy()
        expect(el.emptyStates.clientPolicies.noFilterMatch).toMatch(/[Ͱ-Ͽ]/)
        // Reuses the existing shared key rather than adding a nested duplicate.
        expect(el.emptyStates.clearFilters).toBeTruthy()
    })

    it('does not reuse the no-policies copy for the no-match case', () => {
        // They call for different actions: upload a policy vs clear a filter.
        expect(el.emptyStates.clientPolicies.noFilterMatch)
            .not.toEqual(el.emptyStates.clientPolicies.headline)
    })
})
