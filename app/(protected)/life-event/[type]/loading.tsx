import { Skeleton } from "@/src/design-system/primitives"

export default function LifeEventLoading() {
    return (
        <div aria-busy="true" aria-live="polite">
            <div className="px-g-4 pt-g-3 tablet:px-0"><Skeleton className="h-10 w-1/2 rounded-g-control" /></div>
            <div className="px-g-4 pt-g-4 tablet:px-0"><Skeleton className="h-56 w-full rounded-g-card" /></div>
        </div>
    )
}
