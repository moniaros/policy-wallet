import { describe, it, expect } from 'vitest'
import { readFileSync, globSync } from 'node:fs'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const ACTIONS = strip(readFileSync('app/(protected)/admin/actions.ts', 'utf-8'))
const PAGE = strip(readFileSync('app/(protected)/admin/activity/page.tsx', 'utf-8'))
const GUARD = strip(readFileSync('lib/admin/admin-guard.ts', 'utf-8'))

/**
 * ActivityLog carries two different things under one schema. Its columns are
 * named for administrators — `adminUserId`, `adminEmail` — but most rows are
 * ordinary USER events: every AI question asked, every policy analysed,
 * uploaded, shared or deleted, every login.
 *
 * `getActivityLogs` had no filter, so /admin/activity — headed "Admin Activity
 * Log" and captioned "Every admin action" — was buried under customer activity
 * at 25 rows a page. A role change, a break-glass access or a refund was
 * effectively unfindable, which is precisely what that log exists to evidence.
 */
describe('the admin activity log shows administrator actions', () => {
    it('logAdminAction stamps the discriminator, and nothing else writes it', () => {
        expect(GUARD).toMatch(/_audit: \{/)
        const others = [...globSync('lib/**/*.ts'), ...globSync('app/**/*.ts')]
            .filter((f) => !f.endsWith('lib/admin/admin-guard.ts'))
            .filter((f) => /_audit:/.test(strip(readFileSync(f, 'utf-8'))))
        expect(others, `_audit written outside logAdminAction:\n${others.join('\n')}`).toEqual([])
    })

    it('the query filters on it by default', () => {
        expect(ACTIONS).toMatch(/scope: "admin" \| "all" = "admin"/)
        expect(ACTIONS).toMatch(/path: \["_audit"\], not: Prisma\.DbNull/)
    })

    it('counts the same set it lists', () => {
        // A count over everything beside a filtered list would misreport the
        // total on every page.
        expect(ACTIONS).toMatch(/db\.activityLog\.count\(\{ where: where as any \}\)/)
    })

    it('the page can still show everything, deliberately', () => {
        expect(PAGE).toMatch(/scopeParam === "all" \? "all" : "admin"/)
        expect(PAGE).toMatch(/\/admin\/activity\?scope=all/)
    })

    it('and its heading matches what it is showing', () => {
        expect(PAGE).toMatch(/scope === "admin" \? "Admin Activity Log" : "All Activity"/)
        expect(PAGE).not.toMatch(/Every admin action, most recent first/)
    })
})

/**
 * CLAUDE.md bans substring matching on the comma-separated roles string; it
 * matches any role that merely CONTAINS "admin".
 */
describe('the admin route checks roles properly', () => {
    it('uses hasAnyRole, not String#includes', () => {
        expect(PAGE).toMatch(/hasAnyRole\(dbUser\.roles, \["admin"\]\)/)
        expect(PAGE).not.toMatch(/roles\.includes\("admin"\)/)
    })
})
