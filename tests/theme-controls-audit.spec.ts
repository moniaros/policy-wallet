import { test, expect } from '@playwright/test'
import { dismissCookieBanner } from './helpers/ui'

/**
 * Runtime verification of BUTTON STATES and CARD SURFACES in both themes.
 *
 * The contrast audit samples rendered text. This one drives controls into each
 * state and reads the result, because a state that is only reachable by
 * interaction (pressed, disabled, loading, selected) is invisible to both a
 * static scan and a resting-state pixel sample.
 */

const THEMES = ['light', 'dark'] as const
const VIEWPORTS = [
    { name: 'desktop', width: 1280, height: 800 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 },
]

const PAGES = ['/dashboard', '/wallet', '/account', '/branches', '/pricing', '/', '/upgrade', '/help']

/**
 * Colour readers as REAL FUNCTIONS, not evaluate()-as-string.
 *
 * The string form is what made the contrast audit's SNAP return `undefined` on
 * /account, and it made every one of the 74 buttons here unmeasurable. Playwright
 * parses a string pageFunction in its own way; a function reference does not go
 * through that path at all. Helpers are nested so each reader is self-contained.
 */
function readState(el: Element) {
    const lum = (r: number, g: number, b: number) => {
        const f = (v: number) => {
            v /= 255
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const parse = (str: string): number[] | null => {
        const m = String(str).match(/-?[0-9.]+/g)
        if (!m || m.length < 3) return null
        return [Math.round(+m[0]), Math.round(+m[1]), Math.round(+m[2]), m.length > 3 ? +m[3] : 1]
    }
    const over = (fg: number[], bg: number[]) => {
        const a2 = fg[3]
        return [fg[0] * a2 + bg[0] * (1 - a2), fg[1] * a2 + bg[1] * (1 - a2), fg[2] * a2 + bg[2] * (1 - a2), 1]
    }
    // Walk up compositing translucent backgrounds until an opaque one is found —
    // a /10 wash is not the colour its token names.
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
    const ratio = (x: number[], y: number[]) => {
        const l1 = lum(x[0], x[1], x[2])
        const l2 = lum(y[0], y[1], y[2])
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    }

    if (!el.isConnected) return null
    const cs = getComputedStyle(el)
    const bg = surface(el)
    let fg = parse(cs.color)
    if (!fg) return null
    if (fg[3] < 1) fg = over(fg, bg)
    const r = el.getBoundingClientRect()
    return {
        cr: Math.round(ratio(fg, bg) * 100) / 100,
        fg: 'rgb(' + fg.slice(0, 3).map(Math.round).join(',') + ')',
        bg: 'rgb(' + bg.slice(0, 3).map(Math.round).join(',') + ')',
        outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0,
        shadow: cs.boxShadow !== 'none' && cs.boxShadow !== '',
        fontPx: parseFloat(cs.fontSize),
        bold: parseInt(cs.fontWeight, 10) >= 700,
        w: Math.round(r.width),
        h: Math.round(r.height),
    }
}

function readSurfaces() {
    const lum = (r: number, g: number, b: number) => {
        const f = (v: number) => {
            v /= 255
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const parse = (str: string): number[] | null => {
        const m = String(str).match(/-?[0-9.]+/g)
        if (!m || m.length < 3) return null
        return [Math.round(+m[0]), Math.round(+m[1]), Math.round(+m[2]), m.length > 3 ? +m[3] : 1]
    }
    const over = (fg: number[], bg: number[]) => {
        const a2 = fg[3]
        return [fg[0] * a2 + bg[0] * (1 - a2), fg[1] * a2 + bg[1] * (1 - a2), fg[2] * a2 + bg[2] * (1 - a2), 1]
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

    const out: { bg: string; L: number; cls: string; tag: string }[] = []
    const sel =
        '.pw-card, [role=dialog], [role=menu], [role=listbox], [role=tooltip], aside, dialog, [class*=card], [class*=modal], [class*=dropdown], [class*=panel]'
    const seen = new Set<string>()
    for (const el of Array.from(document.querySelectorAll(sel)).slice(0, 60)) {
        // Interactive fills are intentional brand colour, not a stale surface.
        if (el.closest('button, a, [role=button], input, select')) continue
        const r = el.getBoundingClientRect()
        if (r.width < 40 || r.height < 24) continue
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || cs.display === 'none') continue
        const bg = surface(el)
        const key = bg.slice(0, 3).map(Math.round).join(',')
        if (seen.has(key)) continue
        seen.add(key)
        out.push({
            bg: 'rgb(' + key + ')',
            L: Math.round(lum(bg[0], bg[1], bg[2]) * 1000) / 1000,
            cls: String(el.className || '').slice(0, 60),
            tag: el.tagName,
        })
    }
    return out
}

for (const theme of THEMES) {
    test.describe(`button states — ${theme}`, () => {
        test('every reachable state stays legible and distinguishable', async ({ page }) => {
            test.setTimeout(45 * 60_000)
            await page.addInitScript((t) => {
                try {
                    window.localStorage.setItem('theme', t)
                } catch {
                    /* storage unavailable */
                }
            }, theme)

            const problems: string[] = []
            const unmeasured: string[] = []
            let checked = 0

            for (const path of PAGES) {
                await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 90_000 })
                await dismissCookieBanner(page)
                await page.waitForLoadState('networkidle').catch(() => {})
                await page.waitForTimeout(900)

                // Enabled buttons AND disabled ones — disabled is a state that
                // must stay readable, not vanish.
                const buttons = page.locator('button:visible, a[role=button]:visible, [class*=pw-primary-button]:visible')
                const n = Math.min(await buttons.count(), 8)

                for (let i = 0; i < n; i++) {
                    const el = buttons.nth(i)
                    let label = ''
                    try {
                        label = ((await el.textContent()) || (await el.getAttribute('aria-label')) || '').trim().slice(0, 24)
                    } catch {
                        continue
                    }
                    if (!label) continue

                    try {
                        const isDisabled = await el.evaluate(
                            (b) => (b as HTMLButtonElement).disabled === true || b.getAttribute('aria-disabled') === 'true'
                        )
                        const isSelected = await el.evaluate(
                            (b) => b.getAttribute('aria-pressed') === 'true' || b.getAttribute('aria-selected') === 'true'
                        )

                        // DEFAULT
                        await page.mouse.move(2, 2)
                        await page.waitForTimeout(180)
                        const def = (await el.evaluate(readState)) as any
                        if (!def) {
                            unmeasured.push(`${path} "${label}"`)
                            continue
                        }
                        checked++

                        // A button's own label must clear WCAG AA at its size.
                        const need = def.fontPx >= 24 || (def.fontPx >= 18.66 && def.bold) ? 3 : 4.5
                        if (def.cr < need) {
                            problems.push(
                                `${path} [${theme}] DEFAULT unreadable "${label}" ${def.cr}:1 (needs ${need}) fg=${def.fg} bg=${def.bg}`
                            )
                        }

                        // DISABLED must remain perceivable, not invisible.
                        if (isDisabled && def.cr < 2.5) {
                            problems.push(
                                `${path} [${theme}] DISABLED illegible "${label}" ${def.cr}:1 fg=${def.fg} bg=${def.bg}`
                            )
                        }
                        // SELECTED must clear AA too — it is the one users read most.
                        if (isSelected && def.cr < 4.5) {
                            problems.push(
                                `${path} [${theme}] SELECTED unreadable "${label}" ${def.cr}:1 fg=${def.fg} bg=${def.bg}`
                            )
                        }

                        if (isDisabled) continue

                        // FOCUSED — a visible indicator is required (WCAG 2.4.7).
                        await el.evaluate((b) => (b as HTMLElement).focus())
                        await page.waitForTimeout(220)
                        const foc = (await el.evaluate(readState)) as any
                        if (foc && !foc.outline && !foc.shadow && foc.fg === def.fg && foc.bg === def.bg) {
                            problems.push(`${path} [${theme}] NO FOCUS INDICATOR — "${label}"`)
                        }
                        if (foc && foc.cr < need) {
                            problems.push(`${path} [${theme}] FOCUSED unreadable "${label}" ${foc.cr}:1 fg=${foc.fg} bg=${foc.bg}`)
                        }
                        await el.evaluate((b) => (b as HTMLElement).blur())

                        // HOVER — must stay readable (feedback itself is covered
                        // by the interaction-states check).
                        await el.hover({ timeout: 2500 })
                        await page.waitForTimeout(320)
                        const hov = (await el.evaluate(readState)) as any
                        if (hov && hov.cr < need) {
                            problems.push(`${path} [${theme}] HOVER unreadable "${label}" ${hov.cr}:1 fg=${hov.fg} bg=${hov.bg}`)
                        }

                        // PRESSED — hold the mouse down on the real control.
                        const box = await el.boundingBox()
                        if (box) {
                            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
                            await page.mouse.down()
                            await page.waitForTimeout(220)
                            const pressed = (await el.evaluate(readState)) as any
                            await page.mouse.up()
                            await page.waitForTimeout(120)
                            if (pressed && pressed.cr < need) {
                                problems.push(
                                    `${path} [${theme}] PRESSED unreadable "${label}" ${pressed.cr}:1 fg=${pressed.fg} bg=${pressed.bg}`
                                )
                            }
                        }
                    } catch {
                        unmeasured.push(`${path} "${label}"`)
                    }
                }
            }

            console.log(`[button states — ${theme}] ${checked} buttons measured, ${unmeasured.length} skipped`)
            if (unmeasured.length) console.log('  skipped: ' + unmeasured.slice(0, 20).join(', '))
            expect(checked, 'no buttons were measured — the check would pass vacuously').toBeGreaterThan(20)
            expect(problems.join('\n'), `button-state problems — ${theme}:\n${problems.join('\n')}`).toBe('')
        })
    })
}

for (const viewport of VIEWPORTS) {
    test.describe(`card & panel surfaces — ${viewport.name}`, () => {
        test.use({ viewport: { width: viewport.width, height: viewport.height } })

        test('no light surface survives into dark mode', async ({ page }) => {
            test.setTimeout(45 * 60_000)
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
                await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 90_000 })
                await dismissCookieBanner(page)
                await page.waitForTimeout(900)
                const surfaces = (await page.evaluate(readSurfaces)) as any[]
                for (const s of surfaces) {
                    checked++
                    // In dark mode a card/dialog/menu surface must not be light.
                    // 0.5 relative luminance is roughly #BBB — well clear of any
                    // legitimate dark-mode elevation.
                    if (s.L > 0.5) {
                        problems.push(`${path} [${viewport.name}] LIGHT SURFACE IN DARK MODE ${s.bg} L=${s.L} <${s.tag}> ${s.cls}`)
                    }
                }
            }

            console.log(`[card surfaces — ${viewport.name}] ${checked} distinct surfaces measured`)
            expect(checked, 'no surfaces were measured — the check would pass vacuously').toBeGreaterThan(10)
            expect(problems.join('\n'), `surface problems — ${viewport.name}:\n${problems.join('\n')}`).toBe('')
        })
    })
}
