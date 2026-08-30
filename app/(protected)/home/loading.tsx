import { Skeleton } from "@/src/design-system/primitives"

/** Mirrors HomeScreen's final layout exactly: title, verdict card, three sections. */
export default function HomeLoading() {
    return (
        <div aria-busy="true" aria-live="polite">
            <div className="px-g-4 pt-g-3 tablet:px-0"><Skeleton className="h-10 w-2/3 rounded-g-control" /></div>
            <div className="px-g-4 pt-g-4 tablet:px-0"><Skeleton className="h-56 w-full rounded-g-card" /></div>
            <div className="px-g-4 pt-g-6 tablet:px-0"><Skeleton className="mb-g-3 h-6 w-1/3" /><Skeleton className="h-48 w-full rounded-g-card" /></div>
            <div className="px-g-4 pt-g-6 tablet:px-0"><Skeleton className="mb-g-3 h-6 w-1/3" /><Skeleton className="h-28 w-full rounded-g-card" /></div>
            <div className="px-g-4 pt-g-6 tablet:px-0"><Skeleton className="mb-g-3 h-6 w-1/3" /><Skeleton className="h-40 w-full rounded-g-card" /></div>
        </div>
    )
}
