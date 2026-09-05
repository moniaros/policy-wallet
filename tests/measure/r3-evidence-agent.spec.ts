import { test, expect } from "@playwright/test"
import { mkdirSync, writeFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { settle, renderedCounts } from "./metrics"

/** R3 — the agent book's leak sites (client chip, KPI «with gaps») at 390px Greek. Project: measure-agent. */
const RUN = process.env.MEASURE_RUN || "current"
const OUT = path.join(process.cwd(), "docs", "evidence", "transparency-r3", RUN)

test("R3: agent book leak sites at 390", async ({ page }) => {
    test.setTimeout(5 * 60_000)
    mkdirSync(OUT, { recursive: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 90_000 })
    await settle(page)
    await dismissCookieBanner(page)
    expect(page.url()).not.toContain("/auth/")
    const data = { run: RUN, capturedAt: new Date().toISOString(), counts: await renderedCounts(page) }
    writeFileSync(path.join(OUT, "agent.json"), JSON.stringify(data, null, 2))
    await page.screenshot({ path: path.join(OUT, "agent-390.png"), fullPage: true })
    console.log("[r3 agent] " + JSON.stringify(data.counts))
})
