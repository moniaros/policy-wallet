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
            el: "Δείκτης μακροχρόνιων ασφαλίσεων υγείας, 2024",
            en: "Long-term health insurance index, 2024",
        },
        caveat: {
            el: "Με την ηλικία: +6,24%. Χωρίς την ηλικία: +1,25%. Δεν είναι αύξηση κάθε ασφαλιστηρίου.",
            en: "Including age: +6.24%. Excluding age: +1.25%. Not the increase for every policy.",
        },
        source: {
            name: {
                el: "ΕΛΣΤΑΤ, Δείκτης Αναπροσαρμογής Μακροχρόνιων Ασφαλίσεων Υγείας 2024",
                en: "ELSTAT, Long-term Health Insurance Adjustment Index 2024",
            },
            url: "https://www.statistics.gr/documents/20181/cd813286-0dc3-612f-c399-302179805452",
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
            el: "Για τον ΕΝΦΙΑ 2026, υπό προϋποθέσεις. Το ποσοστό εξαρτάται από την αξία της κατοικίας και τη διάρκεια ασφάλισης το 2025.",
            en: "For ENFIA 2026, subject to conditions. The rate depends on the home's taxable value and insurance duration in 2025.",
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
