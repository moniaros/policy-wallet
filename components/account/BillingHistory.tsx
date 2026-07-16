"use client"

import React from 'react'
import { FileText, Download, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { subscriptionCopy } from '@/lib/subscription-copy'

export interface Invoice {
    id: string
    date: Date
    amount: number
    currency: string
    status: 'paid' | 'pending' | 'failed'
    pdfUrl?: string
}

export interface BillingHistoryProps {
    invoices: Invoice[]
    language: 'el' | 'en'
    className?: string
}

export function BillingHistory({ invoices, language, className = '' }: BillingHistoryProps) {
    const copy = subscriptionCopy

    if (invoices.length === 0) {
        return (
            <div className={`bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-8 text-center ${className}`}>
                <FileText className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-slate-400">
                    {language === 'el'
                        ? 'Δεν υπάρχουν τιμολόγια ακόμα'
                        : 'No invoices yet'}
                </p>
            </div>
        )
    }

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {copy.headings.account.billingHistory[language]}
                </h3>
            </div>

            {/* Invoice List */}
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {invoices.map((invoice) => (
                    <div
                        key={invoice.id}
                        className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                        <div className="flex items-center justify-between gap-4">
                            {/* Date & Amount */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <FileText className="w-5 h-5 text-slate-400 dark:text-slate-600" />
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                        {invoice.date.toLocaleDateString(language === 'el' ? 'el-GR' : 'en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 ml-8">
                                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                                        €{invoice.amount.toFixed(2)}
                                    </span>
                                    {getStatusBadge(invoice.status, language)}
                                </div>
                            </div>

                            {/* Download Button */}
                            {invoice.pdfUrl && invoice.status === 'paid' && (
                                <a
                                    href={invoice.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    <span className="hidden sm:inline">{copy.cta.downloadPDF[language]}</span>
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

function getStatusBadge(status: Invoice['status'], language: 'el' | 'en') {
    const badges = {
        paid: {
            icon: CheckCircle2,
            label: { el: 'Πληρώθηκε', en: 'Paid' },
            className: 'bg-primary-soft dark:bg-primary/15 text-[#166534] dark:text-mint',
        },
        pending: {
            icon: Clock,
            label: { el: 'Εκκρεμεί', en: 'Pending' },
            className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
        },
        failed: {
            icon: XCircle,
            label: { el: 'Απέτυχε', en: 'Failed' },
            className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
        },
    }

    const badge = badges[status]
    const Icon = badge.icon

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${badge.className}`}>
            <Icon className="w-3 h-3" />
            {badge.label[language]}
        </span>
    )
}
