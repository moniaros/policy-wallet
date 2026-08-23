import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { daysLeftPhrase, renewalTaskState, selectRenewalReminder } from '@/lib/services/renewal.service'

const RENEWAL_MILESTONES = [90, 60, 30, 15, 7] as const

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

    it('records EVERY reached milestone, so the ladder cannot drip one email per day', () => {
        // Was: push only the mailed milestone. That left higher un-sent rungs to
        // fire on subsequent days. The fix marks all reached rungs in one send.
        expect(SERVICE).toMatch(/for \(const m of milestonesToSend\)/)
    })
})

/**
 * The milestone ledger, tested behaviourally over a daily cadence — the bug was
 * invisible in a single run and only showed across consecutive days.
 */
describe('a policy first seen inside the window does not get a daily reminder', () => {
    // Drive the pure selector day by day, exactly as the cron would.
    const runLadder = (startDay: number, allowed: readonly number[] = RENEWAL_MILESTONES) => {
        const sent: number[] = []
        const mailedOnDays: number[] = []
        for (let day = startDay; day >= 0; day--) {
            const { mail, mark } = selectRenewalReminder(day, allowed, sent)
            if (mail !== null) mailedOnDays.push(day)
            sent.push(...mark)
        }
        return mailedOnDays
    }

    it('mails a policy uploaded 8 days out at most twice, not five days running', () => {
        const days = runLadder(8)
        // Before the fix: [8,7,6,5,4] — one email per day draining 15,7,30,60,90.
        expect(days).toEqual([8, 7])
    })

    it('follows a clean ladder for a policy uploaded at 45 days', () => {
        // 45 covers 90+60 in one send, then 30, 15, 7 fire as crossed.
        expect(runLadder(45)).toEqual([45, 30, 15, 7])
    })

    it('gives a full-window policy the whole ladder', () => {
        expect(runLadder(95)).toEqual([90, 60, 30, 15, 7])
    })

    it('never mails the same day twice and never repeats a rung', () => {
        for (const start of [7, 8, 15, 30, 60, 90, 95]) {
            const days = runLadder(start)
            expect(new Set(days).size).toBe(days.length) // no duplicate days
        }
    })

    it('honours the free-tier single 30-day rung without daily repeats', () => {
        // Free ladder is [30]; a policy uploaded at 20 days gets exactly one email.
        expect(runLadder(20, [30])).toEqual([20])
        expect(runLadder(45, [30])).toEqual([30])
    })
})

describe('selectRenewalReminder — the ledger primitive', () => {
    it('mails the closest due rung and marks every reached rung', () => {
        // 45 days out, nothing sent: 90 and 60 are both reached.
        const r = selectRenewalReminder(45, RENEWAL_MILESTONES, [])
        expect(r.mail).toBe(60)          // closest of the two
        expect(r.mark).toEqual([90, 60]) // both collapsed into this send
    })

    it('mails nothing when every reached rung is already sent', () => {
        expect(selectRenewalReminder(45, RENEWAL_MILESTONES, [90, 60])).toEqual({ mail: null, mark: [] })
    })

    it('mails nothing beyond the outermost milestone', () => {
        expect(selectRenewalReminder(120, RENEWAL_MILESTONES, [])).toEqual({ mail: null, mark: [] })
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
        // The "nothing to mail today" branch keeps the agent's task countdown
        // current; it is now gated on selectRenewalReminder returning mail === null.
        expect(SERVICE).toMatch(/if \(mailMilestone === null\) \{[\s\S]{0,400}refreshAgentRenewalTask\(/)
    })

    it('selectRenewalReminder returns no mail on a quiet day (what gates that branch)', () => {
        // 50 days out with 90 and 60 already sent, 30 not yet reached → nothing.
        expect(selectRenewalReminder(50, RENEWAL_MILESTONES, [90, 60]).mail).toBeNull()
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
        // Bilingual since P1-05: each arm formats in its own locale, so the
        // date agrees with the wallet in BOTH languages.
        expect(SERVICE).toMatch(/formatDate\(policy\.endDate, "el"\)/)
        expect(SERVICE).toMatch(/formatDate\(policy\.endDate, "en"\)/)
    })

    it('has no unpinned toLocaleDateString left', () => {
        expect(SERVICE).not.toMatch(/toLocaleDateString/)
    })
})
