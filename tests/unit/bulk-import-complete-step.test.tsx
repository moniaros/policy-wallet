import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { TranslationsProvider } from '@/contexts/TranslationsProvider'
import { BulkImportModal, reconcileOutcomes, outcomesFromValidationError } from '@/components/agent/BulkImportModal'
import { el } from '@/lib/i18n/translations/el'

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() } }))
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }))

/**
 * S4 (client half). The complete step said «Η Εισαγωγή Ολοκληρώθηκε!» and
 * closed itself two seconds later, whatever the route had answered:
 * `result.errors` was never rendered, and `result.imported` was read off the
 * wrong level of the envelope (createApiResponse wraps in `data`), so the
 * count fell back to "every valid row". The step now lists ONE outcome per
 * submitted row from the route's `outcomes` — imported / skipped / failed
 * with the reason — and stays open until the agent has read it.
 */

const tt = el.agentModals.bulkImport

const CSV = 'Όνομα;Επώνυμο;Email;Τηλέφωνο\nΜαρία;Παπαδοπούλου;maria@example.gr;69\nΝίκος;Δήμου;nikos@example.gr;69\nΕλένη;Κωστή;eleni@example.gr;69\n'

function csvFile(text: string) {
    const file = new File([text], 'customers.csv', { type: 'text/csv' })
    // jsdom's File does not implement Blob.text() on every version; the modal
    // reads through it, so pin the contract here rather than depend on that.
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(text) })
    return file
}

function renderModal(onSuccess = vi.fn()) {
    return render(
        <LanguageProvider>
            <TranslationsProvider>
                <BulkImportModal isOpen onClose={vi.fn()} onSuccess={onSuccess} />
            </TranslationsProvider>
        </LanguageProvider>
    )
}

async function uploadAndSubmit(text = CSV) {
    const input = document.getElementById('csv-upload') as HTMLInputElement
    Object.defineProperty(input, 'files', { value: [csvFile(text)], configurable: true })
    fireEvent.change(input)
    const submit = await screen.findByTestId('bulk-import-submit')
    fireEvent.click(submit)
}

function respond(status: number, body: unknown) {
    return vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    })
}

describe('BulkImportModal — the complete step reports every row', () => {
    const originalFetch = globalThis.fetch

    beforeEach(() => { vi.clearAllMocks() })
    afterEach(() => { globalThis.fetch = originalFetch })

    it('lists the two rows the route failed, each with its reason, and keeps the dialog open', async () => {
        globalThis.fetch = respond(200, {
            data: {
                imported: 1, skipped: 0, failed: 2, total: 3,
                outcomes: [
                    { row: 1, email: 'maria@example.gr', status: 'imported', code: 'CREATED' },
                    { row: 2, email: 'nikos@example.gr', status: 'failed', code: 'WRITE_FAILED' },
                    { row: 3, email: 'eleni@example.gr', status: 'failed', code: 'WRITE_FAILED' },
                ],
            },
            meta: { request_id: 'r', language: 'el' },
            error: null,
        }) as any
        const onSuccess = vi.fn()
        renderModal(onSuccess)
        await uploadAndSubmit()

        const rows = await screen.findAllByTestId('bulk-import-outcome-row')
        expect(rows).toHaveLength(3)
        const failed = rows.filter((r) => r.getAttribute('data-status') === 'failed')
        expect(failed).toHaveLength(2)
        for (const row of failed) {
            expect(row.textContent).toContain(tt.rowWriteFailed)
        }
        expect(failed.map((r) => r.textContent)).toEqual([
            expect.stringContaining('nikos@example.gr'),
            expect.stringContaining('eleni@example.gr'),
        ])
        // The imported one is labelled as such, and the count is the ROUTE's
        // count, not "every valid row".
        expect(rows[0].textContent).toContain(tt.rowImported)
        expect(onSuccess).toHaveBeenCalledWith(1)
        // No auto-close: the agent reads the list and dismisses it.
        expect(screen.getByText(tt.done)).toBeTruthy()
        expect(screen.getByRole('dialog')).toBeTruthy()
    })

    it('a skipped duplicate is a warning, not a failure, and says why', async () => {
        globalThis.fetch = respond(200, {
            data: {
                imported: 2, skipped: 1, failed: 0, total: 3,
                outcomes: [
                    { row: 1, email: 'maria@example.gr', status: 'imported', code: 'CREATED' },
                    { row: 2, email: 'nikos@example.gr', status: 'skipped', code: 'ALREADY_LINKED' },
                    { row: 3, email: 'eleni@example.gr', status: 'imported', code: 'LINKED' },
                ],
            },
        }) as any
        renderModal()
        await uploadAndSubmit()
        const rows = await screen.findAllByTestId('bulk-import-outcome-row')
        expect(rows[1].getAttribute('data-status')).toBe('skipped')
        expect(rows[1].textContent).toContain(tt.rowAlreadyLinked)
        expect(rows[2].textContent).toContain(tt.rowLinked)
    })

    it('a whole-request VALIDATION_ERROR is attributed to the rows its issues name', async () => {
        globalThis.fetch = respond(400, {
            data: null,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid data',
                details: [{ path: ['customers', 1, 'email'], code: 'invalid_string', message: 'Invalid email' }],
            },
        }) as any
        renderModal()
        await uploadAndSubmit()
        const rows = await screen.findAllByTestId('bulk-import-outcome-row')
        expect(rows).toHaveLength(3)
        expect(rows[1].getAttribute('data-status')).toBe('failed')
        expect(rows[1].textContent).toContain(tt.rowValidationError)
        expect(rows[0].getAttribute('data-status')).toBe('skipped')
        expect(rows[0].textContent).toContain(tt.rowNotAttempted)
    })

    it('a semicolon Greek export reaches the preview with every row valid', async () => {
        globalThis.fetch = respond(200, { data: { imported: 3, outcomes: [] } }) as any
        renderModal()
        const input = document.getElementById('csv-upload') as HTMLInputElement
        Object.defineProperty(input, 'files', { value: [csvFile(CSV)], configurable: true })
        fireEvent.change(input)
        const preview = await screen.findAllByTestId('bulk-import-preview-row')
        expect(preview).toHaveLength(3)
        await waitFor(() => expect(screen.getByTestId('bulk-import-submit')).not.toBeDisabled())
        for (const row of preview) expect(row.textContent).toContain(tt.validBadge)
    })
})

describe('reconcileOutcomes — pure mapping of the route response onto the submitted rows', () => {
    const submitted = [
        { line: 2, name: 'Μαρία', surname: 'Π', email: 'maria@example.gr' },
        { line: 3, name: 'Νίκος', surname: 'Δ', email: 'nikos@example.gr' },
    ]

    it('reads the new per-row shape through the response envelope', () => {
        const out = reconcileOutcomes(submitted, {
            data: { outcomes: [
                { row: 1, email: 'maria@example.gr', status: 'imported', code: 'CREATED' },
                { row: 2, email: 'nikos@example.gr', status: 'failed', code: 'WRITE_FAILED' },
            ] },
        })
        expect(out.map((o) => [o.line, o.status, o.code])).toEqual([[2, 'imported', 'CREATED'], [3, 'failed', 'WRITE_FAILED']])
    })

    it('tolerates the legacy shape: everything not named in `errors` was imported', () => {
        const out = reconcileOutcomes(submitted, { data: { imported: 1, errors: ['Failed to import nikos@example.gr'] } })
        expect(out.map((o) => o.status)).toEqual(['imported', 'failed'])
    })

    it('never reports a row the route did not mention as imported', () => {
        const out = reconcileOutcomes(submitted, { data: { outcomes: [{ row: 1, email: 'maria@example.gr', status: 'imported', code: 'CREATED' }] } })
        expect(out[1].status).toBe('failed')
        expect(out[1].code).toBe('UNKNOWN')
    })

    it('flags every row when a validation refusal names none', () => {
        const out = outcomesFromValidationError(submitted, [])
        expect(out.every((o) => o.status === 'failed' && o.code === 'VALIDATION_ERROR')).toBe(true)
    })
})
