import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"

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

/** True when this line compares raw lineOfBusiness the child-branch-unsafe way. */
function rawBranchEquality(line: string): boolean {
    const stripped = line.replace(/\/\/.*$/, '')
    // A lineOfBusiness equality on this line…
    if (!/lineOfBusiness\s*===|===\s*[^\n]*lineOfBusiness/.test(stripped)) return false
    // …that already routes through the resolver is fine.
    if (/branchFamilyId|normalizeBranch/.test(stripped)) return false
    // Flag only when the comparison is against a PARENT-branch literal
    // or another `.lineOfBusiness` (the child-branch-unsafe shapes).
    const againstParentLiteral = PARENT_BRANCHES.some(
        (b) => new RegExp(`lineOfBusiness\\s*===\\s*['"\`]${b}['"\`]|['"\`]${b}['"\`]\\s*===\\s*[^\\n]*lineOfBusiness`).test(stripped),
    )
    const againstAnotherLine = /lineOfBusiness\s*===\s*[A-Za-z_$][\w$.]*\.lineOfBusiness/.test(stripped)
    return againstParentLiteral || againstAnotherLine
}

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
            readFileSync(file, 'utf-8').split('\n').forEach((line, i) => {
                if (rawBranchEquality(line)) {
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

/**
 * RED-PROOF (Phase 6 guard audit): the matcher against AUTHENTIC pre-fix
 * comparisons (d1086032 swept exactly these shapes), and the resolved or
 * deliberate shapes that must stay silent.
 */
describe('the equality matcher is proven on authentic sources', () => {
    it('flags the parent-literal and record-to-record comparisons that shipped', () => {
        expect(rawBranchEquality("            if (p.lineOfBusiness === 'motor' && (p.acordData as any)?.vehicle) {")).toBe(true)
        expect(rawBranchEquality("        if (policy.lineOfBusiness === 'home' && policy.acordData?.coverageAmount < 100000) {")).toBe(true)
        expect(rawBranchEquality('const same = a.lineOfBusiness === b.lineOfBusiness')).toBe(true)
    })

    it('stays silent on the resolver, child literals, and commented-out code', () => {
        expect(rawBranchEquality('if (branchFamilyId(p.lineOfBusiness) === branchFamilyId(other.lineOfBusiness)) {')).toBe(false)
        // A CHILD-branch literal is a deliberate exact match, not the bug.
        expect(rawBranchEquality("if (p.lineOfBusiness === 'motorbike') {")).toBe(false)
        // A comment is not code.
        expect(rawBranchEquality("// if (p.lineOfBusiness === 'motor') { — the old shape")).toBe(false)
    })
})
