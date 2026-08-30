import { Skeleton } from "@/src/design-system/primitives"

export default function WelcomeLoading() {
    return <div aria-busy="true" className="px-g-4 pt-g-6 tablet:px-0"><Skeleton className="h-64 w-full rounded-g-card" /></div>
}
