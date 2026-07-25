import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The wallet PolicyTable rendered the renewal/end date with a raw
 * toLocaleDateString({ timeZone: 'UTC' }), while the days-left count in the SAME
 * row is computed in Athens (resolvePolicyLifecycle) — so for a policy ending at
 * Athens midnight the UTC date showed the previous day and could disagree with
 * the day count. It now uses the shared Athens-pinned formatDate. Separately, the
 * column headers lacked scope="col" (data-table screen-reader navigation).
 */
const SRC = readFileSync('components/wallet/PolicyTable.tsx', 'utf-8')

describe('PolicyTable renewal date + header accessibility', () => {
    it('renders the renewal date via the Athens-pinned formatDate, not a raw UTC toLocaleDateString', () => {
        expect(SRC).toMatch(/formatDate\(view\.endDate, lang\)/)
        expect(SRC).not.toMatch(/toLocaleDateString\([^)]*timeZone:\s*'UTC'/)
    })

    it('column headers carry scope="col"', () => {
        // Every <th> in the header row is a column header.
        const ths = SRC.match(/<th\b[^>]*>/g) ?? []
        expect(ths.length).toBeGreaterThanOrEqual(6)
        const withoutScope = ths.filter((th) => !/scope="col"/.test(th))
        expect(withoutScope, `<th> without scope="col": ${withoutScope.join(' , ')}`).toEqual([])
    })
})
