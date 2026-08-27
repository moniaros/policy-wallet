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
import { readFileSync, readdirSync } from "fs"
import { join } from "path"
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

describe("every date-moving path calls it", () => {
    // Source-level: none of these paths is reachable from a unit test without a
    // database. A guard that only tests the helper guards the helper, not the
    // invariant — and the invariant is that NO path forgets.
    //
    // THE UNIVERSE IS ENUMERATED FROM THE FILESYSTEM. This guard used to name
    // two files, and passed for months while a THIRD path — the orchestrator's
    // `persistAnalysisArtifacts`, the one the renewal-upload feature actually
    // drives — moved policy end dates and closed nothing. A customer who
    // renewed by attaching their ανανεωτήριο stayed "awaiting renewal" for ever.
    // Naming the paths is what let a new one appear unnoticed, so it now derives
    // them: any service file whose `policy.update` writes an `endDate` is a
    // date-moving path and must close out the superseded row.
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")

    const serviceFiles = (): string[] => {
        const walk = (dir: string): string[] =>
            readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
                const full = join(dir, e.name)
                if (e.isDirectory()) return walk(full)
                return e.name.endsWith(".ts") && !e.name.includes(".test.") ? [full] : []
            })
        return walk("lib/services")
    }

    /** A `policy.update({ ... endDate: ... })` anywhere in the file. */
    const movesPolicyEndDate = (src: string) => /policy\.update\(\s*\{[\s\S]*?endDate:/.test(src)

    const movers = serviceFiles()
        .map((file) => ({ file, src: strip(readFileSync(file, "utf8")) }))
        .filter(({ src }) => movesPolicyEndDate(src))

    it("the scan finds the known date-moving paths", () => {
        // Floor, not an allowlist: three were known when this was written. If the
        // scan silently stops matching, the guard below passes vacuously.
        expect(movers.length).toBeGreaterThanOrEqual(3)
        const names = movers.map((m) => m.file)
        expect(names).toContain("lib/services/policy.service.ts")
        expect(names).toContain("lib/services/policy-merge.service.ts")
        expect(names).toContain("lib/services/analysis/policy-analysis-orchestrator.service.ts")
    })

    it("every file that moves a policy end date closes the superseded renewal row", () => {
        const forgot = movers
            .filter(({ src }) => !/closeSupersededRenewals\s*\(/.test(src))
            .map(({ file }) => file)
        expect(
            forgot,
            `these move a policy's end date and leave its PolicyRenewal row open:\n  ${forgot.join("\n  ")}`
        ).toEqual([])
    })

    it("the approved-merge path closes it INSIDE the transaction", () => {
        const src = strip(readFileSync("lib/services/policy-merge.service.ts", "utf8"))
        // The close-out must land or roll back with the date change that caused
        // it, never as a separate write that can fail on its own.
        const tx = src.slice(src.indexOf("db.$transaction"))
        expect(tx.slice(0, tx.indexOf("logger("))).toMatch(/closeSupersededRenewals\s*\(\s*tx/)
    })

    it("the orchestrator persist closes it inside its transaction too", () => {
        const src = strip(readFileSync("lib/services/analysis/policy-analysis-orchestrator.service.ts", "utf8"))
        const tx = src.slice(src.indexOf("db.$transaction(async (tx)"))
        expect(tx.slice(0, tx.indexOf("gapInstance.deleteMany"))).toMatch(/closeSupersededRenewals\s*\(\s*tx/)
    })
})
