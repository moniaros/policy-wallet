/**
 * VAT math — single source of truth, client-safe (no server imports).
 *
 * PRICING MODEL: advertised prices are **VAT-inclusive** — the price shown is
 * the price charged. €49.99/mo means the customer pays €49.99, and that amount
 * already contains 24% Greek VAT. This helper splits a gross (advertised) price
 * into its net + contained-VAT components for invoicing/receipts.
 *
 * The Stripe `unit_amount` must therefore be the advertised price as-is — never
 * the price × 1.24 (that was the €49.99→€61.99 overcharge bug).
 */
export const GREEK_VAT_RATE = 0.24

export interface VATBreakdown {
    rate: number
    /** Ex-VAT (net) portion of the gross price. */
    net: number
    /** VAT amount contained within the gross price. */
    vat: number
    /** The advertised, VAT-inclusive price — what the customer is charged. */
    gross: number
}

/**
 * Split a VAT-inclusive (advertised) price into net + contained VAT.
 * net = gross / (1 + rate); vat = gross − net.
 */
export function vatInclusiveBreakdown(grossEur: number, countryCode: string = "GR"): VATBreakdown {
    const rate = countryCode === "GR" ? GREEK_VAT_RATE : 0
    const net = Math.round((grossEur / (1 + rate)) * 100) / 100
    const vat = Math.round((grossEur - net) * 100) / 100
    return { rate, net, vat, gross: grossEur }
}
