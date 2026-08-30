import type { Bilingual } from "@/lib/marketing/positioning"

/**
 * The homepage broker band (§6) — every capability named here mirrors one the
 * /solutions/agents page actually claims (its four widgets: portfolio
 * dashboard, per-client gap analysis, renewal reminders, branded report).
 * The homepage may say LESS than the product page, never more. The brief's
 * "60-day renewals" figure is not claimed on the product page, so it is not
 * claimed here either.
 */
export const BROKER_BAND = {
    kicker: { el: "Για ασφαλιστές", en: "For agents" },
    heading: {
        el: "Το χαρτοφυλάκιό σας, διαβασμένο.",
        en: "Your book of business, read.",
    },
    lead: {
        el: "Οι πελάτες που το επιλέγουν μοιράζονται το πορτοφόλι τους μαζί σας — και βλέπετε κενά, λήξεις και ερωτήσεις πριν σας πάρουν τηλέφωνο.",
        en: "Clients who choose to can share their wallet with you — and you see gaps, expiries and questions before they call.",
    },
    capabilities: [
        { el: "Όλοι οι πελάτες σε μία οθόνη", en: "All your clients on one screen" },
        { el: "Ανάλυση κενών ανά πελάτη", en: "Gap analysis per client" },
        { el: "Υπενθυμίσεις ανανεώσεων", en: "Renewal reminders" },
        { el: "Επώνυμη αναφορά προστασίας", en: "Branded protection report" },
    ] as readonly Bilingual[],
    cta: { el: "Δείτε τη λύση για ασφαλιστές", en: "See the agent solution" },
} as const

/**
 * The BrokerScanPanel's sample rows — fictional, role-labelled (no names, not
 * even invented ones), stamped ΔΕΙΓΜΑ by the component. Status renders through
 * the three-state system, never a severity scale: severity is an underwriting
 * verdict and marketing samples do not hand those out.
 */
export const BROKER_SCAN_ROWS: readonly {
    client: Bilingual
    lines: Bilingual
    state: "covered" | "gap" | "review"
    finding: Bilingual
}[] = [
    {
        client: { el: "Πελάτης Α", en: "Client A" },
        lines: { el: "Υγεία + Ζωή", en: "Health + Life" },
        state: "gap",
        finding: { el: "Η εξωνοσοκομειακή εξαιρείται — θέμα για το επόμενο ραντεβού.", en: "Outpatient excluded — one for the next meeting." },
    },
    {
        client: { el: "Πελάτης Β", en: "Client B" },
        lines: { el: "Κατοικία + Αυτοκίνητο", en: "Home + Motor" },
        state: "review",
        finding: { el: "Λήξη σε 18 ημέρες — το ανανεωτήριο δεν έχει ανέβει ακόμη.", en: "Expires in 18 days — the renewal is not uploaded yet." },
    },
    {
        client: { el: "Πελάτης Γ", en: "Client C" },
        lines: { el: "Επιχείρηση", en: "Business" },
        state: "covered",
        finding: { el: "Καλύψεις σε ισχύ· καμία εκκρεμότητα.", en: "Covers in force; nothing pending." },
    },
]

export const BROKER_SCAN_STRINGS = {
    stamp: { el: "ΔΕΙΓΜΑ — ΟΧΙ ΠΡΑΓΜΑΤΙΚΟΙ ΠΕΛΑΤΕΣ", en: "SAMPLE — NOT REAL CLIENTS" },
    panelLabel: { el: "Δείγμα σάρωσης χαρτοφυλακίου", en: "Sample portfolio scan" },
} as const
