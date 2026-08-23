/**
 * The Pro-tier dashboard capture.
 *
 * Runs in the `measure` project because tier is a property of the SESSION's
 * user and that project carries the `ph-pro` account — the same reason the
 * free-tier policy-detail captures needed their own project. Named to avoid the
 * `measure-dash` testMatch, which owns the portfolio-state matrix.
 *
 * One capture, not a matrix: the question is only what tier gating changes
 * about what renders (advisor row, upgrade teasers, plan limits).
 */
import { test, expect } from "@playwright/test"
import { mkdirSync, writeFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { clippedContent, countConsistency, duplicateBlocks, internalTokenLeaks } from "./dashboard"
import { settle, scrollHeight, sectionCount, containerCount, smallTapTargets, nonTextContrastFailures } from "./metrics"

// Same run-labelling rule as dashboard-baseline.spec.ts: a run must be NAMED to
// overwrite anything, and an unnamed one writes to `current`. This spec kept
// writing to `baseline/` after that spec stopped, which silently replaced one
// file of the reference set on the next run.
const RUN = process.env.MEASURE_RUN || "current"
const DATA = path.join(process.cwd(), "docs", "evidence", "dashboard-mobile", "data", RUN)
const SHOTS = path.join(process.cwd(), "docs", "evidence", "dashboard-mobile", "screenshots", RUN)

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

test("baseline: dashboard on a Pro account", async ({ page }) => {
    test.setTimeout(8 * 60_000)
    mkdirSync(DATA, { recursive: true })
    mkdirSync(SHOTS, { recursive: true })

    await page.setViewportSize({ width: 320, height: 720 })
    await page.goto("/dashboard", { waitUntil: "domcontentloaded", timeout: 90_000 })
    await page.waitForTimeout(500)
    expect(page.url(), "bounced to signin — refusing to measure").not.toContain("/auth/signin")
    await dismissCookieBanner(page)
    await page.waitForSelector(".pw-page-shell h1, main h1", { timeout: 45_000, state: "attached" })
    await settle(page)

    const text = await page.evaluate(() => (document.body.innerText || "").replace(/\s+/g, " "))
    const data = {
        capture: "pro-tier",
        width: 320,
        tier: "pro",
        scrollHeight: await scrollHeight(page),
        sections: await sectionCount(page),
        containers: await containerCount(page),
        tapTargets: await smallTapTargets(page),
        countConsistency: await countConsistency(page),
        duplicateBlocks: await duplicateBlocks(page),
        internalTokenLeaks: await internalTokenLeaks(page),
        probes: { clippedContent: await clippedContent(page), fullText: text },
        contrast: { nonText: await nonTextContrastFailures(page) },
    }
    assertRendered("pro-tier", 320, data.scrollHeight, data.sections?.count ?? 99)
    writeFileSync(path.join(DATA, "pro-tier-320.json"), JSON.stringify(data, null, 2))
    await page.screenshot({ path: path.join(SHOTS, "pro-tier-320.png"), fullPage: true })

    console.log(
        `[dash] pro-tier@320: ${data.scrollHeight}px, ${data.sections.count} sections, ` +
        `${data.tapTargets.length} sub-44, ${data.countConsistency.failures} count-consistency, ` +
        `${data.duplicateBlocks.length} duplicate blocks, ${data.internalTokenLeaks.length} token leaks, ` +
        `${data.contrast.nonText.length} 1.4.11`
    )

    // Tier sanity — a mislabelled capture would poison the comparison.
    expect(data.tier).toBe("pro")
})
