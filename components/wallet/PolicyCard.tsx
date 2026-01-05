"use client"

import { useState } from 'react'
import type { Policy } from './types'

interface PolicyCardProps {
    policy: Policy
    onView?: () => void
    onShare?: () => void
    onAddToWallet?: () => void
    onViewDocuments?: () => void
}

export function PolicyCard({ policy, onView, onShare, onAddToWallet, onViewDocuments }: PolicyCardProps) {
    const [menuOpen, setMenuOpen] = useState(false)

    // Format date in Greek format (e.g., "14 Ιουν 2024")
    const formatGreekDate = (dateStr: string | null) => {
        if (!dateStr) return '—'
        const date = new Date(dateStr)
        const months = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαΐ', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ']
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
    }

    // Status badge styling
    const getStatusBadge = () => {
        switch (policy.status) {
            case 'active':
                return (
                    <span className="px-2 py-1 text-xs font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded">
                        Ενεργή
                    </span>
                )
            case 'expiring_soon':
                return (
                    <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                        Λήγει σύντομα
                    </span>
                )
            case 'incomplete':
                return (
                    <span className="px-2 py-1 text-xs font-medium bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 rounded">
                        Ημιτελής
                    </span>
                )
            case 'action_needed':
                return (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                        Απαιτείται ενέργεια
                    </span>
                )
        }
    }

    return (
        <div
            onClick={onView}
            className="relative bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg p-4 hover:shadow-md hover:border-stone-300 dark:hover:border-stone-600 transition-all cursor-pointer group"
        >
            {/* Shared with agent indicator */}
            {policy.sharedWithAgents.length > 0 && (
                <div className="absolute top-3 right-3 group/tooltip">
                    <svg className="w-4 h-4 text-teal-600 dark:text-teal-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                    <div className="absolute top-6 right-0 hidden group-hover/tooltip:block z-10 px-2 py-1 text-xs bg-stone-900 dark:bg-stone-700 text-white rounded whitespace-nowrap">
                        Κοινόχρηστη με {policy.sharedWithAgents[0].agentName}
                    </div>
                </div>
            )}

            {/* Policy info */}
            <div className="pr-8">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100 mb-1">
                            {policy.insurerName}
                        </h3>
                        <p className="text-sm text-stone-600 dark:text-stone-400 font-mono">
                            {policy.policyNumber}
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {getStatusBadge()}
                        <span className="text-sm text-stone-600 dark:text-stone-400">
                            Λήγει: {formatGreekDate(policy.endDate)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Overflow menu */}
            <div className="absolute bottom-4 right-4">
                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpen(!menuOpen)
                        }}
                        className="p-1 rounded hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 transition-colors"
                        aria-label="Περισσότερες επιλογές"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                    </button>

                    {menuOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    setMenuOpen(false)
                                }}
                            />
                            <div className="absolute right-0 bottom-full mb-1 z-20 w-48 bg-white dark:bg-stone-800 rounded-lg shadow-lg border border-stone-200 dark:border-stone-700 py-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onShare?.()
                                        setMenuOpen(false)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700"
                                >
                                    Κοινοποίηση σε πράκτορα
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onAddToWallet?.()
                                        setMenuOpen(false)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700"
                                >
                                    Προσθήκη στο Wallet
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        onViewDocuments?.()
                                        setMenuOpen(false)
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700"
                                >
                                    Προβολή εγγράφων
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
