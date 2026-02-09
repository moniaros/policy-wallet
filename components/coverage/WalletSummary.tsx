"use client"

import type { PortfolioSummary } from '@/lib/policy-status'
import { useLanguage } from '@/contexts/LanguageContext'

interface WalletSummaryProps {
    summary: PortfolioSummary
}

export function WalletSummary({ summary }: WalletSummaryProps) {
    const { t, language } = useLanguage()

    const copy = {
        overview: language === 'el' ? 'Επισκόπηση χαρτοφυλακίου' : 'Portfolio Overview',
        totalPolicies: language === 'el' ? 'Σύνολο συμβολαίων' : 'Total policies',
        annualPremium: language === 'el' ? 'Ετήσιο ασφάλιστρο' : 'Annual premium',
        actionNeeded: language === 'el' ? 'Απαιτείται ενέργεια' : 'Action needed',
        statusBreakdown: language === 'el' ? 'Κατάσταση συμβολαίων' : 'Status breakdown',
        expiringSoon: language === 'el' ? 'Λήγει σύντομα' : 'Expiring soon',
        upcomingRenewals: language === 'el' ? 'Επερχόμενες ανανεώσεις' : 'Upcoming renewals',
        days: language === 'el' ? 'ημέρες' : 'days',
        untilExpiry: language === 'el' ? 'μέχρι τη λήξη' : 'until expiry',
    }

    const formattedPremium = new Intl.NumberFormat(language === 'el' ? 'el-GR' : 'en-US', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(summary.totalPremium)

    return (
        <div className="bg-white dark:bg-stone-900 rounded-xl shadow-sm border border-stone-200 dark:border-stone-800 p-6 mb-6">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 mb-6">{copy.overview}</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-stone-50 dark:bg-stone-800/60 rounded-lg p-4">
                    <div className="text-sm text-stone-600 dark:text-stone-400 mb-1">{copy.totalPolicies}</div>
                    <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">{summary.totalPolicies}</div>
                </div>

                <div className="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4">
                    <div className="text-sm text-teal-700 dark:text-teal-300 mb-1">{copy.annualPremium}</div>
                    <div className="text-2xl font-bold text-teal-700 dark:text-teal-200">{formattedPremium}</div>
                </div>

                {summary.actionNeededCount > 0 && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                        <div className="text-sm text-orange-700 dark:text-orange-300 mb-1">{copy.actionNeeded}</div>
                        <div className="text-2xl font-bold text-orange-700 dark:text-orange-200">{summary.actionNeededCount}</div>
                    </div>
                )}
            </div>

            <div className="mb-6">
                <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">{copy.statusBreakdown}</h3>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-sm text-stone-700 dark:text-stone-300">{t.policyStatus.active}</span>
                        </div>
                        <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{summary.activeCount}</span>
                    </div>

                    {summary.expiringSoonCount > 0 && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-amber-500" />
                                <span className="text-sm text-stone-700 dark:text-stone-300">{copy.expiringSoon}</span>
                            </div>
                            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{summary.expiringSoonCount}</span>
                        </div>
                    )}

                    {summary.expiredCount > 0 && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                <span className="text-sm text-stone-700 dark:text-stone-300">{t.policyStatus.expired}</span>
                            </div>
                            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{summary.expiredCount}</span>
                        </div>
                    )}

                    {summary.actionNeededCount > 0 && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-500" />
                                <span className="text-sm text-stone-700 dark:text-stone-300">{copy.actionNeeded}</span>
                            </div>
                            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">{summary.actionNeededCount}</span>
                        </div>
                    )}
                </div>
            </div>

            {summary.upcomingRenewals.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">{copy.upcomingRenewals}</h3>
                    <div className="space-y-2">
                        {summary.upcomingRenewals.slice(0, 3).map((renewal) => (
                            <div
                                key={renewal.policyId}
                                className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                            >
                                <div>
                                    <div className="text-sm font-medium text-stone-900 dark:text-stone-100">
                                        {renewal.insurerName} - {t.policyTypes[renewal.lineOfBusiness as keyof typeof t.policyTypes] || renewal.lineOfBusiness}
                                    </div>
                                    <div className="text-xs text-stone-600 dark:text-stone-400">{renewal.policyNumber}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                        {renewal.daysUntilExpiry} {copy.days}
                                    </div>
                                    <div className="text-xs text-stone-600 dark:text-stone-400">{copy.untilExpiry}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
