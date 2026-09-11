import { describe, expect, it } from "vitest"

import { getWeeklyDigestEmail } from "@/lib/email/templates/weekly-digest"

/**
 * C-06: a count in an outbound email carries what it is out of.
 *
 * «3 νέα κενά κάλυψης εντοπίστηκαν» alone reads as a verdict on the week. The
 * denominator turns it back into a measurement — and the two numbers come from
 * one query differing only in period, so they can never describe different
 * portfolios. The digest also counts only CLASSIFIED findings (B3 keeps
 * under-review ones out of every email), which is a fact the reader is owed.
 *
 * Its own file because `weekly-digest-renewal-status.test.ts` mocks this
 * template module — the service is what it tests, so the real copy is
 * unreachable there.
 */
describe("the digest's counts name their denominator (C-06)", () => {
    it("states the new findings out of the open total", () => {
        const { html } = getWeeklyDigestEmail("el", "Μαρία", {
            renewingSoon: [],
            newGaps: 3,
            openGaps: 11,
            unreadMessages: 0,
        })
        expect(html).toContain("3 νέα κενά κάλυψης εντοπίστηκαν")
        expect(html).toContain("από 11 ανοιχτά συνολικά")
    })

    it("discloses that findings under review are not among them", () => {
        const { html } = getWeeklyDigestEmail("el", "Μαρία", {
            renewingSoon: [],
            newGaps: 2,
            openGaps: 5,
            unreadMessages: 0,
        })
        expect(html).toContain("Τα ευρήματα υπό αξιολόγηση δεν περιλαμβάνονται σε αυτή τη σύνοψη")
    })

    it("omits the denominator rather than printing a false one when it is absent or smaller", () => {
        const without = getWeeklyDigestEmail("el", "Μαρία", { renewingSoon: [], newGaps: 3, unreadMessages: 0 }).html
        expect(without).toContain("3 νέα κενά κάλυψης εντοπίστηκαν")
        expect(without).not.toContain("ανοιχτά συνολικά")
        // A total below the new count would be incoherent — say nothing instead.
        const impossible = getWeeklyDigestEmail("el", "Μαρία", { renewingSoon: [], newGaps: 3, openGaps: 1, unreadMessages: 0 }).html
        expect(impossible).not.toContain("ανοιχτά συνολικά")
    })

    it("says it in English for an English reader", () => {
        const { html } = getWeeklyDigestEmail("en", "Maria", {
            renewingSoon: [],
            newGaps: 3,
            openGaps: 11,
            unreadMessages: 0,
        })
        expect(html).toContain("of 11 open in total")
        expect(html).toContain("Findings still under review are not included")
    })

    it("says nothing about findings when there are none this week", () => {
        const { html } = getWeeklyDigestEmail("el", "Μαρία", {
            renewingSoon: [],
            newGaps: 0,
            openGaps: 11,
            unreadMessages: 0,
        })
        expect(html).not.toContain("κενά κάλυψης")
        expect(html).not.toContain("υπό αξιολόγηση")
    })
})
