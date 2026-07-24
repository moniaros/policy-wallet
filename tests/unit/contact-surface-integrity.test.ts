import { describe, it, expect } from 'vitest'
import { readFileSync, globSync } from 'node:fs'
import { siteConfig } from '@/lib/seo/site'

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/**
 * The product is policywallet.gr. lib/seo/site.ts already records that a .com
 * contact "is not a mailbox we control" — that correction was applied to the
 * public site and stopped there.
 *
 * It left `support@policywallet.com` as the mailto behind the Help page's
 * "email support" CTA, behind the same CTA on every help article, and as the
 * only route back offered to a REJECTED agent applicant. It left
 * `https://policywallet.com` as the origin fallback in the footer of every
 * email the product sends.
 */
describe('every contact route points at a mailbox the company controls', () => {
    it('the published address is the .gr one', () => {
        expect(siteConfig.contactEmail).toBe('info@policywallet.gr')
    })

    it('no source file names a policywallet.com address or origin', () => {
        const offenders: string[] = []
        const files = [
            ...globSync('lib/**/*.ts'),
            ...globSync('app/**/*.tsx'),
            ...globSync('app/**/*.ts'),
            ...globSync('components/**/*.tsx'),
        ]
        for (const file of files) {
            if (strip(readFileSync(file, 'utf-8')).includes('policywallet.com')) offenders.push(file)
        }
        expect(offenders, `policywallet.com in:\n${offenders.join('\n')}`).toEqual([])
    })
})

/**
 * The email footer linked "Visit Dashboard" to the bare origin (the marketing
 * landing page) and "Support" to /support — a route that does not exist. Both
 * shipped in the footer of every email.
 */
describe('the email footer links to routes that exist', () => {
    const BASE = strip(readFileSync('lib/email/templates/base-template.ts', 'utf-8'))

    it('does not link to /support', () => {
        expect(BASE).not.toMatch(/\/support/)
    })

    it('sends "dashboard" to the canonical dashboard, not the landing page', () => {
        expect(BASE).toMatch(/\$\{origin\}\/dashboard/)
    })

    it('points support at the in-product help centre and the real mailbox', () => {
        expect(BASE).toMatch(/\$\{origin\}\/help/)
        expect(BASE).toMatch(/mailto:\$\{siteConfig\.contactEmail\}/)
    })

    it('every linked route resolves to a real page', () => {
        for (const route of ['dashboard', 'help', 'privacy']) {
            const found = [
                ...globSync(`app/**/${route}/page.tsx`),
                ...globSync(`app/**/${route}/page.ts`),
            ]
            expect(found.length, `no page for /${route}`).toBeGreaterThan(0)
        }
    })
})

/**
 * Every email declared `lang="en"`, so a Greek renewal notice was announced to
 * screen readers — and hinted to any downstream translation — as English, and
 * closed with an English footer.
 */
describe('emails declare the language they are actually written in', () => {
    const BASE = strip(readFileSync('lib/email/templates/base-template.ts', 'utf-8'))

    it('takes the language rather than hardcoding English', () => {
        expect(BASE).toMatch(/<html lang="\$\{language\}">/)
        expect(BASE).not.toMatch(/<html lang="en">/)
    })

    it('defaults to Greek, the product default', () => {
        expect(BASE).toMatch(/language: 'el' \| 'en' = 'el'/)
    })

    it('translates the footer too', () => {
        expect(BASE).toMatch(/Με επιφύλαξη παντός δικαιώματος/)
        expect(BASE).toMatch(/Πίνακας ελέγχου/)
    })
})
