import { describe, it, expect, vi, beforeAll } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { render, fireEvent, act } from '@testing-library/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'
import { AppShell } from '@/components/shell/AppShell'

/**
 * Shell chrome invariants — one guard, because the shell is one surface.
 *
 * Every authenticated screen mounts through app/(protected)/layout.tsx →
 * AppShell, so a defect in the shell reproduces on every screen underneath it.
 * That is a property of the render tree, not a coincidence across pages —
 * which is why these invariants live in ONE guard instead of per-page tests.
 *
 * THE UNIVERSE (D-005 — a guard states what it walks and what it claims):
 *
 *   Files    — every .tsx under components/shell/ must be mounted through
 *              AppShell (asserted from the filesystem), plus the chrome
 *              AppShell pulls from outside that directory: ThemeToggle,
 *              LocaleToggle, InstallPrompt (asserted from its import list).
 *              A new shell file that AppShell does not mount fails here:
 *              either mount it or extend this guard's render matrix.
 *
 *   Renders  — AppShell rendered for EVERY role in the UserRole union
 *              (derived from AppShell.tsx source, not hardcoded), drawer
 *              closed and open, with the real InstallPrompt forced visible
 *              and — where multiple roles exist — the RoleSwitcher menu open.
 *              Interactive elements are then enumerated from the rendered
 *              DOM, never from a hand-kept list.
 *
 *   Excluded, with reasons —
 *     • anything inside #main-content: page content, not shell (each page's
 *       own guards cover it); a deliberately undersized probe button in the
 *       children proves this exclusion is load-bearing, not accidental green;
 *     • the skip link (href="#main-content"): keyboard-only by design,
 *       never a pointer target;
 *     • subtrees gated `hidden lg:block` (the desktop UserMenu): they have
 *       no box below 1024px, and the 44px floor is a touch floor.
 *
 * THE INVARIANTS:
 *   1. No interactive shell control below the 44×44 touch floor. jsdom cannot
 *      measure layout, so the guard enforces the MECHANISM: an explicit
 *      ≥44px height token (h-11 / min-h-11 / min-h-[44px] / larger) on every
 *      control, plus a width token (w-11 / min-w-11 / w-full / flex-1) on
 *      controls whose accessible text (≤3 chars or icon-only) cannot supply
 *      width. Explicit tokens are also what keep the floor when a font or
 *      line-height changes out from under a padding-derived height.
 *   2. A declared modal's scrim covers everything focusable outside it: for
 *      every fixed/sticky region with focusable content outside the open
 *      dialog, the scrim must out-rank it (higher z, or equal z and later in
 *      DOM — all shell fixed elements share one stacking context, verified
 *      in docs/transformation/evidence/CHROME-AUDIT.md §1). The chrome is
 *      also marked `inert` while the drawer is open — that, not the scrim,
 *      is what blocks programmatic focus and taps in a real browser.
 *   3. A fixed, bottom-anchored element reserves env(safe-area-inset-bottom)
 *      — via the .safe-area-inset-bottom utility or an env() term in its
 *      bottom offset. Full-viewport overlays (inset-0) are covers, not
 *      bottom-anchored UI, and are exempt.
 *
 * WHY A NEW FILE (§11.1): app-shell-admin.test.tsx guards admin landmark
 * structure, app-shell-agent-bottom-nav.test.tsx guards the agent "more"
 * slot, alert-and-control-floor.test.tsx guards the base FORM layer's floor
 * in globals.css. None enumerates the shell chrome itself; this one does.
 *
 * PROBES: committed probe components at the bottom prove each checker turns
 * red on a rendered violation and green on the corrected render of the same
 * probe — the verdict must track a real difference in rendered attributes,
 * so a broken checker cannot pass as silence.
 */

vi.mock('next/navigation', () => ({
    usePathname: () => '/dashboard',
    useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))
vi.mock('@/app/(protected)/role-actions', () => ({ setActiveRole: vi.fn() }))

// ─── Universe derivation ────────────────────────────────────────────────────

const SHELL_SOURCE = readFileSync('components/shell/AppShell.tsx', 'utf-8')

/** Roles come from the UserRole union in AppShell.tsx, not a hardcoded list. */
const ROLES: string[] = (() => {
    const union = SHELL_SOURCE.match(/interface UserRole \{\s*\n?\s*role: ([^\n]+)/)
    return union ? [...union[1].matchAll(/'(\w+)'/g)].map((m) => m[1]) : []
})()

// ─── Class-token helpers ────────────────────────────────────────────────────

/** Raw class tokens, variants included ('lg:hidden' stays whole). */
const rawTokens = (el: Element): string[] =>
    (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

/** Unconditional tokens only — variant-prefixed ones do not apply at rest. */
const baseTokens = (el: Element): string[] =>
    rawTokens(el).filter((t) => !t.includes(':'))

/** Pixel value of an explicit height/width (or min-height/width) token, else null. */
function sizePx(token: string, axis: 'h' | 'w'): number | null {
    let m = token.match(new RegExp(`^(?:min-)?${axis}-(\\d+(?:\\.\\d+)?)$`))
    if (m) return parseFloat(m[1]) * 4
    m = token.match(new RegExp(`^(?:min-)?${axis}-\\[(\\d+(?:\\.\\d+)?)(px|rem)\\]$`))
    if (m) return m[2] === 'rem' ? parseFloat(m[1]) * 16 : parseFloat(m[1])
    return null
}

function zOf(el: Element): number {
    for (const t of baseTokens(el)) {
        const m = t.match(/^z-\[?(\d+)\]?$/)
        if (m) return Number(m[1])
    }
    return 0
}

const describeEl = (el: Element): string => {
    const label = el.getAttribute('aria-label') || (el.textContent ?? '').trim().slice(0, 30)
    return `<${el.tagName.toLowerCase()} label="${label}" class="${el.getAttribute('class')}">`
}

// ─── The three checkers ─────────────────────────────────────────────────────

function shellControls(scope: ParentNode): HTMLElement[] {
    return Array.from(scope.querySelectorAll<HTMLElement>('button, a[href]')).filter((el) => {
        if (el.closest('#main-content')) return false // page content, not shell
        if (el.getAttribute('href') === '#main-content') return false // skip link
        for (let a: Element | null = el; a; a = a.parentElement) {
            const t = rawTokens(a)
            if (t.includes('hidden') && t.includes('lg:block')) return false // desktop-only
        }
        return true
    })
}

function meetsFloor(el: HTMLElement): boolean {
    const tokens = baseTokens(el)
    const heightOk = tokens.some((t) => (sizePx(t, 'h') ?? 0) >= 44)
    const text = (el.textContent ?? '').trim()
    const needsWidthToken = text.length <= 3 // icon-only, «ΕΛ», "EN", a count…
    const widthOk =
        !needsWidthToken ||
        tokens.some((t) => (sizePx(t, 'w') ?? 0) >= 44 || t === 'w-full' || t === 'flex-1')
    return heightOk && widthOk
}

function floorViolations(scope: ParentNode): string[] {
    return shellControls(scope).filter((el) => !meetsFloor(el)).map(describeEl)
}

function modalCoverageViolations(scope: ParentNode): string[] {
    const dialog = scope.querySelector('[role="dialog"][aria-modal="true"]')
    if (!dialog) return ['no open [role=dialog][aria-modal] found — caller must open the drawer first']
    const scrims = Array.from(scope.querySelectorAll<HTMLElement>('[class]')).filter(
        (el) => !dialog.contains(el) && baseTokens(el).includes('fixed') && baseTokens(el).includes('inset-0')
    )
    if (scrims.length !== 1) return [`expected exactly one full-viewport scrim outside the dialog, found ${scrims.length}`]
    const scrim = scrims[0]
    const out: string[] = []
    if (zOf(dialog as Element) <= zOf(scrim)) {
        out.push('the dialog itself does not out-rank its scrim')
    }
    for (const el of Array.from(scope.querySelectorAll<HTMLElement>('[class]'))) {
        if (el === scrim || dialog.contains(el) || el.contains(dialog)) continue
        const tokens = baseTokens(el)
        if (!tokens.includes('fixed') && !tokens.includes('sticky')) continue
        if (!(el.matches('button, a[href]') || el.querySelector('button, a[href]'))) continue
        const covered =
            zOf(scrim) > zOf(el) ||
            (zOf(scrim) === zOf(el) &&
                Boolean(el.compareDocumentPosition(scrim) & Node.DOCUMENT_POSITION_FOLLOWING))
        if (!covered) out.push(`scrim does not cover ${describeEl(el)}`)
    }
    return out
}

function safeAreaViolations(scope: ParentNode): string[] {
    const out: string[] = []
    for (const el of Array.from(scope.querySelectorAll<HTMLElement>('[class]'))) {
        const tokens = baseTokens(el)
        if (!tokens.includes('fixed')) continue
        if (tokens.includes('inset-0')) continue // full-viewport cover, not bottom-anchored UI
        if (!tokens.some((t) => t.startsWith('bottom-'))) continue
        const ok =
            tokens.includes('safe-area-inset-bottom') ||
            tokens.some((t) => t.includes('env(safe-area-inset-bottom'))
        if (!ok) out.push(describeEl(el))
    }
    return out
}

// ─── Render harness ─────────────────────────────────────────────────────────

const NAV = [
    {
        title: 'Section',
        items: [
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Renewals', href: '/renewals' },
        ],
    },
]

beforeAll(() => {
    // jsdom has no matchMedia; InstallPrompt asks it about standalone mode.
    window.matchMedia = ((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    })) as any
})

function renderShell(role: string, opts: { multiRole?: boolean } = {}) {
    window.localStorage.clear() // InstallPrompt snoozes itself via localStorage
    const availableRoles = opts.multiRole
        ? ([
              { role: 'policyholder', label: 'Policyholder' },
              { role: 'agent', label: 'Agent' },
          ] as any)
        : []
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <AppShell
                    navigation={NAV}
                    currentRole={{ role: role as any, label: role }}
                    availableRoles={availableRoles}
                    user={{ name: 'Test', email: 't@example.com' }}
                >
                    {/* Page content is NOT shell. This deliberately undersized
                        button proves the #main-content exclusion is doing work. */}
                    <button className="p-1" aria-label="page-content-probe">
                        page action
                    </button>
                </AppShell>
            </TranslationsProvider>
        </LanguageProvider>
    )
}

/** The REAL InstallPrompt is mounted by AppShell; make it show itself. */
function showInstallPrompt() {
    act(() => {
        window.dispatchEvent(new Event('beforeinstallprompt'))
    })
}

function openDrawer() {
    const hamburger = document.querySelector<HTMLButtonElement>(
        'header button[aria-controls="app-sidebar"]'
    )
    expect(hamburger, 'mobile hamburger not found').toBeTruthy()
    fireEvent.click(hamburger!)
}

const bottomNavEl = () =>
    Array.from(document.querySelectorAll('nav')).find((n) =>
        baseTokens(n).includes('fixed') && baseTokens(n).some((t) => t === 'bottom-0')
    )

// ─── Universe assertions ────────────────────────────────────────────────────

describe('shell universe (D-005)', () => {
    it('derived every role from the UserRole union — the matrix cannot silently narrow', () => {
        expect(ROLES).toContain('policyholder')
        expect(ROLES).toContain('agent')
        expect(ROLES).toContain('admin')
        expect(ROLES.length).toBeGreaterThanOrEqual(3)
    })

    it('every components/shell/*.tsx file is mounted through AppShell', () => {
        const files = readdirSync('components/shell').filter((f) => f.endsWith('.tsx'))
        expect(files).toContain('AppShell.tsx') // the walker found the directory
        for (const f of files) {
            const name = f.replace(/\.tsx$/, '')
            if (name === 'AppShell') continue
            expect(
                SHELL_SOURCE.includes(`from './${name}'`),
                `${f} exists under components/shell/ but AppShell does not import it — ` +
                    `mount it through AppShell or extend this guard's render matrix with a reason`
            ).toBe(true)
        }
    })

    it('AppShell mounts the out-of-directory chrome this guard claims to cover', () => {
        for (const spec of ['@/components/pwa/InstallPrompt', '@/components/ui/LocaleToggle', '../ThemeToggle']) {
            expect(SHELL_SOURCE.includes(spec), `AppShell no longer imports ${spec}`).toBe(true)
        }
    })
})

// ─── Invariant 1: the 44×44 floor ───────────────────────────────────────────

describe('no interactive shell control under the 44×44 floor', () => {
    for (const role of ROLES) {
        it(`${role} — chrome at rest, install prompt visible`, () => {
            renderShell(role)
            showInstallPrompt()
            expect(floorViolations(document.body)).toEqual([])
        })

        it(`${role} — drawer open${role === 'policyholder' ? ', role-switcher menu open' : ''}`, () => {
            renderShell(role, { multiRole: role === 'policyholder' })
            openDrawer()
            if (role === 'policyholder') {
                const trigger = document.querySelector<HTMLButtonElement>(
                    '#app-sidebar button[aria-haspopup="menu"]'
                )
                expect(trigger, 'RoleSwitcher trigger not found despite multiple roles').toBeTruthy()
                fireEvent.click(trigger!)
            }
            expect(floorViolations(document.body)).toEqual([])
        })
    }

    it('ignores page content — and only because of the #main-content boundary', () => {
        renderShell('policyholder')
        const probe = document.querySelector<HTMLElement>('[aria-label="page-content-probe"]')!
        expect(probe.closest('#main-content'), 'probe must live inside #main-content').toBeTruthy()
        expect(meetsFloor(probe), 'the page probe must genuinely violate the floor').toBe(false)
        // …yet the shell verdict is clean, because the boundary excludes it.
        expect(floorViolations(document.body)).toEqual([])
    })
})

// ─── Invariant 2: the modal covers what it claims to cover ──────────────────

describe('the drawer is a real modal: scrim coverage, inert chrome, trapped focus', () => {
    it('scrim out-ranks every fixed/sticky chrome region outside the dialog — bottom nav and install prompt included', () => {
        renderShell('policyholder')
        showInstallPrompt()
        openDrawer()
        expect(modalCoverageViolations(document.body)).toEqual([])
    })

    it('scrim coverage holds for the agent shell too (its fifth slot is a button)', () => {
        renderShell('agent')
        openDrawer()
        expect(modalCoverageViolations(document.body)).toEqual([])
    })

    it('header and bottom nav are inert while the drawer is open, and not before', () => {
        renderShell('policyholder')
        const header = document.querySelector('header')!
        const nav = bottomNavEl()!
        expect(nav, 'policyholder bottom nav missing').toBeTruthy()
        expect(header.hasAttribute('inert')).toBe(false)
        expect(nav.hasAttribute('inert')).toBe(false)

        openDrawer()
        // `inert` is what actually blocks taps and programmatic focus in a
        // real browser; the scrim's z-order is the visual half of the claim.
        expect(header.hasAttribute('inert')).toBe(true)
        expect(nav.hasAttribute('inert')).toBe(true)

        fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
        expect(header.hasAttribute('inert')).toBe(false)
        expect(nav.hasAttribute('inert')).toBe(false)
    })

    it('keyboard focus cannot leave the dialog or land on a tab target', () => {
        renderShell('policyholder')
        openDrawer()
        const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]')!
        const nav = bottomNavEl()!
        expect(dialog.contains(document.activeElement), 'focus must move into the dialog on open').toBe(true)
        for (let i = 0; i < 8; i++) {
            fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Tab', shiftKey: i % 3 === 0 })
            expect(dialog.contains(document.activeElement), `focus escaped the dialog on press ${i + 1}`).toBe(true)
            expect(nav.contains(document.activeElement), `focus landed on a bottom-nav target on press ${i + 1}`).toBe(false)
        }
    })
})

// ─── Invariant 3: fixed bottom-anchored elements reserve the safe area ──────

describe('fixed bottom-anchored shell elements reserve env(safe-area-inset-bottom)', () => {
    for (const role of ROLES) {
        it(`${role} — with the install prompt visible`, () => {
            renderShell(role)
            showInstallPrompt()
            expect(safeAreaViolations(document.body)).toEqual([])
        })
    }
})

// ─── Probes: each checker demonstrably turns red, and the verdict tracks ────
// ─── a real rendered difference — a silent checker cannot pass here. ────────

function FloorProbe({ compliant }: { compliant: boolean }) {
    return (
        <button aria-label="floor-probe" className={compliant ? 'grid h-11 w-11 place-items-center' : 'p-2'}>
            <svg aria-hidden="true" />
        </button>
    )
}

function ModalProbe({ compliant }: { compliant: boolean }) {
    return (
        <div>
            <div className="sticky top-0 z-40">
                <button className="h-11 w-11">menu</button>
            </div>
            <aside role="dialog" aria-modal="true" className="fixed z-50">
                <button className="h-11 w-11">close</button>
            </aside>
            <div data-probe-scrim className={`fixed inset-0 ${compliant ? 'z-[45]' : 'z-40'}`} />
            <nav className="fixed bottom-0 z-40 safe-area-inset-bottom">
                <a href="/x" className="min-h-11 w-full">
                    a tab target
                </a>
            </nav>
        </div>
    )
}

function SafeAreaProbe({ compliant }: { compliant: boolean }) {
    return (
        <div
            data-probe-banner
            className={
                compliant
                    ? 'fixed bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] z-40'
                    : 'fixed bottom-24 z-40'
            }
        >
            <button className="h-11 w-full">banner action</button>
        </div>
    )
}

describe('probes — proof each checker goes red and the verdict tracks rendered output', () => {
    it('floor checker: red on a p-2 icon button, green on the 44px rework of the same probe', () => {
        const bad = render(<FloorProbe compliant={false} />)
        const badBtn = bad.container.querySelector('button')!
        // The probe genuinely rendered the offending class — not a no-op.
        expect(badBtn.className).toBe('p-2')
        expect(floorViolations(bad.container)).toHaveLength(1)
        expect(floorViolations(bad.container)[0]).toContain('floor-probe')
        bad.unmount()

        const good = render(<FloorProbe compliant />)
        const goodBtn = good.container.querySelector('button')!
        expect(goodBtn.className).not.toBe(badBtn.className) // rendered behaviour changed
        expect(floorViolations(good.container)).toEqual([])
    })

    it('modal checker: red when a later fixed bar ties the scrim z, green when the scrim out-ranks it', () => {
        const bad = render(<ModalProbe compliant={false} />)
        const badScrim = bad.container.querySelector('[data-probe-scrim]')!
        expect(zOf(badScrim)).toBe(40) // genuinely tied with the bar
        const violations = modalCoverageViolations(bad.container)
        expect(violations).toHaveLength(1)
        expect(violations[0]).toContain('a tab target')
        bad.unmount()

        const good = render(<ModalProbe compliant />)
        const goodScrim = good.container.querySelector('[data-probe-scrim]')!
        expect(zOf(goodScrim)).toBe(45) // rendered behaviour changed
        expect(modalCoverageViolations(good.container)).toEqual([])
    })

    it('safe-area checker: red on a static bottom offset, green on the env() offset of the same probe', () => {
        const bad = render(<SafeAreaProbe compliant={false} />)
        const badBanner = bad.container.querySelector('[data-probe-banner]')!
        expect(badBanner.className).toContain('bottom-24')
        expect(safeAreaViolations(bad.container)).toHaveLength(1)
        bad.unmount()

        const good = render(<SafeAreaProbe compliant />)
        const goodBanner = good.container.querySelector('[data-probe-banner]')!
        expect(goodBanner.className).not.toBe(badBanner.className) // rendered behaviour changed
        expect(goodBanner.className).toContain('env(safe-area-inset-bottom')
        expect(safeAreaViolations(good.container)).toEqual([])
    })
})

describe('the mobile menu trigger: ☰ while closed, X while open (goal series Goal 10, 2026-09-07)', () => {
    // The trigger used to be the avatar disc; a first name starting with Χ
    // («Χρήστης», the placeholder) rendered a white Χ on an ink disc at the
    // top-left — a close button to anyone looking. And the drawer's real X
    // stayed focusable off-canvas. Both are asserted here on rendered output.
    const trigger = () => document.querySelector<HTMLButtonElement>('header button[aria-controls="app-sidebar"]')!
    const drawerClose = () => document.querySelector<HTMLButtonElement>('#app-sidebar button[aria-label="Κλείσιμο μενού"]')!

    it('closed: a hamburger glyph, labelled «Άνοιγμα μενού», no X glyph in the trigger, and the drawer X unreachable', () => {
        renderShell('policyholder')
        expect(trigger().querySelector('svg.lucide-menu'), 'no hamburger').toBeTruthy()
        expect(trigger().querySelector('svg.lucide-x'), 'an X while closed').toBeNull()
        expect(trigger().getAttribute('aria-expanded')).toBe('false')
        expect(trigger().getAttribute('aria-label')).toBe('Άνοιγμα μενού')
        expect(trigger().textContent?.trim()).toBe('')
        expect(baseTokens(drawerClose())).toContain('invisible')
        expect(drawerClose().getAttribute('aria-hidden')).toBe('true')
        expect(drawerClose().getAttribute('tabindex')).toBe('-1')
    })

    it('open: the trigger swaps to X and reads «Κλείσιμο μενού»; the drawer X becomes visible and focusable', () => {
        renderShell('policyholder')
        openDrawer()
        expect(trigger().querySelector('svg.lucide-x'), 'no X while open').toBeTruthy()
        expect(trigger().querySelector('svg.lucide-menu')).toBeNull()
        expect(trigger().getAttribute('aria-expanded')).toBe('true')
        expect(trigger().getAttribute('aria-label')).toBe('Κλείσιμο μενού')
        expect(baseTokens(drawerClose())).not.toContain('invisible')
        expect(drawerClose().getAttribute('aria-hidden')).toBeNull()
    })

    it('the trigger keeps the 44px floor as an icon-only control (class tokens, not textContent)', () => {
        renderShell('policyholder')
        expect(meetsFloor(trigger())).toBe(true)
    })

    it('the agent shell gets the same trigger', () => {
        renderShell('agent')
        expect(trigger().querySelector('svg.lucide-menu')).toBeTruthy()
    })
})
