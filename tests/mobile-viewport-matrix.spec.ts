import { test, expect, type Page } from "@playwright/test"
import { dismissCookieBanner } from "./helpers/ui"

/**
 * The mobile regression guard: three viewports, the real pages, in Greek.
 *
 * The NEW-UI refactor was mobile-first, but the policy page has since gained
 * blocks that shipped desktop-reviewed only. This file exists so a future
 * desktop-only change cannot silently break the phone — which is the device
 * this product is actually used on, standing in a garage or an insurer's
 * office.
 *
 * 320px is a hard floor, not a nicety: it is the narrowest viewport still in
 * the wild, and Greek runs 20–30% longer than English, so a layout that only
 * fits in English will not fit here.
 */
export const VIEWPORTS = [
    { name: "iphone-390", width: 390, height: 844 },
    { name: "iphone-max-430", width: 430, height: 932 },
    { name: "floor-320", width: 320, height: 720 },
] as const

/**
 * Horizontal overflow is the cardinal mobile sin: it makes every tap target
 * move under the reader's thumb. Measured against documentElement, and
 * tolerant of 1px of sub-pixel rounding.
 */
async function horizontalOverflow(page: Page): Promise<number> {
    return page.evaluate(() => {
        const doc = document.documentElement
        return Math.max(0, doc.scrollWidth - doc.clientWidth)
    })
}

/** Elements wider than the viewport — the culprits behind any overflow. */
async function overflowingElements(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const out: string[] = []
        const limit = document.documentElement.clientWidth + 1
        document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
            const r = el.getBoundingClientRect()
            if (r.width > limit || r.right > limit + 1) {
                const cls = typeof el.className === "string" ? el.className.slice(0, 60) : ""
                out.push(`${el.tagName.toLowerCase()}.${cls} w=${Math.round(r.width)} right=${Math.round(r.right)}`)
            }
        })
        return [...new Set(out)].slice(0, 8)
    })
}

/**
 * Controls below the 44×44 CSS-px floor (Apple HIG; WCAG 2.5.8).
 *
 * Two exemptions, both from the guideline itself rather than convenience:
 *
 *  • INLINE TEXT LINKS. A breadcrumb or a link inside a sentence is exempt
 *    (WCAG 2.5.5/2.5.8 "inline" exception) — padding them to 44px would push
 *    the words of the sentence apart. Detected by computed `display: inline`,
 *    not by a name list, so a link that becomes a button is caught again.
 *  • VISUALLY-HIDDEN SKIP LINKS. "Μετάβαση στο περιεχόμενο" measures 1×24
 *    because it is off-screen until focused, which is the correct
 *    implementation, not a defect.
 */
async function smallTapTargets(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const out: string[] = []
        const sel = "a[href], button, [role=button], input:not([type=hidden]), select, textarea"
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
            const r = el.getBoundingClientRect()
            if (r.width === 0 || r.height === 0) return // not rendered
            const style = getComputedStyle(el)
            if (style.visibility === "hidden" || style.display === "none") return

            // Off-screen until focused (skip links, sr-only helpers).
            if (r.right <= 0 || r.bottom <= 0 || r.width <= 2) return

            // Inline text actions — exempt by the guideline, identified by the
            // design system's OWN marker rather than a rule invented here.
            // `.pw-inline-action` is the repo's idiom for a text link with an
            // icon: no border, no background, underline on hover. Padding one
            // to 44px would open a hole in the paragraph around it.
            if (el.classList.contains("pw-inline-action")) return
            if (el.tagName === "A" && style.display === "inline") return

            if (r.height < 44 || r.width < 24) {
                const label = (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)
                // A failure you cannot locate is a failure you cannot fix: two
                // different links on this page read "Αρχική", and without the
                // ancestor chain the first fix landed on the wrong one.
                const chain: string[] = []
                for (let n: HTMLElement | null = el; n && chain.length < 4; n = n.parentElement) {
                    const id = n.id ? `#${n.id}` : ""
                    const cls = n.className && typeof n.className === "string"
                        ? "." + n.className.trim().split(/\s+/).slice(0, 2).join(".")
                        : ""
                    chain.push(`${n.tagName.toLowerCase()}${id}${cls}`)
                }
                out.push(
                    `${el.tagName.toLowerCase()} "${label}" ${Math.round(r.width)}×${Math.round(r.height)}` +
                    ` @ ${chain.reverse().join(" > ")}`
                )
            }
        })
        return [...new Set(out)].slice(0, 10)
    })
}

/** Inputs iOS will zoom into: computed font-size below 16px. */
async function zoomTriggeringInputs(page: Page): Promise<string[]> {
    return page.evaluate(() => {
        const out: string[] = []
        document.querySelectorAll<HTMLElement>("input, select, textarea").forEach((el) => {
            const size = parseFloat(getComputedStyle(el).fontSize)
            if (size && size < 16) {
                out.push(`${el.tagName.toLowerCase()}[${el.getAttribute("type") || "text"}] ${size}px`)
            }
        })
        return [...new Set(out)].slice(0, 10)
    })
}

/**
 * Resolve a policy id through the API rather than the UI.
 *
 * The wallet's cards are NOT anchors — they navigate with `router.push` from an
 * onClick (PolicyWalletClient.tsx:210), so there is no `href` to read and no
 * link for a selector to find. (Worth its own fix one day: a card that
 * navigates should be a link, so it can be middle-clicked, opened in a new tab
 * and announced as a link. Out of scope here, and noted.)
 */
async function gotoPolicy(page: Page): Promise<string> {
    const res = await page.request.get("/api/v1/policies")
    expect(res.status(), "the session fixture cannot list policies").toBe(200)
    const body = await res.json()
    // The envelope is { data: { policies, groupedByLine, pagination }, meta, error }.
    const policies: Array<Record<string, any>> =
        body?.data?.policies ?? body?.policies ?? (Array.isArray(body) ? body : [])
    expect(Array.isArray(policies) && policies.length > 0, "no policy to open").toBe(true)
    const id = policies[0].id ?? policies[0].policyId

    const target = `/wallet/${id}`

    // A guard that silently audits the wrong page is worse than no guard: the
    // session cookie occasionally isn't live in the browser context on the
    // first navigation, proxy.ts redirects to /auth/signin, and the assertions
    // below then measure the LOGIN page while reporting a policy-page verdict.
    // That is exactly how `a "Αρχική" 87×40` — a signin back-link — surfaced as
    // a policy-page tap-target failure. Retry once, then refuse to measure.
    await page.goto(target, { waitUntil: "domcontentloaded" })
    if (new URL(page.url()).pathname.startsWith("/auth")) {
        await page.goto(target, { waitUntil: "domcontentloaded" })
    }
    expect(
        new URL(page.url()).pathname,
        `redirected to ${page.url()} — the fixture session is not live, so nothing here is a verdict about the policy page`
    ).toBe(target)

    await dismissCookieBanner(page)
    // NOT `waitForLoadState("networkidle")`: with the dummy Upstash host this
    // dev server retries a DNS lookup on every request, so the page never goes
    // idle, the wait eats the whole test timeout, and teardown then closes the
    // page mid-wait — reported as "Target page has been closed", which looks
    // like a browser crash and is really just the wrong wait.
    await page.locator("main").first().waitFor({ state: "visible", timeout: 15_000 })
    await page.waitForTimeout(1200) // let below-the-fold sections settle
    return target
}

for (const vp of VIEWPORTS) {
    test.describe(`${vp.name} (${vp.width}×${vp.height})`, () => {
        test.use({ viewport: { width: vp.width, height: vp.height } })

        // The default 30s covers the assertions but not a cold Next dev compile
        // of the policy route on top of them, which is not what this file
        // measures. Budget for the compile so a slow build reads as slow, not
        // as a layout defect.
        test.setTimeout(90_000)

        test("wallet fits its viewport", async ({ page }) => {
            await page.goto("/wallet", { waitUntil: "domcontentloaded" })
            await dismissCookieBanner(page)
            await page.waitForTimeout(600)
            await page.screenshot({ path: `test-results/mobile/${vp.name}-wallet.png`, fullPage: true })

            const overflow = await horizontalOverflow(page)
            expect(overflow, `wallet overflows by ${overflow}px:\n${(await overflowingElements(page)).join("\n")}`).toBeLessThanOrEqual(1)
        })

        test("policy page fits its viewport", async ({ page }) => {
            await gotoPolicy(page)
            await page.screenshot({ path: `test-results/mobile/${vp.name}-policy.png`, fullPage: true })

            const overflow = await horizontalOverflow(page)
            expect(overflow, `policy page overflows by ${overflow}px:\n${(await overflowingElements(page)).join("\n")}`).toBeLessThanOrEqual(1)
        })

        test("tap targets clear the 44px floor", async ({ page }) => {
            await gotoPolicy(page)
            const small = await smallTapTargets(page)
            expect(small, `below 44px tall:\n  ${small.join("\n  ")}`).toEqual([])
        })

        test("no input triggers iOS zoom-on-focus", async ({ page }) => {
            await page.goto("/wallet/add", { waitUntil: "domcontentloaded" })
            await dismissCookieBanner(page)
            await page.waitForTimeout(600)
            const zoomy = await zoomTriggeringInputs(page)
            expect(zoomy, `font-size < 16px makes iOS zoom the page on focus:\n  ${zoomy.join("\n  ")}`).toEqual([])
        })
    })
}
