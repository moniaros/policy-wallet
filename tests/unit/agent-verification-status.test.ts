import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { isAgentVerified, isAgentRejected } from '@/lib/agent/verification'

/**
 * The agent "Verified" trust mark broke on a one-word enum drift: the admin
 * review action WRITES verificationStatus "approved", but every customer- and
 * agent-facing surface compared against "verified" — a value nothing writes. So
 * an approved intermediary (approval email and all) never showed as verified on
 * their portal, their settings card, or the public AgentCard a policyholder sees.
 *
 * These pin the reader to the writer so they can never disagree again.
 */
describe('agent verification: readers accept exactly what the writer writes', () => {
    it('isAgentVerified is true only for approved (and legacy "verified")', () => {
        expect(isAgentVerified('approved')).toBe(true)
        expect(isAgentVerified('verified')).toBe(true) // tolerated legacy value
        expect(isAgentVerified('pending')).toBe(false)
        expect(isAgentVerified('rejected')).toBe(false)
        expect(isAgentVerified(null)).toBe(false)
        expect(isAgentVerified(undefined)).toBe(false)
        expect(isAgentVerified('')).toBe(false)
    })

    it('isAgentRejected separates a reviewed-and-declined agent from a pending one', () => {
        expect(isAgentRejected('rejected')).toBe(true)
        expect(isAgentRejected('pending')).toBe(false)
        expect(isAgentRejected('approved')).toBe(false)
    })

    it('the string the admin APPROVE path writes is accepted by isAgentVerified', () => {
        const admin = readFileSync('app/(protected)/admin/actions.ts', 'utf-8')
        // Whatever literal the approve write uses, the trust-mark readers must treat
        // it as verified — extract it from the source next to the APPROVE_AGENT log.
        const approve = admin.match(/verificationStatus:\s*["'](\w+)["'][\s\S]{0,600}?APPROVE_AGENT/)
        expect(approve, 'could not locate the APPROVE_AGENT write in admin/actions.ts').toBeTruthy()
        const writtenOnApproval = approve![1]
        expect(
            isAgentVerified(writtenOnApproval),
            `admin writes verificationStatus "${writtenOnApproval}" on approval but isAgentVerified rejects it`,
        ).toBe(true)
    })

    it('the string the admin REJECT path writes is NOT read as verified', () => {
        const admin = readFileSync('app/(protected)/admin/actions.ts', 'utf-8')
        const reject = admin.match(/verificationStatus:\s*["'](\w+)["'][\s\S]{0,600}?REJECT_AGENT|rejectAgent[\s\S]{0,600}?verificationStatus:\s*["'](\w+)["']/)
        expect(reject, 'could not locate the reject write in admin/actions.ts').toBeTruthy()
        const writtenOnReject = reject![1] || reject![2]
        expect(isAgentVerified(writtenOnReject)).toBe(false)
    })

    it('no customer/agent-facing surface compares verificationStatus to a raw string', () => {
        const files = [
            ...globSync('app/**/*.tsx'),
            ...globSync('components/**/*.tsx'),
        ].filter((f) => !f.includes('.test.') && !f.includes('/admin/')) // the admin console renders all three states by design

        const offenders: string[] = []
        for (const file of files) {
            readFileSync(file, 'utf-8').split('\n').forEach((line, i) => {
                if (/verificationStatus\s*===/.test(line)) offenders.push(`${file}:${i + 1}  ${line.trim()}`)
            })
        }
        expect(files.length).toBeGreaterThan(50) // sanity: the glob matched
        expect(
            offenders,
            `use isAgentVerified/isAgentRejected, not a raw verificationStatus comparison:\n${offenders.join('\n')}`,
        ).toEqual([])
    })
})
