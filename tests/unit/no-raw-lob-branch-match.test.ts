import { describe, it, expect } from 'vitest'
import { readFileSync, globSync } from 'node:fs'

/**
 * The branchFamilyId class, guarded from regression.
 *
 * A policy's lineOfBusiness can be a CHILD branch (motorbike/truck → motor,
 * renters → home, income_protection/disability/personal_accident → life). Matching
 * it with RAW equality — either against a parent-branch string literal, or against
 * another record's raw lineOfBusiness — silently mishandles those children. This
 * session fixed it in the gap engine, protection score, cross-sell, coverage
 * panels, the comparison, commission, and the related-recommendations filter.
 *
 * Every one of those was a comparison that should have gone through branchFamilyId.
 * This asserts none creeps back into the app/service code: any `lineOfBusiness ===`
 * whose right-hand side is a parent-branch literal or another `.lineOfBusiness`
 * must instead compare branch families.
 */
const PARENT_BRANCHES = ['motor', 'home', 'life', 'business']

describe('branch matching goes through branchFamilyId, never raw lineOfBusiness', () => {
    it('no raw lineOfBusiness equality against a parent branch or another line', () => {
        const files = [
            ...globSync('app/**/*.ts'),
            ...globSync('app/**/*.tsx'),
            ...globSync('components/**/*.ts'),
            ...globSync('components/**/*.tsx'),
            ...globSync('lib/services/**/*.ts'),
        ].filter((f) => !f.includes('.test.'))

        const offenders: string[] = []
        for (const file of files) {
            const src = readFileSync(file, 'utf-8')
            const lines = src.split('\n')
            lines.forEach((line, i) => {
                const stripped = line.replace(/\/\/.*$/, '')
                // A lineOfBusiness equality on this line…
                if (!/lineOfBusiness\s*===|===\s*[^\n]*lineOfBusiness/.test(stripped)) return
                // …that already routes through the resolver is fine.
                if (/branchFamilyId|normalizeBranch/.test(stripped)) return
                // Flag only when the comparison is against a PARENT-branch literal
                // or another `.lineOfBusiness` (the child-branch-unsafe shapes).
                const againstParentLiteral = PARENT_BRANCHES.some(
                    (b) => new RegExp(`lineOfBusiness\\s*===\\s*['"\`]${b}['"\`]|['"\`]${b}['"\`]\\s*===\\s*[^\\n]*lineOfBusiness`).test(stripped),
                )
                const againstAnotherLine = /lineOfBusiness\s*===\s*[A-Za-z_$][\w$.]*\.lineOfBusiness/.test(stripped)
                if (againstParentLiteral || againstAnotherLine) {
                    offenders.push(`${file}:${i + 1}  ${line.trim()}`)
                }
            })
        }

        expect(files.length).toBeGreaterThan(50) // sanity: the glob matched
        expect(
            offenders,
            `raw lineOfBusiness branch comparisons (use branchFamilyId on both sides):\n${offenders.join('\n')}`,
        ).toEqual([])
    })
})
