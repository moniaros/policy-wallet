import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
    return (
        <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
            {/* Breadcrumbs Skeleton */}
            <div className="flex items-center gap-2 mb-8">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header Card Skeleton */}
                    <div className="bg-white dark:bg-stone-800 rounded-3xl p-8 border border-stone-200 dark:border-stone-700">
                        <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
                            <div className="space-y-4 flex-1">
                                <Skeleton className="h-6 w-32 rounded-full" />
                                <Skeleton className="h-12 w-64" />
                                <Skeleton className="h-6 w-48" />
                            </div>
                            <Skeleton className="h-24 w-48 rounded-2xl" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-stone-100 dark:border-stone-700">
                            <Skeleton className="h-16 w-full rounded-xl" />
                            <Skeleton className="h-16 w-full rounded-xl" />
                        </div>
                    </div>

                    {/* Summary Skeleton */}
                    <Skeleton className="h-32 w-full rounded-3xl" />

                    {/* Tabs/Analysis Skeleton */}
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <Skeleton className="h-10 w-32 rounded-xl" />
                            <Skeleton className="h-10 w-32 rounded-xl" />
                        </div>
                        <Skeleton className="h-64 w-full rounded-3xl" />
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Skeleton className="h-48 w-full rounded-3xl" />
                    <Skeleton className="h-64 w-full rounded-3xl" />
                </div>
            </div>
        </div>
    )
}
