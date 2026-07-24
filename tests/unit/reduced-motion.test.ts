import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * WCAG 2.3.3. 25 components animate via framer-motion, plus CSS animate-in /
 * pulse / ping and transitions — and `prefers-reduced-motion` was honoured in
 * exactly ONE place (a public scroll button). A user with a vestibular disorder
 * who sets the OS preference was still shown every entrance animation.
 */
describe('reduced motion is honoured app-wide', () => {
    const css = readFileSync('app/globals.css', 'utf-8')

    it('has a global prefers-reduced-motion rule', () => {
        expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
        expect(css).toMatch(/animation-duration:\s*0\.01ms\s*!important/)
        expect(css).toMatch(/transition-duration:\s*0\.01ms\s*!important/)
    })

    it('exempts loading spinners — freezing them would hide progress', () => {
        const block = /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\n\}/.exec(css)?.[0] || ''
        expect(block).toContain(':not(.animate-spin)')
    })

    it('makes framer-motion defer to the OS preference', () => {
        // CSS duration overrides do not reach framer-motion's JS-driven
        // initial/animate props — MotionConfig reducedMotion="user" does.
        const provider = readFileSync('components/providers/MotionProvider.tsx', 'utf-8')
        expect(provider).toContain('reducedMotion="user"')
        expect(readFileSync('app/layout.tsx', 'utf-8')).toContain('MotionProvider')
    })
})
