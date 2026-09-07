/**
 * PW-BRIDGE-01 L0.3 — the two-sided harness.
 *
 * ONE set of records, TWO authenticated sessions: the E2E policyholder and the
 * E2E agent connected to them. The harness seeds a policy in a named state,
 * makes the agent see it the way production does (an active relationship plus
 * a policy-scoped AccessGrant — the exact rows `sharePolicy` writes), opens
 * both sessions at 390px in Greek, and captures text, `data-fact` and
 * `data-count` from each side so `facts.ts` can pair them.
 *
 * Deterministic seeding: every state is a function of the fixture spec and a
 * pinned clock, re-runnable, and every change it makes to shared rows (the
 * relationship, the grant, the run) is reverted by `restore()`. A discrepancy
 * that cannot be reproduced on demand is not a finding.
 *
 * Refuses the production database by host, as `provisionMatrixFixtures` does.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { Browser, BrowserContext, Page } from "@playwright/test"

import { E2E_AGENT, E2E_POLICYHOLDER } from "../../e2e-users"
import { FIXTURE_SPECS, provisionMatrixFixtures, type FixtureSpec } from "../fixtures"
import { openSurface, withDb } from "../surface-harness"
import { currentCatalogueVersion } from "../../../lib/gaps/composition"
import { extractAttributeMap, type FactMap, type SideCapture } from "./facts"

export const BRIDGE_WIDTH = 390 as const
export const BRIDGE_EVIDENCE_DIR = join(process.cwd(), "docs", "evidence", "bridge-l0")

/** The degraded states L0.3 requires fixtures for, plus the healthy baseline. */
export type BridgeState =
    | "healthy"
    | "failed_run"
    | "pre_plan"
    | "stale_catalogue"
    | "unauthored_branch"
    | "expired"
    | "revoked_access"
    | "empty_book"
    | "single_client_book"
    // Degraded IDENTITY states (A-08 follow-up): the raw renders on the agent page only
    // diverge when the row is degraded — a placeholder number, no premium, a renewed end date.
    | "placeholder_identity"
    | "no_premium"
    | "renewed_end_date"
    // A-06: the advisor confirmed the extracted values — the record status must say so on both sides.
    | "agent_confirmed"
    // A-15 / A-17: one finding RESOLVED after the analysis. A reader that filters on
    // supersededAt alone still lists it as current; the live set must not, on either side.
    | "resolved_finding"

export const BRIDGE_STATES: BridgeState[] = [
    "healthy",
    "failed_run",
    "pre_plan",
    "stale_catalogue",
    "unauthored_branch",
    "expired",
    "revoked_access",
    "empty_book",
    "single_client_book",
    "placeholder_identity",
    "no_premium",
    "renewed_end_date",
    "agent_confirmed",
    "resolved_finding",
]

export interface SeededPair {
    state: BridgeState
    policyId: string
    customerUserId: string
    agentUserId: string
    relationshipId: string
    grantId: string | null
    completedRunId: string | null
    /** Reverts every change made to rows other specs share. */
    restore: () => Promise<void>
}

const PROD_HOST = /cquudefwfwrmvpftuhyl/

function refuseProduction() {
    if (PROD_HOST.test(process.env.DATABASE_URL || "") || PROD_HOST.test(process.env.DIRECT_URL || "")) {
        throw new Error("two-sided harness: refusing to run against the PRODUCTION database")
    }
}

/** The fixture spec each state starts from. Keys are the matrix fixtures' own. */
function specFor(state: BridgeState): FixtureSpec {
    const base = FIXTURE_SPECS.find((f: FixtureSpec) => f.key === "motor-active")
    if (!base) throw new Error("two-sided harness: the matrix fixture 'motor-active' is gone")
    switch (state) {
        case "expired":
            return { ...base, key: "bridge-motor-expired", policyNumber: "ΣΥΜΒ-2026-BR-XPD", state: "expired" }
        case "unauthored_branch":
            // A write branch with no authored check: the composition must render the
            // unauthored state on BOTH sides. The matrix provisioner only knows motor and
            // health shapes, so the row is provisioned as motor with NO gap rows and its
            // branch is switched to `cyber` (no branch section, no rule) right after.
            return { ...base, key: "bridge-cyber-active", policyNumber: "ΣΥΜΒ-2026-BR-CYB", gapSlugs: [] }
        case "placeholder_identity":
            // The matrix's own defect fixture shape: sentinel number AND sentinel insurer.
            return { ...base, key: "bridge-placeholder-identity", policyNumber: "PENDING-1700000000099", insurerName: "__PENDING_EXTRACTION__", gapSlugs: [], placeholderIdentity: true } as FixtureSpec
        case "no_premium":
            return { ...base, key: "bridge-no-premium", policyNumber: "ΣΥΜΒ-2026-BR-NP", premiumAmount: null }
        case "renewed_end_date":
            return { ...base, key: "bridge-renewed", policyNumber: "ΣΥΜΒ-2026-BR-RNW" }
        case "agent_confirmed":
            return { ...base, key: "bridge-agent-confirmed", policyNumber: "ΣΥΜΒ-2026-BR-CNF" }
        case "resolved_finding":
            return { ...base, key: "bridge-resolved-finding", policyNumber: "ΣΥΜΒ-2026-BR-RSV" }
        default:
            return { ...base, key: "bridge-motor-active", policyNumber: "ΣΥΜΒ-2026-BR-ACT" }
    }
}

/**
 * Seed one policy in `state`, connect the agent to it the way `sharePolicy`
 * does, and apply the state's degradation. Idempotent per state key.
 */
export async function seedTwoSided(state: BridgeState): Promise<SeededPair> {
    refuseProduction()
    return withDb(async (db) => {
        const [customer, agent] = await Promise.all([
            db.user.findUnique({ where: { email: E2E_POLICYHOLDER.email }, select: { id: true } }),
            db.user.findUnique({ where: { email: E2E_AGENT.email }, select: { id: true } }),
        ])
        if (!customer || !agent) throw new Error("two-sided harness: run the Playwright global setup first (E2E users missing)")

        const spec = specFor(state)
        const ids = await provisionMatrixFixtures(db, E2E_POLICYHOLDER.email, [spec])
        const policyId = ids[spec.key]
        if (!policyId) throw new Error(`two-sided harness: fixture ${spec.key} produced no policy id`)
        if (state === "unauthored_branch") {
            await db.policy.update({ where: { id: policyId }, data: { lineOfBusiness: "cyber" } })
        }
        if (state === "agent_confirmed") {
            // Exactly what confirmPolicyReview writes into the envelope (wallet/actions.ts).
            const row = await db.policy.findUnique({ where: { id: policyId }, select: { acordData: true } })
            const acord = (row?.acordData && typeof row.acordData === "object" ? row.acordData : {}) as Record<string, unknown>
            const extraction = (acord.extraction && typeof acord.extraction === "object" ? acord.extraction : {}) as Record<string, unknown>
            await db.policy.update({
                where: { id: policyId },
                data: { acordData: { ...acord, extraction: { ...extraction, reviewState: "confirmed", confirmedAt: new Date().toISOString(), confirmedBy: "agent", confirmedByUserId: agent.id, flaggedAt: null } } },
            })
        }
        if (state === "resolved_finding") {
            // The customer resolved one of the two findings after the run: a live-set reader
            // shows one finding on both sides; a supersededAt-only reader shows two (A-15).
            const first = await db.gapInstance.findFirst({ where: { policyId }, orderBy: { detectedAt: "asc" }, select: { id: true } })
            if (first) await db.gapInstance.update({ where: { id: first.id }, data: { status: "resolved", resolvedAt: new Date() } })
        }
        if (state === "renewed_end_date") {
            // A renewal recorded in the document history: the lifecycle resolves the end date from it
            // (latest renewal end → envelope → column); a render that reads the raw column disagrees by a year.
            const row = await db.policy.findUnique({ where: { id: policyId }, select: { endDate: true, acordData: true } })
            const base = row?.endDate ? new Date(row.endDate) : new Date()
            const renewedEnd = new Date(base.getTime() + 365 * 86_400_000)
            const acord = (row?.acordData && typeof row.acordData === "object" ? row.acordData : {}) as Record<string, unknown>
            await db.policy.update({
                where: { id: policyId },
                data: { acordData: { ...acord, renewalHistory: [{ endDate: renewedEnd.toISOString(), source: "bridge-fixture" }] } },
            })
        }

        // Relationship — exactly the row sharePolicy creates (status active).
        const relBefore = await db.customerRelationship.findFirst({
            where: { agentUserId: agent.id, policyholderUserId: customer.id },
            select: { id: true, status: true },
        })
        const relationship = relBefore
            ? await db.customerRelationship.update({ where: { id: relBefore.id }, data: { status: "active" }, select: { id: true } })
            : await db.customerRelationship.create({
                  data: { agentUserId: agent.id, policyholderUserId: customer.id, status: "active" },
                  select: { id: true },
              })

        // Policy-scoped grant — the ONLY thing that confers capabilities (lib/policy-access.ts).
        const scope = `policy:${policyId}`
        const grantBefore = await db.accessGrant.findFirst({
            where: { granterUserId: customer.id, granteeUserId: agent.id, scope },
            select: { id: true, status: true, revokedAt: true },
        })
        const wantRevoked = state === "revoked_access"
        const grant = grantBefore
            ? await db.accessGrant.update({
                  where: { id: grantBefore.id },
                  data: wantRevoked ? { status: "revoked", revokedAt: new Date() } : { status: "active", revokedAt: null },
                  select: { id: true },
              })
            : await db.accessGrant.create({
                  data: {
                      granterUserId: customer.id,
                      granteeUserId: agent.id,
                      scope,
                      permissions: "edit",
                      status: wantRevoked ? "revoked" : "active",
                      revokedAt: wantRevoked ? new Date() : null,
                  },
                  select: { id: true },
              })

        // The completed run the fixture wrote — the degradations act on it.
        const run = await db.policyAnalysisRun.findFirst({
            where: { policyId, status: "completed" },
            orderBy: { finishedAt: "desc" },
            select: { id: true, attemptedRules: true, finishedAt: true },
        })
        const runBefore = run ? { attemptedRules: run.attemptedRules, finishedAt: run.finishedAt } : null

        const gapSlugs = spec.gapSlugs ?? []
        if (run) {
            if (state === "pre_plan") {
                await db.policyAnalysisRun.update({ where: { id: run.id }, data: { attemptedRules: null } })
            } else if (state === "stale_catalogue") {
                await db.policyAnalysisRun.update({
                    where: { id: run.id },
                    data: { attemptedRules: { slugs: gapSlugs, catalogueVersion: "stale-fixture-0000000000000000" } },
                })
            } else {
                // Healthy and every other state: a plan that matches the live catalogue, so the
                // stale sentence renders only where the state asks for it. For the unauthored
                // branch the plan is EMPTY (`slugs: []`) — that is what the composition reads
                // as "no authored check covers this branch" on both sides.
                await db.policyAnalysisRun.update({
                    where: { id: run.id },
                    data: { attemptedRules: { slugs: gapSlugs, catalogueVersion: currentCatalogueVersion() } },
                })
            }
        }

        let failedRunId: string | null = null
        if (state === "failed_run" && run) {
            const failed = await db.policyAnalysisRun.create({
                data: {
                    policyId,
                    userId: customer.id,
                    provider: "fixture",
                    model: "fixture",
                    status: "failed",
                    failureCode: "provider_error",
                    failureMessage: "fixture: the provider returned nothing",
                    startedAt: new Date(),
                    finishedAt: new Date(),
                },
                select: { id: true },
            })
            failedRunId = failed.id
        }

        // Book shape — reversible flips of the agent's OTHER relationships.
        let flippedRelationships: { id: string; status: string }[] = []
        if (state === "empty_book") {
            const all = await db.customerRelationship.findMany({ where: { agentUserId: agent.id }, select: { id: true, status: true } })
            flippedRelationships = all
            await db.customerRelationship.updateMany({ where: { agentUserId: agent.id }, data: { status: "inactive" } })
        } else if (state === "single_client_book") {
            const others = await db.customerRelationship.findMany({
                where: { agentUserId: agent.id, NOT: { id: relationship.id } },
                select: { id: true, status: true },
            })
            flippedRelationships = others
            if (others.length > 0) {
                await db.customerRelationship.updateMany({ where: { id: { in: others.map((o: { id: string }) => o.id) } }, data: { status: "inactive" } })
            }
        }

        const restore = async () => {
            await withDb(async (db2) => {
                if (failedRunId) await db2.policyAnalysisRun.delete({ where: { id: failedRunId } }).catch(() => undefined)
                if (run && runBefore) {
                    await db2.policyAnalysisRun.update({
                        where: { id: run.id },
                        data: { attemptedRules: runBefore.attemptedRules ?? undefined, finishedAt: runBefore.finishedAt },
                    }).catch(() => undefined)
                }
                for (const r of flippedRelationships) {
                    await db2.customerRelationship.update({ where: { id: r.id }, data: { status: r.status } }).catch(() => undefined)
                }
                if (relBefore && relBefore.status !== "active") {
                    await db2.customerRelationship.update({ where: { id: relBefore.id }, data: { status: relBefore.status } }).catch(() => undefined)
                }
                // Leave the grant ACTIVE after a revoked run so later specs see the shared policy.
                await db2.accessGrant.update({ where: { id: grant.id }, data: { status: "active", revokedAt: null } }).catch(() => undefined)
            })
        }

        return {
            state,
            policyId,
            customerUserId: customer.id,
            agentUserId: agent.id,
            relationshipId: relationship.id,
            grantId: grant.id,
            completedRunId: run?.id ?? null,
            restore,
        }
    })
}

export interface TwoSidedSessions {
    customer: Page
    agent: Page
    close: () => Promise<void>
}

/** Both sessions, from the storage states the auth setups write. */
export async function openTwoSided(browser: Browser): Promise<TwoSidedSessions> {
    const mk = async (storageState: string): Promise<{ ctx: BrowserContext; page: Page }> => {
        if (!existsSync(storageState)) throw new Error(`two-sided harness: ${storageState} missing — run the setup projects`)
        const ctx = await browser.newContext({ storageState, locale: "el-GR", viewport: { width: BRIDGE_WIDTH, height: 844 } })
        const page = await ctx.newPage()
        return { ctx, page }
    }
    const c = await mk("playwright/.auth/user.json")
    const a = await mk("playwright/.auth/agent.json")
    return {
        customer: c.page,
        agent: a.page,
        close: async () => {
            await c.ctx.close()
            await a.ctx.close()
        },
    }
}

/** Playwright serialises the extractor's source; the cast only widens the literal parameter for the overload. */
function evaluateAttributeMap(page: Page, attribute: "data-fact" | "data-count"): Promise<FactMap> {
    return page.evaluate(extractAttributeMap as unknown as (attr: string) => FactMap, attribute)
}

export interface BridgeCapture extends SideCapture {
    label: string
    state: BridgeState
    status: number | null
    finalUrl: string
    text: string
    hscroll: boolean
    lang: string
    screenshot: string
}

/**
 * Open `url` as `side` and capture what a parity comparison needs. Never
 * throws on a non-200: a revoked agent landing on 404 IS the expected capture.
 */
export async function captureSide(
    page: Page,
    side: "customer" | "agent",
    url: string,
    label: string,
    state: BridgeState,
    prepare?: (page: Page) => Promise<void>
): Promise<BridgeCapture> {
    const base = process.env.BASE_URL || "http://localhost:3000"
    const dir = join(BRIDGE_EVIDENCE_DIR, state)
    mkdirSync(dir, { recursive: true })
    let status: number | null = null
    try {
        await openSurface(page, `${base}${url}`, BRIDGE_WIDTH)
    } catch {
        // Fall through to a direct navigation so a 404/redirect is still captured.
        const res = await page.goto(`${base}${url}`, { waitUntil: "domcontentloaded" }).catch(() => null)
        status = res?.status() ?? null
        await page.waitForTimeout(1500)
    }
    if (status === null) {
        const res = await page.request.get(`${base}${url}`, { maxRedirects: 0 }).catch(() => null)
        status = res?.status() ?? null
    }
    if (prepare) {
        await prepare(page)
        await page.waitForTimeout(800)
    }
    const finalUrl = page.url().replace(base, "")
    const [facts, counts, text, hscroll, lang] = await Promise.all([
        evaluateAttributeMap(page, "data-fact"),
        evaluateAttributeMap(page, "data-count"),
        page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 20000)),
        page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth),
        page.evaluate(() => document.documentElement.lang),
    ])
    const screenshot = join(dir, `${label}.${side}.png`)
    await page.screenshot({ path: screenshot, fullPage: true }).catch(() => undefined)
    const capture: BridgeCapture = { side, url, label, state, status, finalUrl, facts, counts, text, hscroll, lang, screenshot }
    writeFileSync(join(dir, `${label}.${side}.json`), JSON.stringify({ ...capture, text: capture.text.slice(0, 4000) }, null, 2))
    return capture
}

/**
 * The page pairs the loop compares.
 *  - policy: the two policy pages share `AnalysisCard`; identity/date/premium facts pair once A-08 tags them.
 *  - wallet: the customer's list against the agent's client policies — per-policy, subject-scoped keys.
 *  - home: the customer's dashboard against the agent's customer profile. Portfolio-level by nature and
 *    visibility-scoped on the agent side (D-B3): expected to pair NOTHING; kept so the number is measured, not assumed.
 */
export interface PagePair {
    label: string
    customer: string
    agent: string
    /** Runs on the agent page after it is open — the profile's tabs are local state, not URLs. */
    agentPrepare?: (page: Page) => Promise<void>
}

export const OPEN_POLICIES_TAB = async (page: Page) => {
    const tab = page.getByRole("tab", { name: /Ασφαλιστήρια|Policies/ }).first()
    if (await tab.count()) await tab.click()
}

export function pairUrls(seed: SeededPair): PagePair[] {
    return [
        { label: "policy", customer: `/wallet/${seed.policyId}`, agent: `/customers/${seed.customerUserId}/policy/${seed.policyId}` },
        { label: "wallet", customer: `/wallet`, agent: `/customers/${seed.customerUserId}`, agentPrepare: OPEN_POLICIES_TAB },
        // The agent's book list — captured for its TEXT (the labelled under-review figure, A-02); counts are visibility-scoped and do not pair.
        { label: "book", customer: `/dashboard`, agent: `/customers` },
        // The customer's advisor page against the agent's profile of them — captured for the disclosure facts (A-09/A-10: grant levels, «N of M»).
        { label: "advisor", customer: `/agent`, agent: `/customers/${seed.customerUserId}` },
        { label: "home", customer: `/dashboard`, agent: `/customers/${seed.customerUserId}` },
    ]
}
