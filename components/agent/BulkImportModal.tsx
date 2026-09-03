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

interface BulkImportModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (count: number) => void
}

interface CustomerRow {
    name: string
    surname: string
    email: string
    phone: string
    status: 'valid' | 'invalid' | 'duplicate'
    error?: string
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
            case 'FORBIDDEN':
                return t.apiErrors.forbidden
            case 'UNAUTHORIZED':
                return t.apiErrors.unauthorized
            default:
                return t.apiErrors.generic
        }
    }
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
    const { t } = useLanguage()
    const dialogRef = useDialog<HTMLDivElement>(() => handleClose(), isOpen)
    const tt = t.agentModals.bulkImport
    const limitMessage = useLimitMessage(t)
    const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload')
    const [customers, setCustomers] = useState<CustomerRow[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [importedCount, setImportedCount] = useState(0)

    if (!isOpen) return null

    const handleFileUpload = async (file: File) => {
        setIsProcessing(true)
        try {
            const text = await file.text()
            const lines = text.split('\n').filter(line => line.trim())

            // Skip header row
            const dataLines = lines.slice(1)

            const parsed: CustomerRow[] = dataLines.map((line, index) => {
                const [name, surname, email, phone] = line.split(',').map(s => s.trim())

                // Basic validation
                let status: 'valid' | 'invalid' | 'duplicate' = 'valid'
                let error: string | undefined

                if (!name || !email) {
                    status = 'invalid'
                    error = tt.errMissingFields
                } else if (!email.includes('@')) {
                    status = 'invalid'
                    error = tt.errInvalidEmail
                }

                return { name, surname, email, phone, status, error }
            })

            setCustomers(parsed)
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

        try {
            const validCustomers = customers.filter(c => c.status === 'valid')

            const response = await fetch('/api/v1/customers/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customers: validCustomers })
            })

            if (!response.ok) {
                // The server knows exactly why — plan row limit, customer limit,
                // remaining headroom, with the numbers. Throwing a bare Error
                // discarded all of it and left the agent with "import failed" and
                // no idea that splitting the file or upgrading would fix it.
                const body = await response.json().catch(() => null)
                toast.error(limitMessage(body?.error))
                setStep('preview')
                return
            }

            const result = await response.json()
            setImportedCount(result.imported || validCustomers.length)
            setStep('complete')

            setTimeout(() => {
                onSuccess(result.imported || validCustomers.length)
                handleClose()
            }, 2000)
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
        setImportedCount(0)
        onClose()
    }

    const validCount = customers.filter(c => c.status === 'valid').length
    const invalidCount = customers.filter(c => c.status === 'invalid').length

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
                            {/* Instructions — a sub-card, not a blue panel. */}
                            <div className="pw-subcard p-4">
                                <h3 className="text-sm font-semibold text-foreground">{tt.csvFormatTitle}</h3>
                                <p className="mt-1 text-caption text-muted-foreground">
                                    {tt.csvFormatDesc}
                                </p>
                                <code className="mt-2 block rounded-lg bg-card px-3 py-2 font-mono text-caption text-foreground">
                                    name,surname,email,phone
                                </code>
                                <p className="mt-2 text-caption text-muted-foreground">
                                    {tt.csvExample}
                                </p>
                            </div>

                            {/* File Upload — the shared dropzone, so «σύρετε και
                                αποθέστε» is true. Inert while a file is parsing,
                                which is what `disabled` on the old input did. */}
                            <div className={isProcessing ? "pointer-events-none opacity-60" : undefined} aria-busy={isProcessing || undefined}>
                                <UploadDropzone
                                    onFiles={(files) => { const file = files[0]; if (file) void handleFileUpload(file) }}
                                    accept=".csv"
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
                                            <th className="px-4 py-3">{tt.colName}</th>
                                            <th className="px-4 py-3">{tt.colEmail}</th>
                                            <th className="px-4 py-3">{tt.colPhone}</th>
                                            <th className="px-4 py-3">{tt.colStatus}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {customers.map((customer, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {customer.name} {customer.surname}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">{customer.email}</td>
                                                <td className="px-4 py-3 text-muted-foreground">{customer.phone}</td>
                                                <td className="px-4 py-3">
                                                    {customer.status === 'valid' ? (
                                                        <span className={`${PILL} bg-status-success-tint text-status-success`}>
                                                            {tt.validBadge}
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
                        <div className="py-10 text-center">
                            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-status-success-tint text-status-success" aria-hidden="true">
                                <CheckCircle2 className="h-7 w-7" />
                            </span>
                            <h3 className="mt-4 text-title font-semibold text-foreground">{tt.completeTitle}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {tt.successfullyImported} {importedCount} {importedCount !== 1 ? tt.custPlural : tt.custSingular}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
