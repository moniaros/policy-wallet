import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Task-priority colours must follow the app's urgency ramp (CoverageGapsWidget:
 * critical=rose, high=amber, medium=sky, low=grey). The tasks list previously
 * coloured HIGH priority with the brand green (primary-soft / mint — a
 * success/positive colour) while MEDIUM was amber, so the most urgent task
 * looked reassuring and a medium one looked more alarming — an inverted risk
 * signal, and inconsistent (amber meant "high" everywhere else but "medium"
 * here). High priority must use an urgency colour (amber), never the success
 * green.
 */
const SRC = readFileSync('components/tasks/TasksClient.tsx', 'utf-8')

function priorityPillBody(): string {
    const start = SRC.indexOf('const priorityPill')
    expect(start, 'priorityPill not found').toBeGreaterThan(-1)
    // up to the closing of the function
    return SRC.slice(start, SRC.indexOf('\n    }', start))
}

describe('task priority colours signal urgency, not success', () => {
    it('high priority uses the urgency colour (amber), not the brand-green success palette', () => {
        const body = priorityPillBody()
        // The high case must be amber…
        expect(body).toMatch(/case 'high':\s*return '[^']*amber/)
        // …and must NOT use the success/brand-green palette.
        const highCase = body.match(/case 'high':\s*return '([^']*)'/)
        expect(highCase, 'high case return not found').toBeTruthy()
        expect(highCase![1]).not.toMatch(/mint|primary-soft|primary\//)
    })

    it('the high-priority summary count is not coloured with the success green', () => {
        // The summary highlights the high count; it must not use text-primary/mint.
        expect(SRC).not.toMatch(/key === 'high' \? 'text-primary dark:text-mint'/)
        expect(SRC).toMatch(/key === 'high' \? 'text-amber/)
    })
})
