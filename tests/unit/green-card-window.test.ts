import { describe, it, expect } from "vitest"
import { greenCardDaysLeft, MOTOR_FAMILY_IDS } from "@/lib/renewals/green-card"
import { RENEWAL_MILESTONES } from "@/lib/renewals/milestones"

/** Spec v2 §14: green-card reminder 30 days before; renewal rungs include day 3. */
describe("green card window", () => {
    const now = new Date("2026-09-23T10:00:00+03:00")
    const iso = (days: number) => { const d = new Date(now); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10) }

    it("fires inside the 30-day window, with the day count", () => {
        expect(greenCardDaysLeft({ vehicle: { greenCardExpiryDate: iso(10) } }, now)?.days).toBe(10)
        expect(greenCardDaysLeft({ vehicle: { greenCardExpiryDate: iso(30) } }, now)?.days).toBe(30)
        expect(greenCardDaysLeft({ vehicle: { greenCardExpiryDate: iso(0) } }, now)?.days).toBe(0)
    })

    it("is silent outside the window, on a lapsed card, and on silence", () => {
        expect(greenCardDaysLeft({ vehicle: { greenCardExpiryDate: iso(31) } }, now)).toBeNull()
        expect(greenCardDaysLeft({ vehicle: { greenCardExpiryDate: iso(-1) } }, now)).toBeNull()
        expect(greenCardDaysLeft({ vehicle: {} }, now)).toBeNull()
        expect(greenCardDaysLeft(null, now)).toBeNull()
        expect(greenCardDaysLeft({ vehicle: { greenCardExpiryDate: "not a date" } }, now)).toBeNull()
    })

    it("the motor family carries the card: motor and its children, nothing else", () => {
        expect(MOTOR_FAMILY_IDS).toContain("motor")
        expect(MOTOR_FAMILY_IDS).toContain("motorbike")
        expect(MOTOR_FAMILY_IDS).not.toContain("home")
    })

    it("the renewal ladder carries the spec's day-3 rung, descending", () => {
        expect(RENEWAL_MILESTONES).toContain(3)
        expect([...RENEWAL_MILESTONES]).toEqual([...RENEWAL_MILESTONES].sort((a, b) => b - a))
    })
})
