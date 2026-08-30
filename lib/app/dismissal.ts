/**
 * Dismissal memory (§9): «Ό,τι μου πείτε "δεν με αφορά", δεν θα σας το
 * ξαναδείξω — εκτός αν αλλάξει κάτι.» A dismissed finding reopens only when
 * the underlying document or profile changed after the dismissal, or when the
 * relevant expiry has passed.
 */
export interface DismissalRecord {
    dismissedAt: Date | string
    /** Latest change to any document the finding was read from. */
    documentChangedAt?: Date | string | null
    /** Latest change to the profile fields the finding used. */
    profileChangedAt?: Date | string | null
    /** The expiry the finding pointed at, when it had one. */
    expiryAt?: Date | string | null
}

const t = (d: Date | string | null | undefined): number | null => (d ? new Date(d).getTime() : null)

export function shouldReopen(record: DismissalRecord, now: Date = new Date()): boolean {
    const dismissed = t(record.dismissedAt)!
    const doc = t(record.documentChangedAt)
    const profile = t(record.profileChangedAt)
    const expiry = t(record.expiryAt)
    if (doc !== null && doc > dismissed) return true
    if (profile !== null && profile > dismissed) return true
    if (expiry !== null && expiry <= now.getTime() && expiry > dismissed) return true
    return false
}

/** Which dismissed findings are visible again. */
export function visibleAfterDismissal<T extends { hash: string }>(
    findings: readonly T[],
    dismissals: ReadonlyMap<string, DismissalRecord>,
    now: Date = new Date()
): T[] {
    return findings.filter((f) => {
        const d = dismissals.get(f.hash)
        return !d || shouldReopen(d, now)
    })
}
