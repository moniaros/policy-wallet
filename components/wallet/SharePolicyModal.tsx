"use client"

import { useState } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import * as Sentry from "@sentry/nextjs"

interface SharePolicyModalProps {
    isOpen: boolean
    onClose: () => void
    policyId: string
    policyNumber: string
    onSuccess: () => void
}

export function SharePolicyModal({ isOpen, onClose, policyId, policyNumber, onSuccess }: SharePolicyModalProps) {
    const { language: lang } = useLanguage()
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-md transition-all duration-500">
            <div className="bg-white dark:bg-stone-900 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20 animate-in fade-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 pt-8 pb-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-10 h-10 rounded-full flex items-center justify-center text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <h2 className="text-3xl font-black text-stone-900 dark:text-white tracking-tighter">
                        Share <span className="text-stone-400 dark:text-stone-500 italic">Policy.</span>
                    </h2>
                    <p className="text-sm font-bold text-stone-400 mt-1">
                        #{policyNumber}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Info */}
                    <div className="bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 rounded-2xl p-4">
                        <p className="text-xs font-bold text-teal-700 dark:text-teal-400 leading-relaxed">
                            {lang === 'el'
                                ? 'Μοιραστείτε αυτό το συμβόλαιο με μέλη της οικογένειας ή συνεργάτες.'
                                : 'Invite others to view or manage this policy securely within their own PolicyWallet.'}
                        </p>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-6 py-4 bg-stone-50 dark:bg-stone-800 border border-transparent focus:bg-white dark:focus:bg-stone-700 focus:border-teal-600 rounded-2xl text-stone-900 dark:text-white placeholder-stone-400 transition-all outline-none"
                            placeholder="family@example.com"
                        />
                    </div>

                    {/* Permissions */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">
                            Access Level
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setPermissions('view')}
                                className={`px-6 py-4 rounded-2xl transition-all border ${permissions === 'view'
                                    ? 'bg-stone-900 dark:bg-white border-stone-900 dark:border-white text-white dark:text-stone-900 shadow-xl'
                                    : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800 text-stone-400'
                                    }`}
                            >
                                <span className="block text-xs font-black uppercase tracking-widest">View Only</span>
                                <span className="text-[10px] opacity-60 font-bold">ReadOnly Access</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setPermissions('edit')}
                                className={`px-6 py-4 rounded-2xl transition-all border ${permissions === 'edit'
                                    ? 'bg-stone-900 dark:bg-white border-stone-900 dark:border-white text-white dark:text-stone-900 shadow-xl'
                                    : 'bg-white dark:bg-stone-900 border-stone-100 dark:border-stone-800 text-stone-400'
                                    }`}
                            >
                                <span className="block text-xs font-black uppercase tracking-widest">Can Edit</span>
                                <span className="text-[10px] opacity-60 font-bold">Full Management</span>
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !email}
                            className="flex-1 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white bg-gradient-to-r from-teal-600 to-teal-500 shadow-xl shadow-teal-500/20 active:scale-95 disabled:opacity-50 transition-all"
                        >
                            {isSubmitting ? 'Sharing...' : 'Share Now'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
