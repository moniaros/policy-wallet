import { Skeleton } from "@/components/ui/LoadingSkeleton"

export default function Loading() {
    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex items-center space-x-4 mb-8">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
            </div>
            <div className="space-y-4">
                <Skeleton className="h-[200px] w-full rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-[150px] w-full rounded-xl" />
                    <Skeleton className="h-[150px] w-full rounded-xl" />
                    <Skeleton className="h-[150px] w-full rounded-xl" />
                </div>
            </div>
        </div>
    )
}
