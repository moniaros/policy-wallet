/**
 * A policy whose dates moved forward must not still be "awaiting renewal".
 *
 * `PolicyRenewal` is unique on [policyId, policyEndDate]. Two code paths move a
 * policy's end date — the auto-dedupe inside `runBackgroundAnalysis` and the
 * approved merge in `policy-merge.service` — and neither closed the row keyed to
 * the date that had just stopped being true.
 *
 * The consequence was quiet and cumulative: the daily cron finds no row for the
 * NEW end date and creates a second one, while the old row stays
 * `pending`/`overdue` for ever. It keeps counting toward `/renewals` and
 * `/insights`, and because `remindersSent` is still its own array the reminder
 * ladder can fire again. The customer renewed; the product goes on telling them
 * — and their adviser — that they did not.
 *
 * One shared definition on purpose. The two paths have drifted from each other
 * before (only one calls `mergeAcordData`), and a second copy of this rule would
 * drift the same way with nothing to notice.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "fs"
import { closeSupersededRenewals } from "../../lib/services/renewal.service"

type Captured = { where: Record<string, any>; data: Record<string, any> }

function fakeClient(count = 1) {
    const calls: Captured[] = []
    return {
        calls,
        client: {
            policyRenewal: {
                updateMany: async (args: Captured) => {
                    calls.push(args)
                    return { count }
                },
            },
        },
    }
}

const NEW_END = new Date("2027-01-01T00:00:00.000Z")

describe("closeSupersededRenewals", () => {
    it("closes only rows whose end date the policy has moved PAST", async () => {
        const { client, calls } = fakeClient()
        await closeSupersededRenewals(client, "pol-1", NEW_END, true)

        expect(calls).toHaveLength(1)
        expect(calls[0].where.policyId).toBe("pol-1")
        // Strictly less-than: a row already keyed to the new date is the CURRENT
        // renewal and must be left alone, or the cron's next pass has nothing
        // open for the period the customer is now in.
        expect(calls[0].where.policyEndDate).toEqual({ lt: NEW_END })
    })

    it("only touches rows that are still open", async () => {
        const { client, calls } = fakeClient()
        await closeSupersededRenewals(client, "pol-1", NEW_END, true)
        // An adviser may already have set an outcome by hand. Re-closing it
        // would overwrite a human judgement with an inferred one.
        expect(calls[0].where.status).toEqual({ in: ["pending", "overdue"] })
    })

    it("records the outcome the insurer comparison actually supports", async () => {
        const same = fakeClient()
        await closeSupersededRenewals(same.client, "pol-1", NEW_END, true)
        expect(same.calls[0].data.outcome).toBe("renewed_same_insurer")

        const different = fakeClient()
        await closeSupersededRenewals(different.client, "pol-1", NEW_END, false)
        expect(different.calls[0].data.outcome).toBe("renewed_different_insurer")
    })

    it("marks the outcome as derived, not judged", async () => {
        const { client, calls } = fakeClient()
        await closeSupersededRenewals(client, "pol-1", NEW_END, true)
        expect(calls[0].data.status).toBe("completed")
        // The same enum value an adviser sets in /renewals means something
        // different here: they decided it, this only observed that a later-dated
        // document arrived. `outcomeNotes` is the only place that survives.
        expect(String(calls[0].data.outcomeNotes)).toMatch(/derived|not set by an adviser/i)
    })

    it("reports how many it closed, so a caller can log a no-op honestly", async () => {
        const { client } = fakeClient(3)
        await expect(closeSupersededRenewals(client, "pol-1", NEW_END, true)).resolves.toBe(3)
    })
})

describe("both date-moving paths call it", () => {
    // Source-level: neither path is reachable from a unit test without a
    // database. A guard that only tests the helper guards the helper, not the
    // invariant — and the invariant is that NEITHER path forgets.
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")

    it("the auto-dedupe path in policy.service", () => {
        const src = strip(readFileSync("lib/services/policy.service.ts", "utf8"))
        expect(src).toMatch(/closeSupersededRenewals\s*\(/)
    })

    it("the approved-merge path in policy-merge.service", () => {
        const src = strip(readFileSync("lib/services/policy-merge.service.ts", "utf8"))
        expect(src).toMatch(/closeSupersededRenewals\s*\(/)
        // Inside the transaction: the close-out must land or roll back with the
        // date change that caused it, never as a separate write that can fail on
        // its own and leave the row open against a moved date.
        const tx = src.slice(src.indexOf("db.$transaction"))
        expect(tx.slice(0, tx.indexOf("logger("))).toMatch(/closeSupersededRenewals\s*\(\s*tx/)
    })
})
