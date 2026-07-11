import { Skeleton } from "@/components/ui/skeleton"

// Mirrors the real detail-page shell (dark hero, section-nav pills,
// 1.65fr/1fr grid of pw-cards) so the layout doesn't jump on load.
export default function Loading() {
    return (
        <div className="pw-page-shell">
            <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
                {/* Breadcrumb */}
                <div className="mb-5 flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                </div>

                {/* Dark hero */}
                <div className="relative overflow-hidden rounded-[28px] border border-black/10 bg-[#111111] p-6 sm:p-8 lg:p-10 dark:border-white/10">
                    <div className="space-y-7">
                        <div className="flex gap-2">
                            <Skeleton className="h-6 w-24 rounded-full bg-white/10" />
                            <Skeleton className="h-6 w-32 rounded-full bg-white/10" />
                        </div>
                        <div className="flex flex-col gap-6 xl:flex-row xl:justify-between">
                            <div className="min-w-0 flex-1 space-y-4">
                                <div className="flex items-start gap-4">
                                    <Skeleton className="h-14 w-14 rounded-2xl bg-white/10" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-10 w-64 bg-white/10" />
                                        <Skeleton className="h-4 w-40 bg-white/10" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                    <Skeleton className="h-16 rounded-2xl bg-white/10" />
                                    <Skeleton className="h-16 rounded-2xl bg-white/10" />
                                    <Skeleton className="h-16 rounded-2xl bg-white/10" />
                                    <Skeleton className="h-16 rounded-2xl bg-white/10" />
                                </div>
                            </div>
                            <Skeleton className="h-28 w-full max-w-xs rounded-3xl bg-white/10" />
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <Skeleton className="h-12 rounded-full bg-white/10" />
                            <Skeleton className="h-12 rounded-full bg-white/10" />
                            <Skeleton className="h-12 rounded-full bg-white/10" />
                            <Skeleton className="h-12 rounded-full bg-white/10" />
                        </div>
                    </div>
                </div>

                {/* Section-nav pills */}
                <div className="mt-5 flex gap-2 overflow-hidden">
                    <Skeleton className="h-9 w-24 rounded-full" />
                    <Skeleton className="h-9 w-28 rounded-full" />
                    <Skeleton className="h-9 w-24 rounded-full" />
                    <Skeleton className="h-9 w-28 rounded-full" />
                    <Skeleton className="h-9 w-24 rounded-full" />
                </div>

                {/* Two-column body */}
                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
                    <div className="space-y-6">
                        <Skeleton className="h-40 w-full rounded-2xl" />
                        <Skeleton className="h-56 w-full rounded-2xl" />
                        <Skeleton className="h-72 w-full rounded-2xl" />
                        <Skeleton className="h-64 w-full rounded-2xl" />
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-48 w-full rounded-2xl" />
                        <Skeleton className="h-40 w-full rounded-2xl" />
                        <Skeleton className="h-56 w-full rounded-2xl" />
                    </div>
                </div>
            </div>
        </div>
    )
}
