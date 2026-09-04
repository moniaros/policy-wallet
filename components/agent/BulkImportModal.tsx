"use client"

import { useState } from "react"
import * as Sentry from "@sentry/nextjs"
import { toast } from "sonner"
import { X, FileSpreadsheet, CheckCircle2 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useDialog } from "@/hooks/useDialog"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { TableShell } from "@/components/ui/TableShell"
import { UploadDropzone } from "@/components/ui/UploadDropzone"
import { CUSTOMER_CSV_HEADER_EXAMPLES, parseCustomerCsv } from "@/lib/csv/parse-csv"

interface BulkImportModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (count: number) => void
}

interface CustomerRow {
    /** 1-based line in the file, the header counted — what the agent sees in Excel. */
    line: number
    name: string
    surname: string
    email: string
    phone: string
    taxId: string
    status: 'valid' | 'invalid' | 'duplicate'
    error?: string
}

/**
 * One line of the complete step. `RowOutcomeCode` is the route's per-row
 * vocabulary (app/api/v1/customers/bulk-import/route.ts); `VALIDATION_ERROR`
 * is the whole-request refusal, attributed to the rows its zod issues name.
 */
type RowOutcomeStatus = 'imported' | 'skipped' | 'failed'
type RowOutcomeCode =
    | 'CREATED'
    | 'LINKED'
    | 'ALREADY_LINKED'
    | 'RELATIONSHIP_ENDED'
    | 'DUPLICATE_IN_FILE'
    | 'WRITE_FAILED'
    | 'VALIDATION_ERROR'
    /** The request was refused as a whole; this row was never attempted. */
    | 'NOT_ATTEMPTED'
    | 'UNKNOWN'

interface RowOutcome {
    line: number
    name: string
    email: string
    status: RowOutcomeStatus
    code: RowOutcomeCode
}

/** What the route returns per row (its `row` is the 1-based position in the submitted array). */
interface ServerRowOutcome {
    row?: number
    email?: string
    status?: RowOutcomeStatus
    code?: string
}

// Upload the file, then review what it parsed to.
const TOTAL_STEPS = 2

const PILL = "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-caption font-semibold"

/**
 * Localised reason for a rejected import. The API returns a distinct code and
 * the numbers in `details`, so the message can be built in the reader's language
 * rather than shipped as English prose from the server.
 */
function useLimitMessage(t: any) {
    return (err: { code?: string; message?: string; details?: Record<string, unknown> } | null | undefined) => {
        const d = (err?.details ?? {}) as Record<string, unknown>
        const fill = (template: string) =>
            template.replace(/\{(\w+)\}/g, (_, key) => String(d[key] ?? ''))
        switch (err?.code) {
            case 'BULK_IMPORT_ROW_LIMIT':
                return fill(t.apiErrors.bulkImportRowLimit)
            case 'CUSTOMER_LIMIT_REACHED':
                return fill(t.apiErrors.customerLimitReached)
            case 'CUSTOMER_HEADROOM_EXCEEDED':
                return fill(t.apiErrors.customerHeadroomExceeded)
            case 'VALIDATION_ERROR':
                return t.apiErrors.bulkImportValidationError
            case 'FORBIDDEN':
                return t.apiErrors.forbidden
            case 'UNAUTHORIZED':
                return t.apiErrors.unauthorized
            default:
                return t.apiErrors.generic
        }
    }
}

/** Loose email shape — the server applies the real check; this stops obvious typos before the upload. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Map the route's per-row response onto the rows that were submitted, in
 * submission order. Tolerates the legacy shape (`imported` + `errors: string[]`
 * naming the failed emails) so an older deployment still yields a list.
 *
 * Exported for the render test; a pure function of the two inputs.
 */
export function reconcileOutcomes(
    submitted: Array<Pick<CustomerRow, 'line' | 'name' | 'surname' | 'email'>>,
    body: unknown
): RowOutcome[] {
    const data = (body && typeof body === 'object' && 'data' in (body as any) ? (body as any).data : body) as
        | { outcomes?: ServerRowOutcome[]; errors?: string[]; imported?: number }
        | null
        | undefined
    const outcomes = Array.isArray(data?.outcomes) ? data!.outcomes! : null
    const byEmail = new Map<string, ServerRowOutcome>()
    const byRow = new Map<number, ServerRowOutcome>()
    if (outcomes) {
        for (const o of outcomes) {
            if (typeof o.row === 'number') byRow.set(o.row, o)
            if (o.email) byEmail.set(o.email.trim().toLowerCase(), o)
        }
    }
    const legacyFailed = new Set(
        (Array.isArray(data?.errors) ? data!.errors! : [])
            .map((message) => /([^\s]+@[^\s]+)/.exec(String(message))?.[1]?.toLowerCase())
            .filter((email): email is string => Boolean(email))
    )

    return submitted.map((row, index) => {
        const name = `${row.name} ${row.surname}`.trim()
        const server = byRow.get(index + 1) ?? byEmail.get(row.email.trim().toLowerCase())
        if (server) {
            const status: RowOutcomeStatus =
                server.status === 'imported' || server.status === 'skipped' || server.status === 'failed'
                    ? server.status
                    : 'failed'
            const code = (server.code as RowOutcomeCode | undefined) ?? (status === 'imported' ? 'CREATED' : 'UNKNOWN')
            return { line: row.line, name, email: row.email, status, code }
        }
        if (outcomes) {
            // The route answered per row and said nothing about this one — do
            // not report it as imported.
            return { line: row.line, name, email: row.email, status: 'failed', code: 'UNKNOWN' }
        }
        // Legacy response: everything not named in `errors` was imported.
        return legacyFailed.has(row.email.trim().toLowerCase())
            ? { line: row.line, name, email: row.email, status: 'failed', code: 'WRITE_FAILED' }
            : { line: row.line, name, email: row.email, status: 'imported', code: 'CREATED' }
    })
}

/**
 * A whole-request VALIDATION_ERROR carries zod issues whose path names the
 * submitted index (`customers.<i>.email`). Attribute it to those rows, and
 * to every row when the issues name none.
 */
export function outcomesFromValidationError(
    submitted: Array<Pick<CustomerRow, 'line' | 'name' | 'surname' | 'email'>>,
    details: unknown
): RowOutcome[] {
    const issues = Array.isArray(details) ? (details as Array<{ path?: unknown[] }>) : []
    const flagged = new Set<number>()
    for (const issue of issues) {
        const path = Array.isArray(issue?.path) ? issue.path : []
        const index = path[0] === 'customers' ? Number(path[1]) : Number.NaN
        if (Number.isInteger(index)) flagged.add(index)
    }
    return submitted.map((row, index) => {
        const invalid = flagged.size === 0 || flagged.has(index)
        return {
            line: row.line,
            name: `${row.name} ${row.surname}`.trim(),
            email: row.email,
            status: invalid ? 'failed' : 'skipped',
            code: invalid ? 'VALIDATION_ERROR' : 'NOT_ATTEMPTED',
        }
    })
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
    const { t, language } = useLanguage()
    const dialogRef = useDialog<HTMLDivElement>(() => handleClose(), isOpen)
    const tt = t.agentModals.bulkImport
    const limitMessage = useLimitMessage(t)
    const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload')
    const [customers, setCustomers] = useState<CustomerRow[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [outcomes, setOutcomes] = useState<RowOutcome[]>([])

    if (!isOpen) return null

    const handleFileUpload = async (file: File) => {
        setIsProcessing(true)
        try {
            const text = await file.text()
            const parsed = parseCustomerCsv(text)

            if (parsed.error === 'no_email_column') {
                toast.error(tt.errNoEmailColumn)
                return
            }
            if (parsed.error === 'empty') {
                toast.error(tt.errEmptyFile)
                return
            }

            const seen = new Set<string>()
            const rows: CustomerRow[] = parsed.rows.map((row) => {
                let status: CustomerRow['status'] = 'valid'
                let error: string | undefined
                const key = row.email.toLowerCase()

                if (!row.name || !row.email) {
                    status = 'invalid'
                    error = tt.errMissingFields
                } else if (!EMAIL_SHAPE.test(row.email)) {
                    status = 'invalid'
                    error = tt.errInvalidEmail
                } else if (seen.has(key)) {
                    // The route would skip it as DUPLICATE_IN_FILE; saying so
                    // here saves the agent a round trip.
                    status = 'duplicate'
                    error = tt.errDuplicateInFile
                }
                if (status === 'valid') seen.add(key)

                return { ...row, status, error }
            })

            setCustomers(rows)
            setStep('preview')
        } catch (error) {
            Sentry.captureException(error, {
                tags: { component: 'BulkImportModal', action: 'file_upload' }
            })
            toast.error(tt.parseError)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleImport = async () => {
        setStep('importing')
        setIsProcessing(true)

        const validCustomers = customers.filter(c => c.status === 'valid')
        try {
            const response = await fetch('/api/v1/customers/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customers: validCustomers.map(({ name, surname, email, phone, taxId }) => ({
                        name, surname, email, phone: phone || undefined, taxId: taxId || undefined,
                    })),
                })
            })

            const body = await response.json().catch(() => null)

            if (!response.ok) {
                // The server knows exactly why — plan row limit, customer limit,
                // remaining headroom, with the numbers. Throwing a bare Error
                // discarded all of it and left the agent with "import failed" and
                // no idea that splitting the file or upgrading would fix it.
                toast.error(limitMessage(body?.error))
                if (body?.error?.code === 'VALIDATION_ERROR') {
                    // Per-row attribution from the zod issues, so the agent can
                    // see WHICH lines to fix rather than re-reading the file.
                    setOutcomes(outcomesFromValidationError(validCustomers, body.error.details))
                    setStep('complete')
                    return
                }
                setStep('preview')
                return
            }

            const reconciled = reconcileOutcomes(validCustomers, body)
            setOutcomes(reconciled)
            setStep('complete')
            // The list behind the dialog refreshes now; the dialog stays open
            // until the agent has read the per-row outcome.
            onSuccess(reconciled.filter((o) => o.status === 'imported').length)
        } catch (error) {
            Sentry.captureException(error, {
                tags: { component: 'BulkImportModal', action: 'import' }
            })
            toast.error(tt.importError)
            setStep('preview')
        } finally {
            setIsProcessing(false)
        }
    }

    const handleClose = () => {
        setStep('upload')
        setCustomers([])
        setOutcomes([])
        onClose()
    }

    const validCount = customers.filter(c => c.status === 'valid').length
    const invalidCount = customers.filter(c => c.status !== 'valid').length

    const importedCount = outcomes.filter((o) => o.status === 'imported').length
    const skippedCount = outcomes.filter((o) => o.status === 'skipped').length
    const failedCount = outcomes.filter((o) => o.status === 'failed').length

    // One dictionary line per outcome code; the code never reaches the DOM.
    const outcomeLabel = (o: RowOutcome): string => {
        switch (o.code) {
            case 'CREATED': return tt.rowImported
            case 'LINKED': return tt.rowLinked
            case 'ALREADY_LINKED': return tt.rowAlreadyLinked
            case 'RELATIONSHIP_ENDED': return tt.rowRelationshipEnded
            case 'DUPLICATE_IN_FILE': return tt.rowDuplicateInFile
            case 'WRITE_FAILED': return tt.rowWriteFailed
            case 'VALIDATION_ERROR': return tt.rowValidationError
            case 'NOT_ATTEMPTED': return tt.rowNotAttempted
            default:
                return o.status === 'imported' ? tt.rowImported : o.status === 'skipped' ? tt.rowAlreadyLinked : tt.rowFailed
        }
    }
    const outcomeTone = (status: RowOutcomeStatus) =>
        status === 'imported'
            ? "bg-status-success-tint text-status-success"
            : status === 'skipped'
                ? "bg-status-warning-tint text-status-warning"
                : "bg-status-danger-tint text-status-danger"

    const stepCaption = (current: number) =>
        t.common.stepOf.replace('{current}', String(current)).replace('{total}', String(TOTAL_STEPS))

    // The thin track under the card head — the onboarding's progress device,
    // one segment per step, described once as a progressbar. A render helper,
    // not a nested component, so the panel does not remount on every render.
    const stepTrack = (current: number) => (
        <div className="mt-3">
            <p className="text-caption font-semibold text-muted-foreground">{stepCaption(current)}</p>
            <div
                className="mt-1.5 flex gap-1"
                role="progressbar"
                aria-valuenow={current}
                aria-valuemin={1}
                aria-valuemax={TOTAL_STEPS}
                aria-label={stepCaption(current)}
            >
                {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                    <span key={i} className={`h-1 flex-1 rounded-full ${i < current ? "bg-primary" : "bg-muted"}`} />
                ))}
            </div>
        </div>
    )

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="bulk-import-title" tabIndex={-1} className="pw-card pw-pad relative max-h-[90vh] w-full max-w-4xl overflow-y-auto">
                {/* Header — persistent across the steps, so the dialog's name
                    resolves on every one of them. */}
                <header>
                    <CardHead
                        icon={FileSpreadsheet}
                        id="bulk-import-title"
                        title={tt.title}
                        meta={
                            <button
                                type="button"
                                onClick={handleClose}
                                aria-label={t.common.close}
                                className="pw-soft-button h-11 w-11 px-0"
                            >
                                <X className="h-4 w-4" aria-hidden="true" />
                            </button>
                        }
                    />
                    <p className="mt-2 text-sm text-muted-foreground">{tt.subtitle}</p>
                    {step === 'upload' && stepTrack(1)}
                    {step === 'preview' && stepTrack(2)}
                </header>

                {/* Content */}
                <div className="mt-5">
                    {step === 'upload' && (
                        <div className="space-y-4">
                            {/* Instructions — a sub-card, not a blue panel. The two
                                header rows are the machine format, not prose: the
                                Greek one is what a Greek-locale Excel writes. */}
                            <div className="pw-subcard p-4">
                                <h3 className="text-sm font-semibold text-foreground">{tt.csvFormatTitle}</h3>
                                <p className="mt-1 text-caption text-muted-foreground">
                                    {tt.csvFormatDesc}
                                </p>
                                <code className="mt-2 block rounded-lg bg-card px-3 py-2 font-mono text-caption text-foreground [overflow-wrap:anywhere]">
                                    {CUSTOMER_CSV_HEADER_EXAMPLES[language === 'el' ? 'el' : 'en']}
                                </code>
                                <p className="mt-2 text-caption text-muted-foreground">
                                    {tt.csvHeadersHint}
                                </p>
                                <p className="mt-1 text-caption text-muted-foreground [overflow-wrap:anywhere]">
                                    {tt.csvExample}
                                </p>
                            </div>

                            {/* File Upload — the shared dropzone, so «σύρετε και
                                αποθέστε» is true. Inert while a file is parsing,
                                which is what `disabled` on the old input did. */}
                            <div className={isProcessing ? "pointer-events-none opacity-60" : undefined} aria-busy={isProcessing || undefined}>
                                <UploadDropzone
                                    onFiles={(files) => { const file = files[0]; if (file) void handleFileUpload(file) }}
                                    accept=".csv,text/csv"
                                    multiple={false}
                                    inputId="csv-upload"
                                    title={isProcessing ? tt.processing : tt.clickToUpload}
                                    hint={tt.dragAndDrop}
                                />
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-4">
                            {/* Stats — three fact cells: the word above, the count
                                below, each rendered exactly once. */}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="pw-subcard p-3">
                                    <p className="text-caption text-muted-foreground">{tt.valid}</p>
                                    <p className="mt-0.5 text-title font-semibold tabular-nums text-foreground">{validCount}</p>
                                </div>
                                <div className="pw-subcard p-3">
                                    <p className="text-caption text-muted-foreground">{tt.invalid}</p>
                                    <p className={`mt-0.5 text-title font-semibold tabular-nums ${invalidCount > 0 ? "text-status-danger" : "text-foreground"}`}>{invalidCount}</p>
                                </div>
                                <div className="pw-subcard p-3">
                                    <p className="text-caption text-muted-foreground">{tt.total}</p>
                                    <p className="mt-0.5 text-title font-semibold tabular-nums text-foreground">{customers.length}</p>
                                </div>
                            </div>

                            {/* Preview Table — a sub-card that scrolls both ways:
                                overflow-x was missing entirely here, so a wide
                                preview was CLIPPED rather than scrollable. */}
                            <div className="pw-subcard max-h-96 overflow-y-auto">
                                <TableShell label={tt.title}>
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 border-b border-border bg-muted text-caption font-semibold text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 text-right tabular-nums">{tt.colRow}</th>
                                            <th className="px-4 py-3">{tt.colName}</th>
                                            <th className="px-4 py-3">{tt.colEmail}</th>
                                            <th className="px-4 py-3">{tt.colPhone}</th>
                                            <th className="px-4 py-3">{tt.colTaxId}</th>
                                            <th className="px-4 py-3">{tt.colStatus}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {customers.map((customer) => (
                                            <tr key={customer.line} data-testid="bulk-import-preview-row">
                                                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{customer.line}</td>
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {customer.name} {customer.surname}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground [overflow-wrap:anywhere]">{customer.email}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{customer.phone}</td>
                                                <td className="px-4 py-3 tabular-nums text-muted-foreground">{customer.taxId}</td>
                                                <td className="px-4 py-3">
                                                    {customer.status === 'valid' ? (
                                                        <span className={`${PILL} bg-status-success-tint text-status-success`}>
                                                            {tt.validBadge}
                                                        </span>
                                                    ) : customer.status === 'duplicate' ? (
                                                        <span className={`${PILL} bg-status-warning-tint text-status-warning`}>
                                                            {customer.error}
                                                        </span>
                                                    ) : (
                                                        <span className={`${PILL} bg-status-danger-tint text-status-danger`}>
                                                            {customer.error}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </TableShell>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => setStep('upload')}
                                    className="pw-soft-button flex-1"
                                >
                                    {tt.back}
                                </button>
                                <button
                                    type="button"
                                    data-testid="bulk-import-submit"
                                    onClick={handleImport}
                                    disabled={validCount === 0 || isProcessing}
                                    className="pw-primary-button flex-1"
                                >
                                    {tt.importBtn} {validCount} {validCount !== 1 ? tt.custBtnPlural : tt.custBtnSingular}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="py-10 text-center">
                            <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-primary/10 border-t-primary" />
                            <h3 className="text-title font-semibold text-foreground">{tt.importingTitle}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">{tt.importingDesc}</p>
                        </div>
                    )}

                    {step === 'complete' && (
                        <div className="space-y-4">
                            {/* The verdict is per row, not a single green tick: an
                                import that skipped half the file and failed two
                                rows used to say «Η Εισαγωγή Ολοκληρώθηκε!» and
                                close itself two seconds later. */}
                            <div className="flex items-start gap-3">
                                <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${failedCount > 0 ? "bg-status-warning-tint text-status-warning" : "bg-status-success-tint text-status-success"}`} aria-hidden="true">
                                    <CheckCircle2 className="h-6 w-6" />
                                </span>
                                <div className="min-w-0">
                                    <h3 className="text-title font-semibold text-foreground">{tt.completeTitle}</h3>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {tt.successfullyImported} {importedCount} {importedCount !== 1 ? tt.custPlural : tt.custSingular}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                <div className="pw-subcard p-3">
                                    <p className="text-caption text-muted-foreground">{tt.summaryImported}</p>
                                    <p className="mt-0.5 text-title font-semibold tabular-nums text-foreground">{importedCount}</p>
                                </div>
                                <div className="pw-subcard p-3">
                                    <p className="text-caption text-muted-foreground">{tt.summarySkipped}</p>
                                    <p className={`mt-0.5 text-title font-semibold tabular-nums ${skippedCount > 0 ? "text-status-warning" : "text-foreground"}`}>{skippedCount}</p>
                                </div>
                                <div className="pw-subcard p-3">
                                    <p className="text-caption text-muted-foreground">{tt.summaryFailed}</p>
                                    <p className={`mt-0.5 text-title font-semibold tabular-nums ${failedCount > 0 ? "text-status-danger" : "text-foreground"}`}>{failedCount}</p>
                                </div>
                            </div>

                            <div className="pw-subcard max-h-96 overflow-y-auto">
                                <TableShell label={tt.outcomesTitle}>
                                <table className="w-full text-left text-sm">
                                    <thead className="sticky top-0 border-b border-border bg-muted text-caption font-semibold text-muted-foreground">
                                        <tr>
                                            <th className="px-4 py-3 text-right tabular-nums">{tt.colRow}</th>
                                            <th className="px-4 py-3">{tt.colName}</th>
                                            <th className="px-4 py-3">{tt.colEmail}</th>
                                            <th className="px-4 py-3">{tt.colStatus}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {outcomes.map((o) => (
                                            <tr key={o.line} data-testid="bulk-import-outcome-row" data-status={o.status}>
                                                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{o.line}</td>
                                                <td className="px-4 py-3 font-medium text-foreground">{o.name}</td>
                                                <td className="px-4 py-3 text-muted-foreground [overflow-wrap:anywhere]">{o.email}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`${PILL} ${outcomeTone(o.status)}`}>{outcomeLabel(o)}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                </TableShell>
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                                <button type="button" onClick={handleClose} className="pw-primary-button">
                                    {tt.done}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
