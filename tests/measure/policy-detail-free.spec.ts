/**
 * The FREE-TIER half of the policy-detail evidence matrix.
 *
 * Why this file exists: the Goal 0 baseline was captured on an account that
 * turned out to hold an active `ph-pro` subscription, so in 18 captures the
 * free-only surfaces never rendered once — the locked gap report and its €3
 * unlock CTA, the PDF-preview lock, the premium-insight upsell cards, the
 * sidebar upgrade banner, the free-questions trigger. Goal 2 relocates every
 * capability on this page; a capability nobody has ever seen cannot be
 * relocated, only lost. This measures them before the restructure touches them.
 *
 * Runs in the `measure-free` Playwright project, which carries the free-tier
 * session — tier is a property of the session's user and cannot be passed in.
 *
 * Run:  npx playwright test --project=measure-free
 */

import { test, expect } from "@playwright/test"
import { mkdirSync, writeFileSync, readFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { FREE_SPECS, provisionMatrixFixtures } from "./fixtures"
import {
    WIDTHS,
    settle,
    scrollHeight,
    sectionCount,
    containerCount,
    smallTapTargets,
    clippedLabels,
    repeatedStrings,
} from "./policy-detail"

const EVIDENCE = path.join(process.cwd(), "docs", "evidence", "policy-detail-mobile")
const SHOTS = path.join(EVIDENCE, "screenshots", "free")
const DATA = path.join(EVIDENCE, "data", "free")

const HEIGHT: Record<number, number> = { 320: 720, 390: 844, 430: 932 }

function loadEnvFromDotenvFiles() {
    for (const file of [".env.local", ".env"]) {
        try {
            const content = readFileSync(path.join(process.cwd(), file), "utf8")
            for (const line of content.split("\n")) {
                const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*"?([^"\n]*)"?\s*$/)
                if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
            }
        } catch { /* absent — fine */ }
    }
}

test.describe.configure({ mode: "serial" })

let ids: Record<string, string> = {}

test.beforeAll(async () => {
    test.setTimeout(300_000)
    loadEnvFromDotenvFiles()
    const base = process.env.DATABASE_URL || ""
    const url = base.replace(/connection_limit=\d+/, "connection_limit=1").replace(/pool_timeout=\d+/, "pool_timeout=120")
    const { PrismaClient } = await import("@prisma/client")
    const db = new PrismaClient({ datasources: { db: { url } } })
    try {
        for (let attempt = 0; ; attempt++) {
            try {
                ids = await provisionMatrixFixtures(db, "e2e-ph-free@policywallet.test", FREE_SPECS)
                break
            } catch (err) {
                if (attempt >= 1) throw err
                await new Promise((r) => setTimeout(r, 5_000))
            }
        }
        // The report unlock is a one-off PURCHASE that survives re-analysis, so
        // a fixture that was ever unlocked stays unlocked and the paywall never
        // renders again. Reset it, the same way global-setup resets the trial
        // and free-question counters.
        await db.policy.updateMany({
            where: { id: { in: Object.values(ids) } },
            data: { reportUnlockedAt: null },
        })
    } finally {
        await db.$disconnect()
    }
    mkdirSync(SHOTS, { recursive: true })
    mkdirSync(DATA, { recursive: true })
})

async function open(page: import("@playwright/test").Page, key: string, width: number) {
    const policyId = ids[key]
    expect(policyId, `fixture ${key} provisioned`).toBeTruthy()
    await page.setViewportSize({ width, height: HEIGHT[width] })
    for (let attempt = 0; attempt < 2; attempt++) {
        await page.goto(`/wallet/${policyId}`, { waitUntil: "domcontentloaded", timeout: 90_000 })
        await page.waitForTimeout(400)
        if (page.url().includes("/auth/signin")) continue
        await dismissCookieBanner(page)
        try {
            // Readiness is the page's H1 — the policy's identity — not a
            // section id. Waiting on `#summary` tied the harness to one
            // structure, so the Goal 2 restructure (which legitimately renames
            // and removes section ids) read as "the page never rendered". The
            // probe must survive the change it exists to measure.
            await page.waitForSelector(".pw-page-shell h1", { timeout: 45_000, state: "attached" })
        } catch {
            continue
        }
        await settle(page)
        return
    }
    throw new Error(`open: ${key} never rendered its content (or bounced to signin) — refusing to measure`)
}

/**
 * The free-only surfaces, by the string or control that proves each one
 * rendered. This list IS the coverage claim: what is false here was not
 * measured, and Goal 2 must account for it from the ledger instead.
 */
const FREE_SURFACES = {
    reportLocked: (text: string) => /Ξεκλείδ/.test(text),
    upgradeBanner: (text: string) => /Αναβάθμιση/.test(text),
    premiumInsightCards: (text: string) => /Κλειδωμ|Premium|Pro/i.test(text),
}

for (const spec of FREE_SPECS) {
    test(`free-tier capture: ${spec.key}`, async ({ page }) => {
        test.setTimeout(12 * 60_000)

        for (const width of WIDTHS) {
            await open(page, spec.key, width)

            const text = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "))
            const capture = {
                fixture: spec.key,
                tier: "free",
                width,
                url: page.url(),
                scrollHeight: await scrollHeight(page),
                sections: await sectionCount(page),
                containers: await containerCount(page),
                tapTargets: await smallTapTargets(page),
                freeSurfaces: Object.fromEntries(
                    Object.entries(FREE_SURFACES).map(([k, f]) => [k, f(text)])
                ),
                probes: {
                    clippedLabels: await clippedLabels(page),
                    repeatedStrings: await repeatedStrings(page),
                    // Every upgrade/unlock affordance, so the ledger can name them.
                    monetizationCtas: await page.evaluate(() =>
                        Array.from(document.querySelectorAll('a[href*="upgrade"], a[href*="gap-unlock"], button'))
                            .map((el) => (el.textContent || "").trim())
                            .filter((t) => /Αναβάθμιση|Ξεκλείδ|Pro|Plus|αναβαθ/i.test(t))
                            .slice(0, 20)
                    ),
                    fullText: text,
                },
            }
            writeFileSync(path.join(DATA, `${spec.key}-${width}.json`), JSON.stringify(capture, null, 2))
            await page.screenshot({ path: path.join(SHOTS, `${spec.key}-${width}.png`), fullPage: true })
        }
    })
}

/**
 * The point of the whole file: assert the free surfaces ACTUALLY rendered.
 *
 * Without this the spec could capture a page identical to the pro one and the
 * evidence would look complete while covering nothing — exactly the failure
 * this file was written to correct.
 */
test("the free-tier surfaces are actually on screen (else the coverage claim is empty)", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    await open(page, "free-motor-active", 390)
    const text = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "))

    // Tier sanity: the pro-only direct export must NOT be here. If it is, the
    // session is not free and every capture in this file is mislabelled.
    expect(text, "this session is not free-tier — the captures would be mislabelled")
        .not.toContain("Εξαγωγή αναφοράς")

    expect(FREE_SURFACES.reportLocked(text), "gap report is not locked — the paywall boundary never rendered").toBe(true)
    expect(FREE_SURFACES.upgradeBanner(text), "no upgrade affordance rendered").toBe(true)
})
