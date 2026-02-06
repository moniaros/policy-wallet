import { requirePayingUser } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { WalletSummary } from "@/components/coverage/WalletSummary"
import { calculatePortfolioSummary } from "@/lib/policy-status"

export default async function CoveragePage() {
    const { dbUser } = await requirePayingUser()

    // Fetch user's policies
    const policies = await db.policy.findMany({
        where: {
            ownerUserId: dbUser.id
        },
        orderBy: {
            endDate: 'asc'
        }
    })

    // Calculate portfolio summary
    const summary = calculatePortfolioSummary(policies)

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 text-stone-900 dark:text-stone-100">
                    Coverage Understanding & Status
                </h1>
                <p className="text-stone-600 dark:text-stone-400">
                    Get a clear view of your insurance coverage and policy status.
                </p>
            </div>

            {/* Portfolio Summary */}
            <WalletSummary summary={summary} />

            {/* AI-Powered Insights Section */}
            {summary.totalPolicies > 0 && (
                <div className="mt-8 space-y-6">
                    <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <svg className="w-6 h-6 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                        </svg>
                        Smart Insights & Recommendations
                    </h2>

                    {/* Health Score Card */}
                    <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 border border-teal-200 dark:border-teal-800 rounded-2xl p-6" data-testid="coverage-insight">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-stone-900 dark:text-white">
                                Portfolio Health Score
                            </h3>
                            <span className="text-3xl font-black text-teal-600">
                                {Math.round((summary.activeCount / summary.totalPolicies) * 100)}%
                            </span>
                        </div>
                        <div className="h-3 bg-stone-200 dark:bg-stone:700 rounded-full overflow-hidden mb-4">
                            <div
                                className="h-full bg-gradient-to-r from-teal-600 to-emerald-600 rounded-full transition-all duration-1000"
                                style={{ width: `${(summary.activeCount / summary.totalPolicies) * 100}%` }}
                            />
                        </div>
                        <p className="text-sm text-stone-600 dark:text-stone-400">
                            {summary.activeCount} of {summary.totalPolicies} policies are active and up-to-date.
                        </p>
                    </div>

                    {/* Actionable Recommendations */}
                    {(summary.expiringSoonCount > 0 || summary.actionNeededCount > 0) && (
                        <div className="insight-card bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200 dark:border-stone-700">
                            <h3 className="text-lg font-bold mb-4 text-stone-900 dark:text-white flex items-center gap-2">
                                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Priority Recommendations
                            </h3>
                            <div className="space-y-3">
                                {summary.expiringSoonCount > 0 && (
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                        <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-1">
                                            🗓️ Renewal Alert
                                        </h4>
                                        <p className="text-sm text-amber-800 dark:text-amber-300">
                                            {summary.expiringSoonCount} {summary.expiringSoonCount === 1 ? 'policy' : 'policies'} expiring soon. Review renewal options to avoid coverage gaps.
                                        </p>
                                    </div>
                                )}
                                {summary.actionNeededCount > 0 && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                                        <h4 className="font-semibold text-red-900 dark:text-red-200 mb-1">
                                            ⚠️ Action Required
                                        </h4>
                                        <p className="text-sm text-red-800 dark:text-red-300">
                                            {summary.actionNeededCount} {summary.actionNeededCount === 1 ? 'policy needs' : 'policies need'} attention. Complete missing information to ensure full coverage.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Policy List by Status */}
            <div className="space-y-6 mt-8">
                {/* Expiring Soon Policies */}
                {summary.expiringSoonCount > 0 && (
                    <div>
                        <h2 className="text-xl font-bold mb-4 text-stone-900 dark:text-stone-100">
                            Policies Expiring Soon
                        </h2>
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
                            <p className="text-amber-800 dark:text-amber-200">
                                You have {summary.expiringSoonCount} {summary.expiringSoonCount === 1 ? 'policy' : 'policies'} expiring within the next 30 days.
                                Consider renewing them soon to avoid coverage gaps.
                            </p>
                        </div>
                    </div>
                )}

                {/* Action Needed Policies */}
                {summary.actionNeededCount > 0 && (
                    <div>
                        <h2 className="text-xl font-bold mb-4 text-stone-900 dark:text-stone-100">
                            Action Required
                        </h2>
                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-6">
                            <p className="text-orange-800 dark:text-orange-200">
                                {summary.actionNeededCount} {summary.actionNeededCount === 1 ? 'policy needs' : 'policies need'} your attention.
                                Please review and complete any missing information.
                            </p>
                        </div>
                    </div>
                )}

                {/* All Good Message */}
                {summary.expiringSoonCount === 0 && summary.actionNeededCount === 0 && summary.activeCount > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                        <div className="flex items-center gap-3">
                            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div>
                                <h3 className="font-semibold text-green-800 dark:text-green-200">
                                    Your coverage looks good!
                                </h3>
                                <p className="text-sm text-green-700 dark:text-green-300">
                                    All your policies are active with no immediate action required.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* No Policies Message */}
                {summary.totalPolicies === 0 && (
                    <div className="bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-lg p-8 text-center">
                        <svg className="w-16 h-16 mx-auto mb-4 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">
                            No policies yet
                        </h3>
                        <p className="text-stone-600 dark:text-stone-400 mb-4">
                            Add your first policy to start tracking your coverage.
                        </p>
                        <a
                            href="/wallet/add"
                            className="inline-block bg-teal-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors"
                        >
                            Add Policy
                        </a>
                    </div>
                )}
            </div>
        </div>
    )
}
