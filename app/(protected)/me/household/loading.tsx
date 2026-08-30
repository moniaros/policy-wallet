import { Skeleton } from "@/src/design-system/primitives"

export default function HouseholdLoading() {
    return (
        <div aria-busy="true" className="px-g-4 pt-g-6 tablet:px-0">
            <Skeleton className="mb-g-3 h-6 w-1/2" /><Skeleton className="h-16 w-full rounded-t-g-card" /><Skeleton className="h-16 w-full rounded-b-g-card" /><Skeleton className="mt-g-6 h-48 w-full rounded-g-card" />
        </div>
    )
}
