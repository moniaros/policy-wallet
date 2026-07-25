import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The landing agent-dashboard mock localises its row labels via t(...) but had
 * hardcoded demo premiums as `"€450/yr"` — English money (€ prefix, English
 * "/yr") — so on the Greek landing a mock row read "Αυτοκίνητο … €450/yr",
 * mixing Greek and English on a first-impression credibility surface. The demo
 * premiums must be bilingual (el-GR: "450 €/έτος").
 */
const SRC = readFileSync('components/landing/AgentWidgets.tsx', 'utf-8')

describe('landing agent-widget demo premiums are localised', () => {
    it('no premium is a hardcoded English "€…/yr" literal', () => {
        // A `premium: "€…"` bare string literal (the old hardcoded English money).
        expect(SRC).not.toMatch(/premium:\s*"€/)
    })

    it('demo premiums use the bilingual t() with a Greek euro-suffix form', () => {
        expect(SRC).toMatch(/premium:\s*t\("[^"]*€\/έτος"/)
    })
})
