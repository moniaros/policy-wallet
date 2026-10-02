export interface HistoryIdentity {
    event_id: string
    event_key?: string
    has_in_app?: boolean
}

/** Preserve order and the in-app read-state owner when delivery arms straddle pages. */
export function mergeHistoryPages<T extends HistoryIdentity>(previous: readonly T[], incoming: readonly T[]): T[] {
    const events = new Map<string, T>()
    for (const row of [...previous, ...incoming]) {
        const key = row.event_key || row.event_id
        const existing = events.get(key)
        if (!existing || (!existing.has_in_app && row.has_in_app)) events.set(key, row)
    }
    return [...events.values()]
}
