import { Skeleton } from "@/src/design-system/primitives"

/** Mirrors PolicyDetailScreen: title, hero card with facts, checklist rows. */
export default function PolicyLoading() {
    return (
        <div aria-busy="true" aria-live="polite">
            <div className="px-g-4 pt-g-3 tablet:px-0"><Skeleton className="h-10 w-2/3 rounded-g-control" /><Skeleton className="mt-g-2 h-5 w-1/2" /></div>
            <div className="px-g-4 pt-g-4 tablet:px-0"><Skeleton className="h-64 w-full rounded-g-hero" /></div>
            <div className="px-g-4 pt-g-6 tablet:px-0"><Skeleton className="mb-g-3 h-6 w-1/2" /><Skeleton className="h-14 w-full rounded-t-g-card" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full rounded-b-g-card" /></div>
        </div>
    )
}
