"use client"

import { useState } from "react"
import * as Sentry from "@sentry/nextjs"

interface SharePolicyModalProps {
    isOpen: boolean
    onClose: () => void
    policyId: string
    policyNumber: string
    onSuccess: () => void
}

export function SharePolicyModal({ isOpen, onClose, policyId, policyNumber, onSuccess }: SharePolicyModalProps) {
    const [email, setEmail] = useState('')
    const [permissions, setPermissions] = useState<'view' | 'edit'>('view')
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const response = await fetch('/api/v1/policies/share', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    policyId,
                    email,
                    permissions
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.error || 'Failed to share policy')
            }

            onSuccess()
            handleClose()
        } catch (error) {
            Sentry.captureException(error, {
                tags: {
                    component: 'SharePolicyModal',
                    policyId
                }
            })
            alert(error instanceof Error ? error.message : 'Failed to share policy. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setEmail('')
        setPermissions('view')
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4">
                {/* Header */}
                <div className="border-b border-stone-200 dark:border-stone-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-stone-900 dark:text-white">
                                Share Policy
                            </h2>
                            <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">
                                Policy #{policyNumber}
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

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                        <div className="flex gap-3">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-sm text-blue-800 dark:text-blue-300">
                                <p className="font-semibold mb-1">Share with family members</p>
                                <p>They'll receive an email invitation to view this policy in their PolicyWallet.</p>
                            </div>
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label htmlFor="email" className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-3 rounded-xl border-2 border-stone-200 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-900 dark:text-white focus:border-teal-500 dark:focus:border-teal-400 focus:ring-0 transition-colors"
                            placeholder="family@example.com"
                        />
                    </div>

                    {/* Permissions */}
                    <div>
                        <label className="block text-sm font-bold text-stone-700 dark:text-stone-300 mb-2">
                            Permissions
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setPermissions('view')}
                                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${permissions === 'view'
                                        ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-2 border-teal-500'
                                        : 'bg-stone-50 dark:bg-stone-700 text-stone-600 dark:text-stone-400 border-2 border-transparent hover:border-stone-300 dark:hover:border-stone-600'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    View Only
                                </div>
                                <p className="text-xs mt-1 opacity-75">Can view policy details</p>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPermissions('edit')}
                                className={`px-4 py-3 rounded-xl font-semibold text-sm transition-all ${permissions === 'edit'
                                        ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border-2 border-teal-500'
                                        : 'bg-stone-50 dark:bg-stone-700 text-stone-600 dark:text-stone-400 border-2 border-transparent hover:border-stone-300 dark:hover:border-stone-600'
                                    }`}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Can Edit
                                </div>
                                <p className="text-xs mt-1 opacity-75">Can view and update</p>
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-6 py-3 rounded-xl font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !email}
                            className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-500/30"
                        >
                            {isSubmitting ? 'Sharing...' : 'Share Policy'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
