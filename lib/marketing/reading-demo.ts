import type { Bilingual } from "@/lib/marketing/positioning"

/**
 * The ReadingDemo's sample content (§4.7) — three invented policies, one per
 * wedge line, each with the document lines the "scan" passes over and the
 * findings it reveals.
 *
 * Honesty rules this module answers to:
 *  - Everything here is a SAMPLE and renders under a permanent «ΔΕΙΓΜΑ» stamp;
 *    no line may read as a claim about any real insurer or product.
 *  - The three states carry their §4.2 meanings: `gap` is something the sample
 *    document itself shows missing or excluded; `review` is something the
 *    sample cannot settle (unreadable, referenced elsewhere, needs a fact the
 *    reader holds) — it NEVER silently becomes a gap.
 *  - Next steps use the §2 verbs: the demo hands the reader a question to ask,
 *    never a product to buy.
 */
export type ReadingDemoTab = {
    id: string
    label: Bilingual
    /** The sample document fragment the sweep reads, line by line. */
    docLines: readonly Bilingual[]
    results: readonly {
        state: "covered" | "gap" | "review"
        text: Bilingual
    }[]
}

export const READING_DEMO_TABS: readonly ReadingDemoTab[] = [
    {
        id: "health",
        label: { el: "Υγεία", en: "Health" },
        docLines: [
            { el: "Άρθρο 4 — Νοσοκομειακή περίθαλψη: έως €500.000 ανά έτος…", en: "Art. 4 — Inpatient care: up to €500,000 per year…" },
            { el: "Άρθρο 7 — Απαλλαγή: βλ. Πίνακα Παροχών…", en: "Art. 7 — Deductible: see Benefits Table…" },
            { el: "Άρθρο 9 — Περίοδοι αναμονής: 12 μήνες για…", en: "Art. 9 — Waiting periods: 12 months for…" },
            { el: "Άρθρο 12 — Εξαιρέσεις: εξωνοσοκομειακή περίθαλψη…", en: "Art. 12 — Exclusions: outpatient care…" },
        ],
        results: [
            { state: "covered", text: { el: "Νοσοκομειακή περίθαλψη: έως €500.000 τον χρόνο.", en: "Inpatient care: up to €500,000 a year." } },
            { state: "gap", text: { el: "Η εξωνοσοκομειακή περίθαλψη εξαιρείται — ερώτηση για τον ασφαλιστή σας.", en: "Outpatient care is excluded — a question for your insurer." } },
            { state: "review", text: { el: "Η απαλλαγή παραπέμπει σε πίνακα που δεν επισυνάπτεται. Χρειάζεται έλεγχο.", en: "The deductible points to a table that is not attached. Needs review." } },
            { state: "covered", text: { el: "Περίοδος αναμονής 12 μηνών: καταγράφηκε, με ημερομηνία λήξης της.", en: "12-month waiting period: recorded, with its end date." } },
        ],
    },
    {
        id: "home",
        label: { el: "Κατοικία", en: "Home" },
        docLines: [
            { el: "Καλύψεις: πυρκαγιά, κεραυνός, έκρηξη…", en: "Covers: fire, lightning, explosion…" },
            { el: "Προαιρετικές καλύψεις: σεισμός — ΔΕΝ έχει επιλεγεί…", en: "Optional covers: earthquake — NOT selected…" },
            { el: "Ασφαλιζόμενο κεφάλαιο: €180.000…", en: "Sum insured: €180,000…" },
            { el: "Αστική ευθύνη προς τρίτους: €100.000…", en: "Third-party liability: €100,000…" },
        ],
        results: [
            { state: "covered", text: { el: "Πυρκαγιά και κεραυνός: καλύπτονται.", en: "Fire and lightning: covered." } },
            { state: "gap", text: { el: "Ο σεισμός είναι προαιρετικός και δεν έχει επιλεγεί — ερώτηση για τον ασφαλιστή σας.", en: "Earthquake is optional and not selected — a question for your insurer." } },
            { state: "review", text: { el: "Αν τα €180.000 φτάνουν για ανακατασκευή εξαρτάται από το ακίνητό σας. Χρειάζεται έλεγχο.", en: "Whether €180,000 rebuilds your home depends on your property. Needs review." } },
            { state: "covered", text: { el: "Αστική ευθύνη: έως €100.000.", en: "Liability: up to €100,000." } },
        ],
    },
    {
        id: "motor",
        label: { el: "Αυτοκίνητο", en: "Motor" },
        docLines: [
            { el: "Αστική ευθύνη: σωματικές βλάβες / υλικές ζημίες…", en: "Third-party liability: bodily injury / property damage…" },
            { el: "Ίδιες ζημιές: με απαλλαγή €500…", en: "Own damage: €500 deductible…" },
            { el: "Θραύση κρυστάλλων: εξαιρείται…", en: "Glass breakage: excluded…" },
            { el: "Οδική βοήθεια: βλ. συνημμένο παράρτημα…", en: "Roadside assistance: see attached annex…" },
        ],
        results: [
            { state: "covered", text: { el: "Αστική ευθύνη: σε ισχύ, με τα υποχρεωτικά όρια.", en: "Third-party liability: in force, at the statutory limits." } },
            { state: "covered", text: { el: "Ίδιες ζημιές: καλύπτονται, με απαλλαγή €500.", en: "Own damage: covered, with a €500 deductible." } },
            { state: "gap", text: { el: "Η θραύση κρυστάλλων εξαιρείται — ερώτηση για τον ασφαλιστή σας.", en: "Glass breakage is excluded — a question for your insurer." } },
            { state: "review", text: { el: "Η οδική βοήθεια παραπέμπει σε παράρτημα που λείπει. Χρειάζεται έλεγχο.", en: "Roadside assistance points to a missing annex. Needs review." } },
        ],
    },
]

export const READING_DEMO_STRINGS = {
    heading: { el: "Δείτε πώς διαβάζουμε ένα συμβόλαιο.", en: "See how we read a policy." },
    tablistLabel: { el: "Δείγματα ασφαλιστηρίων", en: "Sample policies" },
    stamp: { el: "ΔΕΙΓΜΑ — ΟΧΙ ΠΡΑΓΜΑΤΙΚΟ ΑΣΦΑΛΙΣΤΗΡΙΟ", en: "SAMPLE — NOT A REAL POLICY" },
    scanning: { el: "Διαβάζουμε το δείγμα…", en: "Reading the sample…" },
    doneAnnouncement: {
        el: "Η ανάλυση του δείγματος ολοκληρώθηκε — 4 ευρήματα.",
        en: "Sample analysis complete — 4 findings.",
    },
    replay: { el: "Δείτε το ξανά", en: "Replay" },
} as const
