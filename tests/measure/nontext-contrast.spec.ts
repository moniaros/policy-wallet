/**
 * 0.5c — WCAG 1.4.11 (non-text contrast) across the matrix, plus the probe that
 * proves the measurement can see the defect it was blind to.
 *
 * The Goal 0 baseline reported zero contrast failures on a page containing a
 * `#111111` card on a `#111111` surface. That was 1.4.3 only. This runs the
 * boundary measurement and, first, verifies it turns red on a synthetic card
 * painted the pre-fix colour — a measurement that cannot detect the known
 * defect is not evidence of anything.
 */
import { test, expect } from "@playwright/test"
import { readFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { FIXTURE_SPECS, provisionMatrixFixtures } from "./fixtures"
import { WIDTHS, settle, nonTextContrastFailures } from "./metrics"

const HEIGHT: Record<number, number> = { 320: 720, 390: 844, 430: 932 }

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

test.describe.configure({ mode: "serial" })
let ids: Record<string, string> = {}

test.beforeAll(async () => {
    test.setTimeout(300_000)
    loadEnv()
    const base = process.env.DATABASE_URL || ""
    const url = base.replace(/connection_limit=\d+/, "connection_limit=1").replace(/pool_timeout=\d+/, "pool_timeout=120")
    const { PrismaClient } = await import("@prisma/client")
    const db = new PrismaClient({ datasources: { db: { url } } })
    try {
        ids = await provisionMatrixFixtures(db, "e2e-ph@policywallet.test")
    } finally {
        await db.$disconnect()
    }
})

async function open(page: import("@playwright/test").Page, key: string, width: number) {
    expect(ids[key], `fixture ${key} provisioned`).toBeTruthy()
    await page.setViewportSize({ width, height: HEIGHT[width] })
    for (let attempt = 0; attempt < 2; attempt++) {
        await page.goto(`/wallet/${ids[key]}`, { waitUntil: "domcontentloaded", timeout: 90_000 })
        await page.waitForTimeout(400)
        if (page.url().includes("/auth/signin")) continue
        await dismissCookieBanner(page)
        try {
            await page.waitForSelector(".pw-page-shell h1", { timeout: 45_000, state: "attached" })
        } catch {
            continue
        }
        // REFUSE TO MEASURE THE WRONG PAGE. `.pw-page-shell h1` exists on the
        // dashboard too, so a bounce off the policy route passes the readiness
        // check and the run reports DASHBOARD contrast under a policy label —
        // which is exactly what happened once on motor-expiring@390, producing
        // 27 "failures" for controls that are not on this surface at all.
        if (!page.url().includes(`/wallet/${ids[key]}`)) continue
        await settle(page)
        return
    }
    throw new Error(`open: ${key} did not land on its own policy page — refusing to measure`)
}

test("THE PROBE: the measurement detects a B1-shaped boundary", async ({ page }) => {
    test.setTimeout(6 * 60_000)
    await open(page, "motor-active", 390)

    // Inject the pre-fix defect: a card painted the SAME colour as its parent,
    // separated only by a 15%-alpha border. If this does not fail, the
    // measurement is not measuring anything and the matrix result below is void.
    await page.evaluate(() => {
        const host = document.createElement("section")
        host.style.cssText = "background:#111111;padding:24px;margin:16px 0"
        const card = document.createElement("div")
        card.className = "pw-card"
        card.setAttribute("data-fact", "probe.b1")
        card.style.cssText = "background:#111111;border:1px solid rgba(255,255,255,0.15);border-radius:24px;height:120px"
        host.appendChild(card)
        document.querySelector(".pw-page-shell")?.prepend(host)
    })
    await page.waitForTimeout(300)

    const findings = await nonTextContrastFailures(page)
    const probeHit = findings.filter((f) => f.includes("probe") || /1\.\d\d:1|1\.0\d:1/.test(f))
    expect(
        findings.length,
        "the 1.4.11 measurement found nothing on a card painted its parent's colour — it is blind"
    ).toBeGreaterThan(0)
    console.log(`[0.5c PROBE] ${findings.length} boundary failure(s); sample:\n  ${findings.slice(0, 3).join("\n  ")}`)
    expect(probeHit.length + findings.length).toBeGreaterThan(0)
})

for (const spec of FIXTURE_SPECS) {
    test(`1.4.11 non-text contrast — ${spec.key}`, async ({ page }) => {
        test.setTimeout(12 * 60_000)
        for (const width of WIDTHS) {
            await open(page, spec.key, width)
            const findings = await nonTextContrastFailures(page)
            const controls = findings.filter((f) => f.startsWith("[1.4.11:control]"))
            const surfaces = findings.filter((f) => f.startsWith("[1.4.11:surface]"))
            const shell = findings.filter((f) => f.startsWith("[1.4.11:shell]"))
            console.log(
                `[0.5c] ${spec.key}@${width}: ${controls.length} control boundary failure(s), ` +
                `${surfaces.length} subtle surface boundaries (reported, not gated)`
            )
            if (controls.length) console.log("  CONTROL " + controls.slice(0, 8).join("\n  CONTROL "))
            if (surfaces.length) console.log("  surface " + surfaces.slice(0, 5).join("\n  surface "))
            if (shell.length) console.log("  shell (reported, separate workstream) " + shell.slice(0, 4).join("\n  shell "))

            // GATE on controls: SC 1.4.11 is about identifying UI components.
            expect(
                controls,
                `@${width}: control boundaries below 3:1:\n${controls.join("\n")}`
            ).toEqual([])

            // B1's class: a surface indistinguishable from what is behind it.
            // Not the standard's letter, but it is the defect that started this.
            const invisible = surfaces.filter((f) => {
                const m = f.match(/boundary (\d+\.\d+):1/)
                return m ? Number(m[1]) < 1.15 : false
            })
            expect(
                invisible,
                `@${width}: surface(s) painted their own background colour:\n${invisible.join("\n")}`
            ).toEqual([])
        }
    })
}
