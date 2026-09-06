/**
 * GUARD: the agent's policy rows speak with the wallet's resolvers (PW-BRIDGE-01
 * A-20, A-21). Measured by the two-sided harness on 2026-09-06 (wallet pair,
 * every state): the SAME policy rendered «ΑΠΑΙΤΕΙΤΑΙ ΕΝΕΡΓΕΙΑ» to its owner and
 * «Ενεργό» to their agent (two status resolvers, two label tables), and one
 * insurer read «Εθνική Ασφαλιστική» on one side and «ΕΘΝΙΚΗ» on the other (two
 * name resolvers).
 *
 * The repair is at the source: the customer service's policy DTO resolves the
 * status key through `resolvePolicyStatusKey` (the wallet's ONE status pipeline)
 * and the insurer through `resolveInsurerDisplay` (the registry); the agent tab
 * labels the key from the shared `t.policyStatus` table and keeps no label map
 * of its own; the agent policy page canonicalises the insurer the same way.
 *
 * Fast static guard; the slow one is the harness. Probe:
 * tests/fixtures/guard-probes/agent-rows-local-resolvers.ts.txt.
 */

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.cwd()
const SERVICE = "lib/services/customer.service.ts"
const TAB = "components/agent/tabs/ClientPoliciesTab.tsx"
const PAGE = "app/(protected)/customers/[id]/policy/[policyId]/page.tsx"

export function localResolverOffences(source: string): string[] {
    const offences: string[] = []
    if (/const STATUS_LABELS\s*:/.test(source)) offences.push("local status label map")
    if (/status:\s*effectivePolicyStatus\(/.test(source)) offences.push("status from effectivePolicyStatus instead of resolvePolicyStatusKey")
    if (/insurer:\s*p\.insurerName\s*,/.test(source)) offences.push("insurer from the raw column instead of resolveInsurerDisplay")
    // A-02: a classified-only gap read hides the under-review figure the customer's home shows.
    if (/scope:\s*"classified"/.test(source) && !/scope:\s*"disclosed"/.test(source)) offences.push("classified-only gap count without the under-review companion")
    return offences
}

describe("GUARD — agent policy rows use the wallet's status and insurer resolvers (A-20/A-21)", () => {
    it("the customer service DTO resolves status and insurer at the source", () => {
        const src = readFileSync(join(ROOT, SERVICE), "utf8")
        expect(localResolverOffences(src)).toEqual([])
        expect(src).toMatch(/status:\s*resolvePolicyStatusKey\(p\)/)
        expect(src).toMatch(/insurer:\s*resolveInsurerDisplay\(p\.insurerName\)\.displayName/)
    })

    it("the agent tab keeps no label map of its own and labels from the shared table", () => {
        const src = readFileSync(join(ROOT, TAB), "utf8")
        expect(localResolverOffences(src)).toEqual([])
        expect(src).toMatch(/policyStatusLabel\(/)
    })

    it("the agent policy page canonicalises the insurer through the registry", () => {
        const src = readFileSync(join(ROOT, PAGE), "utf8")
        expect(src).toMatch(/resolveInsurerDisplay\(policy\.insurerName\)/)
    })

    it("the agent portal and the agent dashboard count classified and under-review from one disclosed read (A-02)", () => {
        for (const f of ["lib/services/agent-portal.service.ts", "app/(protected)/dashboard/agent/page.tsx"]) {
            const src = readFileSync(join(ROOT, f), "utf8")
            expect(localResolverOffences(src), f).toEqual([])
            expect(src, f).toMatch(/underReview/)
        }
    })

    it("the probe fixture turns the guard red on all four offences", () => {
        const probe = readFileSync(join(ROOT, "tests", "fixtures", "guard-probes", "agent-rows-local-resolvers.ts.txt"), "utf8")
        expect(localResolverOffences(probe).length).toBe(4)
    })
})
