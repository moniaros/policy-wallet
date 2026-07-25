import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
    threadStatusLabel,
    threadPriorityLabel,
    actionStatusLabel,
    THREAD_STATUS_LABELS,
    THREAD_PRIORITY_LABELS,
    ACTION_STATUS_LABELS,
} from '@/lib/collaboration/status-labels'

/**
 * CollaborationTimeline rendered `{thread.status}`, `{thread.priority}` and the
 * action-status <select> options as raw English enums — so a Greek advisor read
 * "waiting_policyholder", "high", "in_progress" on the collaboration screen.
 * Same raw-enum class fixed for the AgentInbox badge, opportunity labels and the
 * activity feed. Labels now come from a single shared module so the inbox and the
 * timeline can't drift.
 */

describe('collaboration status/priority/action labels are localised', () => {
    it('every thread status, priority and action status has non-empty el + en', () => {
        const maps = [THREAD_STATUS_LABELS, THREAD_PRIORITY_LABELS, ACTION_STATUS_LABELS]
        for (const map of maps) {
            for (const [key, label] of Object.entries(map)) {
                expect(label.en, `${key}.en empty`).toBeTruthy()
                expect(label.el, `${key}.el empty`).toBeTruthy()
                // The Greek label must not be the raw machine enum.
                expect(label.el, `${key}.el is the raw enum`).not.toBe(key)
            }
        }
    })

    it('the two waiting_* thread states are labelled (they had none before)', () => {
        expect(threadStatusLabel('waiting_agent').el).toBe('Αναμονή συμβούλου')
        expect(threadStatusLabel('waiting_policyholder').el).toBe('Αναμονή πελάτη')
    })

    it('priority and action-status Greek labels are not raw enums', () => {
        expect(threadPriorityLabel('high').el).not.toBe('high')
        expect(actionStatusLabel('in_progress').el).not.toBe('in_progress')
        expect(actionStatusLabel('in_progress').el).toMatch(/εξέλιξη/)
    })

    it('unknown values fall back to the raw string (never throws/blank)', () => {
        expect(threadStatusLabel('mystery').el).toBe('mystery')
        expect(actionStatusLabel('mystery').en).toBe('mystery')
    })
})

describe('CollaborationTimeline routes enums through the shared labels', () => {
    const SRC = readFileSync('components/collaboration/CollaborationTimeline.tsx', 'utf-8')

    it('does not render raw {thread.status} or {thread.priority}', () => {
        expect(SRC).not.toMatch(/>\{thread\.status\}</)
        expect(SRC).not.toMatch(/>\{thread\.priority\}</)
    })

    it('does not use a raw enum as an action-status <option> label', () => {
        expect(SRC).not.toContain('>in_progress</option>')
        expect(SRC).not.toContain('>pending</option>')
    })

    it('imports and uses the shared label helpers', () => {
        expect(SRC).toContain('@/lib/collaboration/status-labels')
        expect(SRC).toMatch(/threadStatusLabel\(thread\.status\)/)
        expect(SRC).toMatch(/threadPriorityLabel\(thread\.priority\)/)
        expect(SRC).toMatch(/actionStatusLabel\(/)
    })
})
