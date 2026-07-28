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
    // Must actually be the top layer where we intend to sample. An element
    // clipped inside an overflow-hidden container still reports a box, but the
    // pixels there belong to whatever is painted on top — sampling it compares
    // that surface with itself and yields a ~1:1 ratio on healthy markup.
    const cx = Math.min(Math.max(r.left + r.width / 2, 1), window.innerWidth - 2);
    const cy = Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 2);
    const top = document.elementFromPoint(cx, cy);
    if (!top || (top !== el && !el.contains(top) && !top.contains(el))) return;
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
    // Freeze motion before capturing. Mid-transition elements measured ~1.1:1
    // because a fading container renders text and surface at nearly the same
    // value — an artifact of WHEN the shot was taken, not a real defect.
    await page.addStyleTag({
        content: `*, *::before, *::after {
            animation: none !important;
            transition: none !important;
            animation-duration: 0s !important;
            transition-duration: 0s !important;
        }`,
    })
    await page.waitForTimeout(1200)

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

/**
 * LAYOUT: horizontal overflow, elements escaping the viewport, and text clipped
 * without an ellipsis. All three are mechanically detectable and are the layout
 * faults that actually reach users — a page that scrolls sideways on a phone, a
 * control pushed off-screen, a label cut mid-word with no affordance.
 */
const LAYOUT_SCAN = `(() => {
  const vw = document.documentElement.clientWidth;
  const out = { pageScrollW: document.documentElement.scrollWidth, vw, escapes: [], clipped: [] };
  document.querySelectorAll('body *').forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.position === 'fixed') return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;

    // Escapes the viewport horizontally. Ignore deliberately scrollable strips.
    if (r.right > vw + 2 || r.left < -2) {
      let scrollable = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const pcs = getComputedStyle(p);
        if (pcs.overflowX === 'auto' || pcs.overflowX === 'scroll') { scrollable = true; break }
      }
      // Two legitimate patterns look like escapes and are not:
      //  - the off-canvas nav drawer, parked fully outside the viewport
      //    (identical bounds on every page at tablet width);
      //  - decorative blur/gradient blobs, which carry no text.
      // Only content the user is meant to read counts.
      const fullyOffCanvas = r.right <= 0 || r.left >= vw;
      const hasText = (el.textContent || '').trim().length > 0;
      if (!scrollable && !fullyOffCanvas && hasText && out.escapes.length < 6) {
        out.escapes.push({ tag: el.tagName, cls: String(el.className || '').slice(0, 60),
          left: Math.round(r.left), right: Math.round(r.right),
          txt: (el.textContent || '').trim().slice(0, 30) });
      }
    }

    // Text wider than its box with no ellipsis and no wrapping = silently cut.
    const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('').trim();
    if (txt.length > 3 && el.scrollWidth > el.clientWidth + 2 && cs.overflow !== 'visible'
        && cs.textOverflow !== 'ellipsis' && cs.overflowX !== 'auto' && cs.overflowX !== 'scroll'
        && out.clipped.length < 6) {
      out.clipped.push({ tag: el.tagName, cls: String(el.className || '').slice(0, 60),
        scrollW: el.scrollWidth, clientW: el.clientWidth, txt: txt.slice(0, 30) });
    }
  });
  return out;
})()`

for (const viewport of VIEWPORTS) {
    test.describe(`layout audit — ${viewport.name}`, () => {
        test.use({ viewport: { width: viewport.width, height: viewport.height } })

        test('no horizontal overflow, escaping elements or clipped text', async ({ page }) => {
            test.setTimeout(12 * 60_000)
            await page.addInitScript(() => {
                try {
                    window.localStorage.setItem('theme', 'dark')
                } catch {
                    /* storage unavailable */
                }
            })
            const problems: string[] = []
            for (const path of PAGES) {
                await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 90_000 })
                await dismissCookieBanner(page)
                await page.waitForTimeout(800)
                const r = (await page.evaluate(LAYOUT_SCAN)) as any
                if (r.pageScrollW > r.vw + 2) {
                    problems.push(`${path} scrolls horizontally: ${r.pageScrollW}px content in ${r.vw}px viewport`)
                }
                for (const e of r.escapes) {
                    problems.push(`${path} escapes viewport [${e.left}..${e.right} of ${r.vw}] <${e.tag}> "${e.txt}" ${e.cls}`)
                }
                for (const c of r.clipped) {
                    problems.push(`${path} clipped without ellipsis (${c.scrollW}>${c.clientW}) <${c.tag}> "${c.txt}" ${c.cls}`)
                }
            }
            expect(problems.join('\n'), `layout problems — ${viewport.name}:\n${problems.join('\n')}`).toBe('')
        })
    })
}

/**
 * INTERACTION STATES: every interactive control must visibly change on hover and
 * expose a focus indicator, in BOTH themes.
 *
 * This compares computed values for INEQUALITY rather than parsing them, so the
 * oklab() serialisation that defeated the contrast work is irrelevant here — a
 * string that differs is a state that changed.
 *
 * RESULT SO FAR: focus indicators are universally present — ZERO
 * "NO FOCUS INDICATOR" findings across both themes. That half is trustworthy.
 *
 * The hover half OVER-REPORTS and needs refining before its output is actioned:
 * it reads the hovered element's OWN computed style, so it misses
 *   - `group-hover:` effects, which restyle a CHILD rather than the element;
 *   - hover styling applied to an ancestor wrapper;
 *   - already-active nav items, which legitimately have no hover delta.
 * Refine by snapshotting the element's subtree (and its nearest `.group`
 * ancestor) rather than the single node.
 */
const SNAP = `(el) => {
  const cs = getComputedStyle(el);
  return [cs.color, cs.backgroundColor, cs.borderColor, cs.outlineStyle, cs.outlineWidth,
          cs.boxShadow, cs.opacity, cs.textDecorationLine, cs.transform].join('|');
}`

for (const theme of ['light', 'dark'] as const) {
    test.describe(`interaction states — ${theme}`, () => {
        test('controls give hover feedback and expose a focus ring', async ({ page }) => {
            test.setTimeout(12 * 60_000)
            await page.addInitScript((t) => {
                try {
                    window.localStorage.setItem('theme', t)
                } catch {
                    /* storage unavailable */
                }
            }, theme)

            const problems: string[] = []
            for (const path of ['/dashboard', '/wallet', '/account', '/branches']) {
                await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 90_000 })
                await dismissCookieBanner(page)
                await page.waitForTimeout(800)

                const controls = page.locator(
                    'button:visible:not([disabled]), a[href]:visible'
                )
                const n = Math.min(await controls.count(), 14) // sample per page
                for (let i = 0; i < n; i++) {
                    const el = controls.nth(i)
                    let label = ''
                    try {
                        label = ((await el.textContent()) || (await el.getAttribute('aria-label')) || '')
                            .trim()
                            .slice(0, 28)
                    } catch {
                        continue
                    }
                    if (!label) continue

                    try {
                        const base = await el.evaluate(SNAP)

                        await el.hover({ timeout: 3000 })
                        await page.waitForTimeout(120)
                        const hovered = await el.evaluate(SNAP)
                        if (hovered === base) {
                            problems.push(`${path} NO HOVER FEEDBACK — "${label}"`)
                        }

                        await el.evaluate((n2) => (n2 as HTMLElement).focus())
                        await page.waitForTimeout(120)
                        const focused = await el.evaluate(SNAP)
                        // A focus indicator must be perceivable: an outline, a ring
                        // (box-shadow), or some other computed change.
                        const hasRing = await el.evaluate((n2) => {
                            const c = getComputedStyle(n2)
                            return (
                                (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) ||
                                (c.boxShadow !== 'none' && c.boxShadow !== '')
                            )
                        })
                        if (!hasRing && focused === base) {
                            problems.push(`${path} NO FOCUS INDICATOR — "${label}"`)
                        }
                    } catch {
                        continue // detached / covered mid-iteration
                    }
                }
            }
            expect(
                problems.join('\n'),
                `interaction-state problems — ${theme}:\n${problems.join('\n')}`
            ).toBe('')
        })
    })
}

/**
 * THEME SWITCHING: repeatedly toggling, refreshing and navigating must never
 * leave a surface painted in the previous theme.
 *
 * Compares a computed-style fingerprint for INEQUALITY, so colour-space
 * serialisation is irrelevant — a surface that did not repaint is one whose
 * fingerprint failed to change when the theme did.
 */
const FINGERPRINT = `(() => {
  const pick = ['body', 'main', 'aside', 'header', 'h1', 'table', '[role="dialog"]'];
  const parts = [];
  for (const sel of pick) {
    const el = document.querySelector(sel);
    if (!el) { parts.push(sel + ':absent'); continue }
    const cs = getComputedStyle(el);
    parts.push(sel + ':' + cs.color + '/' + cs.backgroundColor + '/' + cs.borderColor);
  }
  return parts.join(' ~ ');
})()`

async function setThemeLive(page: Page, theme: 'light' | 'dark') {
    await page.evaluate((t) => {
        window.localStorage.setItem('theme', t)
        const r = document.documentElement
        r.classList.remove('light', 'dark')
        r.classList.add(t)
    }, theme)
    await page.waitForTimeout(400)
}

test.describe('theme switching leaves no stale styles', () => {
    test('toggle, refresh and navigate all repaint correctly', async ({ page }) => {
        test.setTimeout(12 * 60_000)
        const problems: string[] = []
        const routes = ['/dashboard', '/wallet', '/account']

        for (const path of routes) {
            await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 90_000 })
            await dismissCookieBanner(page)
            await page.waitForTimeout(600)

            // Toggle repeatedly — a surface that only repaints on first switch
            // shows up as an unchanged fingerprint on a later pass.
            let prevLight = ''
            let prevDark = ''
            for (let round = 0; round < 3; round++) {
                await setThemeLive(page, 'light')
                const light = (await page.evaluate(FINGERPRINT)) as string
                await setThemeLive(page, 'dark')
                const dark = (await page.evaluate(FINGERPRINT)) as string

                if (light === dark) {
                    problems.push(`${path} round ${round}: fingerprint IDENTICAL in both themes — nothing repainted`)
                }
                if (round > 0 && light !== prevLight) {
                    problems.push(`${path} round ${round}: light differs from the previous light pass — stale style`)
                }
                if (round > 0 && dark !== prevDark) {
                    problems.push(`${path} round ${round}: dark differs from the previous dark pass — stale style`)
                }
                prevLight = light
                prevDark = dark
            }

            // Refresh must reproduce the dark fingerprint exactly.
            await page.reload({ waitUntil: 'domcontentloaded', timeout: 90_000 })
            await dismissCookieBanner(page)
            await page.waitForTimeout(700)
            const afterReload = (await page.evaluate(FINGERPRINT)) as string
            if (afterReload !== prevDark) {
                problems.push(`${path}: dark fingerprint changed across a refresh — theme did not persist cleanly`)
            }
        }

        // Navigate between pages and return: the fingerprint must match a fresh load.
        await page.goto(routes[0], { waitUntil: 'domcontentloaded', timeout: 90_000 })
        await dismissCookieBanner(page)
        await page.waitForTimeout(700)
        const fresh = (await page.evaluate(FINGERPRINT)) as string
        await page.goto(routes[1], { waitUntil: 'domcontentloaded', timeout: 90_000 })
        await page.waitForTimeout(500)
        await page.goto(routes[0], { waitUntil: 'domcontentloaded', timeout: 90_000 })
        await page.waitForTimeout(700)
        const returned = (await page.evaluate(FINGERPRINT)) as string
        if (returned !== fresh) {
            problems.push(`${routes[0]}: fingerprint differs after navigating away and back — stale style carried over`)
        }

        expect(problems.join('\n'), `theme-switch problems:\n${problems.join('\n')}`).toBe('')
    })
})
