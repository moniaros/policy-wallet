import { describe, expect, it } from "vitest"
import { monitorRisk, type MonitoringInputs } from "@/lib/services/risk-dna/monitoring"

/**
 * ABSENCE OF A DETECTED PROBLEM IS NOT EVIDENCE OF NO PROBLEM.
 *
 * The dashboard's monitoring card renders three checks, each with a verdict, and
 * `clear` is drawn as reassurance. On a wallet whose cover had entirely expired
 * it rendered «Κάλυψη που λήγει: Εντάξει» — because the lapse window was
 * `days >= 0 && days <= 45`, which silently excluded every policy that had
 * ALREADY ended. The check found nothing about to lapse because there was
 * nothing left to lapse, and said so as good news.
 *
 * Same shape as the protection score over a never-analysed portfolio and the
 * gap engine's `is_false` operators: silence is not a negative finding. See the
 * invariant in CLAUDE.md.
 */
const base = (policies: MonitoringInputs["policies"]): MonitoringInputs => ({
    ctx: {} as any,
    dimensions: [],
    lastAssessedAt: new Date("2026-08-20T00:00:00Z"),
    policies,
    now: new Date("2026-08-23T00:00:00Z"),
})

const lapse = (inputs: MonitoringInputs) =>
    monitorRisk(inputs).find((s) => s.id === "cover_lapsing")!

const policy = (id: string, endsInDays: number | null) => ({
    id,
    endDate: endsInDays === null ? null : new Date(Date.UTC(2026, 7, 23 + endsInDays)),
    lineOfBusiness: "motor",
})

describe("the lapse watch never calls an expired portfolio clear", () => {
    it("does not report `clear` when every policy has already ended", () => {
        const signal = lapse(base([policy("a", -20), policy("b", -200)]))
        expect(signal.verdict).not.toBe("clear")
        expect(signal.verdict).toBe("action")
    })

    it("says what is wrong, in Greek, rather than staying silent", () => {
        const signal = lapse(base([policy("a", -20), policy("b", -200)]))
        expect(signal.detail?.el).toMatch(/έχουν ήδη λήξει/)
        expect(signal.action?.el).toBeTruthy()
    })

    it("counts the expired ones AND the ones about to go", () => {
        const signal = lapse(base([policy("a", -20), policy("b", 10)]))
        expect(signal.detail?.el).toMatch(/1 ασφαλιστήριο έχει ήδη λήξει/)
        expect(signal.detail?.el).toMatch(/άλλα 1 λήγουν μέσα σε 45 ημέρες/)
    })

    it("still reports `action` for cover that is merely about to lapse", () => {
        expect(lapse(base([policy("a", 10)])).verdict).toBe("action")
    })

    it("is `clear` only when there is live cover and none of it is ending", () => {
        // The one state that genuinely warrants reassurance.
        const signal = lapse(base([policy("a", 200), policy("b", 300)]))
        expect(signal.verdict).toBe("clear")
        expect(signal.detail).toBeNull()
    })

    it("is `clear` on an empty wallet, which the hero handles separately", () => {
        expect(lapse(base([])).verdict).toBe("clear")
    })
})
