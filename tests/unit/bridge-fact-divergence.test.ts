/**
 * PW-BRIDGE-01 L0.3 — the fact-divergence metric must go red before it is trusted.
 *
 * The two-sided harness (tests/measure/bridge/) pairs every `data-fact` and
 * `data-count` present on both the policyholder's page and the agent's page
 * and reports the pairs whose values differ. A metric that has never been seen
 * failing proves nothing, so this file carries the deliberate divergence: two
 * captures of one policy where the agent's side renders a different run date,
 * a different covered count and a one-sided count. The metric must flag
 * exactly the two shared keys that differ, and neither of the one-sided ones.
 */

import { describe, expect, it } from "vitest"

import { compareCounts, compareFacts, formatReport, normaliseValue, type SideCapture } from "../measure/bridge/facts"

const POLICY = "pol_fixture_1"

const customer: SideCapture = {
    side: "customer",
    url: `/wallet/${POLICY}`,
    facts: {
        [`record.status#${POLICY}`]: "ΠΡΟΣ ΕΠΙΒΕΒΑΙΩΣΗ",
        "gap.findingsProvenance": "Ανάλυση της 6 Σεπτεμβρίου 2026 · 8 έλεγχοι",
        "composition.coverage": "3 από 5 σημεία καλύπτονται",
        "composition.recording": "2 από 3 στοιχεία καταγράφονται",
        [`policy.daysRemaining#${POLICY}`]: "σε 42 ημέρες",
    },
    counts: {
        "composition.covered": "3",
        "composition.notCovered": "2",
        "composition.coverageChecked": "5",
        "portfolio.policyCount": "4",
    },
}

const agentDivergent: SideCapture = {
    side: "agent",
    url: `/customers/u1/policy/${POLICY}`,
    facts: {
        [`record.status#${POLICY}`]: "ΠΡΟΣ   ΕΠΙΒΕΒΑΙΩΣΗ", // whitespace only — NOT a divergence
        "gap.findingsProvenance": "Ανάλυση της 7 Σεπτεμβρίου 2026 · 8 έλεγχοι", // the run date moved — a divergence
        "composition.coverage": "3 από 5 σημεία καλύπτονται",
        "composition.recording": "2 από 3 στοιχεία καταγράφονται",
        // policy.daysRemaining absent on the agent side — depth, not fact
    },
    counts: {
        "composition.covered": "2", // differs — a count contradiction
        "composition.notCovered": "2",
        "composition.coverageChecked": "5",
        "client.openGapCount": "1", // agent-only — one-sided, never a divergence
    },
}

const agentIdentical: SideCapture = { ...customer, side: "agent", url: agentDivergent.url }

describe("PW-BRIDGE-01 L0.3 — fact-divergence metric", () => {
    it("flags exactly the shared facts whose values differ, and nothing one-sided", () => {
        const report = compareFacts(customer, agentDivergent)
        expect(report.pairsCompared).toBe(4)
        expect(report.divergences.map((d) => d.key)).toEqual(["gap.findingsProvenance"])
        expect(report.onlyA).toEqual([`policy.daysRemaining#${POLICY}`])
        expect(report.onlyB).toEqual([])
        expect(report.divergences[0]).toMatchObject({
            a: { side: "customer", value: "Ανάλυση της 6 Σεπτεμβρίου 2026 · 8 έλεγχοι" },
            b: { side: "agent", value: "Ανάλυση της 7 Σεπτεμβρίου 2026 · 8 έλεγχοι" },
        })
    })

    it("flags a count contradiction and keeps the agent-only count out of the denominator", () => {
        const report = compareCounts(customer, agentDivergent)
        expect(report.pairsCompared).toBe(3)
        expect(report.divergences.map((d) => d.key)).toEqual(["composition.covered"])
        expect(report.onlyA).toEqual(["portfolio.policyCount"])
        expect(report.onlyB).toEqual(["client.openGapCount"])
    })

    it("reports zero divergences for identical sides and forgives whitespace only", () => {
        expect(compareFacts(customer, agentIdentical).divergences).toEqual([])
        expect(compareCounts(customer, agentIdentical).divergences).toEqual([])
        expect(normaliseValue("  3   από 5 ")).toBe("3 από 5")
        // A grammatical drift is still a divergence: the reader cannot tell it from a numeric one.
        const drift: SideCapture = { ...agentIdentical, facts: { ...customer.facts, "composition.coverage": "3 από 5 σημείων καλύπτονται" } }
        expect(compareFacts(customer, drift).divergences.map((d) => d.key)).toEqual(["composition.coverage"])
    })

    it("never pairs a viewer-scoped key: the unread badge is the viewer's number, not the object's", () => {
        const a: SideCapture = { ...customer, counts: { ...customer.counts, "notification.unreadCount": "9+" } }
        const b: SideCapture = { ...agentIdentical, counts: { ...customer.counts, "notification.unreadCount": "3" } }
        const report = compareCounts(a, b)
        expect(report.divergences).toEqual([])
        expect(report.pairsCompared).toBe(4)
        expect([...report.onlyA, ...report.onlyB]).not.toContain("notification.unreadCount")
    })

    it("names the denominator so an unmeasurable pair reads as a finding, not a pass", () => {
        const empty: SideCapture = { side: "agent", url: "/x", facts: {}, counts: {} }
        const report = compareFacts(customer, empty)
        expect(report.pairsCompared).toBe(0)
        expect(report.divergences).toEqual([])
        expect(formatReport(report)[0]).toMatch(/^fact: 0 pairs compared, 0 divergent/)
    })
})
