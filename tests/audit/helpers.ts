import { expect, type APIRequestContext, type Browser, type BrowserContext, type Page } from "@playwright/test"
import { settle } from "../measure/metrics"

export { settle }

/**
 * The audit kit (D0). One import for every probe: targets, routes, auth,
 * viewports, determinism. The brief's rule is enforced here once — a spec
 * that measures the wrong server, an animated frame or an unsettled font
 * produces evidence that means nothing.
 */

export const OLD_BASE = process.env.BASE_URL_OLD || "http://localhost:3000"
export const NEW_BASE = process.env.BASE_URL_NEW || "http://localhost:3100"

export type AuditTarget = "old" | "new"
/** old → record mode (write baselines); new → assert mode (enforce). */
export const TARGET: AuditTarget = process.env.AUDIT_TARGET === "old" ? "old" : "new"
export const BASE = TARGET === "old" ? OLD_BASE : NEW_BASE

/** The six information-bearing routes of the pre-rebuild app. */
export const OLD_ROUTES = ["/dashboard", "/wallet", "/protection", "/agent", "/notifications", "/account"] as const
/** Where each old route's facts live now (the cutover's 301 map). */
export const ROUTE_MAP: Record<string, string> = {
    "/dashboard": "/",
    "/wallet": "/policies",
    "/protection": "/see",
    "/agent": "/adviser",
    "/notifications": "/updates",
    "/account": "/me",
}
export const NEW_ROUTES = OLD_ROUTES.map((r) => ROUTE_MAP[r])
export const ROUTES: readonly string[] = TARGET === "old" ? OLD_ROUTES : NEW_ROUTES

/** Origin-scoped cookies: one state per server. Both are refreshed by
 * audit.setup.ts on every run (dev sessions rot in about an hour). */
export const STORAGE_STATE = TARGET === "old" ? "playwright/.auth/audit-old.json" : "playwright/.auth/user.json"

/** Mirror of playwright.audit.config.ts — specs that build their own themed
 * contexts look their project's viewport up here. */
export const VIEWPORTS: Record<string, { width: number; height: number }> = {
    "iphone-se": { width: 375, height: 667 },
    "iphone-15": { width: 393, height: 852 },
    ipad: { width: 768, height: 1024 },
    laptop: { width: 1280, height: 800 },
    desktop: { width: 1600, height: 900 },
    "iphone-se-1": { width: 320, height: 568 },
    android: { width: 360, height: 800 },
    "iphone-xr": { width: 414, height: 896 },
    "iphone-15-max": { width: 430, height: 932 },
    "ipad-landscape": { width: 1024, height: 768 },
    "full-hd": { width: 1920, height: 1080 },
}

/** The five canonical devices carry the visual baseline and the
 * project-restricted probes; the rest are geometry-only widths. */
export const CORE_PROJECTS = ["iphone-se", "iphone-15", "ipad", "laptop", "desktop"] as const

export const THEMES = ["light", "dark"] as const
export type Theme = (typeof THEMES)[number]

/** Frozen client clock. The SERVER clock cannot be frozen from here — the
 * lib/app models default `now = new Date()` — so server-rendered clock
 * strings are masked (visual) or digit-normalised (inventory) instead. */
export const FIXED_TIME = new Date("2026-08-31T10:00:00.000Z")

/**
 * Build identity, asserted before any measurement — measuring the wrong
 * server has bitten this repo before. Anonymous /dashboard 307s on BOTH
 * builds (the auth gate answers before the rebuilt proxy's 301), so the
 * discriminator is the R1 theme meta: only the rebuilt app serves a dark
 * `theme-color` (`#0C231F`, the dark surface-base) on its public homepage.
 */
export async function assertOldBuild(request: APIRequestContext): Promise<void> {
    const html = await (await request.get(`${OLD_BASE}/`)).text()
    expect(html, `${OLD_BASE}/ does not look like PolicyWallet at all`).toContain("theme-color")
    expect(
        html.includes("#0C231F"),
        `${OLD_BASE}/ carries the rebuilt dark theme-color meta — that is the NEW build, not the baseline`
    ).toBe(false)
}

export async function assertNewBuild(request: APIRequestContext): Promise<void> {
    const html = await (await request.get(`${NEW_BASE}/`)).text()
    expect(
        html.includes("#0C231F"),
        `${NEW_BASE}/ lacks the dark theme-color meta — is the worktree dev server (the rebuilt app) on :3100?`
    ).toBe(true)
}

export async function assertTarget(request: APIRequestContext): Promise<void> {
    if (TARGET === "old") await assertOldBuild(request)
    else await assertNewBuild(request)
}

/** A themed, authenticated context on the current target. */
export async function auditContext(browser: Browser, projectName: string, theme: Theme): Promise<BrowserContext> {
    const ctx = await browser.newContext({
        storageState: STORAGE_STATE,
        locale: "el-GR",
        colorScheme: theme,
        viewport: VIEWPORTS[projectName] ?? VIEWPORTS.desktop,
    })
    await ctx.addInitScript((t) => {
        try {
            localStorage.setItem("theme", t)
        } catch {
            /* private mode */
        }
    }, theme)
    return ctx
}

/**
 * The settle procedure for every measurement and screenshot:
 * reduced motion (honoured by grafi-app.css + MotionConfig) → networkidle +
 * animation/caret kill + nextjs-portal hide (measure/metrics settle) →
 * fonts loaded → frozen client clock.
 */
export async function settleDeterministic(page: Page): Promise<void> {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await settle(page)
    await page.evaluate(() => (document as Document).fonts.ready)
    await page.clock.setFixedTime(FIXED_TIME)
}

/**
 * Server-rendered clock strings — the parts of the page that move with the
 * wall clock and must be masked in visual shots and digit-normalised in the
 * inventory. Matched by TEXT, not by class (both builds, any markup):
 * relative hours/days («πριν από 3 ώρες», «σε 13 ημέρες»), full dates, and
 * <time> elements.
 */
export const CLOCK_TEXT = /πριν από \d+|σε \d+ (?:ημέρες|ημέρα|ώρες|ώρα)|\d+\s?ημ\.|\d{1,2}\/\d{1,2}\/\d{4}|\d{1,2} (?:Ιαν|Φεβ|Μαρ|Απρ|Μαΐ|Ιουν|Ιουλ|Αυγ|Σεπ|Οκτ|Νοε|Δεκ)/
export function clockMasks(page: Page) {
    return [page.locator("time"), page.getByText(CLOCK_TEXT)]
}

/** Snapshot name for the committed baseline: old-dashboard-light.png … */
export function shotName(route: string, theme: Theme): string {
    const dir = route === "/" ? "home" : route.replace(/^\//, "").replace(/\//g, "-")
    return `${TARGET}-${dir}-${theme}.png`
}
