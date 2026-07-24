import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { getLegalContent } from '@/lib/legal/legal-content'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const JOB = strip(readFileSync('app/api/v1/jobs/privacy-retention/route.ts', 'utf-8'))

/**
 * The privacy policy publishes two different retention lines: accountability
 * records — consents and GDPR requests — at five years, and technical logs at
 * "up to 12 months" / «Έως 12 μήνες».
 *
 * ActivityLog holds both kinds. Administrator actions are accountability
 * records; the rest is ordinary user activity — AI questions, logins, uploads,
 * analyses — which is a technical log by any reading. The sweep applied the
 * five-year line to the whole table, so customer usage logs were kept for five
 * years while the policy told those customers twelve months.
 */
describe('the retention sweep matches what the policy publishes', () => {
    it('the policy really does state both lines', () => {
        const el = JSON.stringify(getLegalContent('el'))
        const en = JSON.stringify(getLegalContent('en'))
        expect(el).toMatch(/Έως 12 μήνες/)
        expect(en).toMatch(/Up to 12 months/)
        expect(el).toMatch(/5 έτη από την ανάκληση/)
        expect(en).toMatch(/5 years from revocation/)
    })

    it('administrator actions keep the five-year accountability period', () => {
        expect(JOB).toMatch(/ADMIN_AUDIT_RETENTION_DAYS = 5 \* 365/)
        expect(JOB).toMatch(/timestamp: \{ lte: adminAuditCutoff \}[\s\S]{0,80}path: \["_audit"\], not: Prisma\.DbNull/)
    })

    it('user activity follows the twelve-month technical-log line', () => {
        expect(JOB).toMatch(/USER_ACTIVITY_RETENTION_DAYS = 365/)
        expect(JOB).toMatch(/timestamp: \{ lte: userActivityCutoff \}[\s\S]{0,80}path: \["_audit"\], equals: Prisma\.DbNull/)
    })

    it('no longer purges the whole table on one clock', () => {
        expect(JOB).not.toMatch(/ACTIVITY_LOG_RETENTION_DAYS/)
        expect(JOB).not.toMatch(/where: \{ timestamp: \{ lte: activityLogCutoff \} \}/)
    })

    it('reports the two sweeps separately, so the split is observable', () => {
        expect(JOB).toMatch(/purged_admin_audit_logs/)
        expect(JOB).toMatch(/purged_user_activity_logs/)
    })

    it('the twelve-month floor cannot break the usage meters', () => {
        // They count over day and month windows — see startOfAthensDay /
        // startOfAthensMonth in the metered paths.
        const wallet = strip(readFileSync('app/(protected)/wallet/actions.ts', 'utf-8'))
        expect(wallet).toMatch(/startOfAthensDay\(new Date\(\)\)/)
        expect(wallet).toMatch(/startOfAthensMonth\(new Date\(\)\)/)
    })
})
