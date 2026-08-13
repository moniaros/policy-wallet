/**
 * Tag-scoped read-through caching for operator-editable configuration.
 *
 * Extracted verbatim from lib/notifications/config.ts, which had the only copy,
 * so the feature-flag loader can hold the same contract instead of growing a
 * second, subtly-different one. The behaviour is unchanged — see the reasoning
 * below, which is the reason this is not simply `unstable_cache` at module
 * scope.
 */

/**
 * Wrap a loader in Next's request cache, when there is one.
 *
 * Config loaders are called from crons, one-off scripts and tests as well as
 * from requests, and `unstable_cache` is not available in all of those.
 * Importing it at module scope made the whole notification delivery path depend
 * on a Next runtime — which is both wrong and, in practice, what broke seven
 * test suites that mock `next/cache` with only the functions they use.
 *
 * Outside a cache scope this reads through uncached. That is the correct
 * degradation: a cron doing one extra query per run costs nothing, and a
 * notification must never fail because caching was unavailable.
 */
export function withCache<T>(
    loader: () => Promise<T>,
    tag: string,
    revalidate: number
): () => Promise<T> {
    let wrapped: (() => Promise<T>) | null = null
    let attempted = false

    return async () => {
        if (!attempted) {
            attempted = true
            try {
                const { unstable_cache } = await import("next/cache")
                if (typeof unstable_cache === "function") {
                    wrapped = unstable_cache(loader, [tag], { tags: [tag], revalidate })
                }
            } catch {
                wrapped = null
            }
        }
        try {
            return wrapped ? await wrapped() : await loader()
        } catch {
            // A cache-layer failure must not become a delivery failure.
            return await loader()
        }
    }
}
