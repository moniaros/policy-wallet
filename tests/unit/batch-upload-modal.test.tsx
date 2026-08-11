import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'
import { BatchUploadModal } from '@/components/wallet/BatchUploadModal'
import { el } from '@/lib/i18n/translations/el'

/**
 * The bulk upload, exercised the way it actually failed in production.
 *
 * Ten documents were uploaded, six became policies and four were reported with
 * one sentence — «Η αποθήκευση ασφαλιστηρίων απέτυχε» — for documents that had
 * been rejected by a rate limiter before anything was read, let alone saved.
 * Each test below pins one link in that chain.
 */

vi.mock('sonner', () => ({
    toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() },
}))

// tests/setup.ts mocks useRouter WITHOUT `refresh`, and this component calls it
// after a successful save. Without this the call throws into the catch and the
// save looks like it failed.
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), refresh: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
    usePathname: () => '/wallet',
}))

const copy = el.wallet.batchUpload

type Handler = (fileName: string) => { status: number; body: any; headers?: Record<string, string> }

let extractHandler: Handler
let batchCreateResponse: { status: number; body: any }
let extractCalls: string[] = []
let batchCreatePayloads: any[] = []
/** (policyId, original filename, declared kind) for each attached document. */
let documentUploads: Array<{ policyId: string; fileName: string; documentKind: string | null }> = []
let documentUploadStatus = 200

function pdf(name: string) {
    return new File(['%PDF-1.4 test'], name, { type: 'application/pdf' })
}

function renderModal(onSuccess = vi.fn()) {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <BatchUploadModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />
            </TranslationsProvider>
        </LanguageProvider>
    )
}

async function upload(files: File[]) {
    // The dropzone input only exists while the list is empty; afterwards it is
    // the hidden input behind "add more files".
    const input = (screen.queryByTestId('batch-upload-file-input') ??
        screen.getByTestId('batch-upload-more-input')) as HTMLInputElement
    Object.defineProperty(input, 'files', { value: files, configurable: true })
    fireEvent.change(input)
}

function rowFor(fileName: string): HTMLElement {
    const rows = screen.getAllByTestId('batch-upload-row')
    const found = rows.find((row) => within(row).queryByTitle(fileName))
    if (!found) throw new Error(`no row rendered for ${fileName}`)
    return found
}

/**
 * The save-all button exists only once at least one row is READY, and stays
 * disabled while any row is still extracting. Several tests used to wait for
 * the ROWS and click immediately — rows render in 'extracting' status, so on a
 * slow worker the click ran before the button existed and the test failed in
 * milliseconds (the flake that failed the 71b943f2 merge CI). Wait for the
 * button to be present AND enabled, then click a fresh query of it.
 */
async function clickSaveAll() {
    await waitFor(
        () => {
            const btn = screen.getByTestId('batch-upload-save-all') as HTMLButtonElement
            expect(btn.disabled).toBe(false)
        },
        { timeout: 5000 }
    )
    fireEvent.click(screen.getByTestId('batch-upload-save-all'))
}

beforeEach(() => {
    extractCalls = []
    batchCreatePayloads = []
    documentUploads = []
    documentUploadStatus = 200
    batchCreateResponse = {
        status: 200,
        body: { success: true, count: 1, failedCount: 0, policyIds: ['p1'], created: [{ index: 0, id: 'p1' }] },
    }
    extractHandler = () => ({ status: 200, body: { success: true, data: goodPolicy('X-1'), notices: [] } })

    vi.stubGlobal('fetch', vi.fn(async (url: string, init: any) => {
        if (String(url).includes('/api/policies/extract')) {
            const file = init.body.get('file') as File
            extractCalls.push(file.name)
            const { status, body, headers } = extractHandler(file.name)
            return new Response(JSON.stringify(body), {
                status,
                headers: { 'content-type': 'application/json', ...(headers || {}) },
            })
        }
        if (String(url).includes('/api/policies/batch-create')) {
            batchCreatePayloads.push(JSON.parse(init.body))
            return new Response(JSON.stringify(batchCreateResponse.body), {
                status: batchCreateResponse.status,
                headers: { 'content-type': 'application/json' },
            })
        }
        const attach = String(url).match(/\/api\/v1\/policies\/([^/]+)\/documents$/)
        if (attach) {
            const file = init.body.get('file') as File
            documentUploads.push({
                policyId: attach[1],
                fileName: file.name,
                documentKind: (init.body.get('documentKind') as string) ?? null,
            })
            return new Response(JSON.stringify({ data: { id: 'doc-1' } }), {
                status: documentUploadStatus,
                headers: { 'content-type': 'application/json' },
            })
        }
        return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
    }))
})

afterEach(() => {
    vi.unstubAllGlobals()
})

function goodPolicy(policyNumber: string) {
    return {
        insurerName: 'Η ΕΘΝΙΚΗ',
        policyNumber,
        lineOfBusiness: 'motor',
        startDate: '2026-01-01',
        endDate: '2027-01-01',
        premiumAmount: 420,
        coverageSummary: null,
    }
}

describe('a failed document says what happened, why, and what to do next', () => {
    it('names the real reason instead of claiming the save failed', async () => {
        extractHandler = (name) =>
            name === 'booklet.pdf'
                ? {
                      status: 422,
                      body: {
                          success: false,
                          code: 'NOT_AN_INSURANCE_POLICY',
                          stage: 'recognition',
                          retryable: false,
                          context: { documentKind: 'terms_and_conditions', correlationId: 'corr-1' },
                      },
                  }
                : { status: 200, body: { success: true, data: goodPolicy('A-1'), notices: [] } }

        renderModal()
        await upload([pdf('booklet.pdf'), pdf('motor.pdf')])

        await waitFor(() => expect(rowFor('booklet.pdf')).toHaveAttribute('data-status', 'failed'))

        const row = rowFor('booklet.pdf')
        expect(within(row).getByText(copy.failures.NOT_AN_INSURANCE_POLICY.title)).toBeTruthy()
        // The "why" names the kind it actually was.
        expect(within(row).getByText(/γενικοί όροι/)).toBeTruthy()
        // And the sentence that used to be shown is nowhere near it.
        expect(within(row).queryByText(copy.saveFailed)).toBeNull()
    })

    it('reveals the remedy and the stage only when asked', async () => {
        extractHandler = () => ({
            status: 422,
            body: { code: 'DOCUMENT_NOT_RECOGNIZED', context: { correlationId: 'corr-9' } },
        })

        renderModal()
        await upload([pdf('scan.pdf')])
        await waitFor(() => expect(rowFor('scan.pdf')).toHaveAttribute('data-status', 'failed'))

        const row = rowFor('scan.pdf')
        // Progressive disclosure: the card is not preloaded with detail.
        expect(within(row).queryByText(copy.failures.DOCUMENT_NOT_RECOGNIZED.action)).toBeNull()

        const toggle = within(row).getByTestId('batch-upload-why')
        expect(toggle).toHaveAttribute('aria-expanded', 'false')
        fireEvent.click(toggle)

        expect(within(row).getByText(copy.failures.DOCUMENT_NOT_RECOGNIZED.action)).toBeTruthy()
        expect(within(row).getByText(copy.stages.recognition)).toBeTruthy()
        // The correlation id is what lets support answer "why did THIS fail"
        // without the user reading a stack trace.
        expect(within(row).getByText(/corr-9/)).toBeTruthy()
        expect(toggle).toHaveAttribute('aria-expanded', 'true')
    })

    it('leaks no internals — no stack frames, no provider names, no SQL', async () => {
        extractHandler = () => ({
            status: 500,
            body: { code: 'AI_EXTRACTION_FAILED', context: { correlationId: 'corr-2' } },
        })
        renderModal()
        await upload([pdf('boom.pdf')])
        await waitFor(() => expect(rowFor('boom.pdf')).toHaveAttribute('data-status', 'failed'))

        fireEvent.click(within(rowFor('boom.pdf')).getByTestId('batch-upload-why'))
        const text = rowFor('boom.pdf').textContent || ''
        for (const forbidden of ['gemini', 'prisma', 'openai', 'anthropic', 'at Object.', 'SELECT ', 'Error:']) {
            expect(text.toLowerCase()).not.toContain(forbidden.toLowerCase())
        }
    })
})

describe('retry depends on the cause', () => {
    it('offers a retry for a transient failure and not for a permanent one', async () => {
        extractHandler = (name) =>
            name === 'timeout.pdf'
                ? { status: 504, body: { code: 'AI_TIMEOUT' } }
                : { status: 422, body: { code: 'DOCUMENT_NOT_RECOGNIZED' } }

        renderModal()
        await upload([pdf('timeout.pdf'), pdf('scan.pdf')])
        await waitFor(() => expect(rowFor('scan.pdf')).toHaveAttribute('data-status', 'failed'))

        expect(within(rowFor('timeout.pdf')).queryByTestId('batch-upload-retry')).toBeTruthy()
        // Re-running the model on the same bytes yields the same non-policy.
        expect(within(rowFor('scan.pdf')).queryByTestId('batch-upload-retry')).toBeNull()
    })

    it('retries only the failed document, never the ones that worked', async () => {
        let attempt = 0
        extractHandler = (name) => {
            if (name === 'flaky.pdf') {
                attempt += 1
                return attempt === 1
                    ? { status: 503, body: { code: 'AI_UNAVAILABLE' } }
                    : { status: 200, body: { success: true, data: goodPolicy('F-1'), notices: [] } }
            }
            return { status: 200, body: { success: true, data: goodPolicy('OK-1'), notices: [] } }
        }

        renderModal()
        await upload([pdf('flaky.pdf'), pdf('fine.pdf')])
        await waitFor(() => expect(rowFor('flaky.pdf')).toHaveAttribute('data-status', 'failed'))

        expect(extractCalls).toEqual(expect.arrayContaining(['flaky.pdf', 'fine.pdf']))
        extractCalls = []

        fireEvent.click(within(rowFor('flaky.pdf')).getByTestId('batch-upload-retry'))
        await waitFor(() => expect(rowFor('flaky.pdf')).toHaveAttribute('data-status', 'ready'))

        // The whole point: a successful document is never re-uploaded.
        expect(extractCalls).toEqual(['flaky.pdf'])
    })

    it('retries a throttle transparently, without ever showing it', async () => {
        let attempt = 0
        extractHandler = () => {
            attempt += 1
            return attempt <= 2
                ? {
                      status: 429,
                      body: { error: { code: 'TOO_MANY_REQUESTS' } },
                      headers: { 'retry-after': '1' },
                  }
                : { status: 200, body: { success: true, data: goodPolicy('T-1'), notices: [] } }
        }

        renderModal()
        await upload([pdf('throttled.pdf')])

        await waitFor(
            () => expect(rowFor('throttled.pdf')).toHaveAttribute('data-status', 'ready'),
            { timeout: 12_000 }
        )
        expect(attempt).toBe(3)
    }, 20_000)

    it('gives up on a throttle that will not clear, and says so honestly', async () => {
        // The daily spend cap is also a 429 and is NOT the same conversation.
        extractHandler = () => ({ status: 429, body: { error: 'RATE_LIMITED' } })

        renderModal()
        await upload([pdf('capped.pdf')])
        await waitFor(() => expect(rowFor('capped.pdf')).toHaveAttribute('data-status', 'failed'))

        const row = rowFor('capped.pdf')
        expect(row).toHaveAttribute('data-code', 'DAILY_LIMIT_REACHED')
        expect(within(row).getByText(copy.failures.DAILY_LIMIT_REACHED.title)).toBeTruthy()
        expect(within(row).queryByTestId('batch-upload-retry')).toBeNull()
    })
})

describe('a recognised policy missing one field is completed, not discarded', () => {
    it('offers the missing field inline and promotes the row once filled', async () => {
        extractHandler = () => ({
            status: 422,
            body: {
                code: 'REQUIRED_DATA_MISSING',
                context: { missingFields: ['policyNumber'] },
                partial: { ...goodPolicy(''), policyNumber: '' },
            },
        })

        renderModal()
        await upload([pdf('nonumber.pdf')])
        await waitFor(() => expect(rowFor('nonumber.pdf')).toHaveAttribute('data-status', 'failed'))

        const row = rowFor('nonumber.pdf')
        expect(within(row).getByText(copy.failures.REQUIRED_DATA_MISSING.title)).toBeTruthy()
        // The "why" names the field, rather than gesturing at "some data" —
        // once in the explanation, once as the label of the input that fixes it.
        expect(
            within(row).getByText(/δεν εντοπίσαμε: αριθμός ασφαλιστηρίου/)
        ).toBeTruthy()

        fireEvent.change(within(row).getByTestId('batch-upload-fix-policyNumber'), {
            target: { value: '91410928' },
        })

        await waitFor(() => expect(rowFor('nonumber.pdf')).toHaveAttribute('data-status', 'ready'))
        expect(screen.getByTestId('batch-upload-save-all')).toBeTruthy()
    })
})

describe('partial success is preserved', () => {
    it('saves the good documents and keeps the failed ones on screen', async () => {
        extractHandler = (name) =>
            name === 'bad.pdf'
                ? { status: 422, body: { code: 'DOCUMENT_NOT_RECOGNIZED' } }
                : { status: 200, body: { success: true, data: goodPolicy(name), notices: [] } }
        batchCreateResponse = {
            status: 200,
            body: { success: true, count: 2, failedCount: 0, policyIds: ['p1', 'p2'] },
        }

        const onSuccess = vi.fn()
        renderModal(onSuccess)
        await upload([pdf('a.pdf'), pdf('bad.pdf'), pdf('b.pdf')])
        await waitFor(() => expect(rowFor('bad.pdf')).toHaveAttribute('data-status', 'failed'))

        // The CTA counts what is ready, and the footer states both halves.
        const summary = screen.getByTestId('batch-upload-footer-summary')
        expect(summary.textContent).toContain('2')
        expect(summary.textContent).toContain('1')

        await clickSaveAll()
        await waitFor(() => expect(batchCreatePayloads).toHaveLength(1))

        // Only the ready rows are sent — the failed one is not smuggled in.
        expect(batchCreatePayloads[0].policies).toHaveLength(2)
        expect(batchCreatePayloads[0].policies.map((p: any) => p.policyNumber).sort()).toEqual(['a.pdf', 'b.pdf'])

        // The saved rows leave; the one still needing attention stays, so the
        // modal does not close over the user's remaining work.
        await waitFor(() => expect(screen.getAllByTestId('batch-upload-row')).toHaveLength(1))
        expect(rowFor('bad.pdf')).toBeTruthy()
        expect(onSuccess).toHaveBeenCalled()
    })

    it('shows a duplicate as a duplicate, on the row it belongs to', async () => {
        extractHandler = (name) => ({
            status: 200,
            body: { success: true, data: goodPolicy(name), notices: [] },
        })
        batchCreateResponse = {
            status: 200,
            body: {
                success: true,
                count: 1,
                failedCount: 1,
                policyIds: ['p1'],
                failedPolicies: [
                    { index: 1, policyNumber: 'dupe.pdf', code: 'DUPLICATE_POLICY', context: { existingPolicyId: 'p_old' } },
                ],
            },
        }

        renderModal()
        await upload([pdf('new.pdf'), pdf('dupe.pdf')])
        await waitFor(() => expect(screen.getAllByTestId('batch-upload-row')).toHaveLength(2))

        await clickSaveAll()

        await waitFor(() => expect(screen.getAllByTestId('batch-upload-row')).toHaveLength(1))
        const row = rowFor('dupe.pdf')
        expect(row).toHaveAttribute('data-code', 'DUPLICATE_POLICY')
        expect(within(row).getByText(copy.failures.DUPLICATE_POLICY.title)).toBeTruthy()
        // Nothing to retry: uploading it again would produce the same duplicate.
        expect(within(row).queryByTestId('batch-upload-retry')).toBeNull()
    })

    it('adding more files appends, and does not destroy what is already there', async () => {
        renderModal()
        await upload([pdf('first.pdf')])
        await waitFor(() => expect(rowFor('first.pdf')).toHaveAttribute('data-status', 'ready'))

        // `setPolicies(initialPolicies)` used to REPLACE state here, so this
        // click threw away every result on screen.
        await upload([pdf('second.pdf')])
        await waitFor(() => expect(screen.getAllByTestId('batch-upload-row')).toHaveLength(2))
        expect(rowFor('first.pdf')).toBeTruthy()
        expect(rowFor('second.pdf')).toBeTruthy()
    })
})

/**
 * Until this existed, a bulk-uploaded policy had NO source document at all: the
 * extract route read the bytes, sent them to the model and dropped them, and
 * batch-create wrote a Policy row and nothing else. Seven policies in production
 * carry no document because of it — every one created through this modal.
 */
describe('every saved policy keeps its source document', () => {
    it('attaches each file to the policy that file became', async () => {
        extractHandler = (name) => ({
            status: 200,
            body: {
                success: true,
                notices: [],
                data: { ...goodPolicy(name), documentKind: 'policy_schedule' },
            },
        })
        batchCreateResponse = {
            status: 200,
            body: {
                success: true, count: 2, failedCount: 0, policyIds: ['pa', 'pb'],
                created: [{ index: 0, id: 'pa' }, { index: 1, id: 'pb' }],
            },
        }

        renderModal()
        await upload([pdf('one.pdf'), pdf('two.pdf')])
        await waitFor(() => expect(screen.getAllByTestId('batch-upload-row')).toHaveLength(2))

        await clickSaveAll()
        await waitFor(() => expect(documentUploads).toHaveLength(2), { timeout: 5000 })

        // Each document goes to ITS policy — the index mapping is what makes
        // that true once any row in the batch has been rejected.
        const sent = [...documentUploads].sort((a, b) => a.fileName.localeCompare(b.fileName))
        expect(sent[0]).toMatchObject({ policyId: 'pa', fileName: 'one.pdf' })
        expect(sent[1]).toMatchObject({ policyId: 'pb', fileName: 'two.pdf' })
        // The classifier's verdict travels with the file, so the record gets a
        // real document type instead of a guess from the extension.
        expect(sent[0].documentKind).toBe('policy_schedule')
    })

    it('pairs documents correctly when an earlier row was rejected', async () => {
        extractHandler = (name) => ({ status: 200, body: { success: true, data: goodPolicy(name), notices: [] } })
        batchCreateResponse = {
            status: 200,
            body: {
                success: true, count: 1, failedCount: 1, policyIds: ['pz'],
                created: [{ index: 1, id: 'pz' }],
                failedPolicies: [{ index: 0, policyNumber: 'dupe.pdf', code: 'DUPLICATE_POLICY' }],
            },
        }

        renderModal()
        await upload([pdf('dupe.pdf'), pdf('keep.pdf')])
        await waitFor(() => expect(screen.getAllByTestId('batch-upload-row')).toHaveLength(2))

        await clickSaveAll()
        await waitFor(() => expect(documentUploads).toHaveLength(1), { timeout: 5000 })

        // The surviving row is index 1 — attaching by position in the SENT array
        // rather than by policyIds order is what keeps this honest.
        expect(documentUploads[0]).toMatchObject({ policyId: 'pz', fileName: 'keep.pdf' })
    })

    it('keeps the policy when only the document fails, and says exactly that', async () => {
        documentUploadStatus = 500

        renderModal()
        await upload([pdf('solo.pdf')])
        await waitFor(() => expect(rowFor('solo.pdf')).toHaveAttribute('data-status', 'ready'))

        await clickSaveAll()
        await waitFor(() => expect(rowFor('solo.pdf')).toHaveAttribute('data-status', 'failed'), { timeout: 5000 })

        const row = rowFor('solo.pdf')
        expect(row).toHaveAttribute('data-code', 'DOCUMENT_UPLOAD_FAILED')
        // NOT "saving failed" — the policy is in the wallet.
        expect(within(row).getByText(copy.failures.DOCUMENT_UPLOAD_FAILED.title)).toBeTruthy()
        expect(within(row).queryByText(copy.saveFailed)).toBeNull()
    })

    it('retries only the file, never the policy, once the policy exists', async () => {
        documentUploadStatus = 500

        renderModal()
        await upload([pdf('solo.pdf')])
        await waitFor(() => expect(rowFor('solo.pdf')).toHaveAttribute('data-status', 'ready'))
        await clickSaveAll()
        await waitFor(() => expect(rowFor('solo.pdf')).toHaveAttribute('data-code', 'DOCUMENT_UPLOAD_FAILED'), { timeout: 5000 })

        batchCreatePayloads = []
        extractCalls = []
        documentUploadStatus = 200

        fireEvent.click(within(rowFor('solo.pdf')).getByTestId('batch-upload-retry'))
        await waitFor(() => expect(screen.queryAllByTestId('batch-upload-row')).toHaveLength(0), { timeout: 5000 })

        // The decisive assertions: no second policy, and no second AI call.
        expect(batchCreatePayloads).toHaveLength(0)
        expect(extractCalls).toHaveLength(0)
        expect(documentUploads).toHaveLength(2)
        expect(documentUploads[1]).toMatchObject({ policyId: 'p1', fileName: 'solo.pdf' })
    })
})

describe('a valid policy on an unmodelled line is ingested, not failed', () => {
    it('flags a new line of business rather than reporting an error', async () => {
        extractHandler = () => ({
            status: 200,
            body: {
                success: true,
                notices: ['NEW_LINE_OF_BUSINESS'],
                data: { ...goodPolicy('N-1'), lineOfBusiness: 'other', declaredLineOfBusiness: 'Parametric Weather' },
            },
        })

        renderModal()
        await upload([pdf('novel.pdf')])
        await waitFor(() => expect(rowFor('novel.pdf')).toHaveAttribute('data-status', 'ready'))

        const row = rowFor('novel.pdf')
        expect(within(row).getByText(/Parametric Weather/)).toBeTruthy()
        expect(within(row).getByText(copy.newLineOfBusinessHint)).toBeTruthy()
        // It is a SUCCESS: it can be saved.
        expect(screen.getByTestId('batch-upload-save-all')).toBeTruthy()
    })
})

describe('the network dropping mid-batch is reported as such', () => {
    it('calls a failed fetch a connection problem', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))

        renderModal()
        await upload([pdf('offline.pdf')])
        await waitFor(() => expect(rowFor('offline.pdf')).toHaveAttribute('data-status', 'failed'))

        const row = rowFor('offline.pdf')
        expect(row).toHaveAttribute('data-code', 'NETWORK_ERROR')
        expect(within(row).getByTestId('batch-upload-retry')).toBeTruthy()
    })
})

describe('accessibility of the failure states', () => {
    it('announces the batch outcome without requiring sight of it', async () => {
        extractHandler = (name) =>
            name === 'bad.pdf'
                ? { status: 422, body: { code: 'DOCUMENT_NOT_RECOGNIZED' } }
                : { status: 200, body: { success: true, data: goodPolicy('A'), notices: [] } }

        renderModal()
        await upload([pdf('good.pdf'), pdf('bad.pdf')])
        await waitFor(() => expect(rowFor('bad.pdf')).toHaveAttribute('data-status', 'failed'))

        const summary = screen.getByTestId('batch-upload-summary')
        expect(summary).toHaveAttribute('role', 'status')
        expect(summary).toHaveAttribute('aria-live', 'polite')
        expect(summary.textContent).toContain(copy.completed)
        expect(summary.textContent).toContain(copy.needsReview)
    })

    it('does not rely on colour alone to identify an error', async () => {
        extractHandler = () => ({ status: 422, body: { code: 'DOCUMENT_NOT_RECOGNIZED' } })
        renderModal()
        await upload([pdf('scan.pdf')])
        await waitFor(() => expect(rowFor('scan.pdf')).toHaveAttribute('data-status', 'failed'))

        // WCAG 1.4.1: the problem is stated in words, and labelled as one for
        // anyone who cannot see the red.
        const row = rowFor('scan.pdf')
        expect(within(row).getByText(`${copy.problemLabel}:`, { exact: false })).toBeTruthy()
        expect(within(row).getByText(copy.failures.DOCUMENT_NOT_RECOGNIZED.title)).toBeTruthy()
    })

    it('keeps a long filename readable and its remove button reachable', async () => {
        const long = 'ΑΣΦΑΛΙΣΤΗΡΙΟ-ΣΥΜΒΟΛΑΙΟ-ΠΟΛΥ-ΜΕΓΑΛΟ-ΟΝΟΜΑ-ΑΡΧΕΙΟΥ-2026-ΤΕΛΙΚΟ.pdf'
        renderModal()
        await upload([pdf(long)])
        await waitFor(() => expect(rowFor(long)).toHaveAttribute('data-status', 'ready'))

        // Truncated visually but recoverable via the title attribute...
        expect(within(rowFor(long)).getByTitle(long)).toBeTruthy()
        // ...and the control still carries the filename in its accessible name.
        expect(within(rowFor(long)).getByLabelText(new RegExp(long.slice(0, 20)))).toBeTruthy()
    })
})
