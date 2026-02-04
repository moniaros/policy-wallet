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

            {/* Policy List by Status */}
            <div className="space-y-6">
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
