export default function ActivityPage() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-3xl font-bold mb-4 text-stone-900 dark:text-stone-100">
                Activity Feed
            </h1>
            <p className="text-stone-600 dark:text-stone-400">
                Tracking all recent interactions, document uploads, and policy changes across your customer base.
            </p>
            <div className="mt-8 flex flex-col gap-4">
                <div className="p-10 border-2 border-dashed border-stone-200 dark:border-stone-700 rounded-3xl text-center">
                    <div className="text-stone-300 dark:text-stone-600 mb-4 flex justify-center">
                        <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-stone-700 dark:text-stone-300">Quiet for now</h3>
                    <p className="text-sm text-stone-500">Activity will appear here as your customers interact with their wallets.</p>
                </div>
            </div>
        </div>
    )
}
