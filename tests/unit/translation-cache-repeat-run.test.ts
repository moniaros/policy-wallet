/**
 * The translation cache must actually work across runs.
 *
 * Verified failure this pins (dev run log, 2026-08-14): "cached 0,
 * translated 17" on every run. Three defects compounded:
 *   1. Double-wrapped `{el,en}` objects (Gemini JSON-mode fallback) flowed
 *      into the collector, were interpolated into the prompt as
 *      "[object Object]", and killed cache writes with Prisma's
 *      "Expected String, provided Object".
 *   2. The model answers "N/A" to those garbage lines, and the code cached
 *      whatever came back verbatim — poisoning the entry if it ever landed.
 *   3. Reads were N sequential findUniques (~1.3s each on the remote dev DB).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { db, generateObjectMock, dbRows } = vi.hoisted(() => {
    const dbRows = new Map<string, { contentHash: string; translated: string }>()
    const generateObjectMock = vi.fn()
    const db = {
        translationCache: {
            findMany: vi.fn(async ({ where }: any) => {
                const hashes: string[] = where.contentHash.in
                return hashes
                    .filter((h) => dbRows.has(h))
                    .map((h) => ({ contentHash: h, translated: dbRows.get(h)!.translated }))
            }),
            createMany: vi.fn(async ({ data }: any) => {
                for (const row of data) {
                    if (!dbRows.has(row.contentHash)) dbRows.set(row.contentHash, row)
                }
                return { count: data.length }
            }),
            upsert: vi.fn(),
            findUnique: vi.fn(async () => null),
        },
    }
    return { db, generateObjectMock, dbRows }
})

vi.mock('@/lib/db', () => ({ db }))
vi.mock('@/lib/logger', () => ({ logger: vi.fn() }))
vi.mock('ai', () => ({ generateObject: generateObjectMock, zodSchema: (s: unknown) => ({ jsonSchema: s }) }))
vi.mock('@ai-sdk/google', () => ({ createGoogleGenerativeAI: () => () => 'model' }))
vi.mock('@/lib/env', () => ({ env: { GEMINI_API_KEY: 'test-key', GEMINI_MODEL_TRANSLATION: 'gemini-test' } }))
vi.mock('@/lib/token-tracking', () => ({ trackTokenUsage: vi.fn() }))
vi.mock('@/lib/services/ai/runtime-config', () => ({ getAiRuntimeOverrides: vi.fn(async () => ({})) }))
vi.mock('@/lib/services/ai/shared-utils', () => ({
    withTimeoutAndRetry: (fn: (signal: AbortSignal) => Promise<unknown>) => fn(new AbortController().signal),
    parseUsage: () => ({ inputTokens: 1, outputTokens: 1 }),
}))

import { batchTranslateToEnglish } from '@/lib/services/translation/batch-translator'
import {
    collectClarityTextsForTranslation,
    collectGapTextsForTranslation,
} from '@/lib/services/translation/greek-to-bilingual'

beforeEach(() => {
    vi.clearAllMocks()
    dbRows.clear()
})

describe('a second identical run hits the cache', () => {
    it('translates once, then serves every phrase from cache with ZERO AI calls', async () => {
        const texts = ['Απογραφή Συμβολαίου', 'Προνόμια και Πρόληψη', 'Κάλυψη πυρκαγιάς']
        generateObjectMock.mockResolvedValue({
            object: { translations: ['Policy Inventory', 'Perks and Prevention', 'Fire coverage'] },
            usage: {},
        })

        const first = await batchTranslateToEnglish(texts)
        expect(first).toEqual(['Policy Inventory', 'Perks and Prevention', 'Fire coverage'])
        expect(generateObjectMock).toHaveBeenCalledTimes(1)
        // The cache write is deliberately fire-and-forget — wait for it.
        await vi.waitFor(() => expect(dbRows.size).toBe(3))
        // Writes are ONE batched statement, never per-row upserts.
        expect(db.translationCache.createMany).toHaveBeenCalledTimes(1)

        const second = await batchTranslateToEnglish(texts)
        expect(second).toEqual(first)
        // Cache hit rate on the repeat run: 3/3 — no new AI call.
        expect(generateObjectMock).toHaveBeenCalledTimes(1)
    })
})

describe('junk model output is used as fallback but NEVER cached', () => {
    it('drops "N/A" and empty answers from the cache', async () => {
        generateObjectMock.mockResolvedValue({
            object: { translations: ['N/A', '', 'Real translation'] },
            usage: {},
        })

        const out = await batchTranslateToEnglish(['κείμενο ένα', 'κείμενο δύο', 'κείμενο τρία'])
        // Junk falls back to the Greek source so the UI never prints "N/A".
        expect(out).toEqual(['κείμενο ένα', 'κείμενο δύο', 'Real translation'])
        // Only the real pair was cached (write is fire-and-forget — wait).
        await vi.waitFor(() => expect(dbRows.size).toBe(1))
        expect([...dbRows.values()][0].translated).toBe('Real translation')
    })
})

describe('double-wrapped {el,en} objects can never reach the prompt or the cache', () => {
    it('collectors coerce object-valued fields to their Greek string', () => {
        const doubleWrapped = { en: { en: 'evidence-en', el: 'στοιχείο' }, el: { en: 'evidence-en', el: 'στοιχείο' } }
        const clarity: any = {
            plainLanguageSummary: { en: 'x', el: 'σύνοψη' },
            savingsOpportunities: [],
            coverageGaps: [{ slug: 'g', evidence: doubleWrapped, recommendation: { en: 'y', el: 'πρόταση' } }],
            checklistScores: [],
            priorityActions: [],
        }
        const { texts, rebuild } = collectClarityTextsForTranslation(clarity)
        for (const text of texts) {
            expect(typeof text).toBe('string')
            expect(text).not.toContain('[object Object]')
        }
        expect(texts).toContain('στοιχείο')

        // The rebuilt object is CLEAN bilingual — the double-wrap does not survive.
        const rebuilt = rebuild(texts.map((t) => `EN:${t}`))
        expect(rebuilt.coverageGaps[0].evidence).toEqual({ en: 'EN:στοιχείο', el: 'στοιχείο' })
    })

    it('gap collectors do the same', () => {
        const gaps: any = [
            {
                slug: 'g1',
                explanation: { en: { el: 'εξήγηση' }, el: { el: 'εξήγηση' } },
                suggestion: { en: 'ok', el: 'σύσταση' },
            },
        ]
        const { texts } = collectGapTextsForTranslation(gaps)
        expect(texts).toEqual(['εξήγηση', 'σύσταση'])
    })

    it('empty coerced entries are not sent to the model at all', async () => {
        generateObjectMock.mockResolvedValue({
            object: { translations: ['Only real text'] },
            usage: {},
        })
        const out = await batchTranslateToEnglish(['', 'πραγματικό κείμενο'])
        expect(out).toEqual(['', 'Only real text'])
        const prompt: string = generateObjectMock.mock.calls[0][0].prompt
        expect(prompt).toContain('1 Greek insurance texts')
        expect(prompt).not.toContain('[object Object]')
    })
})
