"use client"

import { useState } from "react"
import * as Sentry from "@sentry/nextjs"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { useDialog } from "@/hooks/useDialog"
import { TableShell } from "@/components/ui/TableShell"

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

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
    const { t } = useLanguage()
    const dialogRef = useDialog<HTMLDivElement>(() => handleClose(), isOpen)
    const tt = t.agentModals.bulkImport
    const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload')
    const [customers, setCustomers] = useState<CustomerRow[]>([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [importedCount, setImportedCount] = useState(0)

    if (!isOpen) return null

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

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

            if (!response.ok) throw new Error('Import failed')

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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="bulk-import-title" tabIndex={-1} className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-neutral-200 dark:border-neutral-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 id="bulk-import-title" className="text-2xl font-bold text-foreground">
                                {tt.title}
                            </h2>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                {tt.subtitle}
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            aria-label={t.common.close}
                            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 'upload' && (
                        <div className="space-y-6">
                            {/* Instructions */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                                <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">{tt.csvFormatTitle}</h3>
                                <p className="text-sm text-blue-800 dark:text-blue-400 mb-2">
                                    {tt.csvFormatDesc}
                                </p>
                                <code className="block bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300 p-3 rounded text-xs font-mono">
                                    name,surname,email,phone
                                </code>
                                <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                                    {tt.csvExample}
                                </p>
                            </div>

                            {/* File Upload */}
                            <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl p-8 text-center">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                    id="csv-upload"
                                    disabled={isProcessing}
                                />
                                <label
                                    htmlFor="csv-upload"
                                    className="cursor-pointer inline-flex flex-col items-center"
                                >
                                    <svg className="w-16 h-16 text-neutral-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-lg font-bold text-neutral-700 dark:text-neutral-300">
                                        {isProcessing ? tt.processing : tt.clickToUpload}
                                    </span>
                                    <span className="text-sm text-muted-foreground mt-1">
                                        {tt.dragAndDrop}
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div className="bg-primary-tint dark:bg-primary/15 border border-primary/20 dark:border-primary/30 rounded-xl p-4">
                                    <div className="text-3xl font-bold text-[#166534] dark:text-mint">{validCount}</div>
                                    <div className="text-sm font-medium text-primary dark:text-mint">{tt.valid}</div>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                                    <div className="text-3xl font-bold text-red-700 dark:text-red-400">{invalidCount}</div>
                                    <div className="text-sm font-medium text-red-600 dark:text-red-500">{tt.invalid}</div>
                                </div>
                                <div className="bg-neutral-50 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-xl p-4">
                                    <div className="text-3xl font-bold text-neutral-700 dark:text-neutral-300">{customers.length}</div>
                                    <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{tt.total}</div>
                                </div>
                            </div>

                            {/* Preview Table */}
                            {/* overflow-x was missing entirely here, so a wide preview was CLIPPED
                                    rather than scrollable. */}
                            <div className="border border-neutral-200 dark:border-neutral-700 rounded-xl max-h-96 overflow-y-auto">
                                <TableShell label={tt.title}>
                                <table className="w-full text-sm">
                                    <thead className="bg-neutral-50 dark:bg-neutral-900/50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-bold text-neutral-600 dark:text-neutral-400">{tt.colName}</th>
                                            <th className="px-4 py-3 text-left font-bold text-neutral-600 dark:text-neutral-400">{tt.colEmail}</th>
                                            <th className="px-4 py-3 text-left font-bold text-neutral-600 dark:text-neutral-400">{tt.colPhone}</th>
                                            <th className="px-4 py-3 text-left font-bold text-neutral-600 dark:text-neutral-400">{tt.colStatus}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                        {customers.map((customer, index) => (
                                            <tr key={index} className={customer.status === 'invalid' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                                <td className="px-4 py-3 text-foreground">
                                                    {customer.name} {customer.surname}
                                                </td>
                                                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{customer.email}</td>
                                                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{customer.phone}</td>
                                                <td className="px-4 py-3">
                                                    {customer.status === 'valid' ? (
                                                        <span className="px-2 py-1 bg-primary-soft dark:bg-primary/15 text-[#166534] dark:text-mint rounded-full text-xs font-bold">
                                                            {tt.validBadge}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-bold">
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
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setStep('upload')}
                                    className="flex-1 px-6 py-3 rounded-xl font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                                >
                                    {tt.back}
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={validCount === 0 || isProcessing}
                                    className="flex-1 px-6 py-3 rounded-xl font-bold text-white dark:text-[#1A2420] bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/25"
                                >
                                    {tt.importBtn} {validCount} {validCount !== 1 ? tt.custBtnPlural : tt.custBtnSingular}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="py-12 text-center">
                            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mb-4"></div>
                            <h3 className="text-xl font-bold text-foreground">{tt.importingTitle}</h3>
                            <p className="text-neutral-600 dark:text-neutral-400 mt-2">{tt.importingDesc}</p>
                        </div>
                    )}

                    {step === 'complete' && (
                        <div className="py-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-soft dark:bg-primary/15 rounded-full mb-4">
                                <svg className="w-8 h-8 text-primary dark:text-mint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-foreground">{tt.completeTitle}</h3>
                            <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                                {tt.successfullyImported} {importedCount} {importedCount !== 1 ? tt.custPlural : tt.custSingular}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
