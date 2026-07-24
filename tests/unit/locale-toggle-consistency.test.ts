import { describe, it, expect } from 'vitest'
import { readFileSync, globSync } from 'node:fs'
import { LOCALE_OPTIONS } from '@/components/ui/LocaleToggle'

/**
 * The language switcher existed five times, labelling Greek three ways — "ΕΛ",
 * "EL" and "GR" — across two incompatible interaction models:
 *
 *   pick-from-two   the highlighted code is the language you are IN
 *   toggle-to-other the single code shown is the language you would SWITCH TO
 *
 * So a lone "EN" meant "you are reading English" on signin and "click for
 * English" on the signup confirmation page — opposite meanings two steps apart
 * in one flow. One control now, both options always visible.
 */
describe('one language switcher, one meaning', () => {
    const authAndShell = [
        'app/auth/signin/page.tsx',
        'app/auth/signup/SignupForm.tsx',
        'app/auth/signup/confirmation/page.tsx',
        'app/auth/forgot-password/page.tsx',
        'components/shell/AppShell.tsx',
    ]

    it('every auth and shell surface uses the shared control', () => {
        for (const file of authAndShell) {
            expect(readFileSync(file, 'utf-8'), file).toMatch(/<LocaleToggle\b/)
        }
    })

    it('no surface builds its own switcher', () => {
        const offenders: string[] = []
        for (const file of globSync('{app,components}/**/*.tsx')) {
            if (file.endsWith('LocaleToggle.tsx')) continue
            // UserMenu keeps its own: a dropdown with full language names and a
            // router.refresh() transition. Same pick-from-two model, so it
            // carries none of the ambiguity this consolidation removed.
            if (file.endsWith('UserMenu.tsx')) continue
            if (/setLanguage\(/.test(readFileSync(file, 'utf-8'))) offenders.push(file)
        }
        expect(offenders, `hand-rolled language switchers:\n${offenders.join('\n')}`).toEqual([])
    })

    it('labels Greek as a language, never as the country code GR', () => {
        expect(LOCALE_OPTIONS.map((o) => o.label)).toEqual(['ΕΛ', 'EN'])
        for (const file of globSync('{app,components}/**/*.tsx')) {
            expect(readFileSync(file, 'utf-8'), file).not.toMatch(/label: ['"]GR['"]/)
        }
    })

    it('always offers both options, so a code can only mean “you are here”', () => {
        const src = readFileSync('components/ui/LocaleToggle.tsx', 'utf-8')
        expect(src).toMatch(/LOCALE_OPTIONS\.map/)
        expect(src).toMatch(/aria-pressed=\{language === value\}/)
        // The toggle-to-other model is what made a lone code ambiguous.
        expect(src).not.toMatch(/otherLocale/)
    })
})
