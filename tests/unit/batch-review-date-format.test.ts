import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { formatPolicyDate } from '@/lib/wallet/policy-detail'

/**
 * The batch-upload review card formatted the premium (formatCurrencyFull) but
 * rendered the extracted start/end dates RAW — so an advisor reviewing an upload
 * saw a formatted "€1.234,00" next to a raw "2024-06-15T00:00:00.000Z". Dates now
 * go through formatPolicyDate, the same helper the policy-detail page uses.
 */
describe('batch-upload review formats extracted dates', () => {
    it('formatPolicyDate localises the extraction date formats, "-" when unparseable', () => {
        expect(formatPolicyDate('2024-06-15', 'en-GB')).toMatch(/15\/06\/2024/)
        expect(formatPolicyDate('2024-06-15T00:00:00.000Z', 'en-GB')).toMatch(/\d{2}\/\d{2}\/2024/)
        expect(formatPolicyDate('15-06-2024', 'en-GB')).toMatch(/15\/06\/2024/)
        expect(formatPolicyDate('', 'en-GB')).toBe('-')
        expect(formatPolicyDate('not a date', 'en-GB')).toBe('-')
    })

    it('the batch review routes dates through formatPolicyDate, not raw', () => {
        const src = readFileSync('components/wallet/BatchUploadModal.tsx', 'utf-8')
        expect(src).not.toMatch(/\{policy\.data\.startDate\}\s*→\s*\{policy\.data\.endDate\}/)
        expect(src).toContain('formatPolicyDate(policy.data.startDate')
        expect(src).toContain('formatPolicyDate(policy.data.endDate')
    })
})
