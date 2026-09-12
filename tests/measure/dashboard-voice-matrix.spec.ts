import { test, expect, type Page } from "@playwright/test"
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs"
import path from "path"
import { dismissCookieBanner } from "../helpers/ui"
import { applyPortfolioState, type PortfolioState } from "./dashboard-fixtures"
import { WIDTHS, settle } from "./metrics"
import { withDb } from "./surface-harness"

/**
 * PW-VOICE-01 §5 — the fixture matrix for the in-app strings the series
 * rewrote. Each one is rendered at 320/390/430 against the degraded portfolio
 * states: the longest real insurer name (heavy, all-expired), an empty wallet,
 * an all-expired wallet, and a failed run after a completed one (typical,
 * heavy). A rewritten string that only reads well on the happy path has not
 * been tested.
 *
 * Asserts two things per page: it does not scroll sideways, and no rewritten
 * string that is on the page is clipped (ellipsis or line-clamp overflow) or
 * pushed past the right edge. Everything seen is written to
 * docs/evidence/voice-01/round2-matrix.json so the round report quotes a
 * measurement, not a claim. Off-canvas shell items (skip link, drawers) are
 * not page flow and are excluded by the same rule as the overlap metric.
 */
test.describe.configure({ mode: "serial" })

const DASH_EMAIL = "e2e-ph-dash@policywallet.test"
const STATES: PortfolioState[] = ["empty", "typical", "heavy", "all-expired"]
const ROUTES = ["/dashboard", "/wallet", "/protection", "/recommendations", "/account"]
const OUT = path.join(process.cwd(), "docs/evidence/voice-01")

type Change = { locator: string; before: string | null; after: string | null; surface: string }

/** The rewritten texts of every round so far, with placeholders and template expressions as wildcards. */
const LEDGERS = readdirSync("docs/content").filter((f) => /^voice-01-round\d+-changes\.json$/.test(f)).map((f) => path.join("docs/content", f))
const REWRITTEN: string[][] = LEDGERS.flatMap((f) => JSON.parse(readFileSync(f, "utf-8")) as Change[])
    .filter((c) => c.after && c.surface !== "public")
    .map((c) => (c.after as string).replace(/\$\{[^}]*\}|\{[a-zA-Z_]+\}/g, " ").split(" ").map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean))
    .filter((parts) => parts.join("").length >= 6)

interface Seen {
    text: string
    why: "ok" | "clamp" | "overflow" | "offpage"
    dx: number
}
interface Row {
    state: PortfolioState
    width: number
    route: string
    hscroll: number
    seen: Seen[]
}

async function open(page: Page, route: string): Promise<void> {
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 90_000 })
    if (page.url().includes("/auth/")) throw new Error(`${route}: bounced to sign-in — the dash storageState is stale`)
    await dismissCookieBanner(page)
    await settle(page)
}

async function inspect(page: Page, patterns: string[][]): Promise<{ hscroll: number; seen: Seen[] }> {
    return page.evaluate((pats) => {
        const de = document.documentElement
        const hscroll = Math.max(0, de.scrollWidth - de.clientWidth)
        const seen: { text: string; why: "ok" | "clamp" | "overflow" | "offpage"; dx: number }[] = []
        const matches = (text: string) => pats.some((parts) => {
            let from = 0
            for (const p of parts) {
                const i = text.indexOf(p, from)
                if (i < 0) return false
                from = i + p.length
            }
            return true
        })
        const els = document.querySelectorAll<HTMLElement>("h1,h2,h3,h4,p,a,button,span,li,dt,dd,label,small,strong,td,th,div")
        for (const el of els) {
            if (el.children.length > 2) continue
            const text = (el.textContent || "").replace(/\s+/g, " ").trim()
            if (text.length < 6 || text.length > 400 || !/[Ͱ-Ͽ]/.test(text) || !matches(text)) continue
            const rect = el.getBoundingClientRect()
            if (rect.width === 0 || rect.height === 0) continue
            if (rect.right <= 0) continue // off-canvas shell item
            const cs = getComputedStyle(el)
            const clamps = cs.textOverflow === "ellipsis" || cs.webkitLineClamp !== "none"
            const clipped = clamps && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
            const overflows = el.scrollWidth > el.clientWidth + 1 && (cs.overflowX === "hidden" || cs.overflow === "hidden")
            const offpage = rect.right > de.clientWidth + 1
            seen.push({
                text: text.slice(0, 90),
                why: clipped ? "clamp" : overflows ? "overflow" : offpage ? "offpage" : "ok",
                dx: Math.round(rect.right - de.clientWidth),
            })
        }
        // one entry per distinct text — the innermost element wins by appearing last
        const byText = new Map<string, (typeof seen)[number]>()
        for (const s of seen) byText.set(s.text, s)
        return { hscroll, seen: [...byText.values()] }
    }, patterns)
}

const rows: Row[] = []

for (const state of STATES) {
    test(`voice matrix: ${state}`, async ({ page }) => {
        test.setTimeout(600_000)
        await withDb((db) => applyPortfolioState(db, DASH_EMAIL, state))
        for (const width of WIDTHS) {
            await page.setViewportSize({ width, height: 900 })
            for (const route of ROUTES) {
                await open(page, route)
                const { hscroll, seen } = await inspect(page, REWRITTEN)
                rows.push({ state, width, route, hscroll, seen })
            }
        }
        mkdirSync(OUT, { recursive: true })
        writeFileSync(path.join(OUT, "round2-matrix.json"), JSON.stringify({ generated: new Date().toISOString(), states: STATES, widths: WIDTHS, routes: ROUTES, patterns: REWRITTEN.length, rows }, null, 1))

        const sideways = rows.filter((r) => r.state === state && r.hscroll > 1).map((r) => `${r.width}px ${r.route}: ${r.hscroll}px`)
        expect(sideways, `pages that scroll sideways in state ${state}:\n${sideways.join("\n")}`).toEqual([])
        const broken = rows
            .filter((r) => r.state === state)
            .flatMap((r) => r.seen.filter((s) => s.why !== "ok").map((s) => `${r.width}px ${r.route} [${s.why} dx=${s.dx}] «${s.text}»`))
        expect(broken, `rewritten strings clipped or off the page in state ${state}:\n${broken.join("\n")}`).toEqual([])
    })
}
