import { describe, it, expect } from 'vitest'
import { localizeHref } from '@/lib/seo/locale-links'
import { enPathFor, marketingPages } from '@/lib/seo/marketing-pages'

/**
 * Locale-aware internal links: EN pages must navigate within the /en tree,
 * but only toward targets that actually exist — the helper derives the
 * mirrored set from the marketing-pages registry so it can never emit a 404.
 */

describe('localizeHref', () => {
    it('is the identity in the Greek context', () => {
        expect(localizeHref('/pricing', 'el')).toBe('/pricing')
        expect(localizeHref('/', 'el')).toBe('/')
        expect(localizeHref('/privacy', 'el')).toBe('/privacy')
    })

    it('maps the home link to the English home', () => {
        expect(localizeHref('/', 'en')).toBe('/en')
    })

    it('prefixes every registry page that declares an English mirror', () => {
        for (const page of Object.values(marketingPages)) {
            if (page.en) {
                expect(localizeHref(page.path, 'en')).toBe(enPathFor(page.path))
            } else {
                // No mirror ⇒ the Greek page is served instead of a 404.
                expect(localizeHref(page.path, 'en')).toBe(page.path)
            }
        }
    })

    it('preserves query strings and fragments on mirrored targets', () => {
        expect(localizeHref('/pricing?audience=agent', 'en')).toBe('/en/pricing?audience=agent')
        expect(localizeHref('/pricing#pricing-faq', 'en')).toBe('/en/pricing#pricing-faq')
        expect(localizeHref('/product#product-faq', 'en')).toBe('/en/product#product-faq')
    })

    it('passes external URLs, in-page anchors and app routes through', () => {
        expect(localizeHref('https://www.eaee.gr', 'en')).toBe('https://www.eaee.gr')
        expect(localizeHref('#how-it-works', 'en')).toBe('#how-it-works')
        expect(localizeHref('/auth/signup?role=agent', 'en')).toBe('/auth/signup?role=agent')
        expect(localizeHref('/account', 'en')).toBe('/account')
    })

    it('never double-prefixes already-English paths', () => {
        expect(localizeHref('/en', 'en')).toBe('/en')
        expect(localizeHref('/en/pricing', 'en')).toBe('/en/pricing')
    })

    it('localizes guide articles exactly when the guides index is mirrored', () => {
        const expected = marketingPages.guides.en
            ? '/en/guides/ekptosi-enfia-asfalisi-katoikias'
            : '/guides/ekptosi-enfia-asfalisi-katoikias'
        expect(localizeHref('/guides/ekptosi-enfia-asfalisi-katoikias', 'en')).toBe(expected)
    })
})
