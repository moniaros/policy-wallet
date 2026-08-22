/**
 * GOAL 0 baseline pass — policy-detail (mobile), B2C wallet.
 *
 * Runs the 18-capture evidence matrix (motor/health × active/expiring/expired
 * × 320/390/430, locale el) with the shared metric definitions in
 * ./policy-detail.ts, saves full-page screenshots and per-capture JSON under
 * docs/evidence/policy-detail-mobile/, and takes candidate-defect probes.
 *
 * Also captures the REAL analysed policy already on the E2E account
 * (Εθνική 64504715 — English stored summary, failed latest analysis run),
 * which is the page the candidate defects were originally observed on.
 * Those captures are labelled `real-*` and are NOT part of the matrix.
 *
 * Run:  npx playwright test --project=measure
 */

import { test, expect } from "@playwright/test"
import { mkdirSync, writeFileSync, readFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { FIXTURE_SPECS, fixtureDates, provisionMatrixFixtures } from "./fixtures"
import {
    WIDTHS,
    settle,
    scrollHeight,
    sectionCount,
    containerCount,
    duplicateFacts,
    smallTapTargets,
    contrastFailures,
    latinSentences,
    nonTelPhoneNumbers,
    clippedLabels,
    dateFacts,
    repeatedStrings,
    type FactSpec,
} from "./policy-detail"

const EVIDENCE = path.join(process.cwd(), "docs", "evidence", "policy-detail-mobile")
const SHOTS = path.join(EVIDENCE, "screenshots", "baseline")
const DATA = path.join(EVIDENCE, "data", "baseline")

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

const el = (d: Date) => d.toLocaleDateString("el-GR", { timeZone: "Europe/Athens" })

test.describe.configure({ mode: "serial" })

let ids: Record<string, string> = {}
let realPolicyId: string | null = null

test.beforeAll(async () => {
    // Provisioning runs ~40 sequential queries against the remote dev
    // Supabase, whose pooler regularly takes seconds per connect — the
    // default 30s hook timeout is not enough, and the default pool params
    // (connection_limit=5&pool_timeout=20, shared with the running dev
    // server) time out under contention. Use ONE connection with a long
    // pool timeout and retry the whole provisioning pass once.
    test.setTimeout(300_000)
    loadEnvFromDotenvFiles()
    const base = process.env.DATABASE_URL || ""
    const url = base.replace(/connection_limit=\d+/, "connection_limit=1").replace(/pool_timeout=\d+/, "pool_timeout=120")
    const { PrismaClient } = await import("@prisma/client")
    const db = new PrismaClient({ datasources: { db: { url } } })
    try {
        for (let attempt = 0; ; attempt++) {
            try {
                ids = await provisionMatrixFixtures(db, "e2e-ph@policywallet.test")
                break
            } catch (err) {
                if (attempt >= 1) throw err
                await new Promise((r) => setTimeout(r, 5_000))
            }
        }
        const real = await db.policy.findFirst({
            where: { policyNumber: "64504715", owner: { email: "e2e-ph@policywallet.test" } },
            select: { id: true },
        })
        realPolicyId = real?.id ?? null
    } finally {
        await db.$disconnect()
    }
    mkdirSync(SHOTS, { recursive: true })
    mkdirSync(DATA, { recursive: true })
})

async function gotoPolicy(page: import("@playwright/test").Page, policyId: string) {
    // Never measure a redirect target (the guard-defect lesson from STATUS
    // 2026-08-21c): land, check, retry once, then refuse.
    for (let attempt = 0; attempt < 2; attempt++) {
        await page.goto(`/wallet/${policyId}`, { waitUntil: "domcontentloaded", timeout: 90_000 })
        await page.waitForTimeout(500)
        if (page.url().includes("/auth/signin")) continue
        // …and the content itself, not just the shell. Measuring a page whose
        // RSC body is still streaming reports a shorter, emptier page than the
        // product has — the metric equivalent of the redirect defect above.
        try {
            // Readiness is the page's H1 — the policy's identity — not a
            // section id. Waiting on `#summary` tied the harness to one
            // structure, so the Goal 2 restructure (which legitimately renames
            // and removes section ids) read as "the page never rendered". The
            // probe must survive the change it exists to measure.
            await page.waitForSelector(".pw-page-shell h1", { timeout: 45_000, state: "attached" })
            return
        } catch {
            continue
        }
    }
    throw new Error(`gotoPolicy: ${policyId} never rendered its content (or bounced to signin) — refusing to measure`)
}

for (const spec of FIXTURE_SPECS) {
    test(`baseline: ${spec.key}`, async ({ page }) => {
        test.setTimeout(12 * 60_000)
        const policyId = ids[spec.key]
        expect(policyId, `fixture ${spec.key} provisioned`).toBeTruthy()

        const { start, end } = fixtureDates(spec.state)
        const facts: FactSpec[] = [
            { key: "policy.expiryDate", value: el(end) },
            { key: "policy.startDate", value: el(start) },
            { key: "policy.policyNumber", value: spec.policyNumber },
            ...(spec.lineOfBusiness === "motor" ? [{ key: "vehicle.plate", value: "ΙΚΖ-4821" }] : []),
        ]

        for (const width of WIDTHS) {
            await page.setViewportSize({ width, height: HEIGHT[width] })
            await gotoPolicy(page, policyId)
            await dismissCookieBanner(page)
            await settle(page)

            const capture = {
                fixture: spec.key,
                width,
                url: page.url(),
                scrollHeight: await scrollHeight(page),
                sections: await sectionCount(page),
                containers: await containerCount(page),
                duplicates: await duplicateFacts(page, facts),
                tapTargets: await smallTapTargets(page),
                probes: {
                    latinSentences: await latinSentences(page),
                    nonTelPhones: await nonTelPhoneNumbers(page),
                    clippedLabels: await clippedLabels(page),
                    dateFacts: await dateFacts(page),
                    repeatedStrings: await repeatedStrings(page),
                    sidebarText: await page.evaluate(() => (document.querySelector(".pw-page-shell aside")?.textContent || "").replace(/\s+/g, " ").slice(0, 1500)),
                    navLabels: await page.evaluate(() =>
                        Array.from(document.querySelectorAll('nav[aria-label] a[href^="#"]')).map((a) => (a.textContent || "").trim())
                    ),
                    // Whole-page visible text — lets empty-state / placeholder
                    // audits run post-hoc without re-rendering the fixture.
                    fullText: await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ")),
                },
                contrastLight: await contrastFailures(page),
            }
            writeFileSync(path.join(DATA, `${spec.key}-${width}.json`), JSON.stringify(capture, null, 2))
            await page.screenshot({ path: path.join(SHOTS, `${spec.key}-${width}.png`), fullPage: true })
        }

        // One dark-theme contrast pass per fixture at 390 (scope noted in BASELINE.md).
        await page.setViewportSize({ width: 390, height: HEIGHT[390] })
        await page.addInitScript(() => { try { window.localStorage.setItem("theme", "dark") } catch { /* storage unavailable */ } })
        await gotoPolicy(page, policyId)
        await dismissCookieBanner(page)
        await settle(page)
        const dark = await contrastFailures(page)
        writeFileSync(path.join(DATA, `${spec.key}-390-dark-contrast.json`), JSON.stringify(dark, null, 2))
        await page.addInitScript(() => { try { window.localStorage.setItem("theme", "light") } catch { /* storage unavailable */ } })
    })
}

test("baseline: real policy 64504715 (candidate reproduction)", async ({ page }) => {
    test.setTimeout(12 * 60_000)
    test.skip(!realPolicyId, "real analysed policy not present on the E2E account in this database")

    for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: HEIGHT[width] })
        await gotoPolicy(page, realPolicyId!)
        await dismissCookieBanner(page)
        await settle(page)

        const capture = {
            fixture: "real-64504715",
            width,
            url: page.url(),
            scrollHeight: await scrollHeight(page),
            sections: await sectionCount(page),
            containers: await containerCount(page),
            tapTargets: await smallTapTargets(page),
            probes: {
                latinSentences: await latinSentences(page),
                nonTelPhones: await nonTelPhoneNumbers(page),
                clippedLabels: await clippedLabels(page),
                dateFacts: await dateFacts(page),
                repeatedStrings: await repeatedStrings(page),
                sidebarText: await page.evaluate(() => (document.querySelector(".pw-page-shell aside")?.textContent || "").replace(/\s+/g, " ").slice(0, 1500)),
                summaryText: await page.evaluate(() => (document.querySelector("#summary")?.textContent || "").replace(/\s+/g, " ").slice(0, 1200)),
                analysisText: await page.evaluate(() => (document.querySelector("#analysis")?.textContent || "").replace(/\s+/g, " ").slice(0, 2000)),
                heroText: await page.evaluate(() => {
                    const hero = document.querySelector(".pw-page-shell section")
                    return (hero?.textContent || "").replace(/\s+/g, " ").slice(0, 1200)
                }),
                fullText: await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " ")),
            },
        }
        writeFileSync(path.join(DATA, `real-64504715-${width}.json`), JSON.stringify(capture, null, 2))
        await page.screenshot({ path: path.join(SHOTS, `real-64504715-${width}.png`), fullPage: true })
    }
})
