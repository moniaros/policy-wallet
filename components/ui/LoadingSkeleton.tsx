import React from 'react'

export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded ${className}`} />
    )
}

export function DashboardSkeleton() {
    return (
        <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 h-32">
                        <Skeleton className="h-8 w-8 rounded-full mb-3" />
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-8 w-16" />
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Col (Priority) */}
                <div className="lg:col-span-8 space-y-4">
                    <Skeleton className="h-8 w-32 mb-4" />
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-24 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                            <div className="flex justify-between items-start">
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-48" />
                                    <Skeleton className="h-4 w-32" />
                                </div>
                                <Skeleton className="h-6 w-16" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Col (Activity) */}
                <div className="lg:col-span-4 space-y-4">
                    <Skeleton className="h-8 w-32 mb-4" />
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 h-[400px]">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex gap-4 mb-6 last:mb-0">
                                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
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
        <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="h-[200px] rounded-3xl bg-slate-200 dark:bg-slate-800 animate-pulse mb-8" />

            {/* Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 h-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />
                <div className="lg:col-span-4 h-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-2xl" />
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                        <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <div className="pt-4 flex gap-2">
                            <Skeleton className="h-10 flex-1 rounded-lg" />
                            <Skeleton className="h-10 w-10 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
