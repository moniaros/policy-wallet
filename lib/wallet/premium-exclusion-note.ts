/**
 * What a premium total leaves out, in one line.
 *
 * A premium footprint drops policies for three honest reasons — a foreign
 * currency that cannot be added to the majority one, no extracted premium, and
 * no readable term. A total that omits any of them without saying so understates
 * what the household actually spends. This composes the disclosure the wallet's
 * StatusSummary already shows, so the dashboard headline says the same thing.
 *
 * Pure and count-driven so it can be tested without rendering a server page:
 * each branch fires on its count and its count alone.
 */
export interface PremiumExclusionCounts {
    otherCurrencyCount: number
    unknownPremiumCount: number
    unknownDurationCount: number
}

export interface PremiumExclusionCopy {
    premiumExcludesOtherCurrency: string
    premiumExcludesOtherCurrencyPlural: string
    premiumExcludesNoAmount: string
    premiumExcludesNoAmountPlural: string
    premiumExcludesUnknown: string
    premiumExcludesUnknownPlural: string
}

const line = (count: number, one: string, many: string): string | null =>
    count > 0 ? (count === 1 ? one : many).replace('{count}', String(count)) : null

/**
 * One clause of the disclosure, with the registered `data-count` key for the
 * count it states (lib/instrumentation/count-keys.ts) — so a renderer can mark
 * each number instead of burying three counts in one opaque string (§6.7).
 */
export interface PremiumExclusionPart {
    countKey:
        | 'portfolio.premiumOtherCurrencyCount'
        | 'portfolio.premiumNoAmountCount'
        | 'portfolio.premiumUnknownDurationCount'
    count: number
    label: string
}

/** The disclosure, one part per non-zero count, in the note's fixed order. */
export function premiumExclusionParts(
    counts: PremiumExclusionCounts,
    copy: PremiumExclusionCopy
): PremiumExclusionPart[] {
    const parts: PremiumExclusionPart[] = []
    const other = line(counts.otherCurrencyCount, copy.premiumExcludesOtherCurrency, copy.premiumExcludesOtherCurrencyPlural)
    if (other) parts.push({ countKey: 'portfolio.premiumOtherCurrencyCount', count: counts.otherCurrencyCount, label: other })
    const noAmount = line(counts.unknownPremiumCount, copy.premiumExcludesNoAmount, copy.premiumExcludesNoAmountPlural)
    if (noAmount) parts.push({ countKey: 'portfolio.premiumNoAmountCount', count: counts.unknownPremiumCount, label: noAmount })
    const unknown = line(counts.unknownDurationCount, copy.premiumExcludesUnknown, copy.premiumExcludesUnknownPlural)
    if (unknown) parts.push({ countKey: 'portfolio.premiumUnknownDurationCount', count: counts.unknownDurationCount, label: unknown })
    return parts
}

/** The joined note, or undefined when the total leaves nothing out. */
export function premiumExclusionNote(
    counts: PremiumExclusionCounts,
    copy: PremiumExclusionCopy
): string | undefined {
    const parts = premiumExclusionParts(counts, copy)
    return parts.length > 0 ? parts.map((part) => part.label).join(' · ') : undefined
}
