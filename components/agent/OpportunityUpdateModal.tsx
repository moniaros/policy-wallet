"use client"

import { useState } from "react"
import * as Sentry from "@sentry/nextjs"

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

const OPPORTUNITY_STATUSES = [
    { value: 'open', label: 'Open', color: 'amber' },
    { value: 'contacted', label: 'Contacted', color: 'blue' },
    { value: 'quoted', label: 'Quoted', color: 'purple' },
    { value: 'won', label: 'Won', color: 'green' },
    { value: 'lost', label: 'Lost', color: 'red' },
    { value: 'on_hold', label: 'On Hold', color: 'gray' },
]

export function OpportunityUpdateModal({ isOpen, onClose, opportunity, onUpdate }: OpportunityUpdateModalProps) {
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
            alert('Failed to update opportunity. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="border-b border-stone-200 dark:border-stone-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-stone-900 dark:text-white">
                                Update Opportunity
                            </h2>
                            <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                                {opportunity.customerName} • {opportunity.title}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors"
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
                        <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                            Status
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {OPPORTUNITY_STATUSES.map((s) => (
                                <button
                                    key={s.value}
                                    type="button"
                                    onClick={() => setStatus(s.value)}
                                    className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${status === s.value
                                            ? `bg-${s.color}-100 dark:bg-${s.color}-900/30 text-${s.color}-700 dark:text-${s.color}-400 border-2 border-${s.color}-500`
                                            : 'bg-stone-50 dark:bg-stone-700 text-stone-600 dark:text-stone-400 border-2 border-transparent hover:border-stone-300 dark:hover:border-stone-600'
                                        }`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label htmlFor="notes" className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                            Notes
                        </label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white focus:border-teal-500 dark:focus:border-teal-400 focus:ring-0 transition-colors"
                            placeholder="Add notes about this opportunity..."
                        />
                    </div>

                    {/* Next Action Date */}
                    <div>
                        <label htmlFor="nextActionDate" className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                            Next Action Date (Optional)
                        </label>
                        <input
                            type="date"
                            id="nextActionDate"
                            value={nextActionDate}
                            onChange={(e) => setNextActionDate(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white focus:border-teal-500 dark:focus:border-teal-400 focus:ring-0 transition-colors"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 rounded-xl font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-500/30"
                        >
                            {isSubmitting ? 'Updating...' : 'Update Opportunity'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
