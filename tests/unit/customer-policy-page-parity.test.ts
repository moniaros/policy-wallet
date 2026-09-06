/**
 * GUARD: the agent's customer-policy page renders identity, dates and premium by
 * the same three rules as the customer's own policy page (PW-BRIDGE-01 A-03,
 * A-04, A-05, A-19). The two-sided harness measured each of these as a live
 * contradiction on 2026-09-06 (docs/evidence/bridge-l0/RESULT.json):
 *
 *   A-05  policy.policyNumber   customer «»            agent «PENDING-1700000000099»
 *   A-04  policy.expiryDate     customer «2028-02-18»  agent «2027-02-18»
 *   A-03  policy.premiumAmount  customer omits it       agent «0,00 €»
 *   A-19  the status label was computed before the account language was resolved
 *
 * The harness is the slow guard; this is the fast one: it reads the page source
 * and refuses the four raw renders. Probe: tests/fixtures/guard-probes/
 * customer-policy-page-raw.tsx.txt carries all four and must be flagged.
 */

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.cwd()
const PAGE = "app/(protected)/customers/[id]/policy/[policyId]/page.tsx"

export const RAW_RENDER_RULES: { id: string; rule: string; pattern: RegExp }[] = [
    { id: "A-05", rule: "the policy number renders through displayPolicyNumber (a PENDING-… sentinel never shows)", pattern: /\{policy\.policyNumber\}/ },
    { id: "A-04", rule: "the end date is the lifecycle's, never the raw column", pattern: /formatDate\(\s*policy\.endDate/ },
    { id: "A-03", rule: "an unknown premium is said, never zeroed", pattern: /premiumAmount\s*\|\|\s*0/ },
    { id: "A-19", rule: "the status label is resolved in the account's language", pattern: /getStatusLabel\(\s*status\s*\)/ },
]

export function rawRenderOffences(source: string): string[] {
    return RAW_RENDER_RULES.filter((r) => r.pattern.test(source)).map((r) => r.id)
}

describe("GUARD — the agent's customer-policy page follows the customer page's rules (A-03/A-04/A-05/A-19)", () => {
    const source = readFileSync(join(ROOT, PAGE), "utf8")

    it("renders no raw identity, date, premium or defaulted-language status", () => {
        expect(rawRenderOffences(source), RAW_RENDER_RULES.map((r) => `${r.id}: ${r.rule}`).join("\n")).toEqual([])
    })

    it("uses the shared resolvers the customer page uses", () => {
        expect(source).toMatch(/displayPolicyNumber\(policy\.policyNumber\)/)
        expect(source).toMatch(/const lifecycle = resolvePolicyLifecycle\(policy\)/)
        expect(source).toMatch(/lifecycle\.endDate/)
        expect(source).toMatch(/getStatusLabel\(status, language\)/)
        expect(source).toMatch(/t\.wallet\.policyDetailsPage\.valueUnreadable/)
    })

    it("the probe fixture turns the guard red on all four rules", () => {
        const probe = readFileSync(join(ROOT, "tests", "fixtures", "guard-probes", "customer-policy-page-raw.tsx.txt"), "utf8")
        expect(rawRenderOffences(probe).sort()).toEqual(["A-03", "A-04", "A-05", "A-19"])
    })
})
