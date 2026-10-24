/**
 * Every customer-facing statement of WHEN a renewal reminder is sent, composed from the constants
 * the scheduler itself uses (`RENEWAL_MILESTONES`, `BASIC_MILESTONES`, lib/renewals/milestones.ts;
 * the cron is lib/services/renewal.service.ts).
 *
 * Owner decision 2026-10-22 (PW-C02-D16): a reminder offset is never typed. The numbers 90 / 60 / 30 /
 * 15 / 7 / 3 used to be literals in a dozen files; the guard
 * tests/unit/reminder-offsets-from-scheduler.test.ts fails on a literal and ships a probe.
 *
 * What the scheduler really does (renewal.service.ts:84-93, 282-296):
 *   - Free (`notifications` false): ONE email, once the policy is within BASIC days of expiry.
 *     A policy first seen at 10 days gets it at 10 days; it is not sent "on day 30" exactly.
 *   - Plus and Family (`notifications` true): the ladder, one email per rung the policy has reached.
 * The wording below says exactly that.
 */
import { BASIC_MILESTONES, RENEWAL_MILESTONES } from "@/lib/renewals/milestones"

type Bilingual = { el: string; en: string }

const LADDER = [...RENEWAL_MILESTONES]
const LADDER_MAX = Math.max(...LADDER)
const LADDER_MIN = Math.min(...LADDER)
const BASIC = Math.max(...BASIC_MILESTONES)

const joinEl = (xs: number[]) => `${xs.slice(0, -1).join(", ")} και ${xs[xs.length - 1]}`
const joinEn = (xs: number[]) => `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`

/** «από 90 έως 3 ημέρες πριν» */
export const LADDER_RANGE: Bilingual = {
    el: `από ${LADDER_MAX} έως ${LADDER_MIN} ημέρες πριν`,
    en: `from ${LADDER_MAX} to ${LADDER_MIN} days ahead`,
}

/** «στις 90, 60, 30, 15, 7 και 3 ημέρες πριν τη λήξη» */
export const LADDER_LIST: Bilingual = {
    el: `στις ${joinEl(LADDER)} ημέρες πριν τη λήξη`,
    en: `at ${joinEn(LADDER)} days before expiry`,
}

/** «όταν απομένουν έως 30 ημέρες» */
export const BASIC_WHEN: Bilingual = {
    el: `όταν απομένουν έως ${BASIC} ημέρες`,
    en: `once ${BASIC} days or fewer remain`,
}

/** The ladder's first rung, for «από 90 ημέρες πριν». */
export const LADDER_FROM: Bilingual = {
    el: `από ${LADDER_MAX} ημέρες πριν`,
    en: `from ${LADDER_MAX} days ahead`,
}

/** Plan card / table label for the Free reminder. */
export const BASIC_REMINDER_LABEL: Bilingual = {
    el: `Μία υπενθύμιση ανανέωσης (email) ${BASIC_WHEN.el}`,
    en: `One renewal reminder (email) ${BASIC_WHEN.en}`,
}

/** Plan card / table label for the ladder (Plus and Family). */
export const LADDER_LABEL: Bilingual = {
    el: `Υπενθυμίσεις ανανέωσης ${LADDER_RANGE.el} (email)`,
    en: `Renewal reminders ${LADDER_RANGE.en} (email)`,
}
