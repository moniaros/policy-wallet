import { Skeleton, LoadingAnnouncement } from "@/components/ui/LoadingSkeleton"

/**
 * Route-level loading state for the whole auth tree.
 *
 * Sign-in, sign-up, password reset and email verification had no `loading.tsx`
 * anywhere: the in-form spinners only appear AFTER a submit, so navigating to
 * any of these screens showed a blank frame until the page resolved. That is
 * the first thing a new user ever sees, and on a slow Greek mobile connection
 * it reads as a broken app rather than a slow one.
 *
 * Shaped like the auth card so the transition does not jump when the real form
 * arrives. Text-free by design — this renders above the LanguageProvider, so
 * the only copy is the bilingual sr-only announcement.
 */
export default function Loading() {
    return (
        <div
            role="status"
            aria-busy="true"
            className="min-h-screen flex items-center justify-center px-4 py-12"
        >
            <LoadingAnnouncement />
            <div className="w-full max-w-md space-y-6">
                <div className="flex flex-col items-center space-y-3">
                    <Skeleton className="h-12 w-12 rounded-2xl" />
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>

                <div className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                    <Skeleton className="h-11 w-full rounded-xl" />
                    <div className="flex justify-center">
                        <Skeleton className="h-4 w-40" />
                    </div>
                </div>
            </div>
        </div>
    )
}
