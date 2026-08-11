import { describe, expect, it } from 'vitest'

import { isDue } from '@/lib/services/compliance/obligation-scan'
import { complianceObligations } from '@/lib/insurance/policy-conditions'
import { NOTIFICATION_EVENTS } from '@/lib/notifications/registry'

/**
 * The reminder window for a condition of cover.
 *
 * The scan itself needs a database, so what is tested here is the decision it
 * makes per obligation — which is where the judgement lives. Two shapes:
 * dated obligations that fall due on an anniversary, and standing ones that
 * have no due date at all and therefore need a cadence rather than a deadline.
 */

const START = new Date('2026-04-30T00:00:00Z')

const annual = complianceObligations([{
    kind: 'maintenance',
    text: 'Να διενεργείται η ετήσια συντήρηση σκάφους και μηχανής',
    recurrence: 'annual',
    breachEffect: 'voids_cover',
}])[0]

const continuous = complianceObligations([{
    kind: 'security_requirement',
    text: 'Συναγερμός συνδεδεμένος με Κέντρο Λήψης Σημάτων',
    recurrence: 'continuous',
    breachEffect: 'voids_cover',
}])[0]

describe('annual obligations — the policy anniversary is the due date', () => {
    it('fires inside the lead window before the anniversary', () => {
        expect(isDue(annual, START, new Date('2027-04-10T00:00:00Z'))).toBe(true)
        expect(isDue(annual, START, new Date('2027-04-29T00:00:00Z'))).toBe(true)
    })

    it('stays quiet well before it', () => {
        // A reminder eleven months early is noise, and noise is how a product
        // teaches people to ignore the one that matters.
        expect(isDue(annual, START, new Date('2026-06-01T00:00:00Z'))).toBe(false)
    })

    it('rolls to next year once this year’s anniversary has passed', () => {
        // The day after: the next occurrence is eleven months out, not overdue.
        expect(isDue(annual, START, new Date('2027-05-02T00:00:00Z'))).toBe(false)
    })

    it('prefers a date the policy states over the anniversary', () => {
        const dated = complianceObligations([{
            kind: 'documentation',
            text: 'Πιστοποιητικό σε ισχύ',
            recurrence: 'annual',
            dueBy: '2026-09-01',
            breachEffect: 'voids_cover',
        }])[0]
        expect(isDue(dated, START, new Date('2026-08-20T00:00:00Z'))).toBe(true)
        // And the anniversary no longer drives it.
        expect(isDue(dated, START, new Date('2027-04-20T00:00:00Z'))).toBe(false)
    })

    it('ignores an unparseable stated date and falls back to the anniversary', () => {
        const broken = complianceObligations([{
            kind: 'documentation',
            text: 'x',
            recurrence: 'annual',
            dueBy: 'κάθε χρόνο',
            breachEffect: 'voids_cover',
        }])[0]
        expect(isDue(broken, START, new Date('2027-04-20T00:00:00Z'))).toBe(true)
    })
})

describe('continuous obligations — a cadence, not a deadline', () => {
    it('fires on the policy start and again roughly half a year later', () => {
        expect(isDue(continuous, START, START)).toBe(true)
        expect(isDue(continuous, START, new Date('2026-10-29T00:00:00Z'))).toBe(true)
    })

    it('stays quiet in between', () => {
        expect(isDue(continuous, START, new Date('2026-07-01T00:00:00Z'))).toBe(false)
    })

    it('never fires before cover begins', () => {
        expect(isDue(continuous, START, new Date('2026-01-01T00:00:00Z'))).toBe(false)
    })

    it('is phased off the policy start, so a book does not all notify at once', () => {
        const otherStart = new Date('2026-05-15T00:00:00Z')
        const sameDay = new Date('2026-10-29T00:00:00Z')
        expect(isDue(continuous, START, sameDay)).toBe(true)
        expect(isDue(continuous, otherStart, sameDay)).toBe(false)
    })
})

describe('the event is declared and wired', () => {
    it('is live and names its emitter', () => {
        const event = NOTIFICATION_EVENTS.obligation_due
        expect(event).toBeDefined()
        expect(event.status).toBe('live')
        expect(event.emittedBy).toBe('lib/services/compliance/obligation-scan.ts')
    })

    it('is suppressible, because it is the customer’s obligation and not ours', () => {
        // Transactional would bypass preferences. A reminder about something the
        // customer has to do is not a record of something we did.
        expect(NOTIFICATION_EVENTS.obligation_due.transactional).toBe(false)
    })

    it('is high priority — the customer may be paying for cover they do not have', () => {
        expect(NOTIFICATION_EVENTS.obligation_due.priority).toBe('high')
    })
})
