import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * On the agency team screen, each member's role (owner / manager / member — a
 * permission indicator) was shown only as an unlabelled lucide icon: a screen
 * reader announced nothing, and a sighted user had to guess. A `roleLabel`
 * helper existed for exactly this but was dead code. The role icon must carry
 * the localised role label as an accessible name.
 */
const SRC = readFileSync('app/(protected)/team/TeamClient.tsx', 'utf-8')

describe('team member role icon has an accessible name', () => {
    it('the role icon wrapper carries an aria-label from the role label', () => {
        // roleIcon must build an accessible-name wrapper from roleLabel.
        const m = SRC.match(/const roleIcon = \(role: string\) => \{[\s\S]*?\n {4}\}/)
        expect(m, 'roleIcon helper not found').toBeTruthy()
        const body = m![0]
        expect(body).toContain('roleLabel(role)')
        expect(body).toMatch(/aria-label=\{label\}/)
    })

    it('roleLabel is no longer dead code (used by the icon)', () => {
        // Defined AND referenced.
        expect(SRC).toMatch(/const roleLabel = /)
        expect((SRC.match(/roleLabel\(/g) || []).length).toBeGreaterThan(0)
    })
})
