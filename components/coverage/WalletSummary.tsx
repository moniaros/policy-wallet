"use client"

import type { PortfolioSummary } from '@/lib/policy-status'
import { useLanguage } from '@/contexts/LanguageContext'

interface WalletSummaryProps {
    summary: PortfolioSummary
}

export function WalletSummary({ summary }: WalletSummaryProps) {
    const { t } = useLanguage()

    return (
        <div className="bg-white dark:bg-stone-800 rounded-xl shadow-sm border border-stone-200 dark:border-stone-700 p-6 mb-6">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-6">
                Portfolio Overview
            </h2>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Total Policies */}
                <div className="bg-stone-50 dark:bg-stone-900/50 rounded-lg p-4">
                    <div className="text-sm text-stone-600 dark:text-stone-400 mb-1">
                        Total Policies
                    </div>
                    <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                        {summary.totalPolicies}
                    </div>
                </div>

                {/* Total Coverage */}
                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4">
                    <div className="text-sm text-teal-600 dark:text-teal-400 mb-1">
                        Annual Premium
                    </div>
                    <div className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                        €{summary.totalPremium.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                {/* Action Items */}
                {summary.actionNeededCount > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                        <div className="text-sm text-orange-600 dark:text-orange-400 mb-1">
                            Action Needed
                        </div>
                        <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                            {summary.actionNeededCount}
                        </div>
                    </div>
                )}
            </div>

            {/* Status Breakdown */}
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
                    Status Breakdown
                </h3>
                <div className="space-y-2">
                    {/* Active */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-sm text-stone-700 dark:text-stone-300">Active</span>
                        </div>
                        <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                            {summary.activeCount}
                        </span>
                    </div>

                    {/* Expiring Soon */}
                    {summary.expiringSoonCount > 0 && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                <span className="text-sm text-stone-700 dark:text-stone-300">Expiring Soon</span>
                            </div>
                            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                                {summary.expiringSoonCount}
                            </span>
                        </div>
                    )}

                    {/* Expired */}
                    {summary.expiredCount > 0 && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-sm text-stone-700 dark:text-stone-300">Expired</span>
                            </div>
                            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                                {summary.expiredCount}
                            </span>
                        </div>
                    )}

                    {/* Action Needed */}
                    {summary.actionNeededCount > 0 && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                <span className="text-sm text-stone-700 dark:text-stone-300">Action Needed</span>
                            </div>
                            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                                {summary.actionNeededCount}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Upcoming Renewals */}
            {summary.upcomingRenewals.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
                        Upcoming Renewals
                    </h3>
                    <div className="space-y-2">
                        {summary.upcomingRenewals.slice(0, 3).map((renewal) => (
                            <div
                                key={renewal.policyId}
                                className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                            >
                                <div>
                                    <div className="text-sm font-medium text-stone-900 dark:text-stone-100">
                                        {renewal.insurerName} - {renewal.lineOfBusiness}
                                    </div>
                                    <div className="text-xs text-stone-600 dark:text-stone-400">
                                        {renewal.policyNumber}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                        {renewal.daysUntilExpiry} days
                                    </div>
                                    <div className="text-xs text-stone-600 dark:text-stone-400">
                                        until expiry
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
