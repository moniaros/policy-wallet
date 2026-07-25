import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Each notification row in the policyholder's inbox is a role="button" (clicking
 * marks it read). A role="button" must activate on BOTH Enter and Space (the
 * WAI-ARIA button pattern) — the handler previously fired on Enter only, so a
 * keyboard user pressing Space (the natural button key) got nothing and the page
 * scrolled instead. The Space branch must also preventDefault to stop that scroll.
 */
const SRC = readFileSync('components/notifications/NotificationsClient.tsx', 'utf-8')

describe('notification row is keyboard-activatable like a real button', () => {
    it('the role="button" row is present', () => {
        expect(SRC).toContain('role="button"')
    })

    it('the keydown handler activates on Space as well as Enter', () => {
        // Enter OR Space in the same handler.
        expect(SRC).toMatch(/e\.key === "Enter"\s*\|\|\s*e\.key === " "/)
    })

    it('Space activation preventDefaults (so it does not scroll the page)', () => {
        // The combined handler must call preventDefault.
        const handler = SRC.match(/onKeyDown=\{\(e\) => \{[^}]*\}\s*\}/)
        expect(handler, 'notification row onKeyDown handler not found').toBeTruthy()
        expect(handler![0]).toContain('preventDefault')
    })
})
