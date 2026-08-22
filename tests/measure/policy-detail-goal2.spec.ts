/**
 * GOAL 2 acceptance — one structure, one navigation.
 *
 * Thresholds from the brief, asserted at EVERY width rather than on average:
 *
 *   · section count ≤ 8
 *   · duplicate-fact count = 0
 *   · exactly one navigation system
 *   · the ten-second test: all four questions answerable in the first two
 *     viewports, at 320px, in Greek
 *   · AI entry points ≤ 2
 *
 * The ten-second test is the one that cannot be faked by counting: it asserts
 * that each of the four answers is present ABOVE a hard pixel line, which is
 * what "in the first two viewports" means for a reader who has not scrolled.
 *
 * Run:  npx playwright test --project=measure policy-detail-goal2
 */

import { test, expect, type Page } from "@playwright/test"
import { readFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { FIXTURE_SPECS, fixtureDates, provisionMatrixFixtures } from "./fixtures"
import { WIDTHS, settle, sectionCount, duplicateFacts, type FactSpec } from "./policy-detail"

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
                ids = await provisionMatrixFixtures(db, "e2e-ph@policywallet.test")
                break
            } catch (err) {
                if (attempt >= 1) throw err
                await new Promise((r) => setTimeout(r, 5_000))
            }
        }
    } finally {
        await db.$disconnect()
    }
})

async function open(page: Page, key: string, width: number) {
    const policyId = ids[key]
    expect(policyId, `fixture ${key} provisioned`).toBeTruthy()
    await page.setViewportSize({ width, height: HEIGHT[width] })
    for (let attempt = 0; attempt < 2; attempt++) {
        await page.goto(`/wallet/${policyId}`, { waitUntil: "domcontentloaded", timeout: 90_000 })
        await page.waitForTimeout(400)
        if (page.url().includes("/auth/signin")) continue
        await dismissCookieBanner(page)
        try {
            await page.waitForSelector(".pw-page-shell h1", { timeout: 45_000, state: "attached" })
        } catch {
            continue
        }
        await settle(page)
        return
    }
    throw new Error(`open: ${key} never rendered its content (or bounced to signin) — refusing to assert`)
}

const el = (d: Date) => d.toLocaleDateString("el-GR", { timeZone: "Europe/Athens" })

// ── Section count ────────────────────────────────────────────────────────────
for (const spec of FIXTURE_SPECS) {
    test(`sections ≤ 8 at every width — ${spec.key}`, async ({ page }) => {
        test.setTimeout(6 * 60_000)
        for (const width of WIDTHS) {
            await open(page, spec.key, width)
            const { count, ids: sectionIds } = await sectionCount(page)
            expect(
                count,
                `@${width}: ${count} sections (target ≤ 8):\n${sectionIds.join("\n")}`
            ).toBeLessThanOrEqual(8)
        }
    })
}

// ── Duplicate facts ──────────────────────────────────────────────────────────
for (const spec of FIXTURE_SPECS) {
    test(`no fact renders twice — ${spec.key}`, async ({ page }) => {
        test.setTimeout(6 * 60_000)
        const { start, end } = fixtureDates(spec.state)
        const facts: FactSpec[] = [
            { key: "policy.expiryDate", value: el(end) },
            { key: "policy.startDate", value: el(start) },
            { key: "policy.policyNumber", value: spec.policyNumber },
        ]

        for (const width of WIDTHS) {
            await open(page, spec.key, width)

            // With every section OPEN — the hard case. A collapsed page trivially
            // has no duplicates; the invariant has to hold when everything the
            // reader can open is open at once.
            await page.evaluate(() => {
                document.querySelectorAll<HTMLButtonElement>('section[id] > h2 > button[aria-expanded="false"]')
                    .forEach((b) => b.click())
            })
            await page.waitForTimeout(600)

            const dup = await duplicateFacts(page, facts)
            expect(
                dup.dataFactDuplicates,
                `@${width}: data-fact rendered more than once: ${JSON.stringify(dup.dataFactDuplicates)}`
            ).toEqual([])
            expect(
                dup.valueScanDuplicates.map((v) => `${v.key}="${v.value}" ×${v.count}`),
                `@${width}: the same value renders in several places:\n${dup.valueScanDuplicates
                    .map((v) => `${v.key} ×${v.count}\n  ${v.where.join("\n  ")}`)
                    .join("\n")}`
            ).toEqual([])
        }
    })
}

// ── One navigation system ────────────────────────────────────────────────────
test("exactly one navigation system on the page", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await open(page, "motor-active", width)

        const systems = await page.evaluate(() => {
            const shell = document.querySelector(".pw-page-shell")
            if (!shell) return null
            // Anything that navigates WITHIN the page: an anchor strip, a tablist,
            // or a set of disclosure headers. The app shell's bottom bar is site
            // chrome and lives outside .pw-page-shell.
            const anchorStrips = Array.from(shell.querySelectorAll("nav")).filter(
                (n) => n.querySelectorAll('a[href^="#"]').length >= 3
            ).length
            const tablists = shell.querySelectorAll('[role="tablist"]').length
            const disclosureSets = shell.querySelectorAll('section[id] > h2 > button[aria-expanded]').length > 0 ? 1 : 0
            return { anchorStrips, tablists, disclosureSets }
        })

        expect(systems, `@${width}: page shell missing`).not.toBeNull()
        expect(systems!.anchorStrips, `@${width}: an in-page anchor strip is back`).toBe(0)
        expect(systems!.tablists, `@${width}: ${systems!.tablists} tab strip(s) on the page`).toBe(0)
        expect(systems!.disclosureSets, `@${width}: the disclosure navigation is missing`).toBe(1)
    }
})

// ── AI entry points ≤ 2 ──────────────────────────────────────────────────────
test("at most two AI entry points", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    for (const width of WIDTHS) {
        await open(page, "motor-active", width)
        const entries = await page.evaluate(() => {
            const shell = document.querySelector(".pw-page-shell")!
            const hits: string[] = []
            shell.querySelectorAll<HTMLElement>("a,button").forEach((el) => {
                const text = (el.textContent || "").trim()
                // "Ask the AI"-shaped affordances only — not every mention of AI
                // (a label saying content came from AI is not an entry point).
                if (/Ρωτ[ήη]στε το AI|Ρώτησε το AI|Ask the AI/i.test(text)) hits.push(text.slice(0, 40))
            })
            return hits
        })
        expect(entries.length, `@${width}: ${entries.length} AI entry points: ${entries.join(" | ")}`)
            .toBeLessThanOrEqual(2)
    }
})

// ── The ten-second test ──────────────────────────────────────────────────────
for (const spec of FIXTURE_SPECS) {
    test(`the four questions are answered in the first two viewports — ${spec.key}`, async ({ page }) => {
        test.setTimeout(6 * 60_000)
        const { end } = fixtureDates(spec.state)
        const expectedDate = el(end)

        for (const width of WIDTHS) {
            await open(page, spec.key, width)
            const twoViewports = HEIGHT[width] * 2

            const answers = await page.evaluate(
                ({ limit, expectedDate }) => {
                    const topOf = (sel: string) => {
                        const el = document.querySelector(sel) as HTMLElement | null
                        if (!el) return null
                        const r = el.getBoundingClientRect()
                        return r.top + window.scrollY
                    }
                    const textTop = (needle: string) => {
                        let best: number | null = null
                        document.querySelectorAll<HTMLElement>(".pw-page-shell *").forEach((el) => {
                            const own = Array.from(el.childNodes)
                                .filter((n) => n.nodeType === 3)
                                .map((n) => (n.textContent || ""))
                                .join(" ")
                            if (!own.includes(needle)) return
                            const t = el.getBoundingClientRect().top + window.scrollY
                            if (best === null || t < best) best = t
                        })
                        return best
                    }
                    return {
                        limit,
                        // Q1 what is insured — insurer + policy number
                        q1: topOf('[data-fact="policy.insurerName"]'),
                        q1b: topOf('[data-fact="policy.policyNumber"]'),
                        // Q2 in force, until when — status + the date
                        q2: topOf('[data-fact="policy.status"]'),
                        q2date: textTop(expectedDate),
                        // Q3 what needs attention
                        q3: topOf('[data-fact="policy.attention"]'),
                        // Q4 what next — the one primary action
                        q4: (() => {
                            const header = document.querySelector("header.pw-card")
                            const btn = header?.querySelector("button")
                            if (!btn) return null
                            return btn.getBoundingClientRect().top + window.scrollY
                        })(),
                    }
                },
                { limit: twoViewports, expectedDate }
            )

            for (const [key, label] of [
                ["q1", "Q1 what is insured (insurer)"],
                ["q1b", "Q1 what is insured (policy number)"],
                ["q2", "Q2 in force (status)"],
                ["q2date", "Q2 until when (the date)"],
                ["q3", "Q3 what needs attention"],
                ["q4", "Q4 what do I do next (primary action)"],
            ] as const) {
                const top = (answers as Record<string, number | null>)[key]
                expect(top, `@${width}: ${label} is not on the page`).not.toBeNull()
                expect(
                    top!,
                    `@${width}: ${label} sits at ${Math.round(top!)}px — below the first two viewports (${twoViewports}px)`
                ).toBeLessThan(twoViewports)
            }
        }
    })
}
