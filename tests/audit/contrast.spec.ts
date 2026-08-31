import fs from "node:fs"
import path from "node:path"
import { test, expect } from "@playwright/test"
import { BASE, TARGET, OLD_ROUTES, ROUTE_MAP, THEMES, auditContext, settleDeterministic, assertTarget } from "./helpers"

/**
 * A4 — rendered contrast. The token matrix guards the PALETTE; this walks
 * the PAGE: every visible text node's effective foreground against its
 * composited background (alpha resolved up the ancestor chain), 4.5:1 for
 * body text, 3:1 for large text and for form-control borders. Both themes.
 * Colours are parsed mathematically — rgb()/rgba() and oklab() — never via
 * canvas (the serialization trap theme-contrast-audit.spec.ts documents).
 * Disabled controls are exempt (WCAG); zero-alpha text is skipped.
 */

type Fail = { route: string; theme: string; kind: string; text: string; fg: string; bg: string; ratio: number; selector: string }

test.describe("A4 contrast", () => {
    test.beforeEach(async ({ request }, testInfo) => {
        test.skip(testInfo.project.name !== "desktop", "contrast is resolution-independent — one width, both themes")
        await assertTarget(request)
    })

    test("every rendered pair clears its floor", async ({ browser }, testInfo) => {
        test.setTimeout(600_000)
        const routes = TARGET === "old" ? [...OLD_ROUTES] : [...OLD_ROUTES].map((r) => ROUTE_MAP[r])
        const fails: Fail[] = []

        for (const theme of THEMES) {
            const ctx = await auditContext(browser, testInfo.project.name, theme)
            const page = await ctx.newPage()
            for (const route of routes) {
                await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" })
                await settleDeterministic(page)

                const routeFails = await page.evaluate(() => {
                    // ---- colour math (no canvas) ----
                    const srgbToLin = (c: number) => { const s = c / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
                    const lum = ([r, g, b]: number[]) => 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b)
                    const ratio = (a: number[], b: number[]) => { const [x, y] = [lum(a) + 0.05, lum(b) + 0.05]; return x > y ? x / y : y / x }
                    const oklabToSrgb = (L: number, a: number, bb: number): number[] => {
                        const l_ = L + 0.3963377774 * a + 0.2158037573 * bb
                        const m_ = L - 0.1055613458 * a - 0.0638541728 * bb
                        const s_ = L - 0.0894841775 * a - 1.291485548 * bb
                        const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3
                        const lin = [
                            4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
                            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
                            -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
                        ]
                        return lin.map((v) => {
                            const c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055
                            return Math.round(Math.min(1, Math.max(0, c)) * 255)
                        })
                    }
                    const parse = (css: string): { rgb: number[]; alpha: number } | null => {
                        let m = css.match(/rgba?\(([\d.]+),?\s*([\d.]+),?\s*([\d.]+)(?:[,/]\s*([\d.%]+))?\)/)
                        if (m) {
                            let a = m[4] === undefined ? 1 : parseFloat(m[4])
                            if (m[4]?.includes("%")) a /= 100
                            return { rgb: [+m[1], +m[2], +m[3]], alpha: a }
                        }
                        m = css.match(/oklab\(([\d.%]+)\s+([-\d.]+)\s+([-\d.]+)(?:\s*\/\s*([\d.%]+))?\)/)
                        if (m) {
                            const L = m[1].includes("%") ? parseFloat(m[1]) / 100 : parseFloat(m[1])
                            let a = m[4] === undefined ? 1 : parseFloat(m[4])
                            if (m[4]?.includes("%")) a /= 100
                            return { rgb: oklabToSrgb(L, parseFloat(m[2]), parseFloat(m[3])), alpha: a }
                        }
                        if (css === "transparent") return { rgb: [0, 0, 0], alpha: 0 }
                        return null
                    }
                    const composite = (top: number[], ta: number[] | number, bottom: number[]): number[] => {
                        const a = typeof ta === "number" ? ta : 1
                        return top.map((c, i) => Math.round(c * a + bottom[i] * (1 - a)))
                    }
                    const effectiveBg = (el: Element): number[] => {
                        const layers: { rgb: number[]; alpha: number }[] = []
                        for (let cur: Element | null = el; cur; cur = cur.parentElement) {
                            const p = parse(getComputedStyle(cur).backgroundColor)
                            if (p && p.alpha > 0) {
                                layers.push(p)
                                if (p.alpha >= 1) break
                            }
                        }
                        let bg = [255, 255, 255]
                        const rootBg = parse(getComputedStyle(document.documentElement).backgroundColor)
                        if (layers.length === 0 || layers[layers.length - 1].alpha < 1) {
                            if (rootBg && rootBg.alpha > 0) bg = rootBg.rgb
                        }
                        for (let i = layers.length - 1; i >= 0; i--) bg = composite(layers[i].rgb, layers[i].alpha, bg)
                        return bg
                    }

                    const out: { kind: string; text: string; fg: string; bg: string; ratio: number; selector: string }[] = []
                    const scope = document.querySelector("main") || document.body
                    const sel = (el: Element): string => {
                        const parts: string[] = []
                        for (let cur: Element | null = el, hops = 0; cur && cur !== document.body && hops < 4; cur = cur.parentElement, hops++)
                            parts.unshift(cur.tagName.toLowerCase() + (cur.id ? `#${cur.id}` : ""))
                        return parts.join(">")
                    }

                    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
                    let n: Node | null
                    const seen = new Set<Element>()
                    while ((n = walker.nextNode())) {
                        const t = (n.textContent || "").trim()
                        const el = n.parentElement
                        if (t.length < 2 || !el || seen.has(el)) continue
                        seen.add(el)
                        const r = el.getBoundingClientRect()
                        if (r.width < 2 || r.height < 2) continue
                        const cs = getComputedStyle(el)
                        if (cs.visibility === "hidden" || el.closest('[aria-hidden="true"], [disabled], [aria-disabled="true"], script, style')) continue
                        const fg = parse(cs.color)
                        if (!fg || fg.alpha === 0) continue
                        const bg = effectiveBg(el)
                        const fgFlat = fg.alpha < 1 ? composite(fg.rgb, fg.alpha, bg) : fg.rgb
                        const rr = ratio(fgFlat, bg)
                        const px = parseFloat(cs.fontSize)
                        const bold = parseInt(cs.fontWeight, 10) >= 700
                        const large = px >= 24 || (px >= 18.66 && bold)
                        const floor = large ? 3 : 4.5
                        if (rr < floor) out.push({ kind: "text", text: t.slice(0, 50), fg: cs.color, bg: `rgb(${bg.join(",")})`, ratio: Math.round(rr * 100) / 100, selector: sel(el) })
                    }

                    // meaningful borders: form controls at 3:1 against their surroundings
                    scope.querySelectorAll<HTMLElement>("input, select, textarea").forEach((el) => {
                        const r = el.getBoundingClientRect()
                        if (r.width < 2 || r.height < 2 || el.closest("[disabled]")) return
                        const cs = getComputedStyle(el)
                        if (parseFloat(cs.borderTopWidth) < 1) return
                        const bc = parse(cs.borderTopColor)
                        if (!bc || bc.alpha === 0) return
                        const bg = effectiveBg(el.parentElement || el)
                        const flat = bc.alpha < 1 ? composite(bc.rgb, bc.alpha, bg) : bc.rgb
                        const rr = ratio(flat, bg)
                        if (rr < 3) out.push({ kind: "border", text: el.getAttribute("name") || el.tagName, fg: cs.borderTopColor, bg: `rgb(${bg.join(",")})`, ratio: Math.round(rr * 100) / 100, selector: sel(el) })
                    })
                    return out
                })
                for (const f of routeFails) fails.push({ route, theme, ...f })
            }
            await ctx.close()
        }

        const outDir = path.join(process.cwd(), "docs/audit")
        fs.mkdirSync(outDir, { recursive: true })
        fs.writeFileSync(
            path.join(outDir, `contrast-${TARGET === "old" ? "baseline" : "new"}.json`),
            JSON.stringify({ target: TARGET, capturedAt: new Date().toISOString(), fails }, null, 2)
        )

        if (TARGET === "new") {
            const lines = fails.map((f) => `${f.route} [${f.theme}] ${f.kind} ${f.ratio}:1 «${f.text}» fg=${f.fg} bg=${f.bg} (${f.selector})`)
            expect(fails, lines.join("\n")).toEqual([])
        } else {
            expect(fails.length, "probe sensitivity: the old build has known dark-theme failures").toBeGreaterThan(0)
        }
    })
})
