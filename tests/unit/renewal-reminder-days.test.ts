import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { daysLeftPhrase, renewalTaskState } from '@/lib/services/renewal.service'

const SERVICE = readFileSync('lib/services/renewal.service.ts', 'utf-8')
    // Strip comments — several of these assertions match on identifiers that
    // also appear in the prose explaining them.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')

/**
 * RENEWAL_MILESTONES is a LEDGER — which rung of the ladder has already been
 * sent — not the answer to "when does my policy expire". The reminder quoted the
 * rung.
 *
 * They coincide only for a policy that has sat in the product since before the
 * 90-day mark, under a cron that has not missed a day. They diverge for every
 * policy uploaded inside the window, which is most of them: people upload the
 * policy they just received, or the one they are worried about. Worst case is
 * the free plan, whose ladder is the single 30-day rung — a policy uploaded
 * three days before expiry produced exactly one email, titled "Your policy
 * expires in 30 days", over a body naming a date three days out.
 */
describe('renewal reminders quote days left, not the milestone rung', () => {
    it('sends the policyholder reminder the real day count', () => {
        expect(SERVICE).toMatch(/sendPolicyholderReminder\(policy, daysUntilExpiry, isEl\)/)
        expect(SERVICE).not.toMatch(/sendPolicyholderReminder\(policy, milestone/)
    })

    it('sends the agent notification the real day count', () => {
        expect(SERVICE).toMatch(/sendAgentRenewalNotification\(\s*visibleAgentUserId,\s*policy,\s*daysUntilExpiry,/)
    })

    it('still records the milestone rung so the ladder cannot repeat itself', () => {
        expect(SERVICE).toMatch(/updatedReminders\.push\(\{ milestone, sentAt/)
    })
})

describe('the day-count phrase reads correctly at every value it can take', () => {
    it('does not say "in 1 days"', () => {
        expect(daysLeftPhrase(1, false)).toBe('expires tomorrow')
        expect(daysLeftPhrase(1, true)).toBe('λήγει αύριο')
    })

    it('does not say "in 0 days" on the last day of cover', () => {
        expect(daysLeftPhrase(0, false)).toBe('expires today')
        expect(daysLeftPhrase(0, true)).toBe('λήγει σήμερα')
    })

    it('reads naturally at the milestone values', () => {
        expect(daysLeftPhrase(7, false)).toBe('expires in 7 days')
        expect(daysLeftPhrase(30, true)).toBe('λήγει σε 30 ημέρες')
    })

    it('never emits a negative count', () => {
        expect(daysLeftPhrase(-3, false)).toBe('expires today')
        expect(daysLeftPhrase(-3, true)).toBe('λήγει σήμερα')
    })
})

/**
 * The task's countdown and priority were written once, at first detection, and
 * never revisited — so a renewal task opened at 88 days out still read "expires
 * in 88 days · low" on the day the cover lapsed. The one task on the agent's
 * list that most needed to rise to the top was the one guaranteed to stay at the
 * bottom.
 */
describe('the agent renewal task ages with the policy', () => {
    const policy = { policyNumber: 'P-1' }

    it('escalates priority as expiry approaches', () => {
        expect(renewalTaskState(policy, 88).priority).toBe('low')
        expect(renewalTaskState(policy, 30).priority).toBe('medium')
        expect(renewalTaskState(policy, 15).priority).toBe('high')
        expect(renewalTaskState(policy, 1).priority).toBe('high')
    })

    it('restates the countdown rather than repeating the first one', () => {
        expect(renewalTaskState(policy, 88).description).toMatch(/expires in 88 days/)
        expect(renewalTaskState(policy, 2).description).toMatch(/expires in 2 days/)
        expect(renewalTaskState(policy, 0).description).toMatch(/expires today/)
    })

    it('refreshes the open task on runs where no milestone fires', () => {
        expect(SERVICE).toMatch(/if \(milestonesToSend\.length === 0\) \{[\s\S]{0,400}refreshAgentRenewalTask\(/)
    })
})

/**
 * lib/i18n/format.ts pins Europe/Athens precisely because a bare
 * toLocaleDateString resolves against the RUNTIME zone — UTC on Vercel. These
 * emails bypassed it, so a policy ending at Athens midnight was emailed with the
 * previous day's date while the wallet showed the correct one.
 */
describe('renewal emails date policies in the same zone the app does', () => {
    it('uses the shared formatter', () => {
        expect(SERVICE).toMatch(/import \{ formatDate \} from "@\/lib\/i18n\/format"/)
        expect(SERVICE).toMatch(/formatDate\(policy\.endDate, isEl \? "el" : "en"\)/)
        expect(SERVICE).toMatch(/formatDate\(policy\.endDate, "en"\)/)
    })

    it('has no unpinned toLocaleDateString left', () => {
        expect(SERVICE).not.toMatch(/toLocaleDateString/)
    })
})
