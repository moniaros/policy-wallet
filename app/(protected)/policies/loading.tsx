import { Skeleton } from "@/src/design-system/primitives"

/** Mirrors PoliciesScreen: title, search, segmented control, one group of rows. */
export default function PoliciesLoading() {
    return (
        <div aria-busy="true" aria-live="polite">
            <div className="px-g-4 pt-g-3 tablet:px-0"><Skeleton className="h-10 w-1/2 rounded-g-control" /></div>
            <div className="px-g-4 pt-g-4 tablet:px-0"><Skeleton className="h-11 w-full rounded-g-control" /><Skeleton className="mt-g-3 h-10 w-full rounded-g-control" /></div>
            <div className="px-g-4 pt-g-6 tablet:px-0"><Skeleton className="mb-g-2 h-5 w-1/4" /><Skeleton className="h-16 w-full rounded-t-g-card" /><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full rounded-b-g-card" /></div>
        </div>
    )
}
