/**
 * Do the outbound documents survive a phone, in Greek, at their longest?
 *
 * The report, the weekly digest and the invite are the surfaces a person reads
 * OUTSIDE the app — in a mail client, on a phone, often forwarded. Nothing in
 * the app's own measurement harness covers them, because they are strings, not
 * routes: no server, no session, no navigation (PW-BRIDGE-01 C-07).
 *
 * This renders each one at 320 and 390 CSS pixels and reports two DIFFERENT
 * failures:
 *
 *   overflowing — an element extends past the viewport (the page scrolls sideways)
 *   clipped     — an element's own content is wider or taller than its box while
 *                 the box hides the remainder (`overflow: hidden`, ellipsis).
 *                 A document can pass the first and fail this one, which is why
 *                 "no horizontal scroll" is not the acceptance.
 *
 * Run (a real Chrome is fine; Playwright's own browser download is not required):
 *   npx tsx scripts/build-outbound-samples.ts /tmp/out
 *   PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *     node scripts/measure-outbound-documents.mjs /tmp/out
 *
 * Measured 2026-09-09 with the longest realistic Greek identity fields: all
 * three documents, both widths, zero overflowing and zero clipped.
 */
import { chromium } from "playwright"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const dir = process.argv[2]
if (!dir) {
    console.error("usage: node scripts/measure-outbound-documents.mjs <dir with report.html digest.html invite.html>")
    process.exit(2)
}

const PAGES = ["report", "digest", "invite"]
const WIDTHS = [320, 390]

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH })
const results = []

for (const name of PAGES) {
    const html = readFileSync(join(dir, `${name}.html`), "utf8")
    for (const width of WIDTHS) {
        const page = await browser.newPage({ viewport: { width, height: 900 } })
        await page.setContent(html, { waitUntil: "load" })
        const measured = await page.evaluate((w) => {
            const doc = document.documentElement
            const describe = (e) => ({
                tag: e.tagName.toLowerCase(),
                cls: (e.className || "").toString().slice(0, 30),
                text: (e.textContent || "").trim().replace(/\s+/g, " ").slice(0, 45),
            })
            const overflowing = [...document.querySelectorAll("*")]
                .filter((e) => {
                    const b = e.getBoundingClientRect()
                    return b.width > 0 && Math.round(b.right) > w + 1
                })
                .slice(0, 6)
                .map((e) => ({ ...describe(e), right: Math.round(e.getBoundingClientRect().right) }))
            const clipped = [...document.querySelectorAll("*")]
                .filter((e) => {
                    const cs = getComputedStyle(e)
                    const hidesX = cs.overflowX === "hidden" || cs.overflowX === "clip" || cs.textOverflow === "ellipsis"
                    const hidesY = cs.overflowY === "hidden" || cs.overflowY === "clip"
                    return (hidesX && e.scrollWidth > e.clientWidth + 1) || (hidesY && e.scrollHeight > e.clientHeight + 1)
                })
                .slice(0, 6)
                .map((e) => ({ ...describe(e), scrollW: e.scrollWidth, clientW: e.clientWidth }))
            return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth, overflowing, clipped }
        }, width)
        results.push({
            page: name,
            width,
            hscroll: measured.scrollWidth > measured.clientWidth,
            overflowing: measured.overflowing,
            clipped: measured.clipped,
        })
        await page.close()
    }
}

await browser.close()
console.log(JSON.stringify(results, null, 1))

const bad = results.filter((r) => r.hscroll || r.overflowing.length > 0 || r.clipped.length > 0)
if (bad.length > 0) {
    console.error(`\n${bad.length} of ${results.length} renders failed — see above.`)
    process.exit(1)
}
console.error(`\nAll ${results.length} renders clean: no overflow, nothing clipped.`)
