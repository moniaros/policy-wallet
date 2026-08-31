import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Strip comments before asserting a pattern is ABSENT.
 *
 * These fixes are documented in comments that necessarily quote the thing they
 * removed ("Not role='menu'. It declared the APG menu pattern and…"), so a
 * naive `not.toMatch(/role="menu"/)` over raw source fails on the explanation
 * of the fix rather than on the defect. Only the negative assertions need this;
 * the positive ones are happy either way.
 */
function code(source: string): string {
    return source
        .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '') // {/* JSX comment */}
        .replace(/\/\*[\s\S]*?\*\//g, '') // /* block */ and /** doc */
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*)/.test(line))
        .join('\n')
}

/**
 * Keyboard and landmark contracts for the public marketing surface.
 *
 * Each of these was a live defect measured on production with real key presses
 * (never a programmatic `.focus()`, which does not trigger `:focus-visible`)
 * and with `document.elementFromPoint` to prove occlusion rather than mere
 * geometric overlap. They are asserted against the source because the
 * behaviours are structural: the wiring either exists or it does not.
 */

describe('Products disclosure (SolutionsDropdown)', () => {
    const src = readFileSync('components/landing/SolutionsDropdown.tsx', 'utf-8')

    it('returns focus to the trigger when closed with Escape', () => {
        // Escape unmounted the panel — including the focused element — so the
        // browser reset focus to <body>: zero `:focus-visible` matches anywhere
        // on a page with ~75 tab stops (WCAG 2.4.3).
        expect(src, 'a ref to the trigger button is required to restore focus').toMatch(
            /triggerRef\s*=\s*useRef/
        )
        expect(src, 'the close helper must focus the trigger').toMatch(
            /triggerRef\.current\?\.focus\(\)/
        )
        expect(
            src,
            'Escape must route through the focus-restoring close, not a bare setIsOpen(false)'
        ).toMatch(/event\.key === "Escape"[\s\S]{0,80}?close\(true\)/)
    })

    it('closes when focus leaves the container', () => {
        // The only auto-close was a mousedown-outside listener, which a
        // keyboard user never fires — so tabbing past the last link left the
        // panel painted over the hero.
        expect(src, 'an onBlur/focusout close is required').toMatch(/onBlur=\{/)
        expect(src, 'it must test containment of relatedTarget').toMatch(
            /relatedTarget[\s\S]{0,160}?containerRef\.current\?\.contains/
        )
    })

    it('does not claim a menu keyboard model it has not implemented', () => {
        // role="menu" promises the APG menu pattern: roving tabindex plus
        // Arrow/Home/End. All 18 links reported tabIndex 0 and every arrow key
        // left document.activeElement unchanged. These are plain links that
        // already work with Tab, so the honest role is none at all.
        const body = code(src)
        expect(body, 'role="menu" must not be declared without the keyboard model').not.toMatch(
            /role="menu"/
        )
        expect(body, 'role="menuitem" must not be declared either').not.toMatch(/role="menuitem"/)
        expect(body, 'aria-haspopup="menu" makes the same false promise').not.toMatch(
            /aria-haspopup="menu"/
        )
        // …but it is still a disclosure, so this must survive.
        expect(src, 'aria-expanded is what actually describes this control').toMatch(
            /aria-expanded=\{isOpen\}/
        )
    })
})

describe('Audience tabs keyboard model', () => {
    const src = readFileSync('components/landing/AudienceTabs.tsx', 'utf-8')

    it('derives the next tab from the SELECTION, not from the key target', () => {
        // Taking the tab the key fired on as `current` meant that, with a
        // roving tabindex holding focus in place, every arrow press after the
        // first recomputed from the same constant and became a no-op.
        expect(code(src), 'the handler must not take a per-button current').not.toMatch(
            /handleKeyDown\(e,\s*"(policyholders|agents)"\)/
        )
        expect(src, 'the next tab must come from activeTab').toMatch(
            /activeTab === "policyholders" \? "agents" : "policyholders"/
        )
    })

    it('moves focus along with the selection', () => {
        expect(src, 'both tabs need refs so selection can carry focus').toMatch(
            /tabRefs\s*=\s*\{\s*policyholders:/
        )
        expect(src, 'selecting a tab must focus it').toMatch(
            /tabRefs\[next\]\.current\?\.focus\(\)/
        )
    })

    it('supports Home and End', () => {
        expect(src).toMatch(/e\.key === "Home"/)
        expect(src).toMatch(/e\.key === "End"/)
    })
})

describe('landmark uniqueness', () => {
    it('/company does not nest a second <main> inside the shell', () => {
        // LoBPageShell already renders <main id={SKIP_LINK_TARGET_ID}>, so a
        // <main> here gave the page two main landmarks and the skip link two
        // candidates. /company was the only public page doing this.
        const src = readFileSync('app/(public)/company/CompanyPageClient.tsx', 'utf-8')
        expect(code(src), 'CompanyPageClient must not open its own <main>').not.toMatch(/<main[\s>]/)
    })

    it('/compare does not name its table scroller after the section around it', () => {
        // Both the <section> and the scroller inside it pointed at
        // compare-table-heading, exposing two nested regions with the identical
        // accessible name.
        const src = readFileSync('app/(public)/compare/CompareSections.tsx', 'utf-8')
        const scroller = src.match(/<div\s+role="region"[\s\S]*?>/)?.[0] ?? ''
        expect(scroller, 'the scrolling region should exist').not.toBe('')
        expect(
            scroller,
            'the inner scroller must carry its own label, not the section heading'
        ).not.toMatch(/aria-labelledby="compare-table-heading"/)
        expect(scroller, 'it still needs a name of some kind').toMatch(/aria-label=/)
    })
})

describe('auth pages reserve space for the consent banner', () => {
    // The banner is `fixed inset-x-0 bottom-0 z-[120]`, the auth card is
    // centred in a min-h-screen flex box, and the pages have almost no scroll
    // room — 158px at 1280x800, 0 at 1440x900. Sweeping every scroll offset
    // with elementFromPoint at the submit button's centre, /auth/signup's
    // button was covered at ALL of 320x568, 375x667, 360x800, 390x844,
    // 412x915, 844x390 and 1280x800. It is the destination of every primary
    // CTA on the site, and the person seeing the banner is by definition the
    // first-time visitor.
    const utility = readFileSync('app/globals.css', 'utf-8')

    it('the utility exists and consumes the height the banner publishes', () => {
        expect(utility).toMatch(/\.pw-clear-consent\s*\{[^}]*var\(--pw-bottom-obstruction/)
    })

    it('the banner still publishes that height', () => {
        const banner = readFileSync('components/compliance/CookieConsentBanner.tsx', 'utf-8')
        expect(banner, 'nothing would set the variable the utility reads').toMatch(
            /setProperty\("--pw-bottom-obstruction"/
        )
    })

    for (const [file, label] of [
        // Signin, signup and forgot-password all render through AuthShell (A3/A7).
        ['components/auth/AuthShell.tsx', 'AuthShell (signin + signup + forgot)'],
    ] as const) {
        it(`${label} applies it to the full-height container`, () => {
            expect(readFileSync(file, 'utf-8')).toMatch(/pw-clear-consent/)
        })
    }
})

describe('the auth back-link arrow is decoration, not the link name', () => {
    // forgot-password baked "←" into the translated string AND rendered another
    // one in JSX, so the link's accessible name was "← ← Αρχική".
    for (const [file, label] of [
        // Signin, signup and forgot-password all use AuthShell's back link (A3/A7).
        ['components/auth/AuthShell.tsx', 'AuthShell (signin + signup + forgot)'],
    ] as const) {
        it(`${label} renders exactly one arrow, hidden from assistive tech`, () => {
            const src = readFileSync(file, 'utf-8')
            expect(src, 'the arrow must be marked decorative').toMatch(
                /<span aria-hidden="true">←<\/span>/
            )
            expect(
                code(src),
                'no arrow may be baked into the translated label as well'
            ).not.toMatch(/"←\s*(Αρχική|Home)"/)
        })
    }
})
