import { readFileSync } from 'fs'
import { join } from 'path'

import { describe, expect, it } from 'vitest'

import {
    BATCH_UPLOAD_CONCURRENCY,
    BATCH_UPLOAD_MAX_FILES,
    POLICY_EXTRACT_PER_MINUTE_LIMIT,
    POLICY_EXTRACT_RATE_WINDOW_MS,
} from '@/lib/constants/time'

/**
 * The bug this file exists to prevent, stated as an invariant.
 *
 * The bulk-upload modal accepted ten documents and fired all ten at once. The
 * extract route allowed SIX per minute per user. Four of every ten were
 * therefore rejected with a 429 before a single PDF was opened — and, because
 * the client discarded the response body, reported to the user as
 * «Η αποθήκευση ασφαλιστηρίων απέτυχε»: a SAVE failure, for documents that were
 * never read, let alone saved.
 *
 * It was not intermittent. Production activity logs — the route writes one row
 * per request that clears the gate — show exactly six extractions for each of
 * four separate batch attempts:
 *
 *   2026-08-10 08:46:52.8 → 08:46:53.4   6 rows
 *   2026-08-10 08:48:02.6 → 08:48:04.1   6 rows
 *   2026-08-10 14:49:27.2 → 14:49:27.4   6 rows  → "Batch created 6 policies"
 *   2026-08-11 09:12:28.9 → 09:12:29.6   6 rows
 *
 * Nothing connected the advertised batch size to the allowance, so nothing
 * noticed. Now one derives from the other, and this fails if they part company.
 */
describe('bulk upload capacity fits the rate limit it runs against', () => {
    it('permits at least one full batch inside a single window', () => {
        expect(POLICY_EXTRACT_PER_MINUTE_LIMIT).toBeGreaterThanOrEqual(BATCH_UPLOAD_MAX_FILES)
    })

    it('leaves headroom to retry part of a batch within the same minute', () => {
        // Exactly-equal would mean one retry costs a document from the next
        // batch. The point of the headroom is that a retry is not rationed.
        expect(POLICY_EXTRACT_PER_MINUTE_LIMIT).toBeGreaterThan(BATCH_UPLOAD_MAX_FILES)
    })

    it('keeps client concurrency below the batch size, so the queue drains visibly', () => {
        expect(BATCH_UPLOAD_CONCURRENCY).toBeGreaterThan(0)
        expect(BATCH_UPLOAD_CONCURRENCY).toBeLessThan(BATCH_UPLOAD_MAX_FILES)
    })

    it('is the limit the extract route actually declares', () => {
        // The constant is worthless if the route hard-codes a number beside it.
        // This is the assertion that would have failed in the shipped code.
        const route = readFileSync(
            join(__dirname, '..', '..', 'app/api/policies/extract/route.ts'),
            'utf8'
        )
        expect(route).toContain('limit: POLICY_EXTRACT_PER_MINUTE_LIMIT')
        expect(route).toContain('windowMs: POLICY_EXTRACT_RATE_WINDOW_MS')
        expect(route).not.toMatch(/limit:\s*\d+/)
    })

    it('advertises the same maximum the batch-create route enforces', () => {
        const route = readFileSync(
            join(__dirname, '..', '..', 'app/api/policies/batch-create/route.ts'),
            'utf8'
        )
        expect(route).toContain('max(BATCH_UPLOAD_MAX_FILES)')
    })

    it('states the window in whole minutes, as the copy implies', () => {
        expect(POLICY_EXTRACT_RATE_WINDOW_MS % 60_000).toBe(0)
    })
})
