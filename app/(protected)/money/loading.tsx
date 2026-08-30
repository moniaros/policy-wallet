import { Skeleton } from "@/src/design-system/primitives"

/** Mirrors MoneyScreen: title, triad, two grouped sections. */
export default function MoneyLoading() {
    return (
        <div aria-busy="true" aria-live="polite">
            <div className="px-g-4 pt-g-3 tablet:px-0"><Skeleton className="h-10 w-1/2 rounded-g-control" /></div>
            <div className="px-g-4 pt-g-4 tablet:px-0"><Skeleton className="h-40 w-full rounded-g-card" /></div>
            <div className="px-g-4 pt-g-6 tablet:px-0"><Skeleton className="mb-g-3 h-6 w-1/2" /><Skeleton className="h-16 w-full rounded-t-g-card" /><Skeleton className="h-16 w-full rounded-b-g-card" /></div>
            <div className="px-g-4 pt-g-6 tablet:px-0"><Skeleton className="mb-g-3 h-6 w-1/2" /><Skeleton className="h-24 w-full rounded-g-card" /></div>
        </div>
    )
}
