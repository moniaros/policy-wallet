/** Erase composed copies derived from a removed original, including archived analysis runs. */
export function removeComposedDocument(value: unknown, documentId: string): unknown {
    if (Array.isArray(value)) return value.map(v => removeComposedDocument(v, documentId))
    if (!value || typeof value !== 'object') return value
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => {
        if (key === 'benefitComposition' && entry && typeof entry === 'object' && 'documents' in entry && Array.isArray(entry.documents) && entry.documents.some((d: { id?: unknown } | null) => d?.id === documentId)) {
            // Empty snapshot prevents a fallback to an older single-document perk array.
            return [key, { version: '1', sourceVersion: 'withdrawn', generatedAt: new Date().toISOString(), period: null, activation: 'unconfirmed', issues: ['source_missing'], documents: [], benefits: [], conditions: [] }]
        }
        return [key, removeComposedDocument(entry, documentId)]
    }))
}
