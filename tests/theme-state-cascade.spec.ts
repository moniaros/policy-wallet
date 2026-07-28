import { test, expect } from '@playwright/test'
import { dismissCookieBanner } from './helpers/ui'

/**
 * STATE-CASCADE AUDIT — every element, every declared state, one pass per page.
 *
 * Driving real mouse events into each control (hover -> focus -> press) cost
 * ~1.5s per button, so a sweep over 8 pages x 2 themes never finished. It also
 * only ever reached the handful of controls the sampler picked.
 *
 * This reads the CSSOM instead: find every rule carrying a state pseudo-class
 * (:hover, :focus-visible, :active, :disabled, aria-pressed/selected, [data-state])
 * that sets a colour, resolve which live elements it applies to, and compute the
 * contrast that state WOULD produce. No interaction, no per-control latency, and
 * it covers every matching element on the page rather than a sample.
 */

const THEMES = ['light', 'dark'] as const
const VIEWPORTS = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 },
]

const PAGES = [
    '/dashboard', '/wallet', '/account', '/branches', '/notifications', '/tasks',
    '/help', '/upgrade', '/coverage-insights', '/renewals', '/questionnaires',
    '/', '/pricing', '/product', '/product/motor', '/guides', '/company', '/terms',
]

/** Runs in the page. Returns one finding per illegible state. */
function auditStates() {
    const lum = (r: number, g: number, b: number) => {
        const f = (v: number) => {
            v /= 255
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const parse = (str: string): number[] | null => {
        const m = String(str || '').match(/-?[0-9.]+/g)
        if (!m || m.length < 3) return null
        return [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1]
    }
    const over = (fg: number[], bg: number[]) => {
        const a = fg[3]
        return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1]
    }
    /** Composite up the ancestor chain until opaque — a /10 wash is not its token. */
    const surface = (node: Element, skipSelf: boolean): number[] => {
        let acc: number[] | null = null
        let first = true
        for (let n: Element | null = node; n; n = n.parentElement) {
            if (first && skipSelf) {
                first = false
                continue
            }
            first = false
            const c = parse(getComputedStyle(n).backgroundColor)
            if (!c || c[3] === 0) continue
            acc = acc ? over(acc, c) : c
            if (acc[3] >= 0.999) return acc
        }
        return acc || [255, 255, 255, 1]
    }
    const ratio = (x: number[], y: number[]) => {
        const l1 = lum(x[0], x[1], x[2])
        const l2 = lum(y[0], y[1], y[2])
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    }
    const hex = (c: number[]) =>
        '#' + c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')

    // Every state we can resolve statically from the cascade.
    const STATE_RE =
        /(:hover|:focus-visible|:focus|:active|:disabled|:checked|\[aria-pressed=["']?true|\[aria-selected=["']?true|\[aria-current|\[data-state=["']?(on|open|active|checked|selected))/

    const findings: any[] = []
    const seen = new Set<string>()

    for (const sheet of Array.from(document.styleSheets)) {
        let rules: CSSRule[]
        try {
            rules = Array.from((sheet as CSSStyleSheet).cssRules || [])
        } catch {
            continue // cross-origin
        }
        // Flatten one level of @media / @supports.
        const flat: CSSRule[] = []
        for (const r of rules) {
            const grouping = r as CSSGroupingRule
            if (grouping.cssRules) {
                try {
                    for (const inner of Array.from(grouping.cssRules)) flat.push(inner)
                } catch {
                    /* ignore */
                }
            } else flat.push(r)
        }

        for (const rule of flat) {
            const sr = rule as CSSStyleRule
            if (!sr.selectorText || !sr.style) continue
            if (!STATE_RE.test(sr.selectorText)) continue

            const fgDecl = sr.style.getPropertyValue('color')
            const bgDecl = sr.style.getPropertyValue('background-color')
            if (!fgDecl && !bgDecl) continue

            for (const part of sr.selectorText.split(',')) {
                const sel = part.trim()
                if (!sel) continue
                // Strip the state so we can find the elements it would apply to.
                const base = sel
                    .replace(/:hover|:focus-visible|:focus|:active|:disabled|:checked/g, '')
                    .replace(/\[aria-pressed=["']?true["']?\]/g, '')
                    .replace(/\[aria-selected=["']?true["']?\]/g, '')
                    .replace(/\[data-state=["']?[a-z]+["']?\]/g, '')
                    .trim()
                if (!base || base === '*' || /^[>+~]/.test(base)) continue

                let els: Element[]
                try {
                    els = Array.from(document.querySelectorAll(base)).slice(0, 6)
                } catch {
                    continue
                }

                for (const el of els) {
                    const r = el.getBoundingClientRect()
                    if (r.width < 8 || r.height < 8) continue
                    const cs = getComputedStyle(el)
                    if (cs.visibility === 'hidden' || cs.display === 'none') continue

                    // Resolve the state's colours: the rule's own values where it
                    // sets them, the element's current value where it does not.
                    let fg = parse(fgDecl) || parse(cs.color)
                    const ownBg = parse(bgDecl) || parse(cs.backgroundColor)
                    if (!fg) continue

                    // Background behind the element, then the element's own state bg.
                    const behind = surface(el, true)
                    let bg = ownBg && ownBg[3] > 0 ? over(ownBg, behind) : behind
                    if (fg[3] < 1) fg = over(fg, bg)

                    const fontPx = parseFloat(cs.fontSize) || 16
                    const bold = parseInt(cs.fontWeight, 10) >= 700
                    const large = fontPx >= 24 || (fontPx >= 18.66 && bold)
                    const isDisabled = /:disabled/.test(sel)
                    // Disabled text is allowed to be dimmer, but must not vanish.
                    const need = isDisabled ? 2.5 : large ? 3 : 4.5

                    const cr = ratio(fg, bg)
                    if (cr >= need) continue

                    const label = (el.textContent || '').trim().slice(0, 22)
                    if (!label) continue
                    const key = sel + '|' + label + '|' + hex(fg) + hex(bg)
                    if (seen.has(key)) continue
                    seen.add(key)

                    findings.push({
                        sel: sel.slice(0, 70),
                        label,
                        cr: Math.round(cr * 100) / 100,
                        need,
                        fg: hex(fg),
                        bg: hex(bg),
                        cls: String(el.className || '').slice(0, 55),
                    })
                }
            }
        }
    }
    return { findings, ruleCount: seen.size }
}

/** Every card/dialog/menu surface must not stay light in dark mode. */
function auditSurfaces() {
    const lum = (r: number, g: number, b: number) => {
        const f = (v: number) => {
            v /= 255
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const parse = (str: string): number[] | null => {
        const m = String(str || '').match(/-?[0-9.]+/g)
        if (!m || m.length < 3) return null
        return [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1]
    }
    const over = (fg: number[], bg: number[]) => {
        const a = fg[3]
        return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1]
    }
    const surface = (node: Element): number[] => {
        let acc: number[] | null = null
        for (let n: Element | null = node; n; n = n.parentElement) {
            const c = parse(getComputedStyle(n).backgroundColor)
            if (!c || c[3] === 0) continue
            acc = acc ? over(acc, c) : c
            if (acc[3] >= 0.999) return acc
        }
        return acc || [255, 255, 255, 1]
    }

    const sel =
        '.pw-card, [role=dialog], [role=menu], [role=listbox], [role=tooltip], aside, dialog, [class*=card], [class*=modal], [class*=dropdown], [class*=panel], [class*=sheet], [class*=popover]'
    const out: any[] = []
    let checked = 0
    const seen = new Set<string>()
    for (const el of Array.from(document.querySelectorAll(sel)).slice(0, 120)) {
        // Interactive fills are deliberate brand colour, not a stale surface.
        if (el.closest('button, a, [role=button], input, select, textarea')) continue
        const r = el.getBoundingClientRect()
        if (r.width < 60 || r.height < 32) continue
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || cs.display === 'none') continue
        checked++
        const bg = surface(el)
        const L = lum(bg[0], bg[1], bg[2])
        const key = bg.slice(0, 3).map(Math.round).join(',')
        if (L > 0.5 && !seen.has(key)) {
            seen.add(key)
            out.push({
                bg: '#' + bg.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''),
                L: Math.round(L * 1000) / 1000,
                tag: el.tagName,
                cls: String(el.className || '').slice(0, 55),
            })
        }
    }
    return { out, checked }
}

for (const theme of THEMES) {
    test.describe(`state cascade — ${theme}`, () => {
        test('every declared interaction state stays legible', async ({ page }) => {
            test.setTimeout(20 * 60_000)
            await page.addInitScript((t) => {
                try {
                    window.localStorage.setItem('theme', t)
                } catch {
                    /* storage unavailable */
                }
            }, theme)

            const problems: string[] = []
            let pagesScanned = 0

            for (const path of PAGES) {
                try {
                    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 45_000 })
                } catch {
                    continue
                }
                await dismissCookieBanner(page)
                await page.waitForTimeout(400)
                const r = (await page.evaluate(auditStates)) as any
                if (!r || !Array.isArray(r.findings)) continue
                pagesScanned++
                for (const f of r.findings) {
                    problems.push(
                        `${path} [${theme}] ${f.cr}:1 (needs ${f.need}) fg=${f.fg} bg=${f.bg} "${f.label}" ${f.sel}`
                    )
                }
            }

            console.log(`[state cascade — ${theme}] ${pagesScanned}/${PAGES.length} pages scanned`)
            expect(pagesScanned, 'no pages scanned — would pass vacuously').toBeGreaterThan(10)
            expect(problems.join('\n'), `state problems — ${theme}:\n${problems.slice(0, 40).join('\n')}`).toBe('')
        })
    })
}

for (const viewport of VIEWPORTS) {
    test.describe(`surfaces — ${viewport.name}`, () => {
        test.use({ viewport: { width: viewport.width, height: viewport.height } })

        test('no card, dialog or menu surface stays light in dark mode', async ({ page }) => {
            test.setTimeout(20 * 60_000)
            await page.addInitScript(() => {
                try {
                    window.localStorage.setItem('theme', 'dark')
                } catch {
                    /* storage unavailable */
                }
            })

            const problems: string[] = []
            let checked = 0

            for (const path of PAGES) {
                try {
                    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 45_000 })
                } catch {
                    continue
                }
                await dismissCookieBanner(page)
                await page.waitForTimeout(400)
                const r = (await page.evaluate(auditSurfaces)) as any
                if (!r) continue
                checked += r.checked
                for (const s of r.out) {
                    problems.push(`${path} [${viewport.name}] LIGHT SURFACE ${s.bg} L=${s.L} <${s.tag}> ${s.cls}`)
                }
            }

            console.log(`[surfaces — ${viewport.name}] ${checked} surfaces measured`)
            expect(checked, 'no surfaces measured — would pass vacuously').toBeGreaterThan(30)
            expect(problems.join('\n'), `surface problems — ${viewport.name}:\n${problems.slice(0, 30).join('\n')}`).toBe('')
        })
    })
}
