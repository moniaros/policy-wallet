import { createHash } from 'node:crypto'

/** Sorted keys make a source revision independent of JSON property order. */
export function sourceDigest(value: unknown): string {
    const canonical = (v: unknown): unknown => {
        if (v instanceof Date) return v.toISOString()
        if (Array.isArray(v)) return v.map(canonical)
        if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, child]) => [k, canonical(child)]))
        return v
    }
    return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
}

export type ApprovalContent = { body: string; language: string; recipientUserId: string; channel: string; sourceDigest: string }
export function approvalDigest(content: ApprovalContent): string {
    return sourceDigest({ body: content.body, language: content.language, recipientUserId: content.recipientUserId, channel: content.channel, sourceDigest: content.sourceDigest })
}
export function canDeliverRevision(revision: ApprovalContent & { status: string; approvalDigest: string | null }, currentSourceDigest: string) {
    return revision.status === 'approved' && revision.channel === 'collaboration' && revision.sourceDigest === currentSourceDigest && revision.approvalDigest === approvalDigest(revision)
}
