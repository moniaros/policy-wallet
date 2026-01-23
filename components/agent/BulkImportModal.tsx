"use client"

import { useState } from "react"
import * as Sentry from "@sentry/nextjs"

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
                    error = 'Missing required fields'
                } else if (!email.includes('@')) {
                    status = 'invalid'
                    error = 'Invalid email format'
                }

                return { name, surname, email, phone, status, error }
            })

            setCustomers(parsed)
            setStep('preview')
        } catch (error) {
            Sentry.captureException(error, {
                tags: { component: 'BulkImportModal', action: 'file_upload' }
            })
            alert('Failed to parse CSV file. Please check the format.')
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
            alert('Failed to import customers. Please try again.')
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
            <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-stone-200 dark:border-stone-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-stone-900 dark:text-white">
                                Bulk Import Customers
                            </h2>
                            <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                                Import multiple customers from a CSV file
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
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
                                <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">CSV Format Instructions</h3>
                                <p className="text-sm text-blue-800 dark:text-blue-400 mb-2">
                                    Your CSV file should have the following columns:
                                </p>
                                <code className="block bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-300 p-3 rounded text-xs font-mono">
                                    name,surname,email,phone
                                </code>
                                <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                                    Example: John,Doe,john@example.com,+306912345678
                                </p>
                            </div>

                            {/* File Upload */}
                            <div className="border-2 border-dashed border-stone-300 dark:border-stone-600 rounded-xl p-8 text-center">
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
                                    <svg className="w-16 h-16 text-stone-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <span className="text-lg font-bold text-stone-700 dark:text-stone-300">
                                        {isProcessing ? 'Processing...' : 'Click to upload CSV file'}
                                    </span>
                                    <span className="text-sm text-stone-500 dark:text-stone-400 mt-1">
                                        or drag and drop
                                    </span>
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                                    <div className="text-3xl font-bold text-green-700 dark:text-green-400">{validCount}</div>
                                    <div className="text-sm font-medium text-green-600 dark:text-green-500">Valid</div>
                                </div>
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                                    <div className="text-3xl font-bold text-red-700 dark:text-red-400">{invalidCount}</div>
                                    <div className="text-sm font-medium text-red-600 dark:text-red-500">Invalid</div>
                                </div>
                                <div className="bg-stone-50 dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-xl p-4">
                                    <div className="text-3xl font-bold text-stone-700 dark:text-stone-300">{customers.length}</div>
                                    <div className="text-sm font-medium text-stone-600 dark:text-stone-400">Total</div>
                                </div>
                            </div>

                            {/* Preview Table */}
                            <div className="border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-stone-50 dark:bg-stone-900/50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left font-bold text-stone-600 dark:text-stone-400">Name</th>
                                            <th className="px-4 py-3 text-left font-bold text-stone-600 dark:text-stone-400">Email</th>
                                            <th className="px-4 py-3 text-left font-bold text-stone-600 dark:text-stone-400">Phone</th>
                                            <th className="px-4 py-3 text-left font-bold text-stone-600 dark:text-stone-400">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 dark:divide-stone-700">
                                        {customers.map((customer, index) => (
                                            <tr key={index} className={customer.status === 'invalid' ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                                                <td className="px-4 py-3 text-stone-900 dark:text-white">
                                                    {customer.name} {customer.surname}
                                                </td>
                                                <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{customer.email}</td>
                                                <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{customer.phone}</td>
                                                <td className="px-4 py-3">
                                                    {customer.status === 'valid' ? (
                                                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-bold">
                                                            Valid
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-bold">
                                                            {customer.error}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setStep('upload')}
                                    className="flex-1 px-6 py-3 rounded-xl font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={validCount === 0 || isProcessing}
                                    className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-500/30"
                                >
                                    Import {validCount} Customer{validCount !== 1 ? 's' : ''}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="py-12 text-center">
                            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-teal-200 border-t-teal-600 mb-4"></div>
                            <h3 className="text-xl font-bold text-stone-900 dark:text-white">Importing Customers...</h3>
                            <p className="text-stone-600 dark:text-stone-400 mt-2">Please wait while we process your data</p>
                        </div>
                    )}

                    {step === 'complete' && (
                        <div className="py-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-stone-900 dark:text-white">Import Complete!</h3>
                            <p className="text-stone-600 dark:text-stone-400 mt-2">
                                Successfully imported {importedCount} customer{importedCount !== 1 ? 's' : ''}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
