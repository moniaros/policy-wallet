/**
 * PW-BRIDGE-01 L0.3 — the harness demonstrated.
 *
 * Two things, in order:
 *
 *  1. The metric catches a DELIBERATELY introduced divergence on live pages:
 *     capture the policyholder's policy page, move the run's `finishedAt` by
 *     three days in the database, capture the agent's page over the same
 *     policy, and require `gap.findingsProvenance` to be flagged. A metric that
 *     has never gone red on a real page is a comfort, not an instrument.
 *
 *  2. Both sides captured in EVERY fixture state L0.3 names, both page pairs,
 *     390px, Greek — recorded, not asserted. L0 is inventory: the numbers feed
 *     `docs/bridge/PARITY.md` and Queue A; the loop asserts them to zero.
 *
 * Runs in the `bridge` project (playwright.config.ts): no default storage
 * state — the harness opens both sessions itself.
 */

import { test, expect } from "@playwright/test"
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import { withDb } from "../surface-harness"
import { compareCounts, compareFacts, formatReport } from "./facts"
import { BRIDGE_EVIDENCE_DIR, BRIDGE_STATES, captureSide, openTwoSided, pairUrls, seedTwoSided } from "./two-sided"

test.describe.configure({ mode: "serial" })
test.setTimeout(15 * 60 * 1000)

test("L0.3 — a deliberately introduced divergence is caught on live pages", async ({ browser }) => {
    const seed = await seedTwoSided("healthy")
    expect(seed.completedRunId, "the healthy fixture must carry a completed run").not.toBeNull()
    const sessions = await openTwoSided(browser)
    let movedFrom: Date | null = null
    try {
        const pair = pairUrls(seed)[0]
        const customer = await captureSide(sessions.customer, "customer", pair.customer, "policy-divergence", "healthy")

        // The deliberate divergence: one fact, moved on the shared object between the two captures.
        movedFrom = await withDb(async (db) => {
            const run = await db.policyAnalysisRun.findUnique({ where: { id: seed.completedRunId! }, select: { finishedAt: true } })
            const before: Date = run.finishedAt
            await db.policyAnalysisRun.update({
                where: { id: seed.completedRunId! },
                data: { finishedAt: new Date(before.getTime() + 3 * 86_400_000) },
            })
            return before
        })

        const agent = await captureSide(sessions.agent, "agent", pair.agent, "policy-divergence", "healthy")
        const facts = compareFacts(customer, agent)
        const counts = compareCounts(customer, agent)
        console.log([...formatReport(facts), ...formatReport(counts)].join("\n"))

        mkdirSync(BRIDGE_EVIDENCE_DIR, { recursive: true })
        writeFileSync(
            join(BRIDGE_EVIDENCE_DIR, "DIVERGENCE-DEMO.json"),
            JSON.stringify({ customerUrl: customer.url, agentUrl: agent.url, customerStatus: customer.status, agentStatus: agent.status, facts, counts }, null, 2)
        )

        expect(facts.pairsCompared, "facts present on both sides — the denominator").toBeGreaterThan(0)
        expect(facts.divergences.map((d) => d.key), "the moved run date must be flagged").toContain("gap.findingsProvenance")
    } finally {
        if (movedFrom && seed.completedRunId) {
            const restoreTo = movedFrom
            await withDb((db) => db.policyAnalysisRun.update({ where: { id: seed.completedRunId! }, data: { finishedAt: restoreTo } }))
        }
        await sessions.close()
        await seed.restore()
    }
})

/**
 * One test per state so a slow state cannot time out the whole inventory, and
 * RESULT.json is merged after every state so a partial run still leaves evidence.
 */
function mergeResult(rows: Record<string, unknown>[]) {
    mkdirSync(BRIDGE_EVIDENCE_DIR, { recursive: true })
    const path = join(BRIDGE_EVIDENCE_DIR, "RESULT.json")
    let existing: Record<string, unknown>[] = []
    if (existsSync(path)) {
        try { existing = JSON.parse(readFileSync(path, "utf8")) } catch { existing = [] }
    }
    const keyOf = (r: Record<string, unknown>) => `${r.state}/${r.label}`
    const fresh = new Set(rows.map(keyOf))
    const merged = [...existing.filter((r) => !fresh.has(keyOf(r))), ...rows]
    writeFileSync(path, JSON.stringify(merged, null, 2))
}

for (const state of BRIDGE_STATES) {
    test(`L0.3 — both sides captured in state ${state} (inventory, recorded not asserted)`, async ({ browser }) => {
        // Five pairs per state now (policy, wallet, book, advisor, home) — ten captures at ~40 s each.
        test.setTimeout(10 * 60 * 1000)
        const rows: Record<string, unknown>[] = []
        const seed = await seedTwoSided(state)
        const sessions = await openTwoSided(browser)
        try {
            for (const pair of pairUrls(seed)) {
                const customer = await captureSide(sessions.customer, "customer", pair.customer, pair.label, state)
                const agent = await captureSide(sessions.agent, "agent", pair.agent, pair.label, state, pair.agentPrepare)
                const facts = compareFacts(customer, agent)
                const counts = compareCounts(customer, agent)
                rows.push({
                    state,
                    label: pair.label,
                    customer: { url: customer.url, status: customer.status, finalUrl: customer.finalUrl, facts: Object.keys(customer.facts).length, counts: Object.keys(customer.counts).length, hscroll: customer.hscroll, lang: customer.lang },
                    agent: { url: agent.url, status: agent.status, finalUrl: agent.finalUrl, facts: Object.keys(agent.facts).length, counts: Object.keys(agent.counts).length, hscroll: agent.hscroll, lang: agent.lang },
                    factPairs: facts.pairsCompared,
                    factDivergences: facts.divergences,
                    countPairs: counts.pairsCompared,
                    countDivergences: counts.divergences,
                    onlyCustomer: facts.onlyA,
                    onlyAgent: facts.onlyB,
                    countOnlyCustomer: counts.onlyA,
                    countOnlyAgent: counts.onlyB,
                })
                console.log(`[${state}/${pair.label}] customer ${customer.status} agent ${agent.status} · ${formatReport(facts)[0]} · ${formatReport(counts)[0]}`)
            }
        } finally {
            await sessions.close()
            await seed.restore()
        }
        mergeResult(rows)
        expect(rows.length).toBe(pairUrls(seed).length)
    })
}
