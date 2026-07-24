"use client"

import { useState } from "react"
import * as Sentry from "@sentry/nextjs"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { useDialog } from "@/hooks/useDialog"

interface OpportunityUpdateModalProps {
    isOpen: boolean
    onClose: () => void
    opportunity: {
        id: string
        customerName: string
        title: string
        status: string
        notes?: string
    }
    onUpdate: (opportunityId: string, status: string, notes: string, nextActionDate?: string) => Promise<void>
}

export function OpportunityUpdateModal({ isOpen, onClose, opportunity, onUpdate }: OpportunityUpdateModalProps) {
    const { t } = useLanguage()
    const dialogRef = useDialog<HTMLDivElement>(onClose, isOpen)
    const tt = t.agentModals.opportunityUpdate
    const OPPORTUNITY_STATUSES = [
        { value: 'open', label: tt.statusOpen, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-2 border-amber-500' },
        { value: 'contacted', label: tt.statusContacted, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-2 border-blue-500' },
        { value: 'quoted', label: tt.statusQuoted, color: 'bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint border-2 border-primary' },
        { value: 'won', label: tt.statusWon, color: 'bg-primary-soft dark:bg-primary/15 text-[#166534] dark:text-mint border-2 border-primary' },
        { value: 'lost', label: tt.statusLost, color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-2 border-red-500' },
        { value: 'on_hold', label: tt.statusOnHold, color: 'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 border-2 border-neutral-400' },
    ]

    const [status, setStatus] = useState(opportunity.status)
    const [notes, setNotes] = useState(opportunity.notes || '')
    const [nextActionDate, setNextActionDate] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            await onUpdate(opportunity.id, status, notes, nextActionDate || undefined)
            onClose()
        } catch (error) {
            Sentry.captureException(error, {
                tags: {
                    component: 'OpportunityUpdateModal',
                    opportunityId: opportunity.id
                }
            })
            toast.error(tt.updateError)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="opportunity-update-title" tabIndex={-1} className="bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-neutral-200 dark:border-neutral-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 id="opportunity-update-title" className="text-2xl font-bold text-foreground">
                                {tt.title}
                            </h2>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                {opportunity.customerName} • {opportunity.title}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            aria-label={t.common.close}
                            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Status */}
                    <div>
                        <label className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                            {tt.statusLabel}
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {OPPORTUNITY_STATUSES.map((s) => (
                                <button
                                    key={s.value}
                                    type="button"
                                    onClick={() => setStatus(s.value)}
                                    className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${status === s.value
                                            ? s.color
                                            : 'bg-neutral-50 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 border-2 border-transparent hover:border-neutral-300 dark:hover:border-neutral-600'
                                        }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label htmlFor="notes" className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                            {tt.notesLabel}
                        </label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            className="pw-input dark:focus:border-mint"
                            placeholder={tt.notesPlaceholder}
                        />
                    </div>

                    {/* Next Action Date */}
                    <div>
                        <label htmlFor="nextActionDate" className="block text-sm font-bold text-neutral-700 dark:text-neutral-300 mb-2">
                            {tt.nextActionLabel}
                        </label>
                        <input
                            type="date"
                            id="nextActionDate"
                            value={nextActionDate}
                            onChange={(e) => setNextActionDate(e.target.value)}
                            className="pw-input dark:focus:border-mint"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-xl font-bold text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
                        >
                            {tt.cancel}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="pw-primary-button flex-1 shadow-primary/25"
                        >
                            {isSubmitting ? tt.updating : tt.updateBtn}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
