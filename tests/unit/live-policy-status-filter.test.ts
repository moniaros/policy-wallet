import { describe, it, expect } from 'vitest'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import { NON_LIVE_POLICY_STATUSES } from '@/lib/policy-status'

/**
 * The single source of truth for "which Policy.status values are NOT a live
 * policy". Three outbound-email queries (renewal cron, weekly digest, churn
 * day-7) each hand-wrote `status: "active"`, which silently dropped in-force
 * policies stored as 'expiring_soon' / 'action_needed' / 'incomplete' — a policy
 * literally marked "expiring_soon" got no renewal reminder. They now share this
 * one list so they cannot drift apart again.
 */
describe('NON_LIVE_POLICY_STATUSES', () => {
    it('excludes exactly the non-policy states', () => {
        expect([...NON_LIVE_POLICY_STATUSES].sort()).toEqual(['analyzing', 'cancelled', 'deleted'])
    })

    it('does NOT exclude any in-force or pending-review state', () => {
        const excluded = new Set<string>(NON_LIVE_POLICY_STATUSES)
        for (const live of ['active', 'expiring_soon', 'action_needed', 'incomplete']) {
            expect(excluded.has(live)).toBe(false)
        }
    })
})

/**
 * Regression net: the three "does this owner have a live policy expiring soon"
 * services must not reintroduce `status: "active"` on a db.policy query. This
 * class has bitten three times; the net stops the fourth.
 */
describe('no expiring-policy query regresses to status: "active"', () => {
    const FILES = [
        'lib/services/renewal.service.ts',
        'lib/services/weekly-digest.service.ts',
        'lib/services/churn-prevention.service.ts',
        // Fourth bite of the class, found by P1-02: the day-7 drip counted
        // exactly-'active' policies for its coverage-snapshot tile.
        'lib/services/engagement-drip.service.ts',
    ]

    it('each uses the shared NON_LIVE_POLICY_STATUSES filter', () => {
        for (const file of FILES) {
            const src = readFileSync(file, 'utf-8')
            expect(src, `${file} should import the shared filter`).toMatch(/NON_LIVE_POLICY_STATUSES/)
        }
    })

    it('none filters a db.policy query on status: "active"', () => {
        for (const file of FILES) {
            const src = readFileSync(file, 'utf-8')
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/^\s*\/\/.*$/gm, '')
            // The bug shape: a Policy where-clause requiring exactly 'active'.
            // (Subscription/grant/relationship 'active' filters live in other files.)
            expect(src, `${file} reintroduced status: "active" on a policy query`)
                .not.toMatch(/status:\s*["']active["']/)
        }
    })
})
