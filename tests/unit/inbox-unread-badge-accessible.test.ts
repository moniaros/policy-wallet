import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The agent inbox thread rows show an unread-count badge as a bare red number,
 * positioned before the subject in the button's reading order — so a screen
 * reader announces "3, <subject>, …", the "3" unexplained. On an advisor's
 * primary triage screen the badge must carry an accessible name ("3 unread").
 */
const SRC = readFileSync('components/collaboration/AgentInbox.tsx', 'utf-8')

describe('agent inbox unread badge has an accessible name', () => {
    it('the unread badge carries an aria-label with the count + localised label', () => {
        expect(SRC).toContain('UNREAD_ARIA')
        expect(SRC).toMatch(/aria-label=\{`\$\{thread\.unreadCount\} \$\{UNREAD_ARIA\[/)
    })

    it('the unread label is localised (el + en)', () => {
        expect(SRC).toMatch(/UNREAD_ARIA = \{ el: "[^"]+", en: "[^"]+" \}/)
    })
})
