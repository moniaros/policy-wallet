import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { el } from '@/lib/i18n/translations/el'
import { en } from '@/lib/i18n/translations/en'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const ROUTE = strip(readFileSync('app/api/v1/customers/bulk-import/route.ts', 'utf-8'))
const MODAL = strip(readFileSync('components/agent/BulkImportModal.tsx', 'utf-8'))

/**
 * The route knows exactly why an import was refused — the plan's row limit, the
 * customer limit, or how many slots remain — and returns it with the numbers.
 * The modal did `if (!response.ok) throw new Error('Import failed')`, discarding
 * all of it, and showed a generic toast. The agent was told the import failed
 * with no reason, and no way to learn that splitting the file or upgrading would
 * fix it. Every one of those messages was engineered and then thrown away.
 *
 * The messages were also hardcoded English on a Greek-default surface, which is
 * why the fix is a code plus details rather than server prose.
 */
describe('a refused import tells the agent why', () => {
    it('the route returns a distinct code per reason', () => {
        for (const code of [
            'BULK_IMPORT_ROW_LIMIT',
            'CUSTOMER_LIMIT_REACHED',
            'CUSTOMER_HEADROOM_EXCEEDED',
        ]) {
            expect(ROUTE, code).toContain(`"${code}"`)
        }
        // A bare FORBIDDEN cannot be localised into a specific reason.
        expect(ROUTE).not.toMatch(/"FORBIDDEN",\s*\n\s*`Bulk import limited/)
    })

    it('and carries the numbers as structured details', () => {
        expect(ROUTE).toMatch(/\{ limit: bulkLimit, submitted: customers\.length \}/)
        expect(ROUTE).toMatch(/\{ current: customerCheck\.current, limit: customerCheck\.limit \}/)
        expect(ROUTE).toMatch(/adding: newCount, headroom:/)
    })

    it('the modal reads the body instead of throwing it away', () => {
        expect(MODAL).not.toMatch(/throw new Error\('Import failed'\)/)
        expect(MODAL).toMatch(/await response\.json\(\)\.catch\(\(\) => null\)/)
        expect(MODAL).toMatch(/toast\.error\(limitMessage\(body\?\.error\)\)/)
    })

    it('every code maps to copy in both languages', () => {
        for (const key of ['bulkImportRowLimit', 'customerLimitReached', 'customerHeadroomExceeded'] as const) {
            expect(el.apiErrors[key], `el.${key}`).toBeTruthy()
            expect(en.apiErrors[key], `en.${key}`).toBeTruthy()
        }
    })

    it('the copy interpolates the numbers the route sends', () => {
        expect(el.apiErrors.bulkImportRowLimit).toMatch(/\{limit\}/)
        expect(el.apiErrors.bulkImportRowLimit).toMatch(/\{submitted\}/)
        expect(en.apiErrors.customerHeadroomExceeded).toMatch(/\{adding\}/)
        expect(en.apiErrors.customerHeadroomExceeded).toMatch(/\{headroom\}/)
    })

    it('falls back to the generic message for an unknown code', () => {
        expect(MODAL).toMatch(/default:\s*\n\s*return t\.apiErrors\.generic/)
    })
})
