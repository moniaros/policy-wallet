import { test, expect } from '@playwright/test'
import { dismissCookieBanner } from './helpers/ui'

/**
 * RESPONSIVE + ACCESSIBILITY + RUNTIME audit.
 *
 * Loads each route ONCE and then resizes, because layout here is CSS-driven —
 * a reload per breakpoint would mean 9x the page loads and the sweep would not
 * finish (which is how earlier attempts died).
 */

const WIDTHS = [320, 360, 390, 414, 768, 1024, 1280, 1440, 1920]

const ROUTES = [
    '/', '/pricing', '/product', '/product/business', '/product/motor', '/product/property',
    '/guides', '/lexiko', '/company', '/contact', '/terms', '/privacy', '/solutions/agents',
    '/for-agents', '/benefits', '/help', '/en', '/en/pricing',
    '/dashboard', '/wallet', '/account', '/branches', '/notifications', '/tasks',
    '/upgrade', '/coverage-insights', '/renewals', '/questionnaires', '/activity', '/perks',
]

/** Overflow + touch targets at the CURRENT viewport. */
function scanViewport() {
    const de = document.documentElement
    const vw = de.clientWidth
    const out = {
        vw,
        scrollW: de.scrollWidth,
        escapes: [] as string[],
        smallTargets: [] as string[],
        overlaps: [] as string[],
    }
    const els = Array.from(document.querySelectorAll('*'))
    for (const el of els) {
        const r = el.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) continue
        const cs = getComputedStyle(el)
        if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue
        // Escapes the viewport horizontally.
        let scrollable = false
        for (let a: Element | null = el.parentElement; a; a = a.parentElement) {
            const acs = getComputedStyle(a)
            if (acs.overflowX === 'auto' || acs.overflowX === 'scroll' || acs.overflowX === 'hidden') {
                scrollable = true
                break
            }
        }
        if (!scrollable && r.right > vw + 2 && out.escapes.length < 5) {
            const cls = String(el.className || '').slice(0, 45)
            out.escapes.push(`<${el.tagName}> [${Math.round(r.left)}..${Math.round(r.right)}] ${cls}`)
        }
    }
    // Touch targets: only on coarse-pointer widths, and only for real controls
    // that are not inline text links (WCAG 2.5.5 exempts inline).
    if (vw <= 768) {
        const controls = Array.from(
            document.querySelectorAll('button, a[href], input:not([type=hidden]), select, [role=button], [role=tab]')
        )
        for (const el of controls) {
            const r = el.getBoundingClientRect()
            if (r.width < 1 || r.height < 1) continue
            const cs = getComputedStyle(el)
            if (cs.visibility === 'hidden' || cs.display === 'none') continue
            if (cs.display === 'inline' && el.tagName === 'A') continue // inline link exemption
            if (el.closest('p, li')) continue // prose links
            if ((' ' + String(el.className || '') + ' ').indexOf(' sr-only ') >= 0) continue
            if (cs.clipPath === 'inset(50%)' || cs.clip === 'rect(0px, 0px, 0px, 0px)') continue
            // An icon inside a properly sized button is not its own target.
            if (el.querySelector('button, a[href], input, select, [role=button]')) continue
            const outer = el.parentElement?.closest('button, a[href], [role=button]')
            if (outer) {
                const orect = outer.getBoundingClientRect()
                if (orect.width >= 24 && orect.height >= 24) continue
            }
            if ((r.width < 24 || r.height < 24) && out.smallTargets.length < 6) {
                out.smallTargets.push(
                    `<${el.tagName}> ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 18)}"`
                )
            }
        }
    }
    return out
}

/** Static semantics — cheap, and the same at every width. */
function scanA11y() {
    const problems: string[] = []
    const named = (el: Element) =>
        (el.textContent || '').trim() ||
        el.getAttribute('aria-label') ||
        el.getAttribute('title') ||
        (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby')!)?.textContent) ||
        el.querySelector('img[alt]:not([alt=""])')

    for (const el of Array.from(document.querySelectorAll('img'))) {
        if (!el.hasAttribute('alt') && problems.length < 30) {
            problems.push(`IMG without alt: ${(el.getAttribute('src') || '').slice(0, 50)}`)
        }
    }
    for (const el of Array.from(document.querySelectorAll('button, a[href], [role=button]'))) {
        const r = el.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) continue
        if (!named(el) && problems.length < 30) {
            problems.push(`control with no accessible name: <${el.tagName}> ${String(el.className || '').slice(0, 40)}`)
        }
    }
    for (const el of Array.from(document.querySelectorAll('input:not([type=hidden]), select, textarea'))) {
        if (el.getAttribute('aria-hidden') === 'true' || el.closest('[aria-hidden="true"]')) continue
        const r = el.getBoundingClientRect()
        if (r.width < 2 || r.height < 2) continue // off-screen honeypot
        const id = el.getAttribute('id')
        const hasLabel =
            (id && document.querySelector(`label[for="${CSS.escape(id)}"]`)) ||
            el.closest('label') ||
            el.getAttribute('aria-label') ||
            el.getAttribute('aria-labelledby') ||
            el.getAttribute('title')
        if (!hasLabel && problems.length < 30) {
            problems.push(`form field with no label: <${el.tagName}> name=${el.getAttribute('name') || '?'}`)
        }
    }
    // Duplicate ids break aria-labelledby / label[for] resolution.
    const seen = new Set<string>()
    for (const el of Array.from(document.querySelectorAll('[id]'))) {
        const id = el.getAttribute('id')!
        if (seen.has(id) && problems.length < 30) problems.push(`duplicate id="${id}"`)
        seen.add(id)
    }
    if (!document.documentElement.getAttribute('lang')) problems.push('<html> has no lang')
    if (!document.querySelector('main, [role=main]')) problems.push('no <main> landmark')
    if (document.querySelectorAll('h1').length === 0) problems.push('no <h1>')
    if (document.querySelectorAll('h1').length > 1) problems.push(`${document.querySelectorAll('h1').length} <h1> elements`)
    return problems
}

test.describe('responsive, accessibility and runtime quality', () => {
    test('every route at every breakpoint', async ({ page }) => {
        test.setTimeout(45 * 60_000)

        const overflow: string[] = []
        const targets: string[] = []
        const a11y: string[] = []
        const runtime: string[] = []
        let scanned = 0

        page.on('pageerror', (e) => runtime.push(`PAGE ERROR ${page.url()}: ${String(e).slice(0, 110)}`))
        page.on('console', (m) => {
            if (m.type() !== 'error') return
            const t = m.text()
            // Upstash is stubbed with a dummy host in this harness; not a UI fault.
            if (/dummy\.upstash|ERR_NAME_NOT_RESOLVED|favicon|Failed to load resource/i.test(t)) return
            // Local-only: placeholder DSN in .env, and va.vercel-scripts is not
            // served in dev so CSP blocks it. Neither exists in production.
            if (/Invalid Sentry Dsn|va\.vercel-scripts\.com/i.test(t)) return
            runtime.push(`CONSOLE ${page.url()}: ${t.slice(0, 110)}`)
        })

        for (const route of ROUTES) {
            try {
                await page.setViewportSize({ width: 1280, height: 900 })
                await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 45_000 })
                await dismissCookieBanner(page)
                await page.waitForTimeout(500)
            } catch {
                continue
            }
            scanned++

            for (const p of (await page.evaluate(scanA11y)) as string[]) a11y.push(`${route} ${p}`)

            for (const width of WIDTHS) {
                await page.setViewportSize({ width, height: width < 500 ? 844 : 900 })
                await page.waitForTimeout(160) // let CSS settle
                const r = (await page.evaluate(scanViewport)) as any
                if (r.scrollW > r.vw + 2) {
                    overflow.push(`${route} @${width}px scrolls horizontally: ${r.scrollW}px in ${r.vw}px`)
                }
                for (const e of r.escapes) overflow.push(`${route} @${width}px escapes: ${e}`)
                for (const t of r.smallTargets) targets.push(`${route} @${width}px ${t}`)
            }
        }

        console.log(`[ui quality] ${scanned}/${ROUTES.length} routes x ${WIDTHS.length} widths`)
        console.log(`[ui quality] overflow=${overflow.length} touch=${targets.length} a11y=${a11y.length} runtime=${runtime.length}`)
        for (const [name, list] of [
            ['OVERFLOW', overflow],
            ['TOUCH', targets],
            ['A11Y', a11y],
            ['RUNTIME', runtime],
        ] as [string, string[]][]) {
            const uniq = Array.from(new Set(list))
            console.log(`  --- ${name}: ${list.length} (${uniq.length} distinct) ---`)
            for (const l of uniq.slice(0, 14)) console.log('    ' + l)
        }

        expect(scanned, 'too few routes scanned').toBeGreaterThan(ROUTES.length * 0.75)
        expect(overflow.slice(0, 25).join('\n'), 'RESPONSIVE — highest priority').toBe('')
        expect(a11y.slice(0, 25).join('\n'), 'ACCESSIBILITY').toBe('')
        expect(targets.slice(0, 25).join('\n'), 'TOUCH TARGETS').toBe('')
        expect(runtime.slice(0, 25).join('\n'), 'RUNTIME / CONSOLE ERRORS').toBe('')
    })
})
