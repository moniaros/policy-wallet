import { Skeleton, LoadingAnnouncement } from "@/components/ui/LoadingSkeleton"

/**
 * Route-level loading state for the whole public/marketing tree.
 *
 * 59 public routes had no `loading.tsx` at all. The landing pages are also
 * wrapped in `<Suspense fallback={null}>`, so a slow navigation rendered
 * literally nothing — the case where a visitor is most likely to leave, and
 * the one surface where we have no session to fall back on.
 *
 * Shaped like the marketing page shell (header strip, hero, content band) so
 * the real page does not shift when it arrives.
 */
export default function Loading() {
    return (
        <div role="status" aria-busy="true" className="min-h-screen bg-background">
            <LoadingAnnouncement />
            <div className="border-b border-border">
                <div className="mx-auto flex max-w-page items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <Skeleton className="h-8 w-36" />
                    <div className="hidden items-center gap-4 lg:flex">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-9 w-28 rounded-xl" />
                    </div>
                    <Skeleton className="h-9 w-9 rounded-lg lg:hidden" />
                </div>
            </div>

            <div className="mx-auto max-w-page space-y-10 px-4 py-12 sm:px-6 lg:px-8">
                <div className="space-y-4">
                    <Skeleton className="h-10 w-4/5" />
                    <Skeleton className="h-10 w-3/5" />
                    <Skeleton className="h-4 w-full max-w-reading" />
                    <Skeleton className="h-11 w-44 rounded-xl" />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-40 w-full rounded-2xl" />
                    ))}
                </div>
            </div>
        </div>
    )
}
