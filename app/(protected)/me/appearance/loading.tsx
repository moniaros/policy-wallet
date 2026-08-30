import { Skeleton } from "@/src/design-system/primitives"

export default function AppearanceLoading() {
    return <div aria-busy="true" className="px-g-4 pt-g-6 tablet:px-0"><Skeleton className="h-40 w-full rounded-g-card" /></div>
}
