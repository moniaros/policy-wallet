import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { NEEDS_STEPS, NEEDS_QUESTIONS } from '@/lib/needs/questions'
import { DEFAULT_PLAN_FACTS } from '@/lib/pricing/plan-defaults'

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
    // agentCollaboration is false on free AND plus, true only on pro —
    // displayed as "Family" since pricing v2 (it was "PolicyWallet Plus").
    // The plan NAME is read from the catalog rather than typed here, so the
    // next rename fails the copy, not the test. /pricing's comparison row reads
    // Όχι / Όχι / Ναι. /product's bullet list was the one place the claim
    // appeared unqualified, in a list where the other three bullets all
    // carried their plan.
    it('/product does not promise agent sharing without naming the plan', () => {
        const src = readFileSync('app/(public)/product/ProductSections.tsx', 'utf-8')
        const bullet = src.match(/t\("Δείχνετε στον ασφαλιστή σας[^)]*\)/)?.[0] ?? ''
        expect(bullet, 'the agent-sharing bullet should exist').not.toBe('')
        const familyName = DEFAULT_PLAN_FACTS.find((p) => p.tierKey === 'pro')!.displayName
        expect(bullet, `it must name the plan that actually unlocks it (${familyName})`)
            .toContain(familyName)
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
    // Walked by hand rather than with `readdirSync(recursive, withFileTypes)`:
    // Dirent exposes the parent directory as `path` on some Node/@types
    // versions and `parentPath` on others, which type-checks locally and fails
    // in CI. This is portable across both.
    function tsxFilesUnder(dir: string): string[] {
        return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
            const full = join(dir, entry.name)
            if (entry.isDirectory()) return tsxFilesUnder(full)
            return entry.isFile() && entry.name.endsWith('.tsx') ? [full] : []
        })
    }

    const authFiles = tsxFilesUnder('app/auth')

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
    //
    // The auth rebuild (A3/A7) removed every animated card wrapper — the
    // AuthShell paints statically — so the guard now walks the WHOLE auth
    // tree instead of a per-page list: any reintroduced motion wrapper is
    // caught wherever it lands. Conditional toasts/error boxes are exempt:
    // they are not present at first paint.
    function authTsxFiles(dir: string): string[] {
        return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
            const full = join(dir, entry.name)
            if (entry.isDirectory()) return authTsxFiles(full)
            return entry.isFile() && entry.name.endsWith('.tsx') ? [full] : []
        })
    }

    it('no auth screen mounts a card at opacity 0', () => {
        for (const file of authTsxFiles('app/auth')) {
            const src = readFileSync(file, 'utf-8')
            const tags = src.split('<motion.div').slice(1).map((chunk) => chunk.slice(0, 1200))
            const cards = tags.filter((t) => /rounded-2xl|rounded-g-lg/.test(t))
            for (const tag of cards) {
                const attrs = tag
                    .slice(0, tag.indexOf('className'))
                    .replace(/\/\*[\s\S]*?\*\//g, '')
                expect(
                    attrs,
                    `${file}: a full card animates from opacity 0, so it is blank until hydration`
                ).not.toMatch(/initial=\{\{\s*opacity:\s*0/)
            }
        }
    })
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
