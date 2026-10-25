/**
 * The ONE way a public plan price is rendered.
 *
 * A plan's price is a NUMBER in `PublicPricingPlan.pricing` and becomes text
 * only here, in the reader's locale: «4,99 €» / «39 €» in Greek, «€4.99» / «€39»
 * in English. Until PW-CONTENT-02 it was a pre-formatted string («€4.99») that
 * four call sites parsed back with a regex — one of them the pricing JSON-LD,
 * where «4,99 €» would have been read as 499.
 *
 * `formatEur` (pricing-view-model.ts) stays for the authenticated surfaces
 * that use it; public routes do not import it.
 */
import { formatCurrency, type FormatLanguage } from "@/lib/i18n/format"

export function formatPlanPrice(value: number, language: FormatLanguage): string {
    return formatCurrency(value, language, { decimals: Number.isInteger(value) ? 0 : 2 })
}
