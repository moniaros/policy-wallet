/**
 * GUARD: a justified asymmetry carries its disclosure (PW-BRIDGE-01 §4, §12 —
 * items A-09 and A-10).
 *
 * The advisor legitimately sees only the policies the customer shared, at the
 * level the customer granted. That is right — and the customer must be able to
 * see exactly that: which policies the advisor can see (wallet card marker,
 * «N of M» on /agent with its denominator) and what each grant lets the advisor
 * do (the level on every grant row). L0 found the /agent ledger listed grants
 * without their level and the wallet never said which policies were shared.
 *
 * Fast static guard over the three surfaces; the slow one is the two-sided
 * harness. Probe: tests/fixtures/guard-probes/justified-asymmetry-undisclosed.tsx.txt.
 * The agent-side half of A-09 (telling the advisor unshared policies exist) is a
 * halt (docs/bridge/HALTS.md H-B2) and is deliberately NOT asserted here.
 */

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.cwd()

export const DISCLOSURE_RULES: { id: string; file: string; rule: string; pattern: RegExp }[] = [
    { id: "A-10 select", file: "app/(protected)/agent/page.tsx", rule: "the grant query carries the level", pattern: /permissions:\s*true/ },
    { id: "A-10 level", file: "app/(protected)/agent/AgentClient.tsx", rule: "every grant row states its level as a fact", pattern: /data-fact="grant\.level"/ },
    { id: "A-09 summary", file: "app/(protected)/agent/AgentClient.tsx", rule: "«N of M shared» with its denominator", pattern: /data-count="portfolio\.sharedWithAdvisorCount"[\s\S]*data-count="portfolio\.policyCount"/ },
    { id: "A-09 marker", file: "components/wallet/PolicyCard.tsx", rule: "the wallet card marks a policy the advisor can see", pattern: /data-fact="policy\.sharedWithAdvisor"/ },
]

/** Rules whose pattern is absent from `source` — for a probe, all of them. */
export function missingDisclosures(source: string, rules = DISCLOSURE_RULES): string[] {
    return rules.filter((r) => !r.pattern.test(source)).map((r) => r.id)
}

describe("GUARD — a justified asymmetry carries its disclosure (A-09 customer half, A-10)", () => {
    for (const rule of DISCLOSURE_RULES) {
        it(`${rule.id}: ${rule.rule}`, () => {
            const src = readFileSync(join(ROOT, rule.file), "utf8")
            expect(rule.pattern.test(src), `${rule.file} — ${rule.rule}`).toBe(true)
        })
    }

    it("the probe fixture — a grant list without levels and a card without the marker — is missing every disclosure", () => {
        const probe = readFileSync(join(ROOT, "tests", "fixtures", "guard-probes", "justified-asymmetry-undisclosed.tsx.txt"), "utf8")
        expect(missingDisclosures(probe).length).toBe(DISCLOSURE_RULES.length)
    })
})
