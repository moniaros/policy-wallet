import { describe, it, expect } from "vitest"
import { deriveRenewalChecklist, upcomingReminderMilestones } from "@/lib/wallet/renewal-outlook"

/**
 * Guards for the renewal outlook.
 *
 * The checklist is facts-only — every item exists because something is
 * recorded, and there is deliberately NO premium-change or coverage-change
 * item (renewalHistory carries no premium; asserting either without data
 * would be fabrication). The reminder promise is tier-truthful and only names
 * milestones genuinely still ahead.
 */

const QUIET = {
    openGapCount: 0,
    deadlineConditionCount: 0,
    obligationCount: 0,
    hasAutoRenewal: false,
    lastAnalyzedAt: "2026-08-01T00:00:00Z",
    documentCount: 1,
}

describe("deriveRenewalChecklist", () => {
    it("returns nothing for a quiet, analysed policy — no invented work", () => {
        expect(deriveRenewalChecklist(QUIET)).toEqual([])
    })

    it("lists each recorded fact once, ordered by importance", () => {
        const items = deriveRenewalChecklist({
            openGapCount: 2,
            deadlineConditionCount: 1,
            obligationCount: 1,
            hasAutoRenewal: true,
            lastAnalyzedAt: null,
            documentCount: 0,
        })
        expect(items.map((i) => i.kind)).toEqual([
            "gaps",
            "deadline",
            "obligation",
            "auto_renewal",
            "not_analyzed",
            "no_document",
        ])
        expect(items[0].count).toBe(2)
    })

    it("flags a never-analysed policy instead of implying it was checked", () => {
        const items = deriveRenewalChecklist({ ...QUIET, lastAnalyzedAt: null })
        expect(items.map((i) => i.kind)).toEqual(["not_analyzed"])
    })
})

describe("upcomingReminderMilestones", () => {
    it("promises the full ladder only ahead of where the policy stands", () => {
        // 80 days out: 90 has already passed — promising it would be false.
        expect(upcomingReminderMilestones(80, [], true)).toEqual([60, 30, 15, 7])
    })

    it("never re-promises a milestone already sent", () => {
        expect(upcomingReminderMilestones(80, [60, 30], true)).toEqual([15, 7])
    })

    it("is tier-truthful: the free floor is the single 30-day reminder", () => {
        expect(upcomingReminderMilestones(80, [], false)).toEqual([30])
        // 20 days out on free: the 30-day mark has passed — promise nothing.
        expect(upcomingReminderMilestones(20, [], false)).toEqual([])
    })

    it("promises nothing for an expired policy or an unreadable end date", () => {
        expect(upcomingReminderMilestones(-3, [], true)).toEqual([])
        expect(upcomingReminderMilestones(null, [], true)).toEqual([])
    })
})
