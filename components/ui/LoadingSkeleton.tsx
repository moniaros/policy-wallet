import React from 'react'

export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-stone-200 dark:bg-stone-800 rounded-xl ${className}`} />
    )
}

/**
 * Generic skeleton for the agent's data-heavy list/insight routes (customers,
 * opportunities, commissions, insights) — header + stat row + a list of rows.
 * Intentionally text-free so it needs no translations.
 */
export function AgentListSkeleton() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-page-wide mx-auto animate-in fade-in duration-500">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="h-4 w-40" />
                </div>
                <Skeleton className="h-11 w-36 rounded-xl" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 h-28">
                        <Skeleton className="h-4 w-20 mb-3" />
                        <Skeleton className="h-7 w-16" />
                    </div>
                ))}
            </div>

            <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800">
                        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/4" />
                        </div>
                        <Skeleton className="h-8 w-20 rounded-lg" />
                    </div>
                ))}
            </div>
        </div>
    )
}

export function DashboardSkeleton() {
    return (
        <div className="p-4 md:p-6 space-y-8 max-w-page-wide mx-auto animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-end mb-12">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-64" />
                </div>
                <Skeleton className="h-12 w-40 rounded-2xl" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-8 bg-white dark:bg-stone-900 rounded-[32px] border border-stone-200 dark:border-stone-800 h-44 shadow-sm">
                        <Skeleton className="h-10 w-10 rounded-xl mb-4" />
                        <Skeleton className="h-4 w-24 mb-3" />
                        <Skeleton className="h-8 w-16" />
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8">
                {/* Left Col */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Skeleton className="h-6 w-48" />
                    </div>
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-32 bg-white/50 dark:bg-stone-900/50 backdrop-blur-sm rounded-[24px] border border-stone-200 dark:border-stone-800 p-6">
                            <div className="flex justify-between items-center h-full">
                                <div className="flex gap-4 items-center">
                                    <Skeleton className="h-12 w-12 rounded-xl" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-6 w-48" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                </div>
                                <Skeleton className="h-8 w-24 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Col */}
                <div className="lg:col-span-4 space-y-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="bg-white dark:bg-stone-900 rounded-[32px] border border-stone-200 dark:border-stone-800 p-8 h-[500px] shadow-sm">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-4 mb-8 last:mb-0">
                                <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export function WalletSkeleton() {
    return (
        <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto py-12 animate-in fade-in duration-500">
            {/* Page Header Skeleton */}
            <div className="mb-12 space-y-3">
                <Skeleton className="h-10 w-72 mx-auto" />
                <Skeleton className="h-5 w-48 mx-auto" />
            </div>

            {/* Portfolio Insight Strip Skeleton */}
            <div className="mb-8">
                <Skeleton className="h-16 w-full rounded-2xl" />
            </div>

            {/* Toolbar Skeleton */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4 justify-between items-center bg-stone-100/50 dark:bg-stone-900/50 p-3 rounded-2xl border border-stone-200 dark:border-stone-800">
                <Skeleton className="h-10 w-full sm:max-w-md" />
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-48 rounded-lg" />
                    <Skeleton className="h-10 w-24 rounded-lg" />
                </div>
            </div>

            {/* Status Summary Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
                <div className="lg:col-span-8 h-72 bg-white dark:bg-stone-900 rounded-[32px] border border-stone-200 dark:border-stone-800" />
                <div className="lg:col-span-4 h-72 bg-white dark:bg-stone-900 rounded-[32px] border border-stone-200 dark:border-stone-800" />
            </div>

            {/* Grid of Policies Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-72 rounded-[32px] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-8 space-y-6 shadow-sm">
                        <div className="flex justify-between items-start">
                            <Skeleton className="h-14 w-14 rounded-2xl" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                        </div>
                        <div className="space-y-3">
                            <Skeleton className="h-7 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                        <div className="pt-4 flex gap-3">
                            <Skeleton className="h-12 flex-1 rounded-xl" />
                            <Skeleton className="h-12 w-12 rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
export function TasksSkeleton() {
    return (
        <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto py-12 animate-in fade-in duration-500">
            {/* Header */}
            <div className="mb-12 space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-12 w-64 md:w-96" />
                <Skeleton className="h-4 w-48 md:w-80" />
            </div>

            {/* Stats Slider */}
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 -mx-6 px-6 mb-12">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex-shrink-0 w-[160px] h-32 bg-white dark:bg-stone-900 rounded-[32px] border border-stone-200 dark:border-stone-800 p-6">
                        <Skeleton className="h-3 w-12 mb-4" />
                        <Skeleton className="h-10 w-8" />
                    </div>
                ))}
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-2 mb-8">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-28 rounded-full" />
                ))}
            </div>

            {/* Items List */}
            <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-stone-900 rounded-[32px] p-5 flex items-center gap-4 border border-stone-100 dark:border-stone-800 h-24">
                        <Skeleton className="w-14 h-14 rounded-[20px]" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-8 w-24 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    )
}

export function QuestionnaireSkeleton() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-16 md:py-24 space-y-12 animate-in fade-in duration-500">
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-32 rounded-full" />
                    <div className="h-px flex-1 bg-stone-100 dark:bg-stone-800" />
                </div>
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-24 w-full" />
            </div>

            <div className="bg-white/50 dark:bg-stone-800/50 backdrop-blur-xl rounded-[40px] p-8 md:p-16 border border-stone-200 dark:border-stone-700 space-y-16">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-6">
                        <Skeleton className="w-10 h-10 rounded-2xl flex-shrink-0" />
                        <div className="flex-1 space-y-6">
                            <Skeleton className="h-8 w-1/2" />
                            <div className="flex gap-4">
                                <Skeleton className="h-14 w-32 rounded-2xl" />
                                <Skeleton className="h-14 w-32 rounded-2xl" />
                            </div>
                        </div>
                    </div>
                ))}

                <div className="pt-10 border-t border-stone-100 dark:border-stone-700 flex flex-col md:flex-row items-center justify-between gap-8">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-16 w-full md:w-64 rounded-[24px]" />
                </div>
            </div>
        </div>
    )
}
