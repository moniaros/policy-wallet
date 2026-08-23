/**
 * GOAL 0 baseline — dashboard (mobile), B2C wallet.
 *
 * 15 matrix captures (5 portfolio states × 320/390/430) + 3 analysis-state
 * captures at 320px on `heavy` + 1 Pro-tier capture. Locale `el`.
 *
 * Every shared metric is imported from ./policy-detail UNCHANGED, so the two
 * surfaces' numbers are comparable and a definition cannot fork. Only the two
 * dashboard-specific metrics live in ./dashboard.
 *
 * Serial by necessity: portfolio state is a property of the account's whole
 * wallet, so the spec rebuilds that wallet between captures.
 *
 * Run:  npx playwright test --project=measure-dash
 */

import { test, expect, type Page } from "@playwright/test"
import { mkdirSync, writeFileSync, readFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { PORTFOLIO_STATES, applyPortfolioState, policiesFor, type PortfolioState } from "./dashboard-fixtures"
import { clippedContent, countConsistency, duplicateBlocks, internalTokenLeaks } from "./dashboard"
import {
    WIDTHS,
    settle,
    scrollHeight,
    sectionCount,
    containerCount,
    smallTapTargets,
    clippedLabels,
    latinSentences,
    repeatedStrings,
    contrastFailures,
    nonTextContrastFailures,
} from "./policy-detail"

const EVIDENCE = path.join(process.cwd(), "docs", "evidence", "dashboard-mobile")
/**
 * Which RUN this is. Defaults to `current`, never `baseline`.
 *
 * The spec used to write to a fixed `baseline/` directory, so re-running it
 * OVERWROTE the reference it was supposed to be compared against — which is
 * exactly what happened in `f23ee784`: the Goal 0 captures were replaced by
 * post-change ones while BASELINE.md's prose table still described the old
 * numbers, leaving the evidence directory internally contradictory. The true
 * pre-change data had to be recovered from git.
 *
 * A run now has to be NAMED to overwrite anything, and the name a careless run
 * gets is `current`.
 */
const RUN = process.env.MEASURE_RUN || "current"
const SHOTS = path.join(EVIDENCE, "screenshots", RUN)
const DATA = path.join(EVIDENCE, "data", RUN)
const HEIGHT: Record<number, number> = { 320: 720, 390: 844, 430: 932 }

const DASH_EMAIL = "e2e-ph-dash@policywallet.test"

function loadEnv() {
    for (const file of [".env.local", ".env"]) {
        try {
            for (const line of readFileSync(path.join(process.cwd(), file), "utf8").split("\n")) {
                const m = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/)
                if (m && !process.env[m[1]]) process.env[m[1]] = m[2]
            }
        } catch { /* absent */ }
    }
}

async function withDb<T>(fn: (db: any) => Promise<T>): Promise<T> {
    loadEnv()
    const base = process.env.DATABASE_URL || ""
    const url = base.replace(/connection_limit=\d+/, "connection_limit=1").replace(/pool_timeout=\d+/, "pool_timeout=120")
    const { PrismaClient } = await import("@prisma/client")
    const db = new PrismaClient({ datasources: { db: { url } } })
    try {
        return await fn(db)
    } finally {
        await db.$disconnect()
    }
}

test.describe.configure({ mode: "serial" })

test.beforeAll(() => {
    mkdirSync(SHOTS, { recursive: true })
    mkdirSync(DATA, { recursive: true })
})

/**
 * Land on a RENDERED dashboard or refuse to measure.
 *
 * Both halves are lessons from the policy-detail series: a session that has
 * lapsed lands on /auth/signin and the harness measured the login page while
 * reporting a dashboard verdict; and under `next dev` the shell paints before
 * the RSC body finishes, so a page can be "loaded" with no content. The
 * readiness selector is the page's own h1 — not a section id, which a later
 * restructure is entitled to rename.
 */
async function openDashboard(page: Page, width: number) {
    await page.setViewportSize({ width, height: HEIGHT[width] })
    for (let attempt = 0; attempt < 2; attempt++) {
        await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 90_000 })
        await page.waitForTimeout(500)
        if (page.url().includes("/auth/signin")) continue
        await dismissCookieBanner(page)
        try {
            await page.waitForSelector(".pw-page-shell h1, main h1", { timeout: 45_000, state: "attached" })
        } catch {
            continue
        }
        await settle(page)
        return
    }
    throw new Error("openDashboard: never rendered its content (or bounced to signin) — refusing to measure")
}

/**
 * REFUSE TO WRITE A NON-RENDER.
 *
 * A retry of `pro-home` after a fixture error wrote a 864px capture over a good
 * 6139px one, and a `empty@390` landed at 988px. Both are shell-only pages — a
 * dashboard that rendered its chrome and none of its content. Nothing in the
 * pipeline noticed, because "smaller" reads as "better" in every metric this
 * harness collects, so a broken capture is indistinguishable from an
 * improvement in the summary table.
 *
 * The floor is deliberately crude: the smallest real capture in the whole
 * matrix is the EMPTY portfolio at 430px, ~2900px. Anything under 1500px did
 * not render the page.
 */
function assertRendered(label: string, width: number, scrollHeight: number, sections: number) {
    if (scrollHeight < 1500 || sections < 3) {
        throw new Error(
            `${label}@${width}: refusing to record a non-render — ${scrollHeight}px, ${sections} sections. ` +
            `The page did not paint its content (auth bounce, error boundary, or a retry racing the fixtures).`
        )
    }
}

async function capture(page: Page, label: string, width: number, extra: Record<string, unknown> = {}) {
    const text = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "))
    const data = {
        capture: label,
        width,
        url: page.url(),
        scrollHeight: await scrollHeight(page),
        viewportsOfContent: Number((await scrollHeight(page) / HEIGHT[width]).toFixed(1)),
        sections: await sectionCount(page),
        containers: await containerCount(page),
        tapTargets: await smallTapTargets(page),
        // Dashboard-specific
        countConsistency: await countConsistency(page),
        duplicateBlocks: await duplicateBlocks(page),
        internalTokenLeaks: await internalTokenLeaks(page),
        probes: {
            clippedLabels: await clippedLabels(page),
            // What the shared probe structurally cannot see on this surface:
            clippedContent: await clippedContent(page),
            latinSentences: await latinSentences(page),
            repeatedStrings: await repeatedStrings(page),
            fullText: text,
        },
        contrast: {
            text: await contrastFailures(page),
            nonText: await nonTextContrastFailures(page),
        },
        ...extra,
    }
    assertRendered(label, width, data.scrollHeight, data.sections.count)
    writeFileSync(path.join(DATA, `${label}-${width}.json`), JSON.stringify(data, null, 2))
    await page.screenshot({ path: path.join(SHOTS, `${label}-${width}.png`), fullPage: true })
    console.log(
        `[dash] ${label}@${width}: ${data.scrollHeight}px (${data.viewportsOfContent} screens), ` +
        `${data.sections.count} sections, ${data.containers.count} containers (depth ${data.containers.maxDepth}), ` +
        `${data.tapTargets.length} sub-44, ${data.countConsistency.failures} count-consistency, ` +
        `${data.duplicateBlocks.length} duplicate blocks, ${data.internalTokenLeaks.length} token leaks, ` +
        `${data.contrast.text.length}/${data.contrast.nonText.length} contrast (1.4.3/1.4.11)`
    )
    return data
}

// ── The 15-capture matrix ────────────────────────────────────────────────────
for (const state of PORTFOLIO_STATES) {
    test(`baseline: ${state}`, async ({ page }) => {
        test.setTimeout(20 * 60_000)

        const ids = await withDb((db) => applyPortfolioState(db, DASH_EMAIL, state as PortfolioState))
        expect(ids.length, `${state}: fixture count`).toBe(policiesFor(state as PortfolioState).length)

        for (const width of WIDTHS) {
            await openDashboard(page, width)

            // STATE SANITY. A capture labelled `all-expired` that is really
            // showing a stale `heavy` wallet would poison every conclusion —
            // this is the check that caught the free-tier mislabelling on
            // policy-detail, applied before the numbers are believed.
            const rendered = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "))
            if (state === "empty") {
                expect(rendered, "empty state still lists policies").not.toMatch(/ΣΥΜΒ-2026-/)
            } else {
                const first = policiesFor(state as PortfolioState)[0]
                expect(
                    rendered.includes(first.insurerName) || rendered.length > 400,
                    `${state}@${width}: the wallet does not look like this state`
                ).toBe(true)
            }

            // COUNT, not shape. The check above passed while every state was
            // rendering a stale `heavy` wallet on top of itself: renaming the
            // fixture policy prefix orphaned 12 rows that the cleanup filter no
            // longer matched, so `empty` measured 13 sections and 80 containers.
            // `rendered.length > 400` cannot tell a correct wallet from a
            // correct wallet plus somebody else's. The count can.
            const shown = await page.evaluate(
                () => document.querySelectorAll("[data-policy-row], a[href^='/wallet/']").length
            )
            expect(
                shown,
                `${state}@${width}: the page shows ${shown} policy links for a ${ids.length}-policy wallet — stale fixtures?`
            ).toBeLessThanOrEqual(Math.max(ids.length, 6) + 4)

            await capture(page, `${state}`, width, { portfolioState: state, policyCount: ids.length })
        }
    })
}

// ── Analysis-state captures, 320px on `heavy` ────────────────────────────────
test("baseline: analysis states on the heavy portfolio", async ({ page }) => {
    test.setTimeout(20 * 60_000)
    await withDb((db) => applyPortfolioState(db, DASH_EMAIL, "heavy"))

    // (a) one policy IN PROGRESS
    await withDb(async (db) => {
        const owner = await db.user.findUnique({ where: { email: DASH_EMAIL }, select: { id: true } })
        await db.policy.updateMany({
            where: { ownerUserId: owner.id, policyNumber: "ΣΥΜΒ-2026-H12" },
            data: { status: "analyzing" },
        })
    })
    await openDashboard(page, 320)
    await capture(page, "heavy-analysis-in-progress", 320)

    // (b) NOTHING ever analysed — the score has no input at all
    await withDb(async (db) => {
        const owner = await db.user.findUnique({ where: { email: DASH_EMAIL }, select: { id: true } })
        await db.policy.updateMany({
            where: { ownerUserId: owner.id, policyNumber: { startsWith: "ΣΥΜΒ-2026-" } },
            data: { status: "active", lastAnalyzedAt: null, coverageSummary: null },
        })
        await db.policyAnalysisRun.deleteMany({
            where: { policy: { ownerUserId: owner.id, policyNumber: { startsWith: "ΣΥΜΒ-2026-" } } },
        })
    })
    await openDashboard(page, 320)
    await capture(page, "heavy-never-analysed", 320)

    // (c) every analysis FAILED
    await withDb(async (db) => {
        const owner = await db.user.findUnique({ where: { email: DASH_EMAIL }, select: { id: true } })
        const policies = await db.policy.findMany({
            where: { ownerUserId: owner.id, policyNumber: { startsWith: "ΣΥΜΒ-2026-" } },
            select: { id: true, acordData: true },
        })
        for (const p of policies) {
            await db.policy.update({
                where: { id: p.id },
                data: {
                    lastAnalyzedAt: new Date(Date.now() - 5 * 86_400_000),
                    acordData: {
                        ...(p.acordData as object),
                        processingError: {
                            code: "TRANSIENT_FAILURE",
                            message: "Your project has exceeded its monthly spending cap.",
                            retryable: true,
                            occurredAt: new Date().toISOString(),
                        },
                    },
                },
            })
            await db.policyAnalysisRun.create({
                data: {
                    policyId: p.id, userId: owner.id, provider: "fixture", model: "fixture",
                    status: "failed", failureCode: "TRANSIENT_FAILURE",
                    startedAt: new Date(), finishedAt: new Date(),
                },
            })
        }
    })
    await openDashboard(page, 320)
    await capture(page, "heavy-all-failed", 320)
})
