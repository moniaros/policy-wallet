import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { NEEDS_STEPS, NEEDS_QUESTIONS } from '@/lib/needs/questions'

/**
 * Content contracts for the public marketing surface and the auth tree.
 *
 * Everything here was a live defect on production. The theme is the same in
 * each case: one surface drifted away from another that says the same thing,
 * and nothing held them together.
 */

describe('the needs wizard is described by a true number', () => {
    // Four surfaces said "six questions" while the wizard asks twelve, across
    // six steps. /guides was already correct with "6 steps", which is what the
    // rest now match.
    it('really has 6 steps and 12 questions', () => {
        expect(NEEDS_STEPS.length).toBe(6)
        expect(NEEDS_QUESTIONS.length).toBe(12)
    })

    const surfaces: [string, string][] = [
        ['lib/seo/marketing-pages.ts', 'the /needs title and description'],
        ['app/(public)/needs/NeedsPageBody.tsx', "the /needs H1"],
        ['components/landing/WorldClassLanding.tsx', 'the homepage CTA'],
        ['app/(public)/guides/GuidesIndexClient.tsx', 'the /guides card'],
    ]

    for (const [file, label] of surfaces) {
        it(`${label} does not promise a question count`, () => {
            const src = readFileSync(file, 'utf-8')
            // "6 questions" / "six questions" / «6 ερωτήσεις» / «Έξι ερωτήσεις»
            expect(src, `${file} still advertises a question count`).not.toMatch(
                /(\b6|\bsix|Έξι|\b6)\s*(questions|ερωτήσεις)/i
            )
        })
    }
})

describe('plan-gated capabilities name their plan', () => {
    // agentCollaboration is false on free AND Starter, true only on pro —
    // displayed as PolicyWallet Plus. /pricing's comparison row reads
    // Όχι / Όχι / Ναι. /product's bullet list was the one place the claim
    // appeared unqualified, in a list where the other three bullets all
    // carried their plan.
    it('/product does not promise agent sharing without naming the plan', () => {
        const src = readFileSync('app/(public)/product/ProductSections.tsx', 'utf-8')
        const bullet = src.match(/t\("Δείχνετε στον ασφαλιστή σας[^)]*\)/)?.[0] ?? ''
        expect(bullet, 'the agent-sharing bullet should exist').not.toBe('')
        expect(bullet, 'it must name PolicyWallet Plus').toMatch(/PolicyWallet Plus/)
    })
})

describe('Greek copy holds its register and its accents', () => {
    const marketingSources = [
        'components/landing/WorldClassLanding.tsx',
        'components/landing/HeroSlides.tsx',
        'components/landing/AudienceTabs.tsx',
        'components/landing/ServicesGrid.tsx',
    ]

    // Enclitic accent: «το συμβόλαιό σας», not «το συμβόλαιο σας». Counted over
    // the live site these were 1-in-125 and 1-in-11 minorities, both on the
    // homepage and nowhere else.
    const misspellings: [RegExp, string][] = [
        [/συμβόλαιο σας/, 'missing enclitic accent: should be «συμβόλαιό σας»'],
        [/ασφαλιστήριο σας/, 'missing enclitic accent: should be «ασφαλιστήριό σας»'],
        [/χρειαζεται/, 'missing accent: should be «χρειάζεται»'],
        [/\bεισαι\b/, 'missing accent, and informal: should be «είστε»'],
    ]

    for (const file of marketingSources) {
        const src = readFileSync(file, 'utf-8')
        // Comments quote the strings they replaced, so only judge code.
        const body = src
            .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .split('\n')
            .filter((l) => !/^\s*(\/\/|\*)/.test(l))
            .join('\n')

        for (const [pattern, why] of misspellings) {
            it(`${file}: ${why}`, () => {
                expect(body).not.toMatch(pattern)
            })
        }
    }
})

describe('the auth tree carries its language on every internal link', () => {
    // An English visitor was sent to Greek /terms and /privacy — the two
    // documents the signup checkbox asks them to ACCEPT — and to a Greek
    // sign-in page. Only the "sign up as an agent" link carried ?lang=en.
    const authFiles = readdirSync('app/auth', { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith('.tsx'))
        .map((e) => join(String(e.parentPath ?? e.path), e.name))

    it('finds the auth pages to check', () => {
        expect(authFiles.length).toBeGreaterThan(4)
    })

    for (const file of authFiles) {
        it(`${file} has no locale-dropping internal link`, () => {
            const src = readFileSync(file, 'utf-8')
            for (const bare of ['/terms', '/privacy', '/auth/signin', '/auth/signup']) {
                expect(
                    src,
                    `href="${bare}" drops the pinned language — route it through authHref()/localizeHref()`
                ).not.toContain(`href="${bare}"`)
            }
        })
    }
})

describe('above-the-fold auth cards are painted at first paint', () => {
    // `initial={{ opacity: 0 }}` on a whole card ships `style="opacity:0"` in
    // the SERVER HTML, so the card stays invisible until framer-motion
    // hydrates. On forgot-password the form was in the DOM at 1.5s and
    // invisible until 5.1s, and that gap set LCP at 5.2s on slow 4G.
    // Conditional toasts are exempt: they are not present at first paint.
    const cards: [string, string][] = [
        ['app/auth/forgot-password/page.tsx', 'forgot-password'],
        ['app/auth/signup/SignupForm.tsx', 'signup'],
        ['app/auth/signup/confirmation/page.tsx', 'signup confirmation'],
        ['app/auth/reset-password/page.tsx', 'reset-password'],
    ]

    for (const [file, label] of cards) {
        it(`${label}'s card does not start at opacity 0`, () => {
            const src = readFileSync(file, 'utf-8')
            // Split on the tag rather than regex-matching across it: the
            // opening tag can carry a multi-line comment, which blew past any
            // fixed lookahead window.
            const tags = src.split('<motion.div').slice(1).map((chunk) => chunk.slice(0, 1200))
            // A card wrapper is the one carrying the card chrome. Conditional
            // toasts (rounded-xl, border-rose-*) are exempt — they are not on
            // screen at first paint, so animating their opacity costs nothing.
            const cards = tags.filter((t) => /rounded-2xl/.test(t))
            expect(cards.length, `no card wrapper found in ${file}`).toBeGreaterThan(0)
            for (const tag of cards) {
                // Strip comments first — the fix is documented in a comment
                // that necessarily quotes the `opacity: 0` it removed.
                const attrs = tag
                    .slice(0, tag.indexOf('className'))
                    .replace(/\/\*[\s\S]*?\*\//g, '')
                expect(
                    attrs,
                    `${file}: a full card animates from opacity 0, so it is blank until hydration`
                ).not.toMatch(/initial=\{\{\s*opacity:\s*0/)
            }
        })
    }
})

describe('the sign-up link uses the sanctioned Greek CTA', () => {
    // «Εγγραφή» is the word the footer's newsletter button already uses, and
    // PRIMARY_ACTION_SHORT's docblock exists specifically to stop one Greek
    // label pointing at two destinations.
    it('createAccount is «Δημιουργία λογαριασμού», not «Εγγραφή»', () => {
        const el = readFileSync('lib/i18n/translations/el.ts', 'utf-8')
        const values = [...el.matchAll(/createAccount:\s*'([^']*)'/g)].map((m) => m[1])
        expect(values.length, 'createAccount should exist in the Greek dictionary').toBeGreaterThan(0)
        for (const value of values) {
            expect(value, 'createAccount must not reuse the newsletter word').not.toBe('Εγγραφή')
        }
    })
})
