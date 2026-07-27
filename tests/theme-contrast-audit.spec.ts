import { test, expect, type Page } from '@playwright/test'
import sharp from 'sharp'
import { dismissCookieBanner } from './helpers/ui'

/**
 * Runtime theme audit across the AUTHENTICATED app, both themes, three widths.
 *
 * MEASURES RENDERED PIXELS, not computed styles. Two full-page screenshots are
 * taken — one normal, one with every glyph made transparent — so the background
 * is read from what was actually painted and the text colour is recovered by
 * differencing. That sidesteps the two problems that made a computed-style
 * approach unusable here:
 *
 *   - Chrome serialises theme tokens as oklab()/lab(), and canvas fillStyle
 *     REJECTS oklab in this build while silently keeping its previous value — so
 *     every token parsed as the seed colour and readable white-on-dark text
 *     scored a contrast ratio of exactly 1.0.
 *   - Backgrounds come from gradients (background-image), translucent layers and
 *     ancestors that are all transparent, so recomposing the backdrop by walking
 *     the DOM guessed wrong in several distinct ways.
 *
 * Pixels have neither problem: what is on screen is what is measured.
 *
 * Opt-in — a findings tool, not a gate.
 */
test.skip(!process.env.RUN_UX_AUDIT, 'Theme audit — run with RUN_UX_AUDIT=1')

const PAGES = ['/dashboard', '/wallet', '/coverage-insights', '/renewals', '/account', '/branches']

const VIEWPORTS = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 },
]

type Box = { x: number; y: number; w: number; h: number; t: string; tag: string; cls: string; big: boolean }

/** Visible text boxes in DOCUMENT coordinates, to match a full-page screenshot. */
const COLLECT = `(() => {
  const out = [];
  document.querySelectorAll('h1,h2,h3,h4,h5,p,span,a,button,li,td,th,label,dt,dd').forEach(el => {
    const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim();
    if (!txt || txt.length < 2) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return;
    if (parseFloat(cs.opacity) < 0.55) return;
    if (el.closest('[disabled],[aria-disabled="true"]')) return;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
    out.push({ x: Math.round(r.left + window.scrollX), y: Math.round(r.top + window.scrollY),
      w: Math.round(r.width), h: Math.round(r.height), t: txt.slice(0, 40),
      tag: el.tagName, cls: String(el.className || '').slice(0, 70),
      big: size >= 24 || (size >= 18.66 && bold) });
  });
  return out;
})()`

const HIDE_TEXT = `*, *::before, *::after {
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    text-shadow: none !important;
}`

const srgb = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}
const lum = (r: number, g: number, b: number) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b)
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
const hex = (v: number) => '#' + v.toString(16).padStart(6, '0')

async function audit(page: Page, path: string): Promise<string[]> {
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 90_000 })
    await dismissCookieBanner(page)
    await page.waitForTimeout(900)

    const applied = await page.evaluate(() => document.documentElement.className)
    expect(applied.includes('light') && applied.includes('dark'), `hybrid theme on ${path}`).toBe(false)

    const boxes = (await page.evaluate(COLLECT)) as Box[]
    if (!boxes.length) return []

    const withText = await page.screenshot({ fullPage: true })
    const handle = await page.addStyleTag({ content: HIDE_TEXT })
    await page.waitForTimeout(250)
    const noText = await page.screenshot({ fullPage: true })
    await handle.evaluate((n) => (n as HTMLElement).remove())

    const a = await sharp(withText).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const b = await sharp(noText).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const W = a.info.width
    const H = a.info.height
    // A layout shift between the two shots would misalign every sample. Skipping
    // is the honest response; reporting against mismatched pixels is not.
    if (b.info.width !== W || b.info.height !== H) return []

    const findings: string[] = []
    for (const box of boxes) {
        const x0 = Math.max(0, box.x)
        const y0 = Math.max(0, box.y)
        const x1 = Math.min(W, box.x + box.w)
        const y1 = Math.min(H, box.y + box.h)
        if (x1 - x0 < 2 || y1 - y0 < 2) continue

        // Background = the most common pixel in the text-free render of this box.
        const counts = new Map<number, number>()
        let bgKey = -1
        let bgN = 0
        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const i = (y * W + x) * 4
                const k = (b.data[i] << 16) | (b.data[i + 1] << 8) | b.data[i + 2]
                const n = (counts.get(k) || 0) + 1
                counts.set(k, n)
                if (n > bgN) {
                    bgN = n
                    bgKey = k
                }
            }
        }
        if (bgKey < 0) continue
        const bgL = lum((bgKey >> 16) & 255, (bgKey >> 8) & 255, bgKey & 255)

        // Text colour = the changed pixel furthest in luminance from the
        // background. Antialiased edges blend toward it, so the extreme is the
        // glyph core — the colour a reader actually perceives.
        let best = -1
        let bestD = 0
        for (let y = y0; y < y1; y++) {
            for (let x = x0; x < x1; x++) {
                const i = (y * W + x) * 4
                if (
                    Math.abs(a.data[i] - b.data[i]) < 8 &&
                    Math.abs(a.data[i + 1] - b.data[i + 1]) < 8 &&
                    Math.abs(a.data[i + 2] - b.data[i + 2]) < 8
                )
                    continue
                const d = Math.abs(lum(a.data[i], a.data[i + 1], a.data[i + 2]) - bgL)
                if (d > bestD) {
                    bestD = d
                    best = (a.data[i] << 16) | (a.data[i + 1] << 8) | a.data[i + 2]
                }
            }
        }
        // No glyph pixels resolved (icon font, text baked into an image, or the
        // box is covered by a sibling) — nothing measurable, so claim nothing.
        if (best < 0) continue

        const cr = ratio(lum((best >> 16) & 255, (best >> 8) & 255, best & 255), bgL)
        const min = box.big ? 3 : 4.5
        if (cr < min - 0.05) {
            findings.push(
                `${path} "${box.t}" ${cr.toFixed(2)}:1 (needs ${min}) fg=${hex(best)} bg=${hex(bgKey)} <${box.tag}> ${box.cls}`
            )
        }
    }
    return findings
}

for (const viewport of VIEWPORTS) {
    test.describe(`theme audit — ${viewport.name}`, () => {
        test.use({ viewport: { width: viewport.width, height: viewport.height } })

        for (const theme of ['light', 'dark'] as const) {
            test(`${theme} mode has no contrast failures`, async ({ page }) => {
                // Six routes, two full-page screenshots each, against `npm run dev`
                // where the first hit of every route pays on-demand compilation.
                test.setTimeout(12 * 60_000)
                await page.addInitScript((t) => {
                    try {
                        window.localStorage.setItem('theme', t)
                    } catch {
                        /* storage unavailable */
                    }
                }, theme)

                const all: string[] = []
                for (const path of PAGES) all.push(...(await audit(page, path)))

                expect(
                    all.join('\n'),
                    `contrast failures — ${theme}/${viewport.name}:\n${all.join('\n')}`
                ).toBe('')
            })
        }
    })
}
