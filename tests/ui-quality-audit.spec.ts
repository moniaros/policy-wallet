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

// Every static route in app/**/page.tsx. Narrowing this to a
// "representative" subset is what let the /wallet/[id] header defect
// ship while every suite reported green.
const ROUTES = [
    '/',
    '/account',
    '/activity',
    '/admin/activity',
    '/admin/billing-reconciliation',
    '/admin/dashboard',
    '/admin/dsr',
    '/admin/extraction-flags',
    '/admin/insurers',
    '/admin/launch-readiness',
    '/admin/partners',
    '/admin/plans',
    '/admin/policies',
    '/admin/submissions',
    '/admin/tokens',
    '/admin/types',
    '/admin/users',
    '/agent',
    '/agent/pricing',
    '/agent/settings',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/signin',
    '/auth/signup',
    '/auth/signup/agent',
    '/auth/signup/confirmation',
    '/auth/signup/policyholder',
    '/benefits',
    '/branches',
    '/commissions',
    '/company',
    '/consent/ai',
    '/contact',
    '/cookies',
    '/coverage',
    '/coverage-insights',
    '/customers',
    '/customers/invite',
    '/dashboard',
    '/dashboard/agent',
    '/en',
    '/en/company',
    '/en/contact',
    '/en/cookies',
    '/en/for-agents',
    '/en/guides',
    '/en/lexiko',
    '/en/pricing',
    '/en/privacy',
    '/en/product',
    '/en/product/boat',
    '/en/product/business',
    '/en/product/cyber',
    '/en/product/group-health',
    '/en/product/group-life',
    '/en/product/group-pension',
    '/en/product/health',
    '/en/product/legal-expenses',
    '/en/product/liability',
    '/en/product/life',
    '/en/product/motor',
    '/en/product/pension',
    '/en/product/pet',
    '/en/product/property',
    '/en/product/travel',
    '/en/solutions/agents',
    '/en/subprocessors',
    '/en/terms',
    '/for-agents',
    '/guides',
    '/help',
    '/home',
    '/insights',
    '/landing',
    '/lexiko',
    '/notifications',
    '/onboarding',
    '/onboarding/agent',
    '/opportunities',
    '/perks',
    '/pricing',
    '/privacy',
    '/product',
    '/product/boat',
    '/product/business',
    '/product/cyber',
    '/product/group-health',
    '/product/group-life',
    '/product/group-pension',
    '/product/health',
    '/product/legal-expenses',
    '/product/liability',
    '/product/life',
    '/product/motor',
    '/product/pension',
    '/product/pet',
    '/product/property',
    '/product/travel',
    '/questionnaires',
    '/renewals',
    '/solutions/agents',
    '/subprocessors',
    '/tasks',
    '/team',
    '/terms',
    '/upgrade',
    '/wallet',
    '/wallet/add',
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

/**
 * The floor that says "the sweep actually ran", per session.
 *
 * It cannot be one fraction of ROUTES, because a route redirecting is not a
 * defect — it is the auth model. `/admin/*` bounces everyone but an admin, the
 * agent console bounces a policyholder, and `/auth/*` bounces anyone signed in.
 * A single 75%-of-all-routes floor therefore failed for the policyholder and
 * agent sessions on every branch, including ones that changed nothing, while
 * telling you "too few routes scanned" — a number nobody could act on.
 *
 * These are what each session reaches today. A DROP is the signal: a surface
 * this role is supposed to see started redirecting. Raise them when routes are
 * added, and read the REDIRECTED list below before lowering one.
 */
const MIN_SCANNED: Record<string, number> = {
    // Measured, not guessed. The spread between them IS the auth model: the
    // policyholder loses the whole agent console, the agent loses the B2C
    // wallet and /coverage-insights, the admin reaches both, and all three
    // lose /auth/* because they are signed in.
    chromium: 71, //         of  94 non-admin routes (23 redirect)
    'agent-chromium': 79, //  of  94 non-admin routes (15 redirect)
    'admin-chromium': 95, //  of 108 routes           (13 redirect)
}

test.describe('responsive, accessibility and runtime quality', () => {
    // No retry. One attempt is a ~30-minute sweep, and the config's local retry
    // spent a second half-hour on a browser that had already been up an hour —
    // it died at route 56 and reported 38 routes as never-loaded. The findings
    // list IS the deliverable here; re-running the sweep does not stabilise it,
    // it just doubles the wall clock before you get to read it.
    test.describe.configure({ retries: 0 })

    test('every route at every breakpoint', async ({ page }, testInfo) => {
        test.setTimeout(45 * 60_000)

        // Auditing a route this session cannot open measures the redirect stub,
        // not the page — and then counts the miss against coverage.
        const routes = testInfo.project.name === 'admin-chromium'
            ? ROUTES
            : ROUTES.filter((route) => !route.startsWith('/admin/'))

        const overflow: string[] = []
        const targets: string[] = []
        const a11y: string[] = []
        const runtime: string[] = []
        let scanned = 0
        /** Reached a different path — role-gated or an intentional redirect stub. */
        const redirected: string[] = []
        /** goto threw. Used to `continue` silently, so a route could vanish from
         *  the audit without appearing in any total. */
        const failedToLoad: string[] = []
        /** Scanned at some widths only — the shape a dying sweep takes. */
        const partial: string[] = []
        const interrupted: string[] = []

        page.on('pageerror', (e) => runtime.push(`PAGE ERROR ${page.url()}: ${String(e).slice(0, 110)}`))
        page.on('console', (m) => {
            if (m.type() !== 'error') return
            const t = m.text()
            // Upstash is stubbed with a dummy host in this harness; not a UI fault.
            if (/dummy\.upstash|ERR_NAME_NOT_RESOLVED|favicon|Failed to load resource/i.test(t)) return
            // Local-only: placeholder DSN in .env, and va.vercel-scripts is not
            // served in dev so CSP blocks it. Neither exists in production.
            if (/Invalid Sentry Dsn|va\.vercel-scripts\.com/i.test(t)) return
            // `next start` does not serve /_vercel/* — those endpoints exist only
            // on Vercel's edge. Verified 200 in production; local-only noise.
            if (/_vercel\/(insights|speed-insights)/i.test(t)) return
            runtime.push(`CONSOLE ${page.url()}: ${t.slice(0, 110)}`)
        })

        for (const route of routes) {
            try {
                await page.setViewportSize({ width: 1280, height: 900 })
                await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 45_000 })
                await dismissCookieBanner(page)
                await page.waitForTimeout(500)
            } catch (error) {
                failedToLoad.push(`${route} (${String(error).split('\n')[0].slice(0, 90)})`)
                continue
            }
            // A route that only redirects (e.g. /coverage -> /coverage-insights)
            // renders no content of its own; auditing it audits the destination
            // twice and reports the redirect stub as having no <h1>.
            if (!page.url().endsWith(route) && !page.url().includes(route + '?')) {
                redirected.push(`${route} -> ${new URL(page.url()).pathname}`)
                continue
            }

            // A route that redirects AFTER goto resolves — an admin page bouncing
            // a policyholder — destroys the execution context mid-evaluate and
            // previously took the whole 108-route sweep down. Guard each scan.
            try {
                for (const p of (await page.evaluate(scanA11y)) as string[]) a11y.push(`${route} ${p}`)
            } catch {
                interrupted.push(`${route} (a11y scan interrupted)`)
            }

            let widthsDone = 0
            for (const width of WIDTHS) {
                try {
                    await page.setViewportSize({ width, height: width < 500 ? 844 : 900 })
                    await page.waitForTimeout(160) // let CSS settle
                    const r = (await page.evaluate(scanViewport)) as any
                    widthsDone++
                    if (r.scrollW > r.vw + 2) {
                        overflow.push(`${route} @${width}px scrolls horizontally: ${r.scrollW}px in ${r.vw}px`)
                    }
                    for (const e of r.escapes) overflow.push(`${route} @${width}px escapes: ${e}`)
                    for (const t of r.smallTargets) targets.push(`${route} @${width}px ${t}`)
                } catch {
                    /* navigated mid-scan; recorded via widthsDone below */
                }
            }
            if (widthsDone === WIDTHS.length) scanned++
            else partial.push(`${route} (${widthsDone}/${WIDTHS.length} widths)`)
        }

        console.log(`[ui quality] ${testInfo.project.name}: ${scanned}/${routes.length} routes fully scanned x ${WIDTHS.length} widths`)
        // Printed in full, not truncated: a route quietly leaving the audit is
        // the failure this sweep exists to make visible.
        for (const [name, list] of [
            ['REDIRECTED (not this session\'s surface)', redirected],
            ['FAILED TO LOAD', failedToLoad],
            ['PARTIAL', partial],
            ['INTERRUPTED', interrupted],
        ] as [string, string[]][]) {
            if (list.length) console.log(`[ui quality] ${name}: ${list.length}\n    ` + list.join('\n    '))
        }
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

        // Every route is accounted for in exactly one bucket; if that stops
        // adding up, the loop above grew a hole and the totals below lie.
        expect(
            scanned + redirected.length + failedToLoad.length + partial.length,
            'route accounting'
        ).toBe(routes.length)

        // These two ARE the "the sweep died" tripwire the coverage floor was
        // standing in for, and they name the route instead of a count.
        expect(failedToLoad.join('\n'), 'ROUTES THAT NEVER LOADED').toBe('')
        expect(partial.join('\n'), 'ROUTES SCANNED AT ONLY SOME WIDTHS').toBe('')
        // A route can survive the width loop while its a11y scan was lost —
        // counted as scanned, audited for half of what this sweep claims.
        expect(interrupted.join('\n'), 'ROUTES WHOSE A11Y SCAN WAS INTERRUPTED').toBe('')

        const floor = MIN_SCANNED[testInfo.project.name] ?? 1
        expect(
            scanned,
            `fewer routes reachable than this session should see — read REDIRECTED above (floor ${floor})`
        ).toBeGreaterThanOrEqual(floor)
        expect(overflow.slice(0, 25).join('\n'), 'RESPONSIVE — highest priority').toBe('')
        expect(a11y.slice(0, 25).join('\n'), 'ACCESSIBILITY').toBe('')
        expect(targets.slice(0, 25).join('\n'), 'TOUCH TARGETS').toBe('')
        expect(runtime.slice(0, 25).join('\n'), 'RUNTIME / CONSOLE ERRORS').toBe('')
    })
})
