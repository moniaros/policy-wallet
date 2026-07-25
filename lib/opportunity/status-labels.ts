/**
 * Human labels for Opportunity.status (a raw String column, default "open").
 *
 * The activity feed built a bilingual message but interpolated the raw English
 * enum into BOTH languages — so a Greek advisor read «…ενημερώθηκε σε won», a
 * Greek sentence ending in a raw English code. These give the localised label.
 */
export type OpportunityStatus = 'open' | 'contacted' | 'won' | 'lost' | 'dismissed'

const OPPORTUNITY_STATUS_LABELS: Record<string, { en: string; el: string }> = {
    open: { en: 'Open', el: 'Ανοιχτή' },
    contacted: { en: 'Contacted', el: 'Σε επικοινωνία' },
    won: { en: 'Won', el: 'Κερδισμένη' },
    lost: { en: 'Lost', el: 'Χαμένη' },
    dismissed: { en: 'Dismissed', el: 'Απορρίφθηκε' },
}

/** Bilingual label for an opportunity status; unknown values fall back to the raw string. */
export function opportunityStatusLabel(status: string): { en: string; el: string } {
    return OPPORTUNITY_STATUS_LABELS[status] ?? { en: status, el: status }
}
