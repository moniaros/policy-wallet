import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { readFileSync } from "node:fs"
import { globSync } from "../helpers/glob"
import NotFound from '@/app/not-found'

/**
 * The root 404 renders above the LanguageProvider, so it cannot read the user's
 * language and must carry both — Greek leading, as the app default. It used to be
 * English-only ("Page Not Found" / "Return to Safety" / "404_POLICY_MISSING"),
 * which is exactly the "wall of English at the worst moment" the sibling
 * app/error.tsx was deliberately made bilingual to avoid.
 */
describe('the root 404 is bilingual, Greek-first, and professional', () => {
    it('leads in Greek', () => {
        const { container } = render(<NotFound />)
        expect(container.textContent).toContain('Η σελίδα δεν βρέθηκε')
        // No English-only heading.
        expect(container.textContent).not.toContain('Page Not Found')
    })

    it('still offers the English reading', () => {
        const { container } = render(<NotFound />)
        expect(container.textContent).toMatch(/doesn.t exist or has been moved/i)
    })

    it('drops the prototype-flavoured copy', () => {
        const { container } = render(<NotFound />)
        // "Return to Safety" and an invented error code read as a prototype, not
        // a market-leading insurer.
        expect(container.textContent).not.toContain('Return to Safety')
        expect(container.textContent).not.toContain('404_POLICY_MISSING')
    })

    it('offers a route home', () => {
        const { container } = render(<NotFound />)
        const link = container.querySelector('a[href="/"]')
        expect(link).toBeTruthy()
        expect(link?.textContent).toContain('Αρχική')
    })
})

/**
 * Regression net for the whole class: every error/not-found boundary in the app
 * must either carry Greek (it renders above the provider and hard-codes both) or
 * defer to a translated component (it renders below the provider). A new
 * English-only boundary — which the changed-file i18n lint would miss on an
 * unrelated PR — fails here.
 */
describe('no error boundary is English-only', () => {
    it('every boundary carries Greek or uses translations', () => {
        const files = [
            ...globSync('app/**/error.tsx'),
            ...globSync('app/**/not-found.tsx'),
            ...globSync('app/**/global-error.tsx'),
        ]
        expect(files.length).toBeGreaterThan(5) // sanity: the glob actually matched
        const greek = /[Ͱ-Ͽ]/
        const offenders = files.filter((file) => {
            const src = readFileSync(file, 'utf-8')
            const carriesGreek = greek.test(src)
            const usesTranslations = /useLanguage|RouteError|SettingsError|\bt\.errors\b/.test(src)
            return !carriesGreek && !usesTranslations
        })
        expect(offenders, `English-only boundaries:\n${offenders.join('\n')}`).toEqual([])
    })
})
