import { Skeleton } from "@/components/ui/skeleton"

/**
 * The area detail is a multi-await server render (auth, the attention
 * bundle, entitlements, the policy rows); without a loading state it would
 * flash blank behind the back link. Same shape as the page: a back pill, a
 * header card, three section cards. Bilingual announcement for the same
 * reason every route skeleton carries one: loading.tsx renders above the
 * language provider.
 */
export default function ProtectionAreaLoading() {
    return (
        <div role="status" aria-busy="true" className="pw-page-shell">
            <span className="sr-only">Φόρτωση… · Loading…</span>
            <div className="mx-auto max-w-3xl space-y-4 px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8 animate-in fade-in duration-500">
                <Skeleton className="h-11 w-40 rounded-full" />
                <div className="pw-card pw-pad space-y-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-6 w-56" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
                {[0, 1, 2].map((i) => (
                    <div key={i} className="pw-card pw-pad space-y-3">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-11 w-full rounded-xl" />
                        <Skeleton className="h-11 w-full rounded-xl" />
                    </div>
                ))}
            </div>
        </div>
    )
}
