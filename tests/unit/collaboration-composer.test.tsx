import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

const SRC = readFileSync('components/collaboration/CollaborationTimeline.tsx', 'utf-8')

/**
 * The agent↔client message thread is the "notes"/collaboration workflow. Its
 * composer had a single-line <input> wired to an Enter=send / Shift+Enter=newline
 * handler that a single-line input cannot honour — a message longer than one line
 * had nowhere to go — and both the input and the send button were hand-rolled off
 * the design system.
 */
describe('collaboration composer', () => {
    it('uses a textarea so Shift+Enter newline actually works', () => {
        // The keydown handler distinguishes Enter from Shift+Enter; that only
        // means anything on a textarea.
        const composer = SRC.slice(SRC.indexOf('onKeyDown={(e) => { if (e.key === "Enter"'))
        expect(composer.slice(0, 400)).toMatch(/<textarea|rows=\{2\}/)
    })

    it('routes the message field through pw-input', () => {
        const idx = SRC.indexOf('onKeyDown={(e) => { if (e.key === "Enter"')
        const around = SRC.slice(idx - 200, idx + 400)
        expect(around).toContain('pw-input')
    })

    it('uses the shared primary button to send, not a hand-rolled dark button', () => {
        expect(SRC).toMatch(/onClick=\{addMessage\}[^>]*pw-primary-button/)
        expect(SRC).not.toContain('bg-neutral-800 hover:bg-neutral-900 text-white text-sm px-3 py-2')
    })

    it('announces new messages via an aria-live log region', () => {
        // A screen-reader user should hear a message arrive, not have the thread
        // update silently.
        expect(SRC).toMatch(/role="log"[\s\S]{0,120}aria-live="polite"/)
    })
})
