import { Skeleton, LoadingAnnouncement } from "@/components/ui/LoadingSkeleton"

/**
 * Route-level loading state for both onboarding flows.
 *
 * Onboarding is a multi-step flow with no `loading.tsx`, so every step
 * transition could show a blank frame. This is the highest-stakes moment in the
 * product — the user has just signed up and has not yet seen anything work — so
 * a blank frame here costs more than anywhere else.
 *
 * Shaped like the step shell (progress rail + card) so arriving content does
 * not shift the layout.
 */
export default function Loading() {
    return (
        <div role="status" aria-busy="true" className="min-h-screen bg-background">
            <LoadingAnnouncement />
            <div className="mx-auto max-w-2xl px-4 py-10 space-y-8">
                <div className="flex items-center gap-2">
                    {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-1.5 flex-1 rounded-full" />
                    ))}
                </div>

                <div className="space-y-3">
                    <Skeleton className="h-7 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>

                <div className="rounded-3xl border border-border bg-card p-6 space-y-4 shadow-sm">
                    <Skeleton className="h-32 w-full rounded-2xl" />
                    <Skeleton className="h-11 w-full rounded-xl" />
                </div>
            </div>
        </div>
    )
}
