import { expect, test, type Page } from "@playwright/test"
import { enPathFor, marketingPages } from "@/lib/seo/marketing-pages"

/**
 * Anonymous sweep of every public marketing route, both locale trees.
 *
 * Runs under the `public-anon` project (no storageState) — the five
 * policyholder projects ignore this spec, because a signed-in header state
 * would audit a page no anonymous visitor ever sees.
 *
 * Per route it asserts the mechanical layer of "executive-grade":
 *  - no horizontal overflow at 1280px and 320px
 *  - exactly one <h1>, and no heading-level skips
 *  - <html lang> matches the locale tree (the root layout stamps /en/* early)
 *  - no console errors and no uncaught page errors
 *
 * A separate single test fetches every route's HTML and checks that each
 * same-origin link resolves (< 400 after redirects), deduplicated globally.
 */

/** Greek-tree routes: home + every registry page. */
const greekRoutes = ["/", ...Object.values(marketingPages).map((page) => page.path)]

/** English-tree routes: /en + the registry pages that declare an en mirror. */
const englishRoutes = [
    "/en",
    ...Object.values(marketingPages)
        .filter((page) => page.en)
        .map((page) => enPathFor(page.path)),
]

/** Routes that redirect by design — asserted separately, not swept. */
const redirectRoutes = ["/for-agents", "/landing"]

const CONSOLE_ERROR_ALLOWLIST = [
    /Download the React DevTools/i,
    // Next dev overlay/HMR chatter is not a product defect.
    /\[Fast Refresh\]/i,
    // Dev-environment noise, provably absent in production builds:
    // .env.local ships a placeholder Sentry DSN…
    /Invalid Sentry Dsn/i,
    // …and Vercel Analytics only loads its CSP-blocked debug script when
    // NODE_ENV=development (production uses first-party /_vercel/insights).
    /va\.vercel-scripts\.com/i,
]

function collectErrors(page: Page): string[] {
    const errors: string[] = []
    page.on("console", (message) => {
        if (message.type() !== "error") return
        const text = message.text()
        if (CONSOLE_ERROR_ALLOWLIST.some((pattern) => pattern.test(text))) return
        errors.push(text)
    })
    page.on("pageerror", (error) => {
        errors.push(`pageerror: ${error.message}`)
    })
    return errors
}

async function assertNoHorizontalOverflow(page: Page, width: number, route: string) {
    await page.setViewportSize({ width, height: 900 })
    // Give the layout a breath to settle after resize.
    await page.waitForTimeout(150)
    const overflow = await page.evaluate(() => {
        const el = document.documentElement
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
    })
    expect(
        overflow.scrollWidth,
        `${route} overflows horizontally at ${width}px (scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth})`
    ).toBeLessThanOrEqual(overflow.clientWidth + 1)
}

async function assertHeadingDiscipline(page: Page, route: string) {
    const levels = await page.evaluate(() =>
        Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
            .filter((heading) => (heading as HTMLElement).offsetParent !== null || heading.tagName === "H1")
            .map((heading) => Number(heading.tagName[1]))
    )
    const h1Count = levels.filter((level) => level === 1).length
    expect(h1Count, `${route} must render exactly one <h1>, found ${h1Count}`).toBe(1)
    let previous = 0
    for (const level of levels) {
        expect(
            level,
            `${route} skips a heading level (h${previous} → h${level}); screen-reader outlines break on skips`
        ).toBeLessThanOrEqual(previous + 1)
        previous = level
    }
}

for (const [tree, routes, expectedLang] of [
    ["el", greekRoutes, "el"],
    ["en", englishRoutes, "en"],
] as const) {
    test.describe(`public pages (${tree})`, () => {
        for (const route of routes) {
            test(`${route} renders clean`, async ({ page }) => {
                const errors = collectErrors(page)
                await page.goto(route, { waitUntil: "load" })

                await expect(page.locator("h1").first()).toBeVisible()
                expect(await page.evaluate(() => document.documentElement.lang)).toBe(expectedLang)

                await assertHeadingDiscipline(page, route)
                await assertNoHorizontalOverflow(page, 1280, route)
                await assertNoHorizontalOverflow(page, 320, route)

                expect(errors, `${route} logged console/page errors:\n${errors.join("\n")}`).toEqual([])
            })
        }
    })
}

test("designed redirects land on real pages", async ({ request }) => {
    for (const route of redirectRoutes) {
        const response = await request.get(route)
        expect(response.status(), `${route} should land < 400 after its redirect`).toBeLessThan(400)
    }
})

test("glossary and guide detail pages render clean", async ({ page }) => {
    // Discover the first real slug from each index so the check cannot rot
    // when content is renamed.
    for (const [index, prefix] of [
        ["/guides", "/guides/"],
        ["/lexiko", "/lexiko/"],
    ] as const) {
        await page.goto(index, { waitUntil: "load" })
        const detailHref = await page
            .locator(`a[href^="${prefix}"]`)
            .first()
            .getAttribute("href")
        expect(detailHref, `${index} lists no detail links`).toBeTruthy()

        const errors = collectErrors(page)
        await page.goto(detailHref!, { waitUntil: "load" })
        await assertHeadingDiscipline(page, detailHref!)
        await assertNoHorizontalOverflow(page, 1280, detailHref!)
        await assertNoHorizontalOverflow(page, 320, detailHref!)
        expect(errors, `${detailHref} logged console/page errors:\n${errors.join("\n")}`).toEqual([])
    }
})

test("every same-origin link on every public page resolves", async ({ request }) => {
    // One test owns the whole link graph so the dedup set is global — the
    // parallel per-route tests cannot share state across workers.
    test.setTimeout(240_000)
    const checked = new Map<string, number>()
    const broken: string[] = []

    for (const route of [...greekRoutes, ...englishRoutes]) {
        const response = await request.get(route)
        expect(response.status(), `${route} did not render for link extraction`).toBeLessThan(400)
        const html = await response.text()
        const hrefs = new Set(
            Array.from(html.matchAll(/href="(\/[^"#?]*(?:\?[^"#]*)?)"/g), (match) => match[1])
        )
        for (const href of hrefs) {
            if (href.startsWith("/api/")) continue
            if (href.startsWith("/_next")) continue
            if (checked.has(href)) continue
            const linkResponse = await request.get(href)
            checked.set(href, linkResponse.status())
            if (linkResponse.status() >= 400) {
                broken.push(`${href} → ${linkResponse.status()} (linked from ${route})`)
            }
        }
    }

    expect(broken, `Broken links:\n${broken.join("\n")}`).toEqual([])
})
