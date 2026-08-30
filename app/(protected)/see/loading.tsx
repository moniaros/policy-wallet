import { Skeleton } from "@/src/design-system/primitives"

/** Mirrors SeeScreen: title, filter strip, a tier header and two cards. */
export default function SeeLoading() {
    return (
        <div aria-busy="true" aria-live="polite">
            <div className="px-g-4 pt-g-3 tablet:px-0"><Skeleton className="h-10 w-1/2 rounded-g-control" /><Skeleton className="mt-g-2 h-5 w-3/4" /></div>
            <div className="flex gap-g-2 px-g-4 pt-g-3 tablet:px-0"><Skeleton className="h-9 w-16 rounded-g-control" /><Skeleton className="h-9 w-20 rounded-g-control" /><Skeleton className="h-9 w-24 rounded-g-control" /></div>
            <div className="px-g-4 pt-g-6 tablet:px-0"><Skeleton className="mb-g-3 h-7 w-1/2" /><Skeleton className="h-44 w-full rounded-g-card" /><Skeleton className="mt-g-3 h-44 w-full rounded-g-card" /></div>
        </div>
    )
}
