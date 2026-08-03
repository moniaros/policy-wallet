/**
 * Golden test on a real Εθνική general-liability policy (owner action #4,
 * fourth branch — pseudonymised from the start, per the fixture-pii guard).
 *
 * The fixture's structure was decoded from the actual document during the
 * 2026-08 live pipeline verification, so each assertion pins something the
 * REAL Greek market prints, not something invented for the test:
 *
 *  - the insurer prints dates as dd.MM.yyyy WITH DOTS — a format the date
 *    parser must keep handling forever;
 *  - the premium is a breakdown (net + charges + taxes) whose parts must sum
 *    to the printed total exactly — the kind of arithmetic a rounding bug
 *    breaks silently;
 *  - the liability branch has NO coverage taxonomy, so the backstop must stay
 *    silent for this policy: general liability cover is bespoke, and
 *    inventing "missing theft" findings against it would be nonsense.
 */
import { describe, expect, it } from "vitest"
import {
    LIABILITY_ETHNIKI_1,
    LIABILITY_ETHNIKI_1_COVERED,
    LIABILITY_ETHNIKI_1_PREMIUM_BREAKDOWN,
} from "../fixtures/liability-ethniki-1"
import { parseDocumentDate } from "@/lib/dates/document-date"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import { lobProtectionWeight } from "@/lib/services/gap-engine/protection-score"
import { taxonomyBackstopGaps } from "@/lib/services/analysis/taxonomy-gap-backstop"

describe("Εθνική general liability fixture — golden properties", () => {
    it("parses the insurer's dotted date format", () => {
        // «30.06.2026» exactly as printed. A parser regression here turns an
        // active policy into "unknown duration" (or worse, upload-day + 365).
        expect(parseDocumentDate(LIABILITY_ETHNIKI_1.startDate!)?.toISOString().slice(0, 10)).toBe(
            "2026-06-30"
        )
        expect(parseDocumentDate(LIABILITY_ETHNIKI_1.endDate!)?.toISOString().slice(0, 10)).toBe(
            "2027-06-29"
        )
    })

    it("keeps the premium breakdown summing to the printed total", () => {
        const { net, charges, taxes, total } = LIABILITY_ETHNIKI_1_PREMIUM_BREAKDOWN

        // Cent-exact, the way the document prints it: 75,62 + 11,34 + 13,04.
        expect(Math.round((net + charges + taxes) * 100)).toBe(Math.round(total * 100))
        expect(LIABILITY_ETHNIKI_1.premiumAmount).toBe(total)
    })

    it("normalizes to the liability branch, which the score weighs", () => {
        expect(normalizeBranch("liability").id).toBe("liability")
        expect(lobProtectionWeight("liability")).toBeGreaterThan(0)
    })

    it("the taxonomy backstop stays silent for a liability policy", () => {
        // General liability cover is bespoke — there is no per-branch coverage
        // taxonomy for it, and the backstop must not borrow another branch's.
        const gaps = taxonomyBackstopGaps({
            lineOfBusiness: "liability",
            covered: LIABILITY_ETHNIKI_1_COVERED,
            notCovered: [],
            existingSlugs: [],
        })

        expect(gaps).toEqual([])
    })

    it("carries a synthetic identity, never the real policyholder", () => {
        // The source document is a real person's policy. The identity here
        // must remain example-domain and synthetic; the fixture-pii guard
        // enforces the repo-wide rule, this pins the specific file.
        expect(LIABILITY_ETHNIKI_1.customerEmail).toMatch(/@example\.com$/)
        expect(LIABILITY_ETHNIKI_1.policyNumber).toMatch(/^TEST-/)
    })

    it("names the three real exclusions", () => {
        // Cyber, sanctions, tobacco — the riders the document actually
        // attaches. An extraction that drops exclusions loses exactly the
        // clauses a claim gets denied on.
        expect(LIABILITY_ETHNIKI_1.exclusions).toHaveLength(3)
        expect(LIABILITY_ETHNIKI_1.exclusions!.join(" ")).toMatch(/κυβερνοχώρου/)
        expect(LIABILITY_ETHNIKI_1.exclusions!.join(" ")).toMatch(/κυρώσεις/)
        expect(LIABILITY_ETHNIKI_1.exclusions!.join(" ")).toMatch(/καπνού/)
    })
})
