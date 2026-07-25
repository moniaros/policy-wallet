import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The account Settings security audit-trail flagged failed events (e.g. a failed
 * login) with a hardcoded English "Alert" badge, while every other label on the
 * screen used t.settings.*. A Greek user reviewing their own security log saw
 * "Alert" in English on a trust-critical surface. lint:i18n-changed only scans
 * CHANGED .tsx, so the literal shipped unflagged. Now t.settings.securityAlertBadge
 * (el «Προσοχή»).
 */
const SETTINGS = readFileSync('components/account/Settings.tsx', 'utf-8')
const EN = readFileSync('lib/i18n/translations/en.ts', 'utf-8')
const EL = readFileSync('lib/i18n/translations/el.ts', 'utf-8')

describe('settings security-alert badge is localised', () => {
    it('renders t.settings.securityAlertBadge, not a bare "Alert" literal', () => {
        expect(SETTINGS).toContain('t.settings.securityAlertBadge')
        // No JSX text node that is just the word "Alert" (the old hardcoded badge).
        expect(SETTINGS).not.toMatch(/>\s*Alert\s*</)
    })

    it('both languages define securityAlertBadge', () => {
        expect(EN).toMatch(/securityAlertBadge:\s*'[^']+'/)
        expect(EL).toMatch(/securityAlertBadge:\s*'[^']+'/)
    })

    it('the Greek label is a real Greek word, not English', () => {
        const m = EL.match(/securityAlertBadge:\s*'([^']+)'/)
        expect(m).toBeTruthy()
        expect(m![1]).toMatch(/[Α-Ωα-ω]/)
    })
})
