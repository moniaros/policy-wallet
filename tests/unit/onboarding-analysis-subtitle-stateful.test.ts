import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * The onboarding step-3 header subtitle said "Your first analysis is ready"
 * unconditionally. But analysis queues (QStash is the active prod route), so the
 * body could say "Analysis will complete in a few minutes" (queued) or "AI is
 * analyzing your policy…" (in progress) while the header claimed readiness — a
 * contradiction on the very first-run experience. The subtitle must track the
 * actual state and only claim "ready" when status === "completed" (or no upload).
 */
const SRC = readFileSync('app/onboarding/flow.tsx', 'utf-8')

describe('onboarding step-3 subtitle reflects the real analysis state', () => {
    it('computes a state-aware subtitle (not an unconditional "ready")', () => {
        expect(SRC).toContain('const step3Subtitle')
        // Conditional on the loading flag and the completed status.
        expect(SRC).toMatch(/step3Subtitle\s*=\s*simulatingAi\s*\?/)
        expect(SRC).toMatch(/analysisResult\?\.status === "completed"/)
    })

    it('the header renders the state-aware subtitle', () => {
        expect(SRC).toContain('{step3Subtitle}')
    })
})
