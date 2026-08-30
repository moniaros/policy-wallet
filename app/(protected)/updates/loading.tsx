import { Skeleton } from "@/src/design-system/primitives"

/** Mirrors UpdatesScreen: title, two groups of rows. */
export default function UpdatesLoading() {
    return (
        <div aria-busy="true" aria-live="polite">
            <div className="px-g-4 pt-g-3 tablet:px-0"><Skeleton className="h-10 w-1/2 rounded-g-control" /></div>
            {[0, 1].map((i) => (
                <div key={i} className="px-g-4 pt-g-6 tablet:px-0"><Skeleton className="mb-g-3 h-6 w-1/2" /><Skeleton className="h-16 w-full rounded-t-g-card" /><Skeleton className="h-16 w-full rounded-b-g-card" /></div>
            ))}
        </div>
    )
}
