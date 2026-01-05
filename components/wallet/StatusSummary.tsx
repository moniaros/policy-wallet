interface StatusSummaryProps {
    activeCount: number
    expiringCount: number
    actionNeededCount: number
}

export function StatusSummary({ activeCount, expiringCount, actionNeededCount }: StatusSummaryProps) {
    const parts: string[] = []
    if (activeCount > 0) {
        parts.push(`${activeCount} ${activeCount === 1 ? 'ενεργή ασφάλιση' : 'ενεργές ασφαλίσεις'}`)
    }
    if (expiringCount > 0) {
        parts.push(`${expiringCount} λήγει σύντομα`)
    }
    if (actionNeededCount > 0) {
        parts.push(`${actionNeededCount} χρειάζεται ενέργεια`)
    }

    const summaryText = parts.join(', ') || 'Δεν υπάρχουν ασφαλίσεις'

    return (
        <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 mb-2">
                Το Πορτοφόλι μου
            </h1>
            <p className="text-sm text-stone-600 dark:text-stone-400">
                {summaryText}
            </p>
        </div>
    )
}
