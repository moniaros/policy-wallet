import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The agent inbox rendered the raw thread status enum ("waiting_policyholder"),
 * and two of the five statuses (waiting_agent / waiting_policyholder) had no label
 * anywhere. Every STYLED status must also carry a human label, and the badge must
 * render the label, not the code.
 */
const SRC = readFileSync('components/collaboration/AgentInbox.tsx', 'utf-8')

function keysOf(mapName: string): string[] {
    const start = SRC.indexOf(`const ${mapName}`)
    const slice = SRC.slice(start, SRC.indexOf('\n}', start))
    return [...slice.matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1])
}

describe('agent inbox renders a thread-status LABEL, not the raw enum', () => {
    it('does not render the raw {thread.status}', () => {
        expect(SRC).not.toMatch(/>\s*\{thread\.status\}\s*</)
        expect(SRC).toContain('THREAD_STATUS_LABELS[thread.status]')
    })

    it('every styled status has a label (waiting_* included)', () => {
        const styled = keysOf('STATUS_STYLES')
        const labelled = new Set(keysOf('THREAD_STATUS_LABELS'))
        expect(styled.length).toBeGreaterThanOrEqual(5)
        const missing = styled.filter((s) => !labelled.has(s))
        expect(missing, `styled thread statuses with no label: ${missing.join(', ')}`).toEqual([])
        // The two that previously had none.
        expect(labelled.has('waiting_agent')).toBe(true)
        expect(labelled.has('waiting_policyholder')).toBe(true)
    })
})
