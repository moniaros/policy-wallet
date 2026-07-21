import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { publishJSON } = vi.hoisted(() => ({ publishJSON: vi.fn() }))
vi.mock('@upstash/qstash', () => ({
    Client: class {
        publishJSON = publishJSON
    },
}))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))

import { enqueueAnalysisRun } from '@/lib/services/analysis/analysis-queue'

const ENV_KEYS = ['QSTASH_TOKEN', 'QSTASH_CALLBACK_BASE_URL', 'NEXTAUTH_URL', 'VERCEL_URL', 'AI_ANALYSIS_PARALLELISM']
let saved: Record<string, string | undefined>

beforeEach(() => {
    vi.clearAllMocks()
    saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]))
    for (const k of ENV_KEYS) delete process.env[k]
    publishJSON.mockResolvedValue({ messageId: 'm1' })
})
afterEach(() => {
    for (const k of ENV_KEYS) {
        if (saved[k] === undefined) delete process.env[k]
        else process.env[k] = saved[k]
    }
})

describe('enqueueAnalysisRun', () => {
    it('returns false (inline fallback) when QStash is not configured', async () => {
        const queued = await enqueueAnalysisRun('run-1', 'en')
        expect(queued).toBe(false)
        expect(publishJSON).not.toHaveBeenCalled()
    })

    it('returns false when a token is set but no callback base URL can be resolved', async () => {
        process.env.QSTASH_TOKEN = 'tok'
        const queued = await enqueueAnalysisRun('run-1', 'en')
        expect(queued).toBe(false)
        expect(publishJSON).not.toHaveBeenCalled()
    })

    it('publishes to the signed consumer with a flow-control cap when configured', async () => {
        process.env.QSTASH_TOKEN = 'tok'
        process.env.QSTASH_CALLBACK_BASE_URL = 'https://app.example.gr/'
        process.env.AI_ANALYSIS_PARALLELISM = '3'

        const queued = await enqueueAnalysisRun('run-42', 'el')

        expect(queued).toBe(true)
        expect(publishJSON).toHaveBeenCalledTimes(1)
        const arg = publishJSON.mock.calls[0][0]
        expect(arg.url).toBe('https://app.example.gr/api/v1/jobs/execute-analysis')
        expect(arg.body).toEqual({ runId: 'run-42', language: 'el' })
        expect(arg.flowControl).toEqual({ key: 'ai-analysis', parallelism: 3 })
        // Sized against the execution lease: redeliveries must outlive a dead
        // executor's ~4-min lease so the 503-on-held-lease resume path can fire.
        expect(arg.retries).toBe(5)
    })

    it('falls back to inline (false) when the publish call throws', async () => {
        process.env.QSTASH_TOKEN = 'tok'
        process.env.NEXTAUTH_URL = 'https://app.example.gr'
        publishJSON.mockRejectedValue(new Error('qstash down'))

        const queued = await enqueueAnalysisRun('run-9', 'en')
        expect(queued).toBe(false)
    })

    it('derives the base URL from VERCEL_URL when no explicit URL is set', async () => {
        process.env.QSTASH_TOKEN = 'tok'
        process.env.VERCEL_URL = 'policy-wallet.vercel.app'

        const queued = await enqueueAnalysisRun('run-7', 'en')
        expect(queued).toBe(true)
        expect(publishJSON.mock.calls[0][0].url).toBe(
            'https://policy-wallet.vercel.app/api/v1/jobs/execute-analysis'
        )
    })
})
