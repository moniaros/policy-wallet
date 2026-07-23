import { Skeleton } from "@/components/ui/LoadingSkeleton"

/**
 * Segment-level loading UI for /admin.
 *
 * The protected layout already provides a fallback skeleton, but its shape is a
 * dashboard (avatar + hero + three cards). Almost every admin screen is a
 * filter bar over a long table, so that fallback reads as a different page
 * mid-navigation. This matches the shape admin actually renders.
 */
export default function AdminLoading() {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72" />
            </div>
            <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
            <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
            </div>
        </div>
    )
}
