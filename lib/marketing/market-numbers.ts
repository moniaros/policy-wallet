import type { Bilingual } from "@/lib/marketing/positioning"

/**
 * The homepage market numbers (§6) — ONLY claims that resolve to a primary
 * source the repo has actually read. Two exist today:
 *
 *  - The ΕΔΑ: ΕΛΣΤΑΤ's annual health-premium index, from the Δελτίο Τύπου of
 *    29.07.2026 (reference year 2024), read directly. 6,24% is the aggregate
 *    WITH the age effect; 1,25% without it. Both render, because quoting only
 *    the larger one would be fear-selling with a real number.
 *  - The ENFIA discount: ν.5162/2024 άρθρο 10 (ΦΕΚ Α΄198/2024), read via the
 *    ΑΑΔΕ re-host. 20% for residences insured against earthquake, fire and
 *    flood with taxable value up to €500.000 (10% above), from 2025.
 *
 * The unsourced brief figures — "seven in ten never switch", "one in five
 * homes insured" — are NOT here and must not be added without a primary
 * source entry (standing rule: a public claim resolves to a primary source
 * or is cut, never hedged).
 */
export type MarketNumber = {
    id: string
    value: string
    label: Bilingual
    caveat: Bilingual
    source: { name: Bilingual; url: string; dated: string }
}

export const MARKET_NUMBERS: readonly MarketNumber[] = [
    {
        id: "eda-2024",
        value: "+6,24%",
        label: {
            el: "αύξηση ασφαλίστρων υγείας το 2024 (ΕΔΑ)",
            en: "health premium increase in 2024 (EDA index)",
        },
        caveat: {
            el: "Με την ηλικιακή επίδραση· χωρίς αυτήν, +1,25%.",
            en: "Including the age effect; excluding it, +1.25%.",
        },
        source: {
            name: {
                el: "ΕΛΣΤΑΤ, Ετήσιος Δείκτης Ασφαλίστρων υγείας 2024",
                en: "ELSTAT, Annual Health Premium Index 2024",
            },
            url: "https://www.statistics.gr/el/statistics/-/publication/DKT58/-",
            dated: "29.07.2026",
        },
    },
    {
        id: "enfia-2025",
        value: "20%",
        label: {
            el: "έκπτωση ΕΝΦΙΑ για ασφαλισμένες κατοικίες",
            en: "ENFIA discount for insured homes",
        },
        caveat: {
            el: "Για ασφάλιση σεισμού, πυρκαγιάς και πλημμύρας, αξία έως €500.000 — 10% άνω αυτής. Από το 2025.",
            en: "For earthquake, fire and flood cover, value up to €500,000 — 10% above. From 2025.",
        },
        source: {
            name: {
                el: "ν. 5162/2024, άρθρο 10 — ΦΕΚ Α΄ 198/05.12.2024",
                en: "Law 5162/2024, art. 10 — Government Gazette A΄ 198/05.12.2024",
            },
            url: "https://www.aade.gr/sites/default/files/2024-12/%CE%9D%205162%202024%20%CE%A6%CE%95%CE%9A%20198.pdf",
            dated: "05.12.2024",
        },
    },
]
