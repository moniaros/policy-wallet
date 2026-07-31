#!/usr/bin/env node
/**
 * 320px horizontal-overflow sweep, and the same sweep at the large-text setting.
 *
 * 320px is the narrowest viewport WCAG 1.4.10 asks a page to survive, and it is
 * where Greek breaks things that English does not — «αντασφαλιστήριο» and
 * «προειδοποιήσεις» do not wrap where their English counterparts do, so a row
 * that fits in translation can still push the page sideways in the default
 * language.
 *
 * The second pass is the one this was written for. The reading-size preference
 * scales the root font by 125%, which enlarges every rem-based width and
 * padding with it. That claim — "modest steps, nothing clips" — was written
 * from reasoning rather than measurement. This measures it.
 *
 * Public routes only, and deliberately so: they render from the production
 * build with no database, so this runs anywhere the build does. Protected
 * routes need seeded data and belong in the Playwright suite.
 *
 * Usage:
 *   npm run build && npm start &            # or any running instance
 *   node scripts/check-mobile-overflow.mjs [--base http://localhost:3000]
 */
import { chromium } from "playwright"

const BASE = process.argv.includes("--base")
    ? process.argv[process.argv.indexOf("--base") + 1]
    : "http://localhost:3000"

/**
 * Public leaf pages — every one an anonymous visitor can actually land on.
 *
 * Leaves, not the proxy.ts prefixes: `/solutions` is an allowlist PREFIX whose
 * only page is `/solutions/agents`, so sweeping the prefix measures a 404 and
 * calls it a pass. The Greek routes carry the risk (compound words that do not
 * wrap where their English counterparts do), so both languages are covered on
 * the pages where the two diverge.
 */
const ROUTES = [
    "/",
    "/pricing",
    "/product",
    "/product/motor",
    "/product/property",
    "/product/health",
    "/for-agents",
    "/solutions/agents",
    "/company",
    "/contact",
    "/guides",
    "/perks",
    "/lexiko",
    "/trust",
    "/privacy",
    "/terms",
    "/cookies",
    "/subprocessors",
    "/auth/signin",
    "/auth/signup",
    "/en",
    "/en/pricing",
    "/en/trust",
    "/en/product/motor",
]

const WIDTH = 320
/** Matches TEXT_SIZE_SCALE in lib/a11y/text-size.ts. */
const TEXT_SIZES = [null, "larger"]

/**
 * Elements wider than the viewport, with enough identity to find them again.
 * Reports the OFFENDER, not just that the page is broken — "something overflows
 * on /pricing" is a fact nobody can act on.
 */
async function offenders(page) {
    return page.evaluate((width) => {
        const out = []
        for (const el of document.querySelectorAll("body *")) {
            const rect = el.getBoundingClientRect()
            if (rect.width === 0 || rect.height === 0) continue
            // Right edge past the viewport, or intrinsically too wide.
            if (rect.right > width + 1 || rect.width > width + 1) {
                const style = getComputedStyle(el)
                if (style.position === "fixed" || style.overflowX === "auto" || style.overflowX === "scroll") continue
                // Only report the outermost offender in a chain; a wide parent
                // makes every child look wide and floods the output.
                if (out.some((o) => o.el.contains(el))) continue
                out.push({
                    el,
                    tag: el.tagName.toLowerCase(),
                    cls: String(el.className || "").slice(0, 90),
                    w: Math.round(rect.width),
                    text: (el.textContent || "").trim().slice(0, 40),
                })
            }
        }
        return out.map(({ el, ...rest }) => rest)
    }, width)
}

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" })
const findings = []
let checked = 0

for (const textSize of TEXT_SIZES) {
    const context = await browser.newContext({ viewport: { width: WIDTH, height: 720 } })
    const page = await context.newPage()

    for (const route of ROUTES) {
        const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" }).catch(() => null)
        if (!res || res.status() >= 400) {
            findings.push(`${route} [${textSize ?? "default"}] — did not render (${res ? res.status() : "no response"})`)
            continue
        }
        if (textSize) {
            await page.evaluate((size) => document.documentElement.setAttribute("data-text-size", size), textSize)
            await page.waitForTimeout(150) // let the reflow settle
        }
        checked += 1

        const scrolls = await page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
        )
        if (!scrolls) continue

        for (const o of await offenders(page)) {
            findings.push(
                `${route} [${textSize ?? "default"}] — <${o.tag}> ${o.w}px "${o.text}" .${o.cls}`
            )
        }
    }
    await context.close()
}

await browser.close()

// Vacuity floor. A server that never came up, or a base URL typo, would
// otherwise report a clean sweep having measured nothing at all.
if (checked < ROUTES.length) {
    console.error(
        `mobile-overflow: only ${checked}/${ROUTES.length * TEXT_SIZES.length} page loads succeeded. ` +
        "Is the server running? Refusing to report a pass on an unmeasured sweep."
    )
    if (findings.length) console.error(findings.map((f) => `  ${f}`).join("\n"))
    process.exit(1)
}

console.log(`mobile-overflow: ${checked} page loads at ${WIDTH}px (default and large text).`)

if (findings.length) {
    console.error(`\n${findings.length} overflow finding(s):\n${findings.map((f) => `  ${f}`).join("\n")}`)
    process.exit(1)
}

console.log("No horizontal overflow at 320px, at either text size.")
