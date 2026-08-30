import { describe, it, expect } from "vitest"
import { readFileSync } from "node:fs"

/**
 * §8.7/§8.8 done-criterion: every share change leaves an AdviserShareAudit
 * row — grant, revoke (BOTH revoke paths: the switch and the legacy
 * revokeShare that G0 found writing no audit and revalidating /wallet twice),
 * and help_sent with exactly what was shared. Grep-shaped like the
 * analysis-failed guard: the write sites are asserted in the source so a
 * deleted audit call fails CI even where the action's graph is unmockable.
 */
const actions = readFileSync("app/(protected)/adviser/actions.ts", "utf-8")
const wallet = readFileSync("app/(protected)/wallet/actions.ts", "utf-8")

describe("every share change leaves a trace", () => {
    it("grant and revoke through the switch write the audit", () => {
        expect(actions).toMatch(/audit\(dbUser\.id, rel\.agentUserId, "granted", grant\.id/)
        expect(actions).toMatch(/audit\(dbUser\.id, rel\.agentUserId, "revoked", grant\.id/)
        expect(actions).toMatch(/adviserShareAudit\s*\n?\s*\.create/)
    })
    it("the legacy revokeShare writes the audit and revalidates the surfaces that exist", () => {
        expect(wallet).toMatch(/action: 'revoked'/)
        expect(wallet).toMatch(/revalidatePath\("\/adviser"\)/)
        const body = wallet.slice(wallet.indexOf("export async function revokeShare"), wallet.indexOf("export async function deletePolicy"))
        expect(body).not.toMatch(/revalidatePath\("\/wallet"\)/)
    })
    it("help_sent records the finding, the policies and the profile fields actually shared", () => {
        expect(actions).toMatch(/"help_sent", grantIds\[0\] \?\? null, \{\s*findingId: finding\.id/)
        expect(actions).toMatch(/policyIds,\s*profileFields: finding\.whyYou \? \[finding\.whyYou\.profileField\] : \[\]/)
    })
    it("the help flow re-derives the finding server-side from a hash — the client never sends content", () => {
        expect(actions).toMatch(/loadFindingsContext\(dbUser\.id, lang\)/)
        expect(actions).toMatch(/ctx\.findings\.find\(\(f\) => f\.hash === parsed\.data\.hash\)/)
    })
    it("disconnect audits the all-scope revocation and rides terminateRelationship (grants die with the relationship)", () => {
        expect(actions).toMatch(/"revoked", null, \{ reason: "disconnected", scope: "all" \}/)
        expect(actions).toMatch(/disconnectFromAgent\(parsed\.data\.relationshipId\)/)
    })
    it("the event published matches the catalogue's payload fields", () => {
        expect(actions).toMatch(/name: "advisor\.help_requested"/)
        for (const field of ["findingId", "advisorUserId", "policyIds", "profileFields"]) expect(actions).toContain(field)
    })
})
