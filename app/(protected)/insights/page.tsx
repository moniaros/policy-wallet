export default function AgentInsightsPage() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-4 text-stone-900 dark:text-stone-100">
                Practice Insights
            </h1>
            <p className="text-stone-600 dark:text-stone-400">
                Advanced analytics on cross-selling opportunities, customer retention, and portfolio health.
            </p>
            <div className="mt-8 p-8 bg-teal-50 dark:bg-teal-900/10 border border-teal-100 dark:border-teal-900/30 rounded-3xl">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-2xl">
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-bold text-teal-900 dark:text-teal-100 text-lg">Coming in Milestone 7</h3>
                        <p className="text-teal-700/70 dark:text-teal-400/70 mt-1">We are building predictive insights to help you identify which customers are most likely to need a coverage review.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
