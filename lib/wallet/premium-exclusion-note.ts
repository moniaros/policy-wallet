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

/** The joined note, or undefined when the total leaves nothing out. */
export function premiumExclusionNote(
    counts: PremiumExclusionCounts,
    copy: PremiumExclusionCopy
): string | undefined {
    const parts = [
        line(counts.otherCurrencyCount, copy.premiumExcludesOtherCurrency, copy.premiumExcludesOtherCurrencyPlural),
        line(counts.unknownPremiumCount, copy.premiumExcludesNoAmount, copy.premiumExcludesNoAmountPlural),
        line(counts.unknownDurationCount, copy.premiumExcludesUnknown, copy.premiumExcludesUnknownPlural),
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(' · ') : undefined
}
