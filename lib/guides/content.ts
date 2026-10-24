/**
 * Insurance guides — long-form, bilingual content targeting long-tail Greek
 * insurance queries (AEO/GEO). Greek is the primary language at /guides;
 * every article is fully mirrored in English at /en/guides (real routes with
 * their own metadata and JSON-LD), written for an expat reader — Greek
 * specifics (ΕΝΦΙΑ, uninsured-vehicle fines, ΑΑΔΕ) are explained, not assumed.
 *
 * Editorial rules:
 * - Every guide opens with a 40–60 word direct answer (featured-snippet shape).
 * - Question-phrased section headings.
 * - Factual claims that depend on legislation point readers to the official
 *   source (AADE, EAEE, Bank of Greece) instead of asserting volatile details.
 */
import { BASIC_WHEN, LADDER_FROM } from "@/lib/renewals/reminder-copy"
import { FREE_UP_TO } from "@/lib/marketing/limit-statement"

export type LocalizedString = { el: string; en: string }

/**
 * Comparison / worked-example table inside a section. Answer engines lift
 * tabular data far more reliably than the same facts buried in prose, so
 * "which option does what" content belongs here rather than in bullets.
 *
 * The first cell of every row is the row header (rendered as `th scope="row"`).
 * A boolean cell renders as a ✓/✗ pill; a localized string renders as text, so
 * a row can mix "yes", "no" and "only for its own policies" honestly.
 */
export type GuideTable = {
    /** Rendered as a real `caption` — describes what the table compares. */
    caption: LocalizedString
    /** Column headers, including the leading row-header column. */
    columns: LocalizedString[]
    rows: { cells: (LocalizedString | boolean)[] }[]
    /** Caveat printed under the table (e.g. "indicative — ask for quotes"). */
    note?: LocalizedString
}

export type GuideSection = {
    heading: LocalizedString
    paragraphs: LocalizedString[]
    bullets?: LocalizedString[]
    table?: GuideTable
}

export type GuideFaqItem = {
    question: LocalizedString
    answer: LocalizedString
}

export type GuideSource = {
    label: LocalizedString
    url: string
}

export type GuideAuthor = {
    /** Real, publishable person only — never a pen name (E-E-A-T). */
    name: string
    role: LocalizedString
    bio: LocalizedString
    profileUrl?: string
}

export type Guide = {
    slug: string
    title: LocalizedString
    /** Metadata title per locale, sized for the "%s | PolicyWallet" template. */
    metaTitle: LocalizedString
    /** Meta description per locale (140–160 chars, enforced by unit test). */
    metaDescription: LocalizedString
    /** Direct-answer opening paragraph (snippet-shaped, 40–60 words). */
    summary: LocalizedString
    datePublished: string
    dateModified: string
    readingMinutes: number
    /**
     * Named author for the byline + Article JSON-LD author: Person. When
     * absent the byline shows the PolicyWallet editorial team and the
     * schema author stays the Organization — honest either way.
     */
    author?: GuideAuthor
    sections: GuideSection[]
    faq: GuideFaqItem[]
    sources: GuideSource[]
    /**
     * Step-by-step guides can expose their steps for HowTo structured data
     * (e.g. the renewal checklist). Localized: each route emits the steps in
     * the language it serves.
     */
    howToSteps?: { name: LocalizedString; text: LocalizedString }[]
    /** Internal cross-links (related guides + the matching /product page). */
    related?: { label: LocalizedString; href: string }[]
}

export const guides: Guide[] = [
    {
        slug: "ekptosi-enfia-asfalisi-katoikias",
        title: {
            el: "Πώς παίρνετε έκπτωση ΕΝΦΙΑ με ασφάλιση κατοικίας;",
            en: "How do you get the ENFIA tax discount with home insurance?",
        },
        metaTitle: {
            el: "Έκπτωση ΕΝΦΙΑ με ασφάλιση κατοικίας: οδηγός",
            en: "ENFIA discount with home insurance: guide",
        },
        metaDescription: {
            el: "Τι προϋποθέσεις θέλει η ασφάλεια κατοικίας για έκπτωση στον ΕΝΦΙΑ: κάλυψη σεισμού, πυρκαγιάς και πλημμύρας, ελάχιστη διάρκεια και πώς δηλώνεται στην ΑΑΔΕ.",
            en: "What your home policy needs for Greece's ENFIA property-tax discount: earthquake, fire and flood cover, minimum duration and how AADE gets the data.",
        },
        summary: {
            el: "Η ασφάλιση κατοικίας μπορεί να μειώσει τον ΕΝΦΙΑ σας, αν πληροί τις προϋποθέσεις της ΑΑΔΕ. Χρειάζεται κάλυψη για σεισμό, πυρκαγιά και πλημμύρα, για το απαιτούμενο διάστημα και ποσό. Η ασφαλιστική στέλνει τα στοιχεία στην ΑΑΔΕ. Εσείς ελέγχετε την αίτηση και συνδέετε το ασφαλιστήριο με την κατοικία σας.",
            en: "Home insurance may reduce your ENFIA property tax if it meets AADE’s conditions. You need earthquake, fire and flood cover for the required period and amount. Your insurer sends the details to AADE. You check the application and link the policy to your home.",
        },
        datePublished: "2026-07-07",
        // TODO(quarterly-review): ENFIA discount rates/thresholds change with
        // tax legislation — re-verify against aade.gr every quarter (next due
        // 2026-10-01) and bump dateModified ONLY when actually reviewed.
        dateModified: "2026-10-21",
        readingMinutes: 6,
        related: [
            {
                label: {
                    el: "Πόσο κοστίζει η ασφάλιση σεισμού;",
                    en: "How much does earthquake insurance cost?",
                },
                href: "/guides/poso-kostizei-i-asfalisi-seismou",
            },
            {
                label: {
                    el: "Ασφάλεια κατοικίας στο PolicyWallet",
                    en: "Home insurance in PolicyWallet",
                },
                href: "/product/property",
            },
        ],
        sections: [
            {
                heading: {
                    el: "Ποιες είναι οι προϋποθέσεις για την έκπτωση ΕΝΦΙΑ;",
                    en: "What are the conditions for the ENFIA discount?",
                },
                paragraphs: [
                    {
                        el: "Για την έκπτωση δεν αρκεί να έχετε ασφάλεια κατοικίας. Πρέπει να ισχύουν μαζί οι παρακάτω προϋποθέσεις. Ελέγξτε και τις οδηγίες της ΑΑΔΕ για το έτος της αίτησής σας:",
                        en: "Having home insurance alone is not enough for the reduction. The conditions below must all be met. Also check AADE’s instructions for your application year:",
                    },
                ],
                bullets: [
                    {
                        el: "Κάλυψη και των τριών κινδύνων: σεισμός, πυρκαγιά και πλημμύρα. Αν λείπει έστω ένας, δεν υπάρχει έκπτωση.",
                        en: "Coverage of all three risks: earthquake, fire, and flood. If even one is missing, there is no discount.",
                    },
                    {
                        el: "Ελάχιστη διάρκεια ασφάλισης τριών μηνών μέσα στο προηγούμενο έτος — για μικρότερη του έτους διάρκεια, η έκπτωση υπολογίζεται αναλογικά.",
                        en: "Minimum insured duration of three months within the previous year — for less than a full year, the discount is prorated.",
                    },
                    {
                        el: "Για τον ΕΝΦΙΑ 2026, η ΑΑΔΕ χρησιμοποιεί αξία ανακατασκευής 900 € ανά τετραγωνικό μέτρο. Το ποσό ασφάλισης πρέπει να καλύπτει την αξία που προκύπτει με αυτόν τον κανόνα. Το φορολογικό αυτό μέγεθος δεν είναι εκτίμηση του πραγματικού κόστους να ξαναχτιστεί το σπίτι σας.",
                        en: "For ENFIA 2026, AADE uses a reconstruction value of €900 per square metre. The insured amount must cover the value calculated under that rule. This tax measure is not an estimate of your home's actual rebuilding cost.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πόση είναι η μείωση για τον ΕΝΦΙΑ 2026;",
                    en: "How large is the discount today?",
                },
                paragraphs: [
                    {
                        el: "Για κατοικία με φορολογητέα αξία έως 500.000 €, η μείωση είναι 20%. Πάνω από αυτό το ποσό είναι 10%. Τα πλήρη ποσοστά αφορούν ασφάλιση σε όλο το 2025. Για μικρότερη διάρκεια, τουλάχιστον τριών μηνών, η μείωση υπολογίζεται αναλογικά.",
                        en: "The reduction is 20% for a home with a taxable value up to €500,000 and 10% above that amount. The full rates require insurance throughout 2025. For a shorter period of at least three months, the reduction is proportional.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πώς δηλώνεται η ασφάλιση στην ΑΑΔΕ;",
                    en: "How is the insurance reported to AADE?",
                },
                paragraphs: [
                    {
                        el: "Χρειάζεται αίτηση στην εφαρμογή «Μείωση ΕΝΦΙΑ ασφαλισμένων κατοικιών» του myAADE. Η ασφαλιστική στέλνει τα στοιχεία ασφάλισης. Εσείς ελέγχετε τα στοιχεία, συνδέετε την κατοικία με όλα τα σχετικά ασφαλιστήρια και δηλώνετε τυχόν συνιδιοκτήτες. Ακολουθήστε τις προθεσμίες της ΑΑΔΕ για το έτος της αίτησης.",
                        en: "Apply through myAADE's insured-home ENFIA reduction service. The insurer submits insurance data. You check the information, link the home to all relevant policies and declare any co-owners. Follow AADE's deadlines for the application year.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πώς ελέγχετε ότι το ασφαλιστήριό σας πληροί τα κριτήρια;",
                    en: "How do you check that your policy qualifies?",
                },
                paragraphs: [
                    {
                        el: "Ανοίξτε τον πίνακα καλύψεων του ασφαλιστηρίου και αναζητήστε ρητά τις λέξεις «σεισμός», «πυρκαγιά» και «πλημμύρα» στις καλυπτόμενες ζημιές — όχι στις προαιρετικές ή στις εξαιρέσεις. Ελέγξτε επίσης το ασφαλιζόμενο κεφάλαιο κτίσματος σε σχέση με τα τετραγωνικά μέτρα. Εναλλακτικά, ανεβάστε το PDF του ασφαλιστηρίου στο PolicyWallet: η ανάλυση AI σας δείχνει ποιες καλύψεις αναφέρει το ασφαλιστήριο, ώστε να δείτε αν λείπει κάποιος από τους τρεις κινδύνους της έκπτωσης ΕΝΦΙΑ — και, εφόσον το έγγραφο αναφέρει και τα δύο ποσά, αν το ασφαλισμένο κεφάλαιο υπολείπεται του κόστους ανακατασκευής.",
                        en: "Open your policy's coverage table and look for earthquake, fire, and flood explicitly listed among the covered perils — not in the optional add-ons or the exclusions. Also check the insured building sum against your square meters. Alternatively, upload the policy PDF to PolicyWallet: the AI analysis shows you which perils the policy names, so you can see whether one of the three ENFIA-discount perils is missing — and, provided the document states both amounts, whether the insured sum falls below the reconstruction cost.",
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Ισχύει η έκπτωση ΕΝΦΙΑ αν η ασφάλιση καλύπτει μόνο πυρκαγιά;",
                    en: "Does the ENFIA discount apply if the policy only covers fire?",
                },
                answer: {
                    el: "Όχι. Απαιτείται σωρευτική κάλυψη και των τριών κινδύνων — σεισμού, πυρκαγιάς και πλημμύρας. Ασφαλιστήριο μόνο πυρός δεν θεμελιώνει δικαίωμα έκπτωσης.",
                    en: "No. Cumulative coverage of all three risks — earthquake, fire, and flood — is required. A fire-only policy does not qualify.",
                },
            },
            {
                question: {
                    el: "Χρειάζεται αίτηση για την έκπτωση ΕΝΦΙΑ;",
                    en: "Do I need to apply for the ENFIA discount?",
                },
                answer: {
                    el: "Ναι. Η αποστολή στοιχείων από την ασφαλιστική δεν αντικαθιστά την αίτησή σας στο myAADE. Ελέγξτε την κατοικία, τα ασφαλιστήρια και τους συνιδιοκτήτες σύμφωνα με τις οδηγίες της ΑΑΔΕ.",
                    en: "Yes. The insurer's data submission does not replace your myAADE application. Check the home, policies and co-owners following AADE's instructions.",
                },
            },
            {
                question: {
                    el: "Αξίζει οικονομικά η ασφάλιση κατοικίας μόνο για την έκπτωση;",
                    en: "Is home insurance worth it just for the discount?",
                },
                answer: {
                    el: "Η μείωση ΕΝΦΙΑ είναι ένα στοιχείο του κόστους. Ελέγξτε επίσης τι καλύπτει η ασφάλιση, έως ποιο ποσό και τι θα πληρώνατε εσείς σε ζημιά. Η επιλογή εξαρτάται από την κατοικία και τις ανάγκες σας.",
                    en: "The ENFIA reduction is one part of the cost. Also check the cover, limits and your share of a claim. The choice depends on your home and needs.",
                },
            },
        ],
        sources: [{"label":{"el":"ΑΑΔΕ — ερωτήσεις και απαντήσεις για τον ΕΝΦΙΑ 2026","en":"AADE — ENFIA 2026 questions and answers"},"url":"https://www.aade.gr/sites/default/files/2026-01/FAQs_asfalismenwn_katoik2026.pdf"},
            {
                label: { el: "ΑΑΔΕ — οδηγίες μείωσης ΕΝΦΙΑ για το 2026", en: "AADE — ENFIA reduction guidance for 2026" },
                url: "https://aade.gr/sites/default/files/2026-01/dt_14.01.2026_0.pdf",
            },
            {
                // The statutory claim's PRIMARY source: ν. 5162/2024 άρθρο 10
                // (ΦΕΚ Α΄ 198/05.12.2024), amending παρ. 7Ζ άρθρου 3 ν. 4223/2013 —
                // the ΑΑΔΕ re-host of the signed ΦΕΚ PDF, verified against the
                // text itself on 2026-08-30 (p. 9972): 20% for taxable value
                // ≤ €500.000 from 2025, 10% above; perils σεισμός, πυρκαγιά,
                // πλημμύρα; cover for the WHOLE value on a reconstruction basis
                // with a €1.000/τ.μ. floor; minimum three months in the prior
                // year, pro-rated below twelve. Replaces this guide's bare
                // aade.gr origin (G-07 / GB-04 debt, one entry repaid).
                label: {
                    el: "ν. 5162/2024, άρθρο 10 — ΦΕΚ Α΄ 198/05.12.2024 (ΑΑΔΕ)",
                    en: "Law 5162/2024, art. 10 — Government Gazette A΄ 198/05.12.2024 (AADE)",
                },
                url: "https://www.aade.gr/sites/default/files/2024-12/%CE%9D%205162%202024%20%CE%A6%CE%95%CE%9A%20198.pdf",
            },
            {
                label: {
                    el: "ΕΑΕΕ — Ένωση Ασφαλιστικών Εταιριών Ελλάδος",
                    en: "HAIC — Hellenic Association of Insurance Companies",
                },
                url: "https://www.eaee.gr",
            },
        ],
    },
    {
        slug: "kena-kalypsis-ti-einai-pos-ta-vriskete",
        title: {
            el: "Τι είναι τα κενά κάλυψης και πώς τα εντοπίζετε;",
            en: "What are coverage gaps and how do you find them?",
        },
        metaTitle: {
            el: "Κενά κάλυψης: τι είναι και πώς τα εντοπίζετε",
            en: "Insurance coverage gaps: how to find them",
        },
        metaDescription: {
            el: "Τι μπορεί να λείπει από μια ασφάλιση, πώς διαβάζετε τις εξαιρέσεις και τα ποσά και ποιες ερωτήσεις βοηθούν στη συζήτηση με τον ασφαλιστή σας.",
            en: "A coverage gap is the risk you think is insured but is not. The most common gaps in Greece, the average rule (pro-rata) and how to find yours in minutes.",
        },
        summary: {
            el: "Κενό κάλυψης μπορεί να υπάρχει όταν μια ανάγκη σας δεν καλύπτεται ή το ποσό ασφάλισης δεν επαρκεί. Για να το κρίνετε, χρειάζονται οι όροι και τα πραγματικά στοιχεία της περίπτωσής σας. Με το Family, το PolicyWallet επισημαίνει συγκεκριμένα σημεία των εγγράφων για έλεγχο· δεν βεβαιώνει ότι έχετε πλήρη προστασία.",
            en: "A coverage gap may exist when a need is not covered or the insured amount is insufficient. Assessing it requires the terms and your actual circumstances. With Family, PolicyWallet flags specific document findings for review; it does not certify complete protection.",
        },
        datePublished: "2026-07-07",
        dateModified: "2026-10-21",
        readingMinutes: 7,
        sections: [
            {
                heading: {
                    el: "Ποια σημεία αξίζει να ελέγξετε;",
                    en: "Which points are worth checking?",
                },
                paragraphs: [
                    {
                        el: "Ξεκινήστε από τις καλύψεις, τις εξαιρέσεις και τα ποσά. Τα παρακάτω είναι παραδείγματα για έλεγχο, όχι κατάταξη των συχνότερων προβλημάτων στην Ελλάδα.",
                        en: "Start with cover, exclusions and amounts. The following are examples to review, not a ranking of the most common problems in Greece.",
                    },
                ],
                bullets: [
                    {
                        el: "Σεισμός εκτός κάλυψης: σε πολλά ασφαλιστήρια κατοικίας ο σεισμός είναι προαιρετική επέκταση και δεν προστέθηκε ποτέ.",
                        en: "Earthquake not covered: in many mortgage-linked policies earthquake is an optional extension that was never added.",
                    },
                    {
                        el: "Υπασφάλιση κτίσματος: το κόστος ανακατασκευής ανέβηκε με τον πληθωρισμό, αλλά το ασφαλιζόμενο κεφάλαιο έμεινε στο επίπεδο της αγοράς του ακινήτου πριν από χρόνια.",
                        en: "Building underinsurance: reconstruction costs rose with inflation, but the insured sum stayed where it was set years ago.",
                    },
                    {
                        el: "Υψηλή απαλλαγή υγείας: μια απαλλαγή 1.500 € σημαίνει ότι τα περισσότερα περιστατικά πληρώνονται εξ ολοκλήρου από εσάς.",
                        en: "High health deductible: a €1,500 deductible means most incidents are paid entirely out of pocket.",
                    },
                    {
                        el: "Οδική βοήθεια και ίδιες ζημιές: θεωρούνται δεδομένες στο αυτοκίνητο, αλλά συχνά λείπουν από βασικά πακέτα.",
                        en: "Roadside assistance and own damage: assumed by default in motor policies but often missing from basic packages.",
                    },
                    {
                        el: "Επικαλύψεις: δύο ασφαλιστήρια που πληρώνετε για τον ίδιο κίνδυνο (π.χ. ταξιδιωτική κάλυψη σε κάρτα και σε αυτόνομο ασφαλιστήριο) — χρήματα χαμένα.",
                        en: "Overlaps: two policies paying for the same risk (e.g., travel cover on a card and in a standalone policy) — wasted money.",
                    },
                ],
            },
            {
                heading: {
                    el: "Τι είναι ο αναλογικός κανόνας και γιατί σας αφορά;",
                    en: "What is the average rule and why does it matter?",
                },
                paragraphs: [
                    {
                        el: "Παράδειγμα: ένα σπίτι κοστίζει 200.000 € να ξαναχτιστεί, αλλά είναι ασφαλισμένο για 100.000 €, δηλαδή για το μισό ποσό. Αν εφαρμόζεται ο αναλογικός κανόνας, μια ζημιά 20.000 € μπορεί να δώσει αποζημίωση 10.000 €, πριν από άλλες αφαιρέσεις. Αυτό λέγεται υπασφάλιση. Ελέγξτε αν ο κανόνας ισχύει στη δική σας κάλυψη και συζητήστε το ποσό με τον ασφαλιστή σας.",
                        en: "Example: a home costs €200,000 to rebuild but is insured for €100,000, half that amount. If the average clause applies, a €20,000 loss may result in a €10,000 payout before other deductions. This is underinsurance. Check whether the clause applies to your cover and discuss the insured amount with your insurance advisor.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πώς εντοπίζετε τα κενά κάλυψης βήμα-βήμα;",
                    en: "How do you find coverage gaps step by step?",
                },
                paragraphs: [
                    {
                        el: "Ο χειροκίνητος έλεγχος θέλει τρία βήματα: πρώτον, διαβάστε τον πίνακα καλύψεων και σημειώστε τι πραγματικά περιλαμβάνεται — όχι τι υποθέτετε. Δεύτερον, διαβάστε τις εξαιρέσεις: εκεί κρύβονται τα περισσότερα κενά. Τρίτον, συγκρίνετε τα ασφαλιζόμενα κεφάλαια με τις σημερινές αξίες (ανακατασκευή, εξοπλισμός, εισόδημα). Το PolicyWallet αυτοματοποιεί και τα τρία: ανεβάζετε τα PDF των ασφαλιστηρίων και η AI διαβάζει καλύψεις και εξαιρέσεις σε απλά ελληνικά, και δείχνει πιθανές επικαλύψεις· στο πλάνο Family τα διασταυρώνει και εντοπίζει και τα κενά.",
                        en: "A manual check takes three steps: first, read the coverage table and note what is actually included — not what you assume. Second, read the exclusions: that is where most gaps hide. Third, compare insured sums against today's values (reconstruction, contents, income). PolicyWallet automates all three: you upload the policy PDFs and the AI reads coverages and exclusions in plain language and shows possible overlaps; on the Family plan it also cross-checks them and flags gaps.",
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Πόσο συχνά πρέπει να ελέγχω για κενά κάλυψης;",
                    en: "How often should I check for coverage gaps?",
                },
                answer: {
                    el: "Τουλάχιστον μία φορά τον χρόνο, πριν από κάθε ανανέωση, και επιπλέον μετά από κάθε σημαντική αλλαγή: μετακόμιση, ανακαίνιση, νέο μέλος οικογένειας, νέο όχημα ή αλλαγή εργασίας.",
                    en: "At least once a year, before each renewal, and additionally after every major life change: moving, renovation, a new family member, a new vehicle, or a job change.",
                },
            },
            {
                question: {
                    el: "Το κενό κάλυψης σημαίνει ότι φταίει ο ασφαλιστής μου;",
                    en: "Does a coverage gap mean my agent failed me?",
                },
                answer: {
                    el: "Όχι απαραίτητα. Οι ανάγκες αλλάζουν πιο γρήγορα από τα ασφαλιστήρια. Ένα ουδέτερο εργαλείο ανάλυσης σας δίνει καθαρή εικόνα, ώστε η συζήτηση με τον ασφαλιστή σας να γίνεται με συγκεκριμένα δεδομένα.",
                    en: "Not necessarily. Needs change faster than policies do. A neutral analysis tool gives you a clear picture so the conversation with your agent starts from concrete data.",
                },
            },
            {
                question: {
                    el: "Μπορεί η AI να διαβάσει οποιοδήποτε ασφαλιστήριο;",
                    en: "Can the AI read any insurance policy?",
                },
                answer: {
                    el: "Ναι — εφόσον έχετε το ασφαλιστήριο σε PDF, η ανάλυση λειτουργεί ανεξάρτητα από ασφαλιστική εταιρεία ή διαμεσολαβητή, για όλες τις βασικές κατηγορίες: αυτοκίνητο, κατοικία, υγεία, ομαδικά, κυβερνοασφάλεια και κατοικίδια.",
                    en: "Yes — as long as you have the policy PDF, the analysis works regardless of insurer or intermediary, across all major lines: motor, home, health, group, cyber, and pet.",
                },
            },
        ],
        sources: [
            {
                label: {
                    el: "ΕΑΕΕ — Ετήσια στατιστικά στοιχεία ασφαλιστικής αγοράς",
                    en: "HAIC — Annual Greek insurance market statistics",
                },
                url: "https://www.eaee.gr",
            },
            {
                label: {
                    el: "Τράπεζα της Ελλάδος — Εποπτεία ιδιωτικής ασφάλισης",
                    en: "Bank of Greece — Private insurance supervision",
                },
                url: "https://www.bankofgreece.gr",
            },
        ],
        related: [
            {
                label: { el: "Σκορ Προστασίας", en: "Protection Score" },
                href: "/lexiko/skor-prostasias",
            },
            {
                label: {
                    el: "Πού διαχειρίζεστε όλα τα ασφαλιστήριά σας online",
                    en: "Where to manage all your policies online",
                },
                href: "/guides/diaxeirisi-asfalistirion-se-ena-simeio",
            },
            {
                label: {
                    el: "Ανάλυση ασφαλιστηρίου με AI",
                    en: "AI policy analysis",
                },
                href: "/product",
            },
        ],
    },
    {
        slug: "checklist-ananeosis-asfalistiriou",
        title: {
            el: "Τι ελέγχετε πριν από την ανανέωση ασφαλιστηρίου;",
            en: "What should you check before renewing an insurance policy?",
        },
        metaTitle: {
            el: "Ανανέωση ασφαλιστηρίου: λίστα 7 βημάτων",
            en: "Insurance renewal checklist: 7 steps",
        },
        metaDescription: {
            el: "Μην ανανεώνετε στα τυφλά: 7 βήματα πριν από κάθε ανανέωση ασφαλιστηρίου — αξίες, απαλλαγές, εξαιρέσεις, σύγκριση αγοράς και συνέχεια κάλυψης χωρίς κενά ημερών.",
            en: "Do not renew blindly: 7 steps before every insurance renewal — insured sums, deductibles, exclusions, market comparison and continuity with no gap days.",
        },
        summary: {
            el: "Πριν από κάθε ανανέωση ασφαλιστηρίου ελέγξτε επτά πράγματα: τι άλλαξε στη ζωή σας, αν τα κεφάλαια αντιστοιχούν στις σημερινές αξίες, το ύψος της απαλλαγής, τις εξαιρέσεις, την αύξηση του ασφαλίστρου, τουλάχιστον μία εναλλακτική προσφορά και τη συνέχεια της κάλυψης χωρίς κενό ημερών. Ξεκινήστε 30 ημέρες πριν από τη λήξη.",
            en: "Before every policy renewal, check seven things: what changed in your life, whether insured sums match today's values, the deductible level, the exclusions, the premium increase, at least one alternative quote, and continuity of coverage with no gap days. Start 30 days before expiry.",
        },
        datePublished: "2026-07-07",
        dateModified: "2026-10-21",
        readingMinutes: 5,
        // HowTo structured data for the 7-step checklist (rendered by the
        // guide route when howToSteps is present). Every name and text is a
        // VERBATIM substring of the visible checklist bullets below (minus the
        // "N. " ordinal) — structured data must never say what the page
        // doesn't. Edit the bullets and these together.
        howToSteps: [
            {
                name: {
                    el: "Καταγράψτε τι άλλαξε",
                    en: "Note what changed",
                },
                text: {
                    el: "Καταγράψτε τι άλλαξε: μετακόμιση, ανακαίνιση, νέο όχημα, οικογενειακές αλλαγές, νέος εξοπλισμός.",
                    en: "Note what changed: moving, renovation, new vehicle, family changes, new equipment.",
                },
            },
            {
                name: {
                    el: "Επικαιροποιήστε τα κεφάλαια",
                    en: "Update insured sums",
                },
                text: {
                    el: "Δείτε αν τα ποσά ασφάλισης ταιριάζουν ακόμη στην αξία του οχήματος, του κτιρίου ή των αντικειμένων σας.",
                    en: "Update insured sums: home reconstruction cost, vehicle market value, contents value.",
                },
            },
            {
                name: {
                    el: "Ελέγξτε την απαλλαγή",
                    en: "Review the deductible",
                },
                text: {
                    el: "Δείτε ποιο ποσό ή ποσοστό πληρώνετε εσείς σε ζημιά. Συγκρίνετε και το ασφάλιστρο: η διαφορά δεν είναι ίδια σε όλα τα προγράμματα.",
                    en: "Check the amount or percentage you pay towards a claim. Compare the premium too: the difference is not the same in every programme.",
                },
            },
            {
                name: {
                    el: "Ξαναδιαβάστε τις εξαιρέσεις",
                    en: "Re-read the exclusions",
                },
                text: {
                    el: "Ξαναδιαβάστε τις εξαιρέσεις: οι όροι αλλάζουν στις ανανεώσεις, συχνά χωρίς να το προσέξετε.",
                    en: "Re-read the exclusions: terms change at renewal, often without you noticing.",
                },
            },
            {
                name: {
                    el: "Συγκρίνετε την αύξηση",
                    en: "Question the increase",
                },
                text: {
                    el: "Συγκρίνετε την αύξηση: αν το ασφάλιστρο ανέβηκε, ζητήστε αιτιολόγηση και ελέγξτε τι δίνει η αγορά.",
                    en: "Question the increase: if the premium went up, ask why and check what the market offers.",
                },
            },
            {
                name: {
                    el: "Πάρτε τουλάχιστον μία εναλλακτική προσφορά",
                    en: "Get at least one alternative quote",
                },
                text: {
                    el: "Πάρτε τουλάχιστον μία εναλλακτική προσφορά με ίδιες καλύψεις — αλλιώς η σύγκριση τιμής είναι παραπλανητική.",
                    en: "Get at least one alternative quote with identical coverages — otherwise the price comparison is misleading.",
                },
            },
            {
                name: {
                    el: "Εξασφαλίστε συνέχεια",
                    en: "Ensure continuity",
                },
                text: {
                    el: "Εξασφαλίστε συνέχεια: η νέα κάλυψη πρέπει να ξεκινά την ημέρα που λήγει η παλιά. Ένα κενό ημερών μπορεί να κοστίσει και την έκπτωση ΕΝΦΙΑ.",
                    en: "Ensure continuity: the new coverage must start the day the old one ends. A gap of days can even cost you the ENFIA discount.",
                },
            },
        ],
        related: [
            {
                label: {
                    el: "Πού διαχειρίζεστε όλα τα ασφαλιστήριά σας online",
                    en: "Where to manage all your policies online",
                },
                href: "/guides/diaxeirisi-asfalistirion-se-ena-simeio",
            },
            {
                label: {
                    el: "Κενά κάλυψης: τι είναι και πώς τα βρίσκετε;",
                    en: "Coverage gaps: what they are and how to find them",
                },
                href: "/guides/kena-kalypsis-ti-einai-pos-ta-vriskete",
            },
            {
                label: {
                    el: "Πρόστιμο ανασφάλιστου οχήματος: ποσά και διαδικασία",
                    en: "Uninsured vehicle fine: amounts and process",
                },
                href: "/guides/prostimo-anasfalistou-oximatos",
            },
            {
                label: {
                    el: "Αναλογικός κανόνας και υπασφάλιση κατοικίας",
                    en: "The average clause and underinsurance",
                },
                href: "/guides/analogikos-kanonas-ypasfalisi-katoikias",
            },
        ],
        sections: [
            {
                heading: {
                    el: "Ποια είναι τα 7 βήματα πριν από την ανανέωση;",
                    en: "What are the 7 steps before renewal?",
                },
                paragraphs: [
                    {
                        el: "Η ανανέωση είναι μια καλή στιγμή για έλεγχο. Αλλαγές μπορούν να γίνουν και μέσα στη χρονιά, εφόσον συμφωνηθούν με την εταιρεία. Το κόστος και οι προϋποθέσεις διαφέρουν.",
                        en: "Renewal is a useful time to review cover. Changes may also be agreed with the insurer during the year. Costs and conditions vary.",
                    },
                ],
                bullets: [
                    {
                        el: "1. Καταγράψτε τι άλλαξε: μετακόμιση, ανακαίνιση, νέο όχημα, οικογενειακές αλλαγές, νέος εξοπλισμός.",
                        en: "1. Note what changed: moving, renovation, new vehicle, family changes, new equipment.",
                    },
                    {
                        el: "2. Επικαιροποιήστε τα κεφάλαια: κόστος ανακατασκευής κατοικίας, εμπορική αξία οχήματος, αξία περιεχομένου.",
                        en: "2. Update insured sums: home reconstruction cost, vehicle market value, contents value.",
                    },
                    {
                        el: "3. Ελέγξτε τη συμμετοχή σας σε ζημιά: ποιο ποσό ή ποσοστό πληρώνετε εσείς και πώς αλλάζει το ασφάλιστρο αν αλλάξει αυτό το ποσό.",
                        en: "3. Check your share of a claim: the amount or percentage you pay and how the premium changes if that amount changes.",
                    },
                    {
                        el: "4. Ξαναδιαβάστε τις εξαιρέσεις: οι όροι αλλάζουν στις ανανεώσεις, συχνά χωρίς να το προσέξετε.",
                        en: "4. Re-read the exclusions: terms change at renewal, often without you noticing.",
                    },
                    {
                        el: "5. Συγκρίνετε την αύξηση: αν το ασφάλιστρο ανέβηκε, ζητήστε αιτιολόγηση και ελέγξτε τι δίνει η αγορά.",
                        en: "5. Question the increase: if the premium went up, ask why and check what the market offers.",
                    },
                    {
                        el: "6. Πάρτε τουλάχιστον μία εναλλακτική προσφορά με ίδιες καλύψεις — αλλιώς η σύγκριση τιμής είναι παραπλανητική.",
                        en: "6. Get at least one alternative quote with identical coverages — otherwise the price comparison is misleading.",
                    },
                    {
                        el: "7. Εξασφαλίστε συνέχεια: η νέα κάλυψη πρέπει να ξεκινά την ημέρα που λήγει η παλιά. Ένα κενό ημερών μπορεί να κοστίσει και την έκπτωση ΕΝΦΙΑ.",
                        en: "7. Ensure continuity: the new coverage must start the day the old one ends. A gap of days can even cost you the ENFIA discount.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πότε πρέπει να ξεκινήσετε τη διαδικασία;",
                    en: "When should you start the process?",
                },
                paragraphs: [
                    {
                        el: "Τριάντα ημέρες πριν από τη λήξη. Έτσι προλαβαίνετε να ζητήσετε προσφορές, να διαπραγματευτείτε και να μην βρεθείτε χωρίς χρόνο να αποφασίσετε με αυτόματη ανανέωση σε χειρότερους όρους. Το PolicyWallet κρατά τις ημερομηνίες λήξης των ασφαλιστηρίων σας σε ένα σημείο και σας στέλνει υπενθύμιση πριν τη λήξη, με έτοιμη τη σύνοψη καλύψεων για να συγκρίνετε προσφορές σε ίση βάση.",
                        // Every plan gets one renewal reminder email once the policy is within 30
                        // days (lib/renewals/reminder-copy.ts); the longer ladder is Plus and Family — so neither
                        // language attributes the reminder to a plan (PW-CONTENT-02).
                        en: "Thirty days before expiry. That leaves time to request quotes, negotiate, and avoid being locked into an automatic renewal on worse terms. PolicyWallet tracks the expiry dates of all your policies and sends you a reminder before expiry, with a ready coverage summary so you can compare quotes on equal footing.",
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Η ασφαλιστική μπορεί να αλλάξει τους όρους στην ανανέωση;",
                    en: "Can the insurer change the terms at renewal?",
                },
                answer: {
                    el: "Εξαρτάται από τη διάρκεια και τους όρους της σύμβασης. Η ανανέωση δεν σημαίνει πάντα νέα σύμβαση με ελεύθερη αλλαγή όλων των όρων. Ζητήστε γραπτώς τι αλλάζει και με ποια βάση, ιδίως σε μακροχρόνια ασφάλιση υγείας.",
                    en: "It depends on the contract's duration and terms. Renewal does not always mean a new contract whose terms can all be freely changed. Ask in writing what changes and on what basis, especially for long-term health insurance.",
                },
            },
            {
                question: {
                    el: "Τι γίνεται αν αφήσω το ασφαλιστήριο να λήξει για λίγες μέρες;",
                    en: "What happens if I let the policy lapse for a few days?",
                },
                answer: {
                    el: "Μένετε ακάλυπτοι για κάθε ζημιά στο διάστημα αυτό, στο αυτοκίνητο κινδυνεύετε με πρόστιμο ανασφάλιστου οχήματος, και στην κατοικία μπορεί να χάσετε την αναλογία της έκπτωσης ΕΝΦΙΑ για τη χρονιά.",
                    en: "You are uncovered for any loss in that window, an uninsured vehicle risks a fine, and for a home you may lose part of the year's ENFIA discount proration.",
                },
            },
            {
                question: {
                    el: "Μπορώ να αλλάξω εταιρεία κατά την ανανέωση;",
                    en: "Can I switch insurers at renewal?",
                },
                answer: {
                    el: "Μπορείτε να εξετάσετε αλλαγή εταιρείας. Ελέγξτε την προθεσμία μη ανανέωσης, την έναρξη της νέας κάλυψης και τυχόν νέες εξαιρέσεις ή περιόδους αναμονής. Μην θεωρείτε δεδομένο ότι η αλλαγή δεν έχει κόστος.",
                    en: "You can consider changing insurers. Check the non-renewal deadline, the new cover's start date and any new exclusions or waiting periods. Do not assume switching is cost-free.",
                },
            },
        ],
        sources: [
            {
                label: {
                    el: "Τράπεζα της Ελλάδος — Οδηγίες για καταναλωτές ιδιωτικής ασφάλισης",
                    en: "Bank of Greece — Consumer guidance on private insurance",
                },
                url: "https://www.bankofgreece.gr",
            },
            {
                label: {
                    el: "ΕΑΕΕ — Ενημέρωση ασφαλισμένων",
                    en: "HAIC (EAEE) — Policyholder information",
                },
                url: "https://www.eaee.gr",
            },
        ],
    },
    {
        slug: "ti-kalyptei-i-asfaleia-aytokinitou",
        title: {
            el: "Τι καλύπτει η ασφάλεια αυτοκινήτου;",
            en: "What does car insurance cover?",
        },
        metaTitle: {
            el: "Τι καλύπτει η ασφάλεια αυτοκινήτου; Οδηγός",
            en: "What does car insurance cover? A guide",
        },
        metaDescription: {
            el: "Αστική ευθύνη, βασική ή μικτή: τι καλύπτει κάθε πακέτο ασφάλειας αυτοκινήτου, ποιες είναι οι κρυφές εξαιρέσεις και πώς επιλέγετε το σωστό για το όχημά σας.",
            en: "Liability, basic or comprehensive: what each Greek car insurance package covers, the hidden exclusions and how to choose the right one for your vehicle.",
        },
        summary: {
            el: "Η αστική ευθύνη καλύπτει ζημιές που προκαλεί το όχημά σας σε άλλους. Από 1 Ιουνίου 2025 υπάρχει και υποχρέωση ασφάλισης του οχήματος για δασική πυρκαγιά και πλημμύρα, με νόμιμες εξαιρέσεις. Η «μικτή» προσθέτει κάλυψη για ζημιές στο δικό σας όχημα, αλλά έχει όρους και εξαιρέσεις.",
            en: "Third-party liability covers damage your vehicle causes to others. Since 1 June 2025, vehicle insurance against forest fire and flood is also required, subject to statutory exceptions. Comprehensive insurance adds cover for damage to your own vehicle, but has conditions and exclusions.",
        },
        datePublished: "2026-07-13",
        dateModified: "2026-10-21",
        readingMinutes: 6,
        related: [
            {
                label: {
                    el: "Πρόστιμο ανασφάλιστου οχήματος: ποσά και διαδικασία",
                    en: "Uninsured vehicle fine: amounts and process",
                },
                href: "/guides/prostimo-anasfalistou-oximatos",
            },
            {
                label: {
                    el: "Τι ελέγχετε πριν από την ανανέωση ασφαλιστηρίου;",
                    en: "What should you check before renewing a policy?",
                },
                href: "/guides/checklist-ananeosis-asfalistiriou",
            },
            {
                label: {
                    el: "Ασφάλεια αυτοκινήτου στο PolicyWallet",
                    en: "Motor insurance in PolicyWallet",
                },
                href: "/product/motor",
            },
        ],
        sections: [
            {
                heading: {
                    el: "Τι καλύπτει υποχρεωτικά η αστική ευθύνη;",
                    en: "What does mandatory third-party liability cover?",
                },
                paragraphs: [
                    {
                        el: "Κάθε όχημα που κυκλοφορεί στην Ελλάδα πρέπει να έχει ασφάλιση αστικής ευθύνης. Αυτή αποζημιώνει τους τρίτους για σωματικές βλάβες και υλικές ζημιές που προκαλεί το όχημά σας — δεν πληρώνει ποτέ για το δικό σας αυτοκίνητο ή τα δικά σας τραύματα ως υπαίτιου οδηγού.",
                        en: "Every vehicle on Greek roads must carry third-party liability insurance. It compensates third parties for bodily injury and property damage your vehicle causes — it never pays for your own car or your own injuries as the at-fault driver.",
                    },
                    {
                        el: "Τα ελάχιστα όρια κάλυψης ορίζονται από τη νομοθεσία και αναπροσαρμόζονται περιοδικά· είναι της τάξης εκατομμυρίων ευρώ ανά ατύχημα για σωματικές βλάβες και υλικές ζημιές. Τα ακριβή ισχύοντα ποσά δημοσιεύονται από την Ένωση Ασφαλιστικών Εταιριών Ελλάδος (ΕΑΕΕ).",
                        en: "Minimum coverage limits are set by law and adjusted periodically; they are in the range of millions of euros per accident for bodily injury and property damage. The exact current amounts are published by the Hellenic Association of Insurance Companies (HAIC/EAEE).",
                    },
                ],
            },
            {
                heading: {
                    el: "Τι προσθέτει η βασική και τι η μικτή ασφάλεια;",
                    en: "What do basic and comprehensive packages add?",
                },
                paragraphs: [
                    {
                        el: "Τα ονόματα των πακέτων δεν έχουν το ίδιο περιεχόμενο σε κάθε εταιρεία. Δείτε ξεχωριστά αν περιλαμβάνονται κρύσταλλα, κλοπή, οδική βοήθεια, νομική προστασία και άλλες καλύψεις.",
                        en: "Package names do not mean the same thing at every insurer. Check separately for glass, theft, roadside assistance, legal protection and other covers.",
                    },
                    {
                        el: "Η «μικτή» συνήθως περιλαμβάνει ζημιές στο δικό σας όχημα ακόμη και όταν ευθύνεστε εσείς. Δεν καλύπτει τα πάντα. Ελέγξτε τις εξαιρέσεις, το ανώτατο ποσό και την απαλλαγή, δηλαδή το μέρος που πληρώνετε εσείς.",
                        en: "Comprehensive cover usually includes damage to your own vehicle even when you are at fault. It does not cover everything. Check exclusions, the limit and the deductible — the part you pay.",
                    },
                ],
                bullets: [
                    {
                        el: "Αστική ευθύνη: υποχρεωτική — ζημιές τρίτων μόνο.",
                        en: "Third-party liability: mandatory — third-party damage only.",
                    },
                    {
                        el: "Βασικό πακέτο: + θραύση κρυστάλλων, οδική βοήθεια, νομική προστασία (διαφέρει ανά εταιρεία).",
                        en: "Basic package: + glass breakage, roadside assistance, legal protection (varies by insurer).",
                    },
                    {
                        el: "Πυρός/κλοπής: + πυρκαγιά, ολική/μερική κλοπή, συχνά φυσικά φαινόμενα και χαλάζι.",
                        en: "Fire/theft: + fire, total/partial theft, often natural phenomena and hail.",
                    },
                    {
                        el: "Μικτή: περιλαμβάνει κάλυψη ζημιών στο δικό σας όχημα, σύμφωνα με τους όρους και τη συμμετοχή σας.",
                        en: "Comprehensive: includes damage to your own vehicle, subject to the terms and your share of the claim.",
                    },
                ],
            },
            {
                heading: {
                    el: "Ποιες είναι οι συνηθέστερες εξαιρέσεις;",
                    en: "What are the most common exclusions?",
                },
                paragraphs: [
                    {
                        el: "Οι εξαιρέσεις είναι το σημείο όπου οι περισσότεροι οδηγοί εκπλήσσονται τη στιγμή της ζημιάς. Οι πιο συνηθισμένες: οδήγηση υπό την επήρεια αλκοόλ ή ουσιών, οδηγός χωρίς ισχύουσα άδεια ή εκτός των δηλωμένων οδηγών, συμμετοχή σε αγώνες, χρήση του οχήματος για σκοπό διαφορετικό από τον δηλωμένο (π.χ. επαγγελματική διανομή με ασφαλιστήριο ιδιωτικής χρήσης) και φυσιολογική φθορά ή μηχανικές βλάβες.",
                        en: "Exclusions are where most drivers get surprised at claim time. The most common: driving under the influence of alcohol or drugs, a driver without a valid license or outside the declared drivers, participation in racing, using the vehicle for a purpose other than declared (e.g. commercial delivery on a private-use policy), and normal wear or mechanical failure.",
                    },
                    {
                        el: "Στην αστική ευθύνη, η εταιρεία μπορεί να αποζημιώσει τον τρίτο και στη συνέχεια να στραφεί αναγωγικά εναντίον σας αν συνέτρεχε λόγος εξαίρεσης — π.χ. μέθη. Διαβάστε τους γενικούς και ειδικούς όρους: εκεί ορίζεται τι ακριβώς εξαιρείται στο δικό σας ασφαλιστήριο.",
                        en: "Under liability cover, the insurer may compensate the third party and then seek recovery from you if an exclusion applied — e.g. drunk driving. Read the general and special terms: that is where your own policy's exact exclusions are defined.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πώς επιλέγετε ανάμεσα σε βασική και μικτή;",
                    en: "How do you choose between basic and comprehensive?",
                },
                paragraphs: [
                    {
                        el: "Συγκρίνετε το κόστος, την αξία του οχήματος, τη συμμετοχή σας σε ζημιά και τις εξαιρέσεις. Αν υπάρχει δάνειο ή χρηματοδοτική μίσθωση, ελέγξτε και τι ζητά η σχετική σύμβαση. Ο ασφαλιστής σας μπορεί να εξηγήσει τις επιλογές για τη δική σας περίπτωση.",
                        en: "Compare the cost, vehicle value, your share of a claim and exclusions. If there is a loan or lease, also check that contract's requirements. Your adviser can explain options for your circumstances.",
                    },
                    {
                        el: "Σε κάθε ανανέωση, επανεκτιμήστε: η εμπορική αξία πέφτει κάθε χρόνο, άρα η ίδια μικτή κάλυψη προστατεύει όλο και μικρότερο κεφάλαιο για παρόμοιο ασφάλιστρο.",
                        en: "Reassess at every renewal: market value drops each year, so the same comprehensive cover protects an ever-smaller sum for a similar premium.",
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Είναι υποχρεωτική η ασφάλεια αυτοκινήτου στην Ελλάδα;",
                    en: "Is car insurance mandatory in Greece?",
                },
                answer: {
                    el: "Ναι. Η υποχρέωση αστικής ευθύνης συνδέεται με το καθεστώς κυκλοφορίας του οχήματος. Η νόμιμη ακινησία είναι διαφορετική περίπτωση. Ωστόσο, η υποχρέωση κάλυψης δασικής πυρκαγιάς και πλημμύρας ισχύει και για οχήματα σε διοικητική ακινησία, με τις εξαιρέσεις του νόμου.",
                    en: "Yes. The third-party liability requirement depends on the vehicle's circulation status; lawful immobilisation is a different case. However, forest-fire and flood insurance is also required for vehicles in administrative immobilisation, subject to statutory exceptions.",
                },
            },
            {
                question: {
                    el: "Τι είναι η απαλλαγή στη μικτή ασφάλεια;",
                    en: "What is the deductible in comprehensive insurance?",
                },
                answer: {
                    el: "Είναι το μέρος της καλυπτόμενης ζημιάς που πληρώνετε εσείς. Για παράδειγμα, με ζημιά 2.000 € και απαλλαγή 500 €, απομένουν 1.500 € για την ασφαλιστική, εφόσον δεν εφαρμόζονται άλλοι περιορισμοί.",
                    en: "It is the part of a covered claim you pay. For example, a €2,000 claim with a €500 deductible leaves €1,500 for the insurer, provided no other restrictions apply.",
                },
            },
            {
                question: {
                    el: "Καλύπτομαι αν οδηγήσει το αυτοκίνητό μου άλλος;",
                    en: "Am I covered if someone else drives my car?",
                },
                answer: {
                    el: "Εξαρτάται από τους όρους: κάποια ασφαλιστήρια καλύπτουν οποιονδήποτε νόμιμο οδηγό, άλλα μόνο δηλωμένους. Οδηγοί κάτω των 23-25 ετών ή με νέο δίπλωμα συχνά απαιτούν επασφάλιστρο ή δήλωση.",
                    en: "It depends on the terms: some policies cover any lawful driver, others only declared ones. Drivers under 23-25 or newly licensed often require an extra premium or explicit declaration.",
                },
            },
            {
                question: {
                    el: "Ισχύει η ασφάλειά μου στο εξωτερικό;",
                    en: "Does my insurance apply abroad?",
                },
                answer: {
                    el: "Η αστική ευθύνη ισχύει σε όλο τον Ευρωπαϊκό Οικονομικό Χώρο (ΕΟΧ). Για χώρες του συστήματος πράσινης κάρτας εκτός ΕΟΧ — όπως η Αλβανία, η Βόρεια Μακεδονία ή η Τουρκία — χρειάζεστε Πράσινη Κάρτα από την εταιρεία σας, συνήθως δωρεάν ή με μικρό κόστος. Για χώρες εκτός του συστήματος απαιτείται ασφάλιση συνόρων.",
                    en: "Liability cover applies across the European Economic Area. For Green Card system countries outside the EEA — such as Albania, North Macedonia or Turkey — you need a Green Card from your insurer, usually free or at small cost. Outside the Green Card system you need frontier insurance.",
                },
            },
        ],
        sources: [{"label":{"el":"ΦΕΚ Β΄ 2706/2025 — ασφάλιση οχημάτων για δασική πυρκαγιά και πλημμύρα","en":"Gazette B 2706/2025 — vehicle forest-fire and flood insurance"},"url":"https://www.epimetol.gr/wp-content/uploads/2025/06/Η-απόφαση-για-την-υποχρεωτική-ασφάλιση-οχημάτων-έναντι-φυσικών-καταστροφών.pdf"},
            {
                label: {
                    el: "ΕΑΕΕ — Ένωση Ασφαλιστικών Εταιριών Ελλάδος",
                    en: "HAIC (EAEE) — Hellenic Association of Insurance Companies",
                },
                url: "https://www.eaee.gr",
            },
            {
                label: {
                    el: "gov.gr — Οχήματα και ασφάλιση",
                    en: "gov.gr — Vehicles and insurance",
                },
                url: "https://www.gov.gr",
            },
            {
                label: {
                    el: "Τράπεζα της Ελλάδος — Εποπτεία ιδιωτικής ασφάλισης",
                    en: "Bank of Greece — Private insurance supervision",
                },
                url: "https://www.bankofgreece.gr",
            },
        ],
    },
    {
        slug: "apallagi-asfaleia-ygeias-pos-leitourgei",
        title: {
            el: "Απαλλαγή στην ασφάλεια υγείας: πώς λειτουργεί;",
            en: "Health insurance deductibles: how do they work?",
        },
        metaTitle: {
            el: "Απαλλαγή στην ασφάλεια υγείας: πώς λειτουργεί",
            en: "Health insurance deductibles explained",
        },
        metaDescription: {
            el: "Πώς λειτουργεί η απαλλαγή στην ασφάλεια υγείας: ετήσια ή ανά περιστατικό, πώς συνδυάζεται με ΕΟΠΥΥ και ομαδικό συμβόλαιο και πόσο μειώνει το ασφάλιστρο.",
            en: "How health insurance deductibles work: annual or per incident, how they combine with EOPYY and employer group policies, and how much they cut premiums.",
        },
        summary: {
            el: "Η απαλλαγή είναι το μέρος των καλυπτόμενων εξόδων που πληρώνετε εσείς. Μπορεί να ισχύει ανά έτος ή ανά περιστατικό. Ορισμένα προγράμματα συνυπολογίζουν πληρωμές από τον ΕΟΠΥΥ ή άλλη ασφάλιση. Αυτό χρειάζεται έλεγχο στους όρους· δεν σημαίνει ότι κάθε νοσηλεία θα είναι δωρεάν.",
            en: "The deductible is your share of covered expenses. It may apply per year or per event. Some programmes count payments from EOPYY or other insurance towards it. Check the terms; this does not mean every hospital stay will be free.",
        },
        datePublished: "2026-07-13",
        dateModified: "2026-10-21",
        readingMinutes: 6,
        related: [
            {
                label: {
                    el: "Ομαδικό συμβόλαιο εργασίας: τι παρέχει και τι συμπληρώνετε ατομικά",
                    en: "Employer group policies: what they provide and what to add",
                },
                href: "/guides/omadiko-symvolaio-ergasias",
            },
            {
                label: {
                    el: "Ασφάλεια υγείας στο PolicyWallet",
                    en: "Health insurance in PolicyWallet",
                },
                href: "/product/health",
            },
        ],
        sections: [
            {
                heading: {
                    el: "Τι ακριβώς είναι η απαλλαγή;",
                    en: "What exactly is a deductible?",
                },
                paragraphs: [
                    {
                        el: "Στην ασφάλεια υγείας, απαλλαγή (ή «εκπιπτόμενο ποσό») είναι το τμήμα των αναγνωρισμένων εξόδων που αναλαμβάνετε εσείς. Αν το ασφαλιστήριό σας έχει απαλλαγή 1.500 ευρώ και η νοσηλεία κοστίσει 6.000, η εταιρεία καλύπτει τα 4.500 — εφόσον τα έξοδα είναι εντός των όρων και των ανώτατων ορίων.",
                        en: "In health insurance, the deductible is the portion of recognized expenses you bear yourself. If your policy has a €1,500 deductible and a hospitalization costs €6,000, the insurer covers €4,500 — provided the expenses fall within the terms and the policy limits.",
                    },
                    {
                        el: "Η απαλλαγή είναι μέρος των όρων του προγράμματος. Για να συγκρίνετε δύο επιλογές, δείτε μαζί το ασφάλιστρο και το ποσό που μπορεί να πληρώσετε εσείς.",
                        en: "The deductible is part of the programme's terms. To compare two options, consider both the premium and what you may have to pay yourself.",
                    },
                ],
            },
            {
                heading: {
                    el: "Ετήσια ή ανά περιστατικό — ποια η διαφορά;",
                    en: "Annual or per incident — what is the difference?",
                },
                paragraphs: [
                    {
                        el: "Η ετήσια απαλλαγή υπολογίζεται στο ασφαλιστικό έτος. Η απαλλαγή ανά περιστατικό υπολογίζεται χωριστά για κάθε περιστατικό, όπως το ορίζουν οι όροι. Ακόμη και αφού καλυφθεί η απαλλαγή, μπορεί να υπάρχουν άλλες συμμετοχές ή έξοδα εκτός κάλυψης.",
                        en: "An annual deductible is calculated over the insurance year. A per-event deductible is calculated separately for each event as defined in the terms. Other co-payments or uncovered expenses may remain after the deductible is met.",
                    },
                    {
                        el: "Στους όρους θα δείτε επίσης «κλιμακωτές» εκδοχές: π.χ. η απαλλαγή μειώνεται ή μηδενίζεται όταν χρησιμοποιηθεί δημόσιος φορέας ή άλλο ασφαλιστήριο. Αυτή η λεπτομέρεια αλλάζει δραστικά το πραγματικό κόστος.",
                        en: "The terms may also include tiered versions: e.g. the deductible shrinks or drops to zero when a public fund or another policy is used. This detail dramatically changes the real cost.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πώς συνδυάζεται με ΕΟΠΥΥ ή ομαδικό συμβόλαιο;",
                    en: "How does it combine with EOPYY or a group policy?",
                },
                paragraphs: [
                    {
                        el: "Ορισμένα προγράμματα αφαιρούν από την απαλλαγή ποσά που πλήρωσε ο ΕΟΠΥΥ ή άλλη ασφάλιση. Άλλα έχουν διαφορετικούς κανόνες. Ζητήστε γραπτή επιβεβαίωση για τη σειρά πληρωμών και τα δικαιολογητικά.",
                        en: "Some programmes deduct amounts paid by EOPYY or other insurance from the deductible. Others have different rules. Ask for written confirmation of the payment order and required documents.",
                    },
                    {
                        el: "Αν έχετε ομαδική και ατομική ασφάλιση, ρωτήστε πώς συνδυάζονται. Ελέγξτε επίσης πότε σταματά η ομαδική κάλυψη αν φύγετε από την εργασία σας.",
                        en: "If you have group and individual insurance, ask how they work together. Also check when group cover ends if you leave your job.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πόσο μειώνει το ασφάλιστρο μια υψηλότερη απαλλαγή;",
                    en: "How much does a higher deductible cut the premium?",
                },
                paragraphs: [
                    {
                        el: "Δεν υπάρχει ενιαίο ποσοστό μείωσης. Ζητήστε συγκρίσιμες προσφορές με διαφορετική απαλλαγή και ίδιες τις υπόλοιπες καλύψεις. Έτσι βλέπετε πόσο αλλάζει το κόστος στη δική σας περίπτωση.",
                        en: "There is no universal reduction percentage. Request comparable quotes with different deductibles and otherwise identical cover. This shows the cost difference for your circumstances.",
                    },
                    {
                        el: "Κανόνας ασφαλείας: η απαλλαγή που επιλέγετε πρέπει να είναι ποσό που μπορείτε να διαθέσετε άμεσα σε μια έκτακτη νοσηλεία χωρίς δανεισμό.",
                        en: "Safety rule: the deductible you choose should be an amount you could pay immediately in an emergency hospitalization without borrowing.",
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Ισχύει η απαλλαγή και στα εξωνοσοκομειακά;",
                    en: "Does the deductible apply to outpatient care too?",
                },
                answer: {
                    el: "Συνήθως όχι — η απαλλαγή αφορά κατά κανόνα τη νοσοκομειακή περίθαλψη. Τα εξωνοσοκομειακά (ιατροί, διαγνωστικές) έχουν δικούς τους όρους, συμμετοχές ή πλαφόν ανά έτος.",
                    en: "Usually not — deductibles typically apply to in-hospital care. Outpatient benefits (doctors, diagnostics) carry their own terms, co-pays, or annual caps.",
                },
            },
            {
                question: {
                    el: "Μπορώ να αλλάξω το ύψος της απαλλαγής αργότερα;",
                    en: "Can I change the deductible level later?",
                },
                answer: {
                    el: "Η μείωση απαλλαγής αντιμετωπίζεται συχνά ως αναβάθμιση και μπορεί να απαιτεί νέο έλεγχο ασφαλισιμότητας. Η αύξηση είναι ευκολότερη. Ρωτήστε πριν υπογράψετε — οι κανόνες διαφέρουν ανά εταιρεία.",
                    en: "Lowering a deductible is often treated as an upgrade and may require new underwriting. Raising it is easier. Ask before you sign — rules differ by insurer.",
                },
            },
            {
                question: {
                    el: "Τι σημαίνει «κάλυψη απαλλαγής» από ομαδικό;",
                    en: "What does “deductible coverage” via a group policy mean?",
                },
                answer: {
                    el: "Ότι το ποσό που πλήρωσε το ομαδικό σας συμβόλαιο συνυπολογίζεται στην απαλλαγή του ατομικού. Ελέγξτε ότι το ατομικό σας το προβλέπει ρητά στους όρους — δεν το κάνουν όλα τα προγράμματα.",
                    en: "That whatever your group policy paid counts toward your individual policy's deductible. Check that your individual terms say so explicitly — not all plans do.",
                },
            },
        ],
        sources: [
            {
                label: {
                    el: "Τράπεζα της Ελλάδος — Εποπτεία ιδιωτικής ασφάλισης",
                    en: "Bank of Greece — Private insurance supervision",
                },
                url: "https://www.bankofgreece.gr",
            },
            {
                label: {
                    el: "ΕΑΕΕ — Κλάδος ασφαλίσεων υγείας",
                    en: "HAIC (EAEE) — Health insurance sector",
                },
                url: "https://www.eaee.gr",
            },
            {
                label: {
                    el: "gov.gr — Υγεία και πρόνοια",
                    en: "gov.gr — Health and welfare",
                },
                url: "https://www.gov.gr",
            },
        ],
    },
    {
        slug: "poso-kostizei-i-asfalisi-seismou",
        title: {
            el: "Πόσο κοστίζει η ασφάλιση σεισμού;",
            en: "How much does earthquake insurance cost?",
        },
        metaTitle: {
            el: "Πόσο κοστίζει η ασφάλιση σεισμού;",
            en: "How much does earthquake insurance cost?",
        },
        metaDescription: {
            el: "Τι επηρεάζει την τιμή της ασφάλισης σεισμού, ποια στοιχεία χρειάζεται μια προσφορά και πώς ελέγχετε την απαλλαγή και τις προϋποθέσεις μείωσης ΕΝΦΙΑ.",
            en: "What drives the cost of earthquake insurance in Greece: insured sum, construction year, deductible — plus indicative rates and the ENFIA tax discount.",
        },
        summary: {
            el: "Η τιμή της ασφάλισης σεισμού εξαρτάται από το κτίριο, την περιοχή, το ποσό ασφάλισης και τους όρους. Δεν υπάρχει ενιαία τιμή ανά τετραγωνικό για όλα τα σπίτια. Ζητήστε προσφορά που να αναφέρει καλύψεις, εξαιρέσεις και το μέρος της ζημιάς που πληρώνετε εσείς.",
            en: "The price of earthquake insurance depends on the building, location, sum insured and terms. There is no single price per square metre for every home. Request a quote showing cover, exclusions and the share of a claim you pay.",
        },
        datePublished: "2026-07-13",
        dateModified: "2026-10-21",
        readingMinutes: 6,
        related: [
            {
                label: {
                    el: "Πώς παίρνετε έκπτωση ΕΝΦΙΑ με ασφάλιση κατοικίας;",
                    en: "How do you get the ENFIA discount with home insurance?",
                },
                href: "/guides/ekptosi-enfia-asfalisi-katoikias",
            },
            {
                label: {
                    el: "Πού διαχειρίζεστε όλα τα ασφαλιστήριά σας online",
                    en: "Where to manage all your policies online",
                },
                href: "/guides/diaxeirisi-asfalistirion-se-ena-simeio",
            },
            {
                label: {
                    el: "Ασφάλεια κατοικίας στο PolicyWallet",
                    en: "Home insurance in PolicyWallet",
                },
                href: "/product/property",
            },
        ],
        sections: [
            {
                heading: {
                    el: "Από τι εξαρτάται το κόστος της κάλυψης σεισμού;",
                    en: "What drives the cost of earthquake cover?",
                },
                paragraphs: [
                    {
                        el: "Η εταιρεία εξετάζει στοιχεία όπως τοποθεσία, έτος και τρόπο κατασκευής, χρήση, ποσό ασφάλισης και απαλλαγή. Η επίδραση κάθε στοιχείου στην τιμή διαφέρει ανά πρόγραμμα.",
                        en: "The insurer considers details such as location, construction year and method, use, sum insured and deductible. Each factor's effect on price varies by programme.",
                    },
                    {
                        el: "Για σύγκριση, ζητήστε προσφορές με τα ίδια ποσά και τις ίδιες καλύψεις. Μια χαμηλότερη τιμή μπορεί να έχει μεγαλύτερη απαλλαγή ή διαφορετικές εξαιρέσεις.",
                        en: "For comparison, request quotes with identical limits and cover. A lower price may have a larger deductible or different exclusions.",
                    },
                    {
                        el: "Κρατήστε την προσφορά και τους πλήρεις όρους. Ελέγξτε το ετήσιο κόστος, τι πληρώνετε εσείς σε ζημιά και αν καλύπτονται χωριστά το κτίριο και τα αντικείμενα μέσα σε αυτό.",
                        en: "Keep the quote and full terms. Check the annual cost, your share of a claim and whether the building and its contents are covered separately.",
                    },
                ],

            },
            {
                heading: {
                    el: "Τι σημαίνει η απαλλαγή 2% στον σεισμό;",
                    en: "What does the 2% earthquake deductible mean?",
                },
                paragraphs: [
                    {
                        el: "Ελέγξτε αν η απαλλαγή είναι σταθερό ποσό ή ποσοστό και πάνω σε ποιο ποσό υπολογίζεται. Παράδειγμα: αν οι όροι ορίζουν 2% επί ασφαλισμένου ποσού 150.000 €, η απαλλαγή είναι 3.000 €. Το 2% είναι υπόθεση του παραδείγματος, όχι κανόνας για όλα τα ασφαλιστήρια.",
                        en: "Check whether the deductible is a fixed amount or percentage and what it is calculated on. Example: if the terms specify 2% of a €150,000 sum insured, the deductible is €3,000. The 2% is an example assumption, not a rule for every policy.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πώς συνδέεται με την έκπτωση ΕΝΦΙΑ;",
                    en: "How does it connect to the ENFIA discount?",
                },
                paragraphs: [
                    {
                        el: "Για τη μείωση ΕΝΦΙΑ χρειάζονται μαζί σεισμός, πυρκαγιά και πλημμύρα, καθώς και οι υπόλοιπες προϋποθέσεις της ΑΑΔΕ. Το φορολογικό όφελος διαφέρει ανά κατοικία. Δείτε τον σχετικό οδηγό και τις επίσημες οδηγίες του έτους.",
                        en: "The ENFIA reduction requires earthquake, fire and flood cover together, plus AADE's other conditions. The tax benefit varies by home. See the guide and the official instructions for the relevant year.",
                    },
                ],
            },
            {
                heading: {
                    el: "Υπασφάλιση: όταν το ποσό είναι χαμηλότερο από την αξία",
                    en: "Underinsurance: when the amount is below the value",
                },
                paragraphs: [
                    {
                        el: "Αν εφαρμόζεται αναλογικός κανόνας, χαμηλότερο ποσό ασφάλισης μπορεί να μειώσει και την αποζημίωση για μερική ζημιά. Ελέγξτε πώς ορίζεται η αξία και αν υπάρχει εξαίρεση από τον κανόνα, όπως κάλυψη σε «πρώτο κίνδυνο».",
                        en: "Where an average clause applies, a lower sum insured may reduce even a partial claim. Check how value is defined and whether the rule is waived, for example for first-loss cover.",
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Αξίζει η ασφάλιση σεισμού σε νεόδμητο κτίριο;",
                    en: "Is earthquake insurance worth it in a new building?",
                },
                answer: {
                    el: "Ένα νεότερο κτίριο μπορεί επίσης να υποστεί ζημιές από σεισμό. Η εκτίμηση του κινδύνου και του κόστους ασφάλισης εξαρτάται από τα χαρακτηριστικά του κτιρίου και τους όρους της εταιρείας.",
                    en: "A newer building can also suffer earthquake damage. Risk and insurance cost depend on the building's characteristics and the insurer's terms.",
                },
            },
            {
                question: {
                    el: "Καλύπτεται το περιεχόμενο από τον σεισμό;",
                    en: "Are contents covered against earthquake?",
                },
                answer: {
                    el: "Μόνο αν έχει ασφαλιστεί ρητά και το περιεχόμενο με κάλυψη σεισμού — η κάλυψη κτιρίου δεν το περιλαμβάνει αυτόματα. Ελέγξτε τον πίνακα καλύψεων του ασφαλιστηρίου σας.",
                    en: "Only if contents are explicitly insured with earthquake cover — building cover does not include them automatically. Check your policy's coverage schedule.",
                },
            },
            {
                question: {
                    el: "Ισχύει η κάλυψη αμέσως μετά την αγορά;",
                    en: "Does the cover apply immediately after purchase?",
                },
                answer: {
                    el: "Κατά κανόνα ναι, από την έναρξη του ασφαλιστηρίου — αλλά ορισμένα προγράμματα προβλέπουν σύντομη περίοδο αναμονής για τον κίνδυνο σεισμού. Επιβεβαιώστε το στους όρους πριν βασιστείτε στην κάλυψη.",
                    en: "Generally yes, from the policy start date — but some plans apply a short waiting period to the earthquake peril. Confirm it in the terms before relying on the cover.",
                },
            },
            {
                question: {
                    el: "Πόσο κοστίζει η ασφάλιση σεισμού για διαμέρισμα 100 τ.μ.;",
                    en: "How much is earthquake insurance for a 100 m² apartment?",
                },
                answer: {
                    el: "Τα τετραγωνικά δεν αρκούν για να βγει τιμή. Χρειάζονται η τοποθεσία, η κατασκευή, το ποσό ασφάλισης, η απαλλαγή και οι καλύψεις. Ζητήστε γραπτή προσφορά με αυτά τα στοιχεία.",
                    en: "Floor area alone is not enough to calculate a price. Location, construction, sum insured, deductible and cover all matter. Request a written quote using those details.",
                },
            },
            {
                question: {
                    el: "Μπορώ να ασφαλίσω μόνο τον σεισμό, χωρίς πυρκαγιά;",
                    en: "Can I insure only against earthquake, without fire?",
                },
                answer: {
                    el: "Συνήθως όχι. Ο σεισμός προσφέρεται ως προαιρετική επέκταση πάνω σε ασφαλιστήριο κατοικίας με βασικό κίνδυνο την πυρκαγιά, όχι ως αυτοτελές προϊόν. Για την έκπτωση ΕΝΦΙΑ χρειάζονται ούτως ή άλλως και οι τρεις κίνδυνοι μαζί.",
                    en: "Usually not. Earthquake is offered as an optional extension on a home policy whose base peril is fire, rather than as a standalone product. For the ENFIA discount all three perils are needed together in any case.",
                },
            },
        ],
        sources: [
            {
                label: {
                    el: "ΕΑΕΕ — Ασφάλιση καταστροφικών κινδύνων",
                    en: "HAIC (EAEE) — Catastrophic risk insurance",
                },
                url: "https://www.eaee.gr",
            },
            {
                label: {
                    el: "ΑΑΔΕ — ΕΝΦΙΑ και ασφαλισμένες κατοικίες",
                    en: "AADE — ENFIA and insured homes",
                },
                url: "https://www.aade.gr",
            },
            {
                label: {
                    el: "Τράπεζα της Ελλάδος — Εποπτεία ιδιωτικής ασφάλισης",
                    en: "Bank of Greece — Private insurance supervision",
                },
                url: "https://www.bankofgreece.gr",
            },
        ],
    },
    {
        slug: "asfaleia-katoikidiou-ti-exaireitai",
        title: {
            el: "Ασφάλεια κατοικιδίου: τι εξαιρείται;",
            en: "Pet insurance: what is excluded?",
        },
        metaTitle: {
            el: "Ασφάλεια κατοικιδίου: τι εξαιρείται",
            en: "Pet insurance exclusions: what to check",
        },
        metaDescription: {
            el: "Προϋπάρχουσες παθήσεις, περίοδοι αναμονής, όρια ηλικίας και εξαιρέσεις φυλών: τι δεν καλύπτει συνήθως η ασφάλεια κατοικιδίου και τι να προσέξετε στους όρους.",
            en: "Pre-existing conditions, waiting periods, age limits and breed exclusions: what pet insurance usually does not cover and what to check in the terms.",
        },
        summary: {
            el: "Πριν επιλέξετε ασφάλιση κατοικιδίου, ελέγξτε τι ισχύει για παθήσεις που υπήρχαν ήδη, χρόνους αναμονής, ηλικία και φυλή. Δείτε επίσης αν καλύπτονται προληπτικές εξετάσεις και εμβόλια. Οι όροι διαφέρουν ανά πρόγραμμα. Ζητήστε να σας εξηγήσουν όσα δεν καταλαβαίνετε πριν υπογράψετε.",
            en: "Before choosing pet insurance, check pre-existing conditions, waiting periods, age and breed. Also check preventive examinations and vaccinations. Terms vary by programme.",
        },
        datePublished: "2026-07-13",
        dateModified: "2026-10-21",
        readingMinutes: 5,
        related: [
            {
                label: {
                    el: "Τι ελέγχετε πριν από την ανανέωση ασφαλιστηρίου;",
                    en: "What should you check before renewing a policy?",
                },
                href: "/guides/checklist-ananeosis-asfalistiriou",
            },
            {
                label: {
                    el: "Ασφάλεια κατοικιδίων στο PolicyWallet",
                    en: "Pet insurance in PolicyWallet",
                },
                href: "/product/pet",
            },
        ],
        sections: [
            {
                heading: {
                    el: "Γιατί δεν καλύπτονται οι προϋπάρχουσες παθήσεις;",
                    en: "Why are pre-existing conditions not covered?",
                },
                paragraphs: [
                    {
                        el: "Οι όροι εξηγούν ποια πάθηση θεωρείται προϋπάρχουσα: μπορεί να αρκούν συμπτώματα πριν από την έναρξη, χωρίς διάγνωση. Δηλώστε το ιστορικό με ακρίβεια και ζητήστε να μάθετε τι θα καλύπτεται.",
                        en: "The terms define a pre-existing condition: symptoms before inception may count even without a diagnosis. Declare the history accurately and ask what will be covered.",
                    },
                    {
                        el: "Ορισμένα προγράμματα διαχωρίζουν τις «ιάσιμες» προϋπάρχουσες (π.χ. μια ωτίτιδα που θεραπεύτηκε πλήρως) από τις χρόνιες· οι πρώτες μπορεί να επανακαλυφθούν μετά από διάστημα χωρίς συμπτώματα. Ρωτήστε ρητά — η διαφορά είναι σημαντική.",
                        en: "Some plans distinguish “curable” pre-existing conditions (e.g. a fully healed ear infection) from chronic ones; the former may become coverable again after a symptom-free interval. Ask explicitly — the difference matters.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πώς λειτουργούν οι περίοδοι αναμονής;",
                    en: "How do waiting periods work?",
                },
                paragraphs: [
                    {
                        el: "Κάποιες καλύψεις αρχίζουν αργότερα από την ημερομηνία έναρξης του ασφαλιστηρίου. Το διάστημα και η αντιμετώπιση περιστατικών που εμφανίζονται μέσα σε αυτό διαφέρουν ανά πρόγραμμα. Ελέγξτε κάθε κάλυψη χωριστά.",
                        en: "Some covers start later than the policy's inception date. The waiting period and treatment of events arising during it vary by programme. Check each cover separately.",
                    },
                ],
            },
            {
                heading: {
                    el: "Τι ισχύει με φυλές και όρια ηλικίας;",
                    en: "What about breeds and age limits?",
                },
                paragraphs: [
                    {
                        el: "Μπορεί να υπάρχουν όρια ηλικίας, εξαιρέσεις για συγκεκριμένες παθήσεις ή διαφορετικοί όροι ανά φυλή. Ζητήστε τους όρους που αφορούν το δικό σας ζώο, χωρίς να βασίζεστε μόνο σε μια γενική περιγραφή.",
                        en: "There may be age limits, exclusions for particular conditions or different terms by breed. Ask for the terms applicable to your animal rather than relying only on a general description.",
                    },
                    {
                        el: "Η λεϊσμανίαση (καλαζάρ), ενδημική στην Ελλάδα, αντιμετωπίζεται διαφορετικά ανά πρόγραμμα: άλλα την καλύπτουν με προϋποθέσεις προληπτικών μέτρων, άλλα την εξαιρούν ρητά. Για σκύλο στην Ελλάδα, αυτός ο όρος αξίζει ειδικό έλεγχο πριν από την υπογραφή.",
                        en: "Leishmaniasis (kala-azar), endemic in Greece, is treated differently across plans: some cover it conditional on preventive measures, others exclude it outright. For a dog in Greece, this clause deserves specific scrutiny before signing.",
                    },
                ],
            },
            {
                heading: {
                    el: "Τι άλλο μένει συνήθως εκτός κάλυψης;",
                    en: "What else usually stays outside cover?",
                },
                paragraphs: [
                    {
                        el: "Η πρόληψη — εμβολιασμοί, αποπαρασίτωση, ετήσιος έλεγχος — καλύπτεται μόνο από προγράμματα με πρόσθετο «πακέτο ευεξίας». Εκτός μένουν επίσης συνήθως η κύηση και ο τοκετός, οι αισθητικές επεμβάσεις, οι ειδικές δίαιτες και η εκπαίδευση συμπεριφοράς.",
                        en: "Prevention — vaccinations, antiparasitics, the annual check-up — is covered only by plans with an add-on wellness package. Also typically outside: pregnancy and birth, cosmetic procedures, special diets, and behavioral training.",
                    },
                ],
                bullets: [
                    {
                        el: "Ελέγξτε: κάλυψη λεϊσμανίασης και προϋποθέσεις πρόληψης.",
                        en: "Check: leishmaniasis cover and its prevention conditions.",
                    },
                    {
                        el: "Ελέγξτε: όρια ανά περιστατικό και ετήσιο ανώτατο όριο.",
                        en: "Check: per-incident limits and the annual cap.",
                    },
                    {
                        el: "Ελέγξτε: αν το ασφαλιστήριο απαιτεί ηλεκτρονική σήμανση (τσιπ) — που είναι ούτως ή άλλως υποχρεωτική από τον νόμο.",
                        en: "Check: whether the policy requires microchipping — which Greek law mandates anyway.",
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Καλύπτεται η αστική ευθύνη αν ο σκύλος μου προκαλέσει ζημιά;",
                    en: "Is liability covered if my dog causes damage?",
                },
                answer: {
                    el: "Ελέγξτε αν υπάρχει κάλυψη αστικής ευθύνης στο πρόγραμμα κατοικιδίου ή κατοικίας σας. Η κάλυψη αφορά ευθύνη για ζημιές σε άλλους και διαφέρει από τα κτηνιατρικά έξοδα. Δύο παρόμοιες καλύψεις δεν σημαίνουν αυτόματα περιττό κόστος.",
                    en: "Check for liability cover in your pet or home policy. It concerns responsibility for damage to others and differs from veterinary expenses. Two similar covers do not automatically mean unnecessary cost.",
                },
            },
            {
                question: {
                    el: "Αξίζει η ασφάλιση για γάτα εσωτερικού χώρου;",
                    en: "Is insurance worth it for an indoor cat?",
                },
                answer: {
                    el: "Το ότι η γάτα μένει μέσα δεν αποκλείει την ασθένεια ή το ατύχημα. Συγκρίνετε το κόστος, τις εξαιρέσεις και τα ποσά του προγράμματος με τα έξοδα που μπορείτε να αναλάβετε.",
                    en: "Staying indoors does not rule out illness or accidents. Compare the cost, exclusions and limits with the expenses you can afford yourself.",
                },
            },
            {
                question: {
                    el: "Τι γίνεται αν η φυλή μου εξαιρείται;",
                    en: "What if my breed is excluded?",
                },
                answer: {
                    el: "Οι λίστες φυλών διαφέρουν σημαντικά ανά εταιρεία — μια φυλή που εξαιρείται σε ένα πρόγραμμα μπορεί να γίνεται δεκτή αλλού με επασφάλιστρο. Ζητήστε προσφορές από περισσότερες εταιρείες πριν συμπεράνετε ότι δεν ασφαλίζεται.",
                    en: "Breed lists differ significantly by insurer — a breed excluded in one plan may be accepted elsewhere with a surcharge. Get quotes from multiple insurers before concluding it cannot be insured.",
                },
            },
        ],
        sources: [{"label":{"el":"ν. 4830/2021 — υποχρεώσεις για ζώα συντροφιάς, άρθρο 9","en":"Law 4830/2021 — pet responsibilities, article 9"},"url":"https://pet.gov.gr/wp-content/uploads/2024/02/4830-2021-nomos-zoa-syntrofias.pdf"},
            {
                label: {
                    el: "gov.gr — Δήλωση και σήμανση ζώων συντροφιάς",
                    en: "gov.gr — Companion animal registration and microchipping",
                },
                url: "https://www.gov.gr",
            },
            {
                label: {
                    el: "ΕΑΕΕ — Ένωση Ασφαλιστικών Εταιριών Ελλάδος",
                    en: "HAIC (EAEE) — Hellenic Association of Insurance Companies",
                },
                url: "https://www.eaee.gr",
            },
        ],
    },
    {
        slug: "omadiko-symvolaio-ergasias",
        title: {
            el: "Ομαδική ασφάλιση εργασίας: τι περιλαμβάνει;",
            en: "Employer group policies: what they provide and what to add individually",
        },
        metaTitle: {
            el: "Ομαδικό συμβόλαιο: τι καλύπτει, τι λείπει",
            en: "Employer group insurance: what is missing",
        },
        metaDescription: {
            el: "Δείτε ποιες παροχές περιλαμβάνει η ομαδική ασφάλιση εργασίας, ποιους καλύπτει, πότε σταματά και πώς συνδυάζεται με τυχόν ατομικό ασφαλιστήριο.",
            en: "What an employer group policy usually covers, where it stops — it ends when you leave, sums are often low — and which covers are worth adding individually.",
        },
        summary: {
            el: "Η ομαδική ασφάλιση είναι πρόγραμμα για μια ομάδα, όπως οι εργαζόμενοι μιας επιχείρησης. Μπορεί να περιλαμβάνει υγεία, ζωή ή άλλες παροχές. Οι καλύψεις, οι προϋποθέσεις ένταξης και το κόστος διαφέρουν. Ζητήστε το ενημερωτικό και τους όρους του δικού σας προγράμματος.",
            en: "Group insurance is a programme for a group such as a company's employees. It may include health, life or other benefits. Cover, eligibility and cost vary. Ask for your programme's information and terms.",
        },
        datePublished: "2026-07-13",
        dateModified: "2026-10-21",
        readingMinutes: 6,
        related: [
            {
                label: {
                    el: "Απαλλαγή στην ασφάλεια υγείας: πώς λειτουργεί;",
                    en: "Health insurance deductibles: how they work",
                },
                href: "/guides/apallagi-asfaleia-ygeias-pos-leitourgei",
            },
            {
                label: {
                    el: "Ομαδική ασφάλιση υγείας στο PolicyWallet",
                    en: "Group health insurance in PolicyWallet",
                },
                href: "/product/group-health",
            },
        ],
        sections: [
            {
                heading: {
                    el: "Τι καλύπτει συνήθως ένα ομαδικό συμβόλαιο;",
                    en: "What does a group policy usually cover?",
                },
                paragraphs: [
                    {
                        el: "Το τυπικό ομαδικό πρόγραμμα ελληνικής επιχείρησης περιλαμβάνει: νοσοκομειακή περίθαλψη (με όριο ανά έτος ή περιστατικό), εξωνοσοκομειακές παροχές με πλαφόν, ασφάλεια ζωής ως πολλαπλάσιο του μισθού και κάλυψη μόνιμης ολικής ή μερικής ανικανότητας. Μεγαλύτερα προγράμματα προσθέτουν επίδομα μητρότητας, οδοντιατρικά ή προληπτικό έλεγχο.",
                        en: "A typical Greek company plan includes: hospital care (with an annual or per-incident limit), capped outpatient benefits, life insurance as a salary multiple, and permanent total or partial disability cover. Larger schemes add maternity allowances, dental, or check-ups.",
                    },
                    {
                        el: "Μερικά προγράμματα δέχονται εργαζομένους χωρίς ατομικό ερωτηματολόγιο υγείας. Αυτό δεν σημαίνει ότι καλύπτεται κάθε πάθηση. Ελέγξτε τις εξαιρέσεις και τυχόν ειδικές προϋποθέσεις.",
                        en: "Some programmes admit employees without an individual health questionnaire. This does not mean every condition is covered. Check exclusions and any special conditions.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πού σταματά η προστασία του ομαδικού;",
                    en: "Where does group protection stop?",
                },
                paragraphs: [
                    {
                        el: "Δείτε τρία πράγματα: τα ανώτατα ποσά, τη δική σας συμμετοχή και πότε σταματά η κάλυψη. Αν φύγετε από την εργασία, ζητήστε την ακριβή ημερομηνία λήξης και αν υπάρχει δυνατότητα συνέχισης.",
                        en: "Check three things: benefit limits, your share and when cover ends. If you leave your job, ask for the exact end date and any continuation option.",
                    },
                    {
                        el: "Ορισμένα ομαδικά προβλέπουν δικαίωμα μετατροπής σε ατομικό κατά την αποχώρηση, χωρίς νέο έλεγχο ασφαλισιμότητας και μέσα σε συγκεκριμένη προθεσμία. Αν υπάρχει, είναι πολύτιμο — μάθετε αν το δικό σας το προσφέρει πριν το χρειαστείτε.",
                        en: "Some group schemes include a conversion right to an individual policy upon leaving, without new underwriting and within a set deadline. Where it exists it is valuable — find out whether yours offers it before you need it.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πώς συνδυάζεται με ατομική ασφάλιση;",
                    en: "How does it work with individual insurance?",
                },
                paragraphs: [
                    {
                        el: "Ο συνδυασμός δεν λειτουργεί με τον ίδιο τρόπο σε όλα τα προγράμματα. Ο ασφαλιστής σας μπορεί να ελέγξει τις παροχές, τα ποσά και τη σειρά πληρωμής. Πριν προσθέσετε ή ακυρώσετε κάλυψη, επιβεβαιώστε πώς θα λειτουργούν τα δύο ασφαλιστήρια μαζί.",
                        en: "Combining policies does not work the same way in every programme. Your adviser can review benefits, limits and payment order. Before adding or cancelling cover, confirm how the two policies will work together.",
                    },
                ],
                bullets: [
                    {
                        el: "Υγεία: ποια έξοδα καλύπτει κάθε πρόγραμμα και ποιο μέρος πληρώνετε εσείς;",
                        en: "Health: which expenses does each programme cover and what do you pay?",
                    },
                    {
                        el: "Ζωή: ποιο ποσό προβλέπεται και ποιος είναι ο δικαιούχος;",
                        en: "Life: what amount is provided and who is the beneficiary?",
                    },
                    {
                        el: "Εισόδημα: υπάρχει παροχή όταν δεν μπορείτε να εργαστείτε και με ποιες προϋποθέσεις;",
                        en: "Income: is there a benefit if you cannot work, and under what conditions?",
                    },
                ],
            },
            {
                heading: {
                    el: "Πώς δηλώνετε σωστά τον συνδυασμό στις αποζημιώσεις;",
                    en: "How do you coordinate benefits correctly at claim time?",
                },
                paragraphs: [
                    {
                        el: "Όταν έχετε δύο πηγές κάλυψης, η σειρά έχει σημασία: συνήθως εξαντλείτε πρώτα το ομαδικό και το ατομικό καλύπτει τη διαφορά — με το ποσό του ομαδικού να μετρά έναντι της απαλλαγής, αν το προβλέπουν οι όροι. Ενημερώστε και τις δύο εταιρείες για την ύπαρξη της άλλης κάλυψης· η απόκρυψη διπλής ασφάλισης μπορεί να θεωρηθεί παράβαση όρων.",
                        en: "With two sources of cover, order matters: you usually exhaust the group scheme first and the individual policy covers the difference — with the group payout counting toward the deductible where the terms allow. Inform both insurers that the other cover exists; concealing dual insurance can constitute a breach of terms.",
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Καλύπτεται η οικογένειά μου από το ομαδικό;",
                    en: "Does the group policy cover my family?",
                },
                answer: {
                    el: "Πολλά ομαδικά επιτρέπουν την ένταξη συζύγου και παιδιών, άλλοτε με κόστος εργοδότη και άλλοτε με δική σας συμμετοχή. Ρωτήστε το HR — και ελέγξτε τι από αυτά χάνεται αν αποχωρήσετε.",
                    en: "Many schemes allow adding a spouse and children, sometimes at employer cost, sometimes with your contribution. Ask HR — and check what is lost if you leave.",
                },
            },
            {
                question: {
                    el: "Φορολογείται το ομαδικό συμβόλαιο ως παροχή;",
                    en: "Is a group policy taxed as a benefit?",
                },
                answer: {
                    el: "Η φορολογική αντιμετώπιση των εργοδοτικών εισφορών σε ομαδικά προγράμματα ορίζεται από την εκάστοτε νομοθεσία και έχει όρια απαλλαγής. Για τα ισχύοντα ποσά συμβουλευτείτε την ΑΑΔΕ ή λογιστή.",
                    en: "Tax treatment of employer contributions to group schemes is set by current legislation with exemption thresholds. Consult AADE or an accountant for the amounts in force.",
                },
            },
            {
                question: {
                    el: "Μπορώ να αρνηθώ το ομαδικό και να πάρω τα χρήματα;",
                    en: "Can I opt out of the group scheme and take the cash?",
                },
                answer: {
                    el: "Αυτό εξαρτάται από την πολιτική παροχών και τη συμφωνία εργασίας. Ρωτήστε το τμήμα προσωπικού αν υπάρχει επιλογή και τι συνέπειες έχει.",
                    en: "This depends on the benefits policy and employment agreement. Ask the HR team whether there is an option and what its consequences are.",
                },
            },
        ],
        sources: [
            {
                label: {
                    el: "ΕΑΕΕ — Ομαδικές ασφαλίσεις",
                    en: "HAIC (EAEE) — Group insurance",
                },
                url: "https://www.eaee.gr",
            },
            {
                label: {
                    el: "ΑΑΔΕ — Φορολογική μεταχείριση ασφαλίστρων",
                    en: "AADE — Tax treatment of premiums",
                },
                url: "https://www.aade.gr",
            },
            {
                label: {
                    el: "Τράπεζα της Ελλάδος — Εποπτεία ιδιωτικής ασφάλισης",
                    en: "Bank of Greece — Private insurance supervision",
                },
                url: "https://www.bankofgreece.gr",
            },
        ],
    },
    {
        slug: "prostimo-anasfalistou-oximatos",
        title: {
            el: "Πρόστιμο ανασφάλιστου οχήματος: ποσά και διαδικασία",
            en: "Uninsured vehicle fines in Greece: amounts and process",
        },
        metaTitle: {
            el: "Πρόστιμο ανασφάλιστου: ποσά και διαδικασία",
            en: "Uninsured vehicle fines: amounts and process",
        },
        metaDescription: {
            el: "Πώς εντοπίζονται τα ανασφάλιστα οχήματα, ποια πρόστιμα προβλέπονται ανά κατηγορία, τι ισχύει σε ατύχημα και πώς τακτοποιείτε άμεσα την εκκρεμότητα.",
            en: "How uninsured vehicles are detected in Greece, the fines per vehicle category, what happens after an accident and how to resolve a notice immediately.",
        },
        summary: {
            el: "Τα ανασφάλιστα οχήματα εντοπίζονται με ηλεκτρονικές διασταυρώσεις της Γ.Γ.Π.Σ.Ψ.Δ. και ελέγχους της Τροχαίας. Η διασταύρωση επιφέρει πρόστιμο ανά κατηγορία οχήματος — 250 ευρώ για δίκυκλα, 500 ευρώ για επιβατηγά και 1.000 ευρώ για λεωφορεία και φορτηγά δημόσιας χρήσης — ενώ ο έλεγχος στον δρόμο προσθέτει πρόστιμο και αφαίρεση στοιχείων κυκλοφορίας. Σε ατύχημα, το Επικουρικό Κεφάλαιο αποζημιώνει τον τρίτο και αναζητά το σύνολο από τον ιδιοκτήτη.",
            en: "Uninsured vehicles are detected through electronic cross-checks run by the General Secretariat of Information Systems and Digital Governance, and by traffic police stops. A cross-check triggers a fine set by vehicle class — €250 for two-wheelers, €500 for passenger cars and €1,000 for public-use buses and lorries — while a roadside stop adds a fine and confiscation of the plates and registration. In an accident, the Auxiliary Fund compensates the third party and then recovers the full amount from the owner.",
        },
        datePublished: "2026-07-13",
        // 2026-08-26, two changes on the same day from two branches.
        // 1. Extended with the objection window and the reader's own evidence
        //    that cover was in force on the check date (SRC-012).
        // 2. HALT-G02 and HALT-G04 RESOLVED — the growth-branch note that said
        //    otherwise was written before the fix landed. The cross-check is
        //    Γ.Γ.Π.Σ.Ψ.Δ.'s and the fine is Σ.Δ.Ο.Ε.'s — the tax authority
        //    named here before runs road tax, not this check — and the
        //    amounts are 1.000/500/250 by vehicle class — ν. 5113/2024, άρ. 22-24.
        dateModified: "2026-10-21",
        readingMinutes: 6,
        related: [
            {
                label: {
                    el: "Τι καλύπτει η ασφάλεια αυτοκινήτου;",
                    en: "What does car insurance cover?",
                },
                href: "/guides/ti-kalyptei-i-asfaleia-aytokinitou",
            },
            {
                label: {
                    el: "Ασφάλεια αυτοκινήτου στο PolicyWallet",
                    en: "Motor insurance in PolicyWallet",
                },
                href: "/product/motor",
            },
        ],
        sections: [
            {
                heading: {
                    el: "Πώς εντοπίζονται τα ανασφάλιστα οχήματα;",
                    en: "How are uninsured vehicles detected?",
                },
                paragraphs: [
                    {
                        el: "Δύο μηχανισμοί λειτουργούν παράλληλα. Ο πρώτος είναι ηλεκτρονικός: η Γενική Γραμματεία Πληροφοριακών Συστημάτων και Ψηφιακής Διακυβέρνησης (Γ.Γ.Π.Σ.Ψ.Δ.) του Υπουργείου Ψηφιακής Διακυβέρνησης διασταυρώνει, τουλάχιστον μία φορά ανά ημερολογιακό εξάμηνο, το μητρώο οχημάτων με το Κέντρο Πληροφοριών ασφαλισμένων οχημάτων· όποιο όχημα με ενεργή άδεια κυκλοφορίας δεν εμφανίζεται ασφαλισμένο, εντοπίζεται χωρίς να χρειαστεί έλεγχος στον δρόμο. Ο δεύτερος είναι ο κλασικός έλεγχος από την Τροχαία.",
                        en: "Two mechanisms run in parallel. The first is electronic: the General Secretariat of Information Systems and Digital Governance, at least once every calendar half-year, cross-references the vehicle registry with the insured-vehicle Information Center; any vehicle with active registration that does not appear insured is flagged without a roadside stop. The second is the classic traffic police check.",
                    },
                    {
                        el: "Αν δεν χρησιμοποιείτε το όχημα, η νόμιμη ακινησία πρέπει να έχει δηλωθεί. Το ότι μένει σε ιδιωτικό χώρο δεν αρκεί από μόνο του. Η υποχρέωση δασικής πυρκαγιάς και πλημμύρας εξετάζεται χωριστά και ισχύει και σε διοικητική ακινησία.",
                        en: "If you do not use the vehicle, lawful immobilisation must be declared. Keeping it on private property is not enough. Forest-fire and flood insurance is a separate requirement and also applies during administrative immobilisation.",
                    },
                ],
            },
            {
                heading: {
                    el: "Ποια πρόστιμα και κυρώσεις προβλέπονται;",
                    en: "What fines and penalties apply?",
                },
                paragraphs: [
                    {
                        el: "Από την ηλεκτρονική διασταύρωση επιβάλλεται πρόστιμο από τη Γενική Διεύθυνση Σώματος Δίωξης Οικονομικού Εγκλήματος (Γ.Δ. Σ.Δ.Ο.Ε.), κλιμακούμενο ανά κατηγορία οχήματος και όχι ανά κυβισμό: 250 ευρώ για τα δίκυκλα, 500 ευρώ για τα επιβατηγά και κάθε άλλο όχημα, και 1.000 ευρώ για τα λεωφορεία και τα φορτηγά δημόσιας χρήσης. Τα ποσά ορίζονται στο άρθρο 23 του ν. 5113/2024. Η πληρωμή του παραβόλου δεν «νομιμοποιεί»: πρέπει και να ασφαλίσετε το όχημα εντός της ταχθείσας προθεσμίας, αλλιώς ακολουθούν αυστηρότερες κυρώσεις.",
                        en: "The electronic cross-check triggers a fine imposed by the Financial Crime Directorate (Γ.Δ. Σ.Δ.Ο.Ε.), set by vehicle class rather than by engine size: €250 for two-wheelers, €500 for passenger cars and any other vehicle, and €1,000 for public-use buses and lorries. The amounts are set in article 23 of law 5113/2024. Paying the fee does not legalize you: the vehicle must also be insured within the set deadline, or stricter penalties follow.",
                    },
                    {
                        el: "Σε έλεγχο της Τροχαίας, οι κυρώσεις είναι βαρύτερες και άμεσες: χρηματικό πρόστιμο, αφαίρεση πινακίδων, άδειας κυκλοφορίας και διπλώματος, ενώ η οδήγηση ανασφάλιστου οχήματος συνιστά και ποινικό αδίκημα.",
                        en: "At a police stop, penalties are heavier and immediate: a monetary fine, confiscation of plates, registration, and license — and driving uninsured is also a criminal offense.",
                    },
                ],
            },
            {
                heading: {
                    el: "Τι γίνεται αν ανασφάλιστο όχημα προκαλέσει ατύχημα;",
                    en: "What happens when an uninsured vehicle causes an accident?",
                },
                paragraphs: [
                    {
                        el: "Το Επικουρικό Κεφάλαιο μπορεί να αποζημιώσει τον ζημιωθέντα υπό τις προϋποθέσεις του νόμου και στη συνέχεια να ζητήσει τα ποσά από τους υπεύθυνους. Η πληρωμή προστίμου δεν σας απαλλάσσει από την ευθύνη για το ατύχημα.",
                        en: "The Motor Insurers' Bureau may compensate the injured party under statutory conditions and then recover the amounts from those responsible. Paying a fine does not remove liability for the accident.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πώς τακτοποιείτε άμεσα την εκκρεμότητα;",
                    en: "How do you resolve the issue quickly?",
                },
                paragraphs: [
                    {
                        el: "Διαβάστε την πράξη και τις προθεσμίες της. Αν χρειάζεται ασφάλιση, επιβεβαιώστε πότε αρχίζει η κάλυψη· η νέα ασφάλιση δεν καλύπτει αναδρομικά το προηγούμενο διάστημα. Αν τα στοιχεία είναι λάθος, συγκεντρώστε τα αποδεικτικά και ακολουθήστε τη διαδικασία ένστασης.",
                        en: "Read the notice and its deadlines. If insurance is needed, confirm when cover begins; new insurance does not cover the previous period retrospectively. If the information is wrong, collect evidence and follow the objection procedure.",
                    },
                ],
            },
            {
                heading: {
                    el: "Τι κρίνει μια ένσταση και πόσο χρόνο έχετε;",
                    en: "What does an objection turn on, and how long do you have?",
                },
                paragraphs: [
                    {
                        el: "Ο ν. 5113/2024 (ΦΕΚ Α΄ 96/21.06.2024) προβλέπει δικαίωμα ένστασης κατά της πράξης επιβολής προστίμου. Η ένσταση υποβάλλεται ηλεκτρονικά, σε ειδική εφαρμογή της Ενιαίας Ψηφιακής Πύλης της Δημόσιας Διοίκησης, εντός προθεσμίας δέκα (10) εργάσιμων ημερών από την κοινοποίηση της πράξης. Εξετάζεται από την αρχή που επιβάλλει το αντίστοιχο πρόστιμο, η οποία αποφαίνεται εντός τριάντα (30) εργάσιμων ημερών· σε περίπτωση αποδοχής, το πρόστιμο ή τα τέλη κυκλοφορίας διαγράφονται.",
                        en: "Law 5113/2024 (Government Gazette A΄ 96/21.06.2024) provides a right to object to the penalty notice. The objection is filed electronically, through a dedicated application on the national digital portal, within ten (10) working days of the notice being served. It is examined by the authority that imposes the relevant fine, which decides within thirty (30) working days; where it is accepted, the fine or the road tax is written off.",
                    },
                    {
                        el: "Ο νόμος ορίζει το δικαίωμα και τις προθεσμίες. Δεν απαριθμεί τι αποδεικνύει ότι υπήρχε κάλυψη — αυτό δεν γράφεται στο κείμενο, και δεν το συμπληρώνουμε εμείς. Αυτό που μπορείτε να συγκεντρώσετε είναι τα δικά σας έγγραφα και οι ημερομηνίες τους.",
                        en: "The statute sets out the right and the deadlines. It does not enumerate what proves that cover was in force — the text does not say, and we do not fill that in. What you can gather is your own documents and the dates on them.",
                    },
                    {
                        el: "Το ερώτημα είναι χρονικό, όχι διαδικαστικό: τι έδειχναν τα έγγραφά σας για τη συγκεκριμένη ημέρα. Κάθε ασφαλιστική περίοδος έχει αρχή και τέλος τυπωμένα πάνω της, και μια αλλαγή εταιρείας μέσα στη χρονιά αφήνει δύο ζεύγη ημερομηνιών αντί για ένα. Αν υπάρχει κενό, βρίσκεται ανάμεσά τους.",
                        en: "The question is one about time, not about procedure: what your documents showed for that particular day. Every period of insurance has a start and an end printed on it, and switching insurer mid-year leaves two pairs of dates instead of one. If there is a gap, it sits between them.",
                    },
                ],
                bullets: [
                    {
                        el: "«Ημερομηνία έναρξης» και «ημερομηνία λήξης» της ασφαλιστικής περιόδου (inception and expiry dates) — τυπωμένες στο ασφαλιστήριο και στη βεβαίωση ασφάλισης.",
                        en: "«Ημερομηνία έναρξης» and «ημερομηνία λήξης» — the inception and expiry dates of the period of insurance, printed on the policy and on the certificate.",
                    },
                    {
                        el: "Η «βεβαίωση ασφάλισης» (certificate of insurance) για κάθε περίοδο που ακουμπά την επίμαχη ημέρα, όχι μόνο για την τρέχουσα.",
                        en: "The «βεβαίωση ασφάλισης» — certificate of insurance — for every period that touches the day in question, not only the current one.",
                    },
                    {
                        el: "Οι αποδείξεις πληρωμής ασφαλίστρου (premium payment receipts) και οι ημερομηνίες τους.",
                        en: "The «αποδείξεις πληρωμής ασφαλίστρου» — premium payment receipts — and their dates.",
                    },
                    {
                        el: "Αν αλλάξατε εταιρεία: το τέλος της προηγούμενης περιόδου δίπλα στην αρχή της επόμενης — αν ακουμπούν ή αν αφήνουν ημέρες ανάμεσα.",
                        en: "If you switched insurer: the end of the previous period beside the start of the next — whether they meet, or leave days between them.",
                    },
                    {
                        el: "Η ημερομηνία κοινοποίησης της πράξης, από την οποία μετρούν οι δέκα εργάσιμες ημέρες.",
                        en: "The date the notice was served, from which the ten working days are counted.",
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Το όχημα είναι στην αυλή μου και δεν κυκλοφορεί — χρειάζεται ασφάλιση;",
                    en: "My vehicle sits in my yard unused — does it need insurance?",
                },
                answer: {
                    el: "Το ότι δεν το χρησιμοποιείτε δεν αρκεί. Η αστική ευθύνη και η νόμιμη ακινησία έχουν συγκεκριμένους κανόνες. Επιπλέον, η κάλυψη δασικής πυρκαγιάς και πλημμύρας απαιτείται και σε διοικητική ακινησία, με τις νόμιμες εξαιρέσεις.",
                    en: "Not using it is not enough. Third-party liability and lawful immobilisation have specific rules. Forest-fire and flood cover is also required during administrative immobilisation, subject to statutory exceptions.",
                },
            },
            {
                question: {
                    el: "Πλήρωσα το παράβολο — τελείωσε η υπόθεση;",
                    en: "I paid the fee — is the matter closed?",
                },
                answer: {
                    el: "Όχι. Το παράβολο είναι κύρωση, όχι άδεια. Αν το όχημα δεν ασφαλιστεί (ή δεν δηλωθεί ακινησία) εντός της προθεσμίας, προβλέπονται αυστηρότερες συνέπειες στις επόμενες διασταυρώσεις.",
                    en: "No. The fee is a penalty, not a permit. If the vehicle is not insured (or immobility declared) within the deadline, stricter consequences follow at the next cross-checks.",
                },
            },
            {
                question: {
                    el: "Πώς ελέγχω αν το όχημά μου εμφανίζεται ασφαλισμένο;",
                    en: "How do I check whether my vehicle shows as insured?",
                },
                answer: {
                    el: "Μέσω της υπηρεσίας ελέγχου ασφάλισης οχήματος στο Κέντρο Πληροφοριών (μέσω gov.gr) με τον αριθμό κυκλοφορίας. Αξίζει έλεγχο μετά από κάθε αλλαγή εταιρείας — καθυστερημένη ενημέρωση του μητρώου έχει προκαλέσει εσφαλμένες ειδοποιήσεις.",
                    en: "Via the vehicle insurance check service of the Information Center (through gov.gr) using the plate number. Worth checking after every insurer switch — delayed registry updates have caused erroneous notices.",
                },
            },
            {
                question: {
                    el: "Πόσο χρόνο έχω για να υποβάλω ένσταση;",
                    en: "How long do I have to file an objection?",
                },
                answer: {
                    el: "Δέκα (10) εργάσιμες ημέρες από την κοινοποίηση της πράξης επιβολής προστίμου, ηλεκτρονικά μέσω ειδικής εφαρμογής της Ενιαίας Ψηφιακής Πύλης της Δημόσιας Διοίκησης. Η αρχή που επιβάλλει το πρόστιμο αποφαίνεται εντός τριάντα (30) εργάσιμων ημερών, και σε αποδοχή της ένστασης το πρόστιμο ή τα τέλη κυκλοφορίας διαγράφονται (ν. 5113/2024, άρθρο 24).",
                    en: "Ten (10) working days from service of the penalty notice, filed electronically through a dedicated application on the national digital portal. The authority that imposes the fine decides within thirty (30) working days, and if the objection is accepted the fine or the road tax is written off (Law 5113/2024, article 24).",
                },
            },
        ],
        sources: [{"label":{"el":"ΦΕΚ Β΄ 2706/2025 — ασφάλιση οχημάτων για δασική πυρκαγιά και πλημμύρα","en":"Gazette B 2706/2025 — vehicle forest-fire and flood insurance"},"url":"https://www.epimetol.gr/wp-content/uploads/2025/06/Η-απόφαση-για-την-υποχρεωτική-ασφάλιση-οχημάτων-έναντι-φυσικών-καταστροφών.pdf"},
            {
                label: {
                    el: "ν. 5113/2024 (ΦΕΚ Α΄ 96) — ανασφάλιστα οχήματα, άρθρα 22–24",
                    en: "Law 5113/2024 (Gazette A 96) — uninsured vehicles, articles 22–24",
                },
                url: "https://minfin.gov.gr/wp-content/uploads/2024/07/FEK-2024-Tefxos-A-00096-N.-5113-2024-ΑΝΑΣΦΑΛΙΣΤΑ-ΟΧΗΜΑΤΑ.pdf",
            },
            {
                label: {
                    el: "gov.gr — Έλεγχος ασφάλισης οχήματος",
                    en: "gov.gr — Vehicle insurance check",
                },
                url: "https://www.gov.gr",
            },
            {
                label: {
                    el: "Επικουρικό Κεφάλαιο Ασφάλισης Ευθύνης από Ατυχήματα Αυτοκινήτων",
                    en: "Auxiliary Fund for Motor Liability Insurance",
                },
                url: "https://www.epikef.gr",
            },
            {
                label: {
                    el: "ν. 5113/2024 (ΦΕΚ Α΄ 96/21.06.2024) — ηλεκτρονικοί διασταυρωτικοί έλεγχοι και ένσταση, άρθρα 22-24 (PDF)",
                    en: "Law 5113/2024 (Gazette A΄ 96/21.06.2024) — electronic cross-checks and objections, articles 22-24 (PDF)",
                },
                url: "https://minfin.gov.gr/wp-content/uploads/2024/07/FEK-2024-Tefxos-A-00096-N.-5113-2024-ΑΝΑΣΦΑΛΙΣΤΑ-ΟΧΗΜΑΤΑ.pdf",
            },
        ],
    },
    {
        slug: "diaxeirisi-asfalistirion-se-ena-simeio",
        title: {
            el: "Πού διαχειρίζεστε όλα τα ασφαλιστήριά σας online;",
            en: "Where can you manage all your insurance policies online?",
        },
        metaTitle: {
            el: "Διαχείριση ασφαλιστηρίων online",
            en: "Manage all your policies in one place",
        },
        metaDescription: {
            el: "Portal ασφαλιστικής, εφαρμογή ασφαλιστή ή ψηφιακό πορτοφόλι; Σύγκριση ανά κατηγορία: έγγραφα, ανάλυση καλύψεων, ανανεώσεις, πληρωμές, αποζημιώσεις.",
            en: "Insurer portal, agent app or a policy wallet? A category-by-category comparison: documents, coverage analysis, renewals, premium payments and claims.",
        },
        summary: {
            el: "Μπορείτε να χρησιμοποιήσετε την εφαρμογή της ασφαλιστικής, εργαλεία του ασφαλιστή σας ή χώρο αποθήκευσης εγγράφων. Οι δυνατότητες διαφέρουν ανά υπηρεσία. Το PolicyWallet συγκεντρώνει ασφαλιστήρια διαφορετικών εταιρειών και εξηγεί το περιεχόμενό τους· δεν δέχεται πληρωμές ασφαλίστρων και δεν παρακολουθεί την εξέλιξη αποζημιώσεων.",
            en: "You can use your insurer's app, your adviser's tools or document storage. Features vary by service. PolicyWallet brings together policies from different insurers and explains their contents; it does not accept premium payments or track claim progress.",
        },
        datePublished: "2026-07-27",
        dateModified: "2026-10-21",
        readingMinutes: 8,
        sections: [
            {
                heading: {
                    el: "Ποιες επιλογές υπάρχουν σήμερα;",
                    en: "What options exist today?",
                },
                paragraphs: [
                    {
                        el: "Δείτε αν η υπηρεσία δέχεται έγγραφα από τις εταιρείες που σας ενδιαφέρουν, αν εξηγεί τους όρους και αν παρέχει τις υπενθυμίσεις που χρειάζεστε. Οι δυνατότητες διαφέρουν ανά πάροχο.",
                        en: "Check whether the service accepts documents from the insurers you use, explains terms and provides the reminders you need. Features vary by provider.",
                    },
                ],
                bullets: [
                    {
                        el: "Το portal ή η εφαρμογή της ασφαλιστικής σας εταιρείας: πλήρης εικόνα, αλλά μόνο για τα δικά της ασφαλιστήρια. Με τρεις εταιρείες χρειάζεστε τρεις λογαριασμούς.",
                        en: "Your insurer's own portal or app: a complete picture, but only of its own policies. With three insurers you need three logins.",
                    },
                    {
                        el: "Η εφαρμογή του ασφαλιστή ή του πρακτορείου σας: ρωτήστε ποια ασφαλιστήρια μπορεί να συγκεντρώσει και αν μπορείτε να προσθέσετε άλλα.",
                        en: "Your adviser's or agency's app: ask which policies it can bring together and whether you can add others.",
                    },
                    {
                        el: "Οι ιστοσελίδες σύγκρισης: βοηθούν στη σύγκριση προσφορών. Οι υπηρεσίες μετά την αγορά διαφέρουν ανά πάροχο.",
                        en: "Comparison websites help compare quotes. Post-purchase services vary by provider.",
                    },
                    {
                        el: "Η γενική αποθήκευση αρχείων, όπως έναν δίσκο στο cloud ή φωτογραφίες στο κινητό: κρατά τα PDF, δεν καταλαβαίνει το περιεχόμενό τους.",
                        en: "Generic file storage, such as a cloud drive or photos on your phone: it keeps the PDFs but understands nothing inside them.",
                    },
                    {
                        el: "Το ψηφιακό πορτοφόλι ασφαλίσεων: δέχεται ασφαλιστήρια από οποιαδήποτε εταιρεία και διαβάζει τι λένε. Δεν εισπράττει, όμως, ασφάλιστρα.",
                        en: "The insurance policy wallet: it takes policies from any insurer and reads what they say. It does not, however, collect premiums.",
                    },
                ],
            },
            {
                heading: {
                    el: "Τι κάνει η κάθε κατηγορία;",
                    en: "What does each category actually do?",
                },
                paragraphs: [
                    {
                        el: "Ο πίνακας συγκρίνει τις πέντε κατηγορίες σε έξι πράγματα που ζητούν συνήθως όσοι θέλουν «όλα σε ένα σημείο». Οι δύο τελευταίες στήλες είναι αυτές που εκπλήσσουν τους περισσότερους.",
                        en: "The table compares the five categories across the six things people usually mean by “all in one place”. The last two columns are the ones that surprise most readers.",
                    },
                ],
                table: {
                    caption: {
                        el: "Τι καλύπτει κάθε κατηγορία εργαλείου διαχείρισης ασφαλιστηρίων.",
                        en: "What each category of policy-management tool covers.",
                    },
                    columns: [
                        { el: "Επιλογή", en: "Option" },
                        { el: "Όλες οι ασφαλιστικές μαζί", en: "All insurers together" },
                        { el: "Έγγραφα σε ένα σημείο", en: "Documents in one place" },
                        { el: "Ανάλυση καλύψεων και κενών", en: "Coverage and gap analysis" },
                        { el: "Υπενθυμίσεις ανανέωσης", en: "Renewal reminders" },
                        { el: "Πληρωμή ασφαλίστρων", en: "Premium payment" },
                        { el: "Κατάσταση αποζημίωσης", en: "Claim status" },
                    ],
                    rows: [
                        {
                            cells: [
                                { el: "Portal ασφαλιστικής εταιρείας", en: "Insurer's own portal" },
                                false,
                                { el: "Μόνο τα δικά της", en: "Only its own" },
                                false,
                                true,
                                true,
                                true,
                            ],
                        },
                        {
                            cells: [
                                { el: "Εφαρμογή ασφαλιστή ή πρακτορείου", en: "Agent or agency app" },
                                { el: "Μόνο του χαρτοφυλακίου του", en: "Only their own book" },
                                true,
                                { el: "Μερικώς", en: "Partly" },
                                true,
                                { el: "Κατά περίπτωση", en: "Case by case" },
                                { el: "Μέσω του ασφαλιστή", en: "Via the agent" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Συγκριτική πλατφόρμα", en: "Comparison site" },
                                false,
                                false,
                                false,
                                false,
                                { el: "Στη στιγμή της αγοράς", en: "At the point of purchase" },
                                false,
                            ],
                        },
                        {
                            cells: [
                                { el: "Γενική αποθήκευση αρχείων", en: "Generic file storage" },
                                true,
                                true,
                                false,
                                false,
                                false,
                                false,
                            ],
                        },
                        {
                            cells: [
                                { el: "Ψηφιακό πορτοφόλι ασφαλίσεων", en: "Insurance policy wallet" },
                                true,
                                true,
                                true,
                                true,
                                false,
                                { el: "Οδηγίες, όχι κατάσταση", en: "Guidance, not status" },
                            ],
                        },
                    ],
                    note: {
                        el: "Η σύγκριση αφορά κατηγορίες εργαλείων, όχι συγκεκριμένες εταιρείες· οι δυνατότητες διαφέρουν από πάροχο σε πάροχο.",
                        en: "The comparison covers categories of tool, not named companies; capabilities vary from provider to provider.",
                    },
                },
            },
            {
                heading: {
                    el: "Τι δεν κάνει το PolicyWallet;",
                    en: "What does PolicyWallet not do?",
                },
                paragraphs: [
                    {
                        el: "Στο PolicyWallet δεν πληρώνετε ασφάλιστρα. Χρησιμοποιήστε τον τρόπο πληρωμής που σας έχει δώσει η ασφαλιστική ή ο εξουσιοδοτημένος ασφαλιστής σας.",
                        en: "You cannot pay insurance premiums through PolicyWallet. Use the payment method provided by your insurer or authorised adviser.",
                    },
                    {
                        el: "Το PolicyWallet δεν συνδέεται με τον φάκελο αποζημίωσης της εταιρείας σας. Για την εξέλιξη μιας ζημιάς, επικοινωνήστε με την εταιρεία ή τον ασφαλιστή σας.",
                        en: "PolicyWallet does not connect to your insurer's claim file. Contact the insurer or your adviser for claim progress.",
                    },
                    {
                        el: "Το ίδιο ισχύει για τον έλεγχο ασφαλιστηρίου με τον αριθμό ασφαλιστηρίου: αυτή η αναζήτηση δουλεύει στο portal της εταιρείας που το εξέδωσε. Ένα πορτοφόλι ασφαλίσεων σάς δείχνει την κατάσταση που προκύπτει από το ίδιο σας το έγγραφο — σε ισχύ, λήγει σύντομα ή έληξε — όχι την εγγραφή της εταιρείας.",
                        en: "The same goes for checking a policy by its policy number: that lookup works on the portal of the insurer that issued it. A policy wallet shows you the status derived from your own document — active, expiring soon, or expired — not the insurer's record.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πώς λειτουργεί το PolicyWallet;",
                    en: "How does PolicyWallet work?",
                },
                paragraphs: [
                    {
                        el: "Ανεβάζετε τα ασφαλιστήριά σας και η εφαρμογή οργανώνει τις πληροφορίες που διαβάζει: καλύψεις, εξαιρέσεις, ποσά και ημερομηνίες. Η εξήγηση βοηθά στην ανάγνωση, αλλά χρειάζεται έλεγχο με το πρωτότυπο.",
                        en: "Upload your policies and the application organises the information it reads: cover, exclusions, amounts and dates. The explanation helps you read them but must be checked against the original.",
                    },
                    {
                        el: "Δείτε τις ρητές εξαιρέσεις του εγγράφου σας· με το Family δείτε και ευρήματα από τους ελέγχους, όπως διαφορές μεταξύ ποσών. Αν δύο ασφαλιστήρια έχουν παρόμοιες καλύψεις, ρωτήστε πώς συνδυάζονται· δεν είναι αυτόματα διπλή χρέωση για το ίδιο αποτέλεσμα.",
                        en: "See the explicit exclusions in your document; with Family also review findings from checks, such as differences between amounts. If two policies have similar cover, ask how they work together; it is not automatically double payment for the same result.",
                    },
                    {
                        el: `Από εκεί και πέρα: υπενθυμίσεις ανανέωσης ${LADDER_FROM.el} τη λήξη στα πλάνα Plus και Family, και — με το πλάνο Family — ερωτήσεις στην AI για ένα συγκεκριμένο ασφαλιστήριο, ασφαλής κοινοποίηση σε σύμβουλο που ανακαλείται όποτε θέλετε, και εξαγωγή αναφοράς. Το PolicyWallet δεν πουλά ασφάλειες και δεν παίρνει προμήθειες: δεν είναι ασφαλιστική επιχείρηση ούτε διαμεσολαβητής.`,
                        en: `Beyond that: renewal reminders ${LADDER_FROM.en} of expiry on Plus and Family, and — on the Family plan — AI questions about a specific policy, secure sharing with an advisor that you can revoke at any time, and report export. PolicyWallet does not sell insurance and takes no commission: it is neither an insurance undertaking nor an intermediary.`,
                    },
                ],
            },
            {
                heading: {
                    el: "Πώς επιλέγετε ανάλογα με την περίπτωσή σας;",
                    en: "How do you choose for your own situation?",
                },
                paragraphs: [
                    {
                        el: "Επιλέξτε με βάση τις λειτουργίες που χρειάζεστε, τις εταιρείες που υποστηρίζονται και το κόστος.",
                        en: "Choose based on the features you need, supported insurers and cost.",
                    },
                ],
                bullets: [
                    {
                        el: "Για ένα ασφαλιστήριο, ξεκινήστε ελέγχοντας τι προσφέρει η εφαρμογή της εταιρείας σας.",
                        en: "For one policy, start by checking what your insurer's app offers.",
                    },
                    {
                        el: "Όλα τα ασφαλιστήρια μέσω ενός ασφαλιστή: η εφαρμογή του πρακτορείου καλύπτει τα περισσότερα — αρκεί να μη διαφεύγει κάτι που κλείσατε αλλού.",
                        en: "Everything through one agent: the agency's app covers most of it — as long as nothing you bought elsewhere slips through.",
                    },
                    {
                        el: "Για ασφαλιστήρια διαφορετικών εταιρειών, ελέγξτε αν η υπηρεσία τα δέχεται όλα.",
                        en: "For policies from different insurers, check whether the service accepts them all.",
                    },
                    {
                        el: "Θέλετε να καταλάβετε τι πραγματικά καλύπτεστε, όχι απλώς να βρίσκετε το αρχείο: χρειάζεστε ανάλυση, όχι αποθήκευση.",
                        en: "You want to understand what you are actually covered for, not just find the file: you need analysis, not storage.",
                    },
                    {
                        el: "Θέλετε να πληρώνετε από ένα σημείο: αυτό λύνεται στην τράπεζα ή στην ασφαλιστική εταιρεία, όχι σε εφαρμογή διαχείρισης.",
                        en: "You want to pay from one place: that is solved at your bank or your insurer, not in a management app.",
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Πού μπορώ να διαχειρίζομαι όλα τα ασφαλιστήριά μου σε ένα σημείο;",
                    en: "Where can I manage all my insurance policies in one place?",
                },
                answer: {
                    el: "Σε ένα ψηφιακό πορτοφόλι ασφαλίσεων ανεξάρτητο από ασφαλιστική εταιρεία. Τα portal των εταιρειών δείχνουν μόνο τα δικά τους ασφαλιστήρια, ενώ ένα πορτοφόλι δέχεται ασφαλιστήρια από όλες τις εταιρείες μαζί και τα διαβάζει.",
                    en: "In an insurer-independent policy wallet. Insurers' portals show only their own contracts, whereas a wallet accepts policies from every insurer at once and reads them.",
                },
            },
            {
                question: {
                    el: "Μπορώ να πληρώνω τα ασφάλιστρά μου από την ίδια εφαρμογή;",
                    en: "Can I pay my premiums from the same app?",
                },
                answer: {
                    el: "Δεν μπορείτε να πληρώσετε ασφάλιστρα μέσω του PolicyWallet. Χρησιμοποιήστε τους τρόπους που δίνει η ασφαλιστική σας ή ο εξουσιοδοτημένος ασφαλιστής σας. Άλλες εφαρμογές μπορεί να έχουν διαφορετικές δυνατότητες.",
                    en: "You cannot pay premiums through PolicyWallet. Use the methods provided by your insurer or authorised adviser. Other applications may have different features.",
                },
            },
            {
                question: {
                    el: "Μπορώ να ελέγξω κατάσταση ασφαλιστηρίου με τον αριθμό ασφαλιστηρίου;",
                    en: "Can I check a policy's status by policy number?",
                },
                answer: {
                    el: "Με τον αριθμό, μόνο στο portal της εταιρείας που το εξέδωσε. Ένα πορτοφόλι ασφαλίσεων υπολογίζει την κατάσταση από το δικό σας έγγραφο — σε ισχύ, λήγει σύντομα ή έληξε — χωρίς να ρωτά την εταιρεία.",
                    en: "By number, only on the portal of the insurer that issued it. A policy wallet derives the status from your own document — active, expiring soon or expired — without querying the insurer.",
                },
            },
            {
                question: {
                    el: "Πόσο κοστίζει μια πλατφόρμα διαχείρισης ασφαλιστηρίων;",
                    en: "How much does a policy-management platform cost?",
                },
                answer: {
                    el: `Οι τιμές διαφέρουν ανά υπηρεσία. Το PolicyWallet διαθέτει δωρεάν πλάνο για ${FREE_UP_TO.el}. Δείτε τις τρέχουσες τιμές, τις λειτουργίες και τα όρια στη σελίδα τιμών.`,
                    en: `Prices vary by service. PolicyWallet has a free plan for ${FREE_UP_TO.en}. See current prices, features and limits on the pricing page.`,
                },
            },
            {
                question: {
                    el: "Ποια είναι η καλύτερη επιλογή αν έχω πολλά ασφαλιστήρια;",
                    en: "What is the best option if I have several policies?",
                },
                answer: {
                    el: "Ελέγξτε αν δέχεται έγγραφα από τις εταιρείες σας, αν βρίσκετε εύκολα τα στοιχεία και αν οι λειτουργίες του ταιριάζουν σε όσα χρειάζεστε. Για συμβουλή σχετικά με τις καλύψεις, μιλήστε με τον ασφαλιστή σας.",
                    en: "Check whether it accepts documents from your insurers, makes information easy to find and offers the features you need. Speak to your adviser about your cover.",
                },
            },
        ],
        sources: [
            {
                label: {
                    el: "ΕΑΕΕ — Στατιστικά στοιχεία ασφαλιστικής αγοράς",
                    en: "HAIC — Greek insurance market statistics",
                },
                url: "https://www.eaee.gr",
            },
            {
                label: {
                    el: "Τράπεζα της Ελλάδος — Εποπτεία ιδιωτικής ασφάλισης",
                    en: "Bank of Greece — Private insurance supervision",
                },
                url: "https://www.bankofgreece.gr",
            },
        ],
        related: [
            {
                label: { el: "Σκορ Προστασίας", en: "Protection Score" },
                href: "/lexiko/skor-prostasias",
            },
            {
                label: {
                    el: "Τι δεν είναι το PolicyWallet — η σύγκριση",
                    en: "What PolicyWallet is not — the comparison",
                },
                href: "/compare",
            },
            {
                label: {
                    el: "Πληρωμή ασφαλίστρων ψηφιακά",
                    en: "Paying insurance premiums digitally",
                },
                href: "/guides/pliromi-asfalistron-psifiaka",
            },
            {
                label: {
                    el: "Εφαρμογές για ασφαλιστήρια και ζημιές",
                    en: "Apps for policies, cover and claims",
                },
                href: "/guides/efarmoges-asfalistirion-apozimioseis",
            },
            {
                label: {
                    el: "Ανάλυση ασφαλιστηρίου με AI",
                    en: "AI policy analysis",
                },
                href: "/product",
            },
        ],
    },
    {
        slug: "pliromi-asfalistron-psifiaka",
        title: {
            el: "Ψηφιακά πορτοφόλια και πληρωμή ασφαλίστρων: τι ισχύει;",
            en: "Digital wallets and insurance premium payments: how it works",
        },
        metaTitle: {
            el: "Πληρωμή ασφαλίστρων ψηφιακά",
            en: "How insurance premiums are paid digitally",
        },
        metaDescription: {
            el: "Τι σημαίνει «ψηφιακό πορτοφόλι» στην ασφάλιση, πώς πληρώνονται σήμερα τα ασφάλιστρα στην Ελλάδα και τι παρακολουθείτε ψηφιακά χωρίς να πληρώνετε.",
            en: "What a digital wallet means in insurance, how premiums are actually paid in Greece, and what you can track digitally without paying from the app.",
        },
        summary: {
            el: "Στην ασφάλιση ο όρος «ψηφιακό πορτοφόλι» σημαίνει δύο εντελώς διαφορετικά πράγματα. Το πορτοφόλι πληρωμών κρατά κάρτες και μεταφέρει χρήματα, οπότε μπορεί να εξοφλήσει ένα ασφάλιστρο όπου η εταιρεία δέχεται τη μέθοδο. Το πορτοφόλι ασφαλίσεων κρατά τα ασφαλιστήρια και τις καλύψεις σας: σας δείχνει πόσο πληρώνετε και πότε λήγει η κάλυψη, χωρίς να κινεί χρήματα.",
            en: "In insurance, “digital wallet” means two entirely different things. A payment wallet holds cards and moves money, so it can settle a premium wherever the insurer accepts that method. A policy wallet holds your contracts and your cover: it shows you what you pay and when cover ends, without moving any money at all.",
        },
        datePublished: "2026-07-27",
        dateModified: "2026-10-21",
        readingMinutes: 7,
        sections: [
            {
                heading: {
                    el: "Τι εννοούμε «ψηφιακό πορτοφόλι» στην ασφάλιση;",
                    en: "What does “digital wallet” mean in insurance?",
                },
                paragraphs: [
                    {
                        el: "Το πορτοφόλι πληρωμών σας βοηθά να πληρώνετε. Το PolicyWallet οργανώνει ασφαλιστήρια και εξηγεί όσα αναφέρουν τα έγγραφα. Δεν μεταφέρει χρήματα.",
                        en: "A payment wallet helps you pay. PolicyWallet organises policies and explains what the documents say. It does not transfer money.",
                    },
                ],
                table: {
                    caption: {
                        el: "Πορτοφόλι πληρωμών και πορτοφόλι ασφαλίσεων: πού διαφέρουν.",
                        en: "Payment wallet versus policy wallet: where they differ.",
                    },
                    columns: [
                        { el: "Ερώτημα", en: "Question" },
                        { el: "Πορτοφόλι πληρωμών", en: "Payment wallet" },
                        { el: "Πορτοφόλι ασφαλίσεων", en: "Policy wallet" },
                    ],
                    rows: [
                        {
                            cells: [
                                { el: "Τι κρατά", en: "What it holds" },
                                { el: "Κάρτες και υπόλοιπα", en: "Cards and balances" },
                                { el: "Ασφαλιστήρια και καλύψεις", en: "Policies and cover" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Ρόλος στο ασφάλιστρο", en: "Role in the premium" },
                                { el: "Το εξοφλεί, όπου γίνεται δεκτό", en: "Settles it, where accepted" },
                                { el: "Το εμφανίζει και το υπενθυμίζει", en: "Displays it and reminds you" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Ξέρει τι καλύπτεστε", en: "Knows what you are covered for" },
                                false,
                                true,
                            ],
                        },
                        {
                            cells: [
                                { el: "Δουλεύει με όλες τις ασφαλιστικές", en: "Works across all insurers" },
                                { el: "Όπου δέχονται τη μέθοδο", en: "Where the method is accepted" },
                                true,
                            ],
                        },
                        {
                            cells: [
                                { el: "Καθεστώς λειτουργίας", en: "Regulatory footing" },
                                { el: "Υπηρεσίες πληρωμών", en: "Payment services" },
                                { el: "Δεν είναι ίδρυμα πληρωμών", en: "Not a payment institution" },
                            ],
                        },
                    ],
                },
            },
            {
                heading: {
                    el: "Πώς πληρώνονται σήμερα τα ασφάλιστρα στην Ελλάδα;",
                    en: "How are insurance premiums actually paid in Greece?",
                },
                paragraphs: [
                    {
                        el: "Η είσπραξη γίνεται πάντα από την ασφαλιστική εταιρεία ή τον διαμεσολαβητή, με έναν από τους παρακάτω τρόπους. Ποιοι από αυτούς είναι διαθέσιμοι εξαρτάται από την εταιρεία και το προϊόν, οπότε το σίγουρο σημείο ελέγχου είναι το ειδοποιητήριο πληρωμής και το portal της εταιρείας σας.",
                        en: "Collection always sits with the insurer or the intermediary, through one of the routes below. Which ones are available depends on the insurer and the product, so the reliable place to check is your payment notice and your insurer's own portal.",
                    },
                ],
                bullets: [
                    {
                        el: "Μεταφορά από web banking ή την εφαρμογή της τράπεζας, με τον κωδικό πληρωμής που αναγράφεται στο ειδοποιητήριο.",
                        en: "A transfer from web banking or your bank's app, using the payment code printed on the notice.",
                    },
                    {
                        el: "Πάγια εντολή χρέωσης τραπεζικού λογαριασμού, ώστε η δόση να φεύγει αυτόματα στην ημερομηνία της.",
                        en: "A standing order on your bank account, so each installment leaves automatically on its due date.",
                    },
                    {
                        el: "Επαναλαμβανόμενη χρέωση κάρτας που δηλώνετε μία φορά στην ασφαλιστική εταιρεία.",
                        en: "A recurring card charge that you set up once with the insurer.",
                    },
                    {
                        el: "Πληρωμή με κάρτα στο portal ή στην εφαρμογή της εταιρείας — εκεί εμφανίζονται και τα πορτοφόλια κινητού, όπου το σύστημα πληρωμής τα υποστηρίζει.",
                        en: "A card payment on the insurer's portal or app — this is also where mobile wallets appear, where the checkout supports them.",
                    },
                    {
                        el: "Άμεσες πληρωμές μεταξύ λογαριασμών, όπου η εταιρεία τις έχει ενεργοποιήσει ως τρόπο εξόφλησης.",
                        en: "Instant account-to-account payments, where the insurer has enabled them as a settlement route.",
                    },
                    {
                        el: "Είσπραξη από τον ασφαλιστικό διαμεσολαβητή, ο οποίος αποδίδει το ασφάλιστρο στην εταιρεία.",
                        en: "Collection by your insurance intermediary, who then remits the premium to the insurer.",
                    },
                ],
            },
            {
                heading: {
                    el: "Τι δεν κάνει ένα ψηφιακό πορτοφόλι ασφαλίσεων;",
                    en: "What does an insurance policy wallet not do?",
                },
                paragraphs: [
                    {
                        el: "Το PolicyWallet δεν δέχεται ούτε προωθεί πληρωμές ασφαλίστρων. Δεν εκδίδει ασφαλιστήρια και δεν πουλά ασφάλιση. Χρησιμοποιείται για οργάνωση και κατανόηση των εγγράφων που ανεβάζετε.",
                        en: "PolicyWallet does not accept or forward insurance premium payments. It does not issue policies or sell insurance. It is used to organise and understand the documents you upload.",
                    },
                    {
                        el: "Τα έσοδα του PolicyWallet προέρχονται από συνδρομές, όχι από προμήθειες πώλησης ασφαλιστηρίων. Η ανάλυση μπορεί παρ' όλα αυτά να έχει λάθη και χρειάζεται έλεγχο.",
                        en: "PolicyWallet's revenue comes from subscriptions, not insurance sales commissions. The analysis may still contain errors and needs checking.",
                    },
                ],
            },
            {
                heading: {
                    el: "Τι παρακολουθείτε ψηφιακά χωρίς να πληρώνετε από την εφαρμογή;",
                    en: "What can you track digitally without paying from the app?",
                },
                paragraphs: [
                    {
                        el: "Όταν ανεβάζετε ένα ασφαλιστήριο, η εφαρμογή αναζητά και τα οικονομικά στοιχεία που αναφέρει. Σας βοηθά να τα βρείτε συγκεντρωμένα· δεν επιβεβαιώνει ότι μια πληρωμή έγινε ή ότι μια κάλυψη είναι αρκετή για τις ανάγκες σας.",
                        en: "When you upload a policy, the application also looks for its financial information. It helps you find that information together; it does not confirm that a payment was made or that cover meets your needs.",
                    },
                ],
                bullets: [
                    {
                        el: "Το ασφάλιστρο και τη συχνότητα πληρωμής όπως αναγράφονται στο ασφαλιστήριο.",
                        en: "The premium and the payment frequency exactly as the policy states them.",
                    },
                    {
                        el: "Το συνολικό ετήσιο κόστος όλων των ασφαλιστηρίων μαζί — συνήθως η πρώτη έκπληξη.",
                        en: "The combined annual cost of every policy together — usually the first surprise.",
                    },
                    {
                        el: `Τις ημερομηνίες λήξης και ανανέωσης, με υπενθυμίσεις ${LADDER_FROM.el} στα Plus και Family.`,
                        en: `Expiry and renewal dates, with reminders ${LADDER_FROM.en} on Plus and Family.`,
                    },
                    {
                        el: "Τι άλλαξε ανάμεσα σε δύο εκδόσεις του ίδιου ασφαλιστηρίου, ώστε μια αύξηση ασφαλίστρου να συγκρίνεται με το τι πήρατε επιπλέον.",
                        en: "What changed between two versions of the same policy, so a premium increase can be weighed against what you actually gained.",
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Τι ρόλο παίζουν τα ψηφιακά πορτοφόλια στην πληρωμή ασφαλίστρων;",
                    en: "What role do digital wallets play in insurance premium payments?",
                },
                answer: {
                    el: "Τα πορτοφόλια πληρωμών λειτουργούν ως τρόπος εξόφλησης: παρουσιάζουν την κάρτα σας στο σύστημα πληρωμής της ασφαλιστικής εταιρείας, όπου αυτό τα υποστηρίζει. Τα πορτοφόλια ασφαλίσεων παίζουν διαφορετικό ρόλο — δείχνουν τι πληρώνετε, πότε και για ποια κάλυψη, χωρίς να συμμετέχουν στη συναλλαγή.",
                    en: "Payment wallets act as a settlement method: they present your card at the insurer's checkout, where it supports them. Policy wallets play a different role — they show what you pay, when, and for which cover, without taking part in the transaction.",
                },
            },
            {
                question: {
                    el: "Μπορώ να πληρώσω το ασφάλιστρό μου μέσα από το PolicyWallet;",
                    en: "Can I pay my premium inside PolicyWallet?",
                },
                answer: {
                    el: "Όχι. Το PolicyWallet δεν εισπράττει ασφάλιστρα και δεν είναι ίδρυμα πληρωμών. Η πληρωμή γίνεται στην ασφαλιστική εταιρεία ή στον διαμεσολαβητή σας· η εφαρμογή σάς θυμίζει πότε λήγει το ασφαλιστήριο.",
                    en: "No. PolicyWallet does not collect premiums and is not a payment institution. Payment happens with your insurer or intermediary; the app reminds you when a policy ends.",
                },
            },
            {
                question: {
                    el: "Πώς βλέπω πόσα πληρώνω συνολικά σε ασφάλιστρα;",
                    en: "How do I see what I pay in premiums overall?",
                },
                answer: {
                    el: "Ανεβάζοντας όλα τα ασφαλιστήρια σε ένα σημείο. Το ασφάλιστρο κάθε ασφαλιστηρίου εξάγεται από το ίδιο το έγγραφο, οπότε το άθροισμα προκύπτει χωρίς να το υπολογίσετε εσείς.",
                    en: "By uploading every policy to one place. Each premium is extracted from the document itself, so the total adds up without you working it out.",
                },
            },
            {
                question: {
                    el: "Είναι το PolicyWallet ασφαλιστική εταιρεία ή διαμεσολαβητής;",
                    en: "Is PolicyWallet an insurer or an intermediary?",
                },
                answer: {
                    el: "Το PolicyWallet οργανώνει και εξηγεί τα έγγραφά σας. Δεν εκδίδει ασφαλιστήρια, δεν πουλά ασφάλιση και δεν λαμβάνει προμήθεια πώλησης. Για ασφαλιστική συμβουλή, απευθυνθείτε σε αδειοδοτημένο επαγγελματία.",
                    en: "PolicyWallet organises and explains your documents. It does not issue policies, sell insurance or receive sales commissions. Consult a licensed professional for insurance advice.",
                },
            },
        ],
        sources: [
            {
                label: {
                    el: "Τράπεζα της Ελλάδος — Συστήματα πληρωμών και εποπτεία",
                    en: "Bank of Greece — Payment systems and supervision",
                },
                url: "https://www.bankofgreece.gr",
            },
            {
                label: {
                    el: "ΔΙΑΣ — Διατραπεζικά συστήματα πληρωμών",
                    en: "DIAS — Greek interbank payment systems",
                },
                url: "https://www.dias.com.gr",
            },
            {
                label: {
                    el: "ΕΑΕΕ — Ένωση Ασφαλιστικών Εταιρειών Ελλάδος",
                    en: "HAIC — Hellenic Association of Insurance Companies",
                },
                url: "https://www.eaee.gr",
            },
        ],
        related: [
            {
                label: {
                    el: "Τι δεν είναι το PolicyWallet — η σύγκριση",
                    en: "What PolicyWallet is not — the comparison",
                },
                href: "/compare",
            },
            {
                label: {
                    el: "Πού διαχειρίζεστε όλα τα ασφαλιστήριά σας online",
                    en: "Where to manage all your policies online",
                },
                href: "/guides/diaxeirisi-asfalistirion-se-ena-simeio",
            },
            {
                label: {
                    el: "Τι είναι το ασφάλιστρο",
                    en: "What a premium is",
                },
                href: "/lexiko/asfalistro",
            },
            {
                label: {
                    el: "Ανάλυση ασφαλιστηρίου με AI",
                    en: "AI policy analysis",
                },
                href: "/product",
            },
        ],
    },
    {
        slug: "efarmoges-asfalistirion-apozimioseis",
        title: {
            el: "Εφαρμογές για ασφαλιστήρια, καλύψεις και ζημιές: τι κάνει η καθεμία;",
            en: "Apps for policies, coverage and claims: what each one does",
        },
        metaTitle: {
            el: "Εφαρμογές για ασφαλιστήρια και ζημιές",
            en: "Apps for policies, cover and claims info",
        },
        metaDescription: {
            el: "Ποιες εφαρμογές οργανώνουν ασφαλιστήρια, καλύψεις και πληροφορίες ζημιάς — και ποιος πραγματικά σας δίνει την πορεία μιας αποζημίωσης στην Ελλάδα.",
            en: "Which apps organize policies, coverage and claim information — and who actually gives you the status of a claim in Greece. An honest breakdown.",
        },
        summary: {
            el: "Οργάνωση εγγράφων, εξήγηση καλύψεων και παρακολούθηση αποζημιώσεων είναι διαφορετικές λειτουργίες. Ελέγξτε τι προσφέρει κάθε εφαρμογή. Το PolicyWallet οργανώνει και εξηγεί τα έγγραφά σας. Για την πορεία και την απόφαση για την αποζημίωση, απευθυνθείτε στην ασφαλιστική εταιρεία ή στον ασφαλιστή σας.",
            en: "Document organisation, cover explanations and claim tracking are different functions. Check what each app offers. PolicyWallet organises and explains your documents. For claim progress, contact your insurer or adviser.",
        },
        datePublished: "2026-07-27",
        dateModified: "2026-10-21",
        readingMinutes: 6,
        sections: [
            {
                heading: {
                    el: "«Όλα σε ένα σημείο»: τρεις διαφορετικές δουλειές",
                    en: "“All in one place”: three different jobs",
                },
                paragraphs: [
                    {
                        el: "Πριν επιλέξετε εφαρμογή, ξεχωρίστε τι χρειάζεστε. Μια γενική περιγραφή όπως «όλα σε ένα μέρος» δεν σας λέει αν υποστηρίζονται οι παρακάτω λειτουργίες.",
                        en: "Before choosing an app, identify what you need. A general description such as “everything in one place” does not tell you whether it supports the following features.",
                    },
                ],
                bullets: [
                    {
                        el: "Οργάνωση εγγράφων: να βρίσκετε το σωστό PDF χωρίς να ψάχνετε σε email και φωτογραφίες. Το λύνει οποιαδήποτε αποθήκευση αρχείων.",
                        en: "Organising documents: finding the right PDF without digging through email and photos. Any file storage solves this.",
                    },
                    {
                        el: "Κατανόηση καλύψεων: να ξέρετε τι καλύπτεται, τι εξαιρείται και με ποια όρια. Θέλει ανάγνωση και ανάλυση του περιεχομένου, όχι αποθήκευση.",
                        en: "Understanding cover: knowing what is included, what is excluded and up to what limits. That needs the content read and analysed, not stored.",
                    },
                    {
                        el: "Ενημέρωση για αποζημιώσεις: σε ποιο στάδιο βρίσκεται ο φάκελος ζημιάς. Απαιτεί πρόσβαση στα συστήματα της ασφαλιστικής εταιρείας.",
                        en: "Claim updates: what stage the claim file has reached. That requires access to the insurer's own systems.",
                    },
                ],
            },
            {
                heading: {
                    el: "Ποιος σας ενημερώνει πραγματικά για μια αποζημίωση;",
                    en: "Who actually gives you claim updates?",
                },
                paragraphs: [
                    {
                        el: "Η επίσημη ενημέρωση προέρχεται από την ασφαλιστική εταιρεία. Μπορεί να τη βλέπετε στην εφαρμογή της ή μέσω εξουσιοδοτημένου συνεργάτη. Το PolicyWallet δεν έχει σύνδεση με αυτά τα συστήματα.",
                        en: "Official updates come from the insurer. You may see them in its app or through an authorised partner. PolicyWallet does not connect to those systems.",
                    },
                    {
                        el: "Πρακτικά αυτό σημαίνει ότι η εφαρμογή ή το portal της εταιρείας σας παραμένει το σημείο αναφοράς για την πορεία μιας ζημιάς, και ο ασφαλιστής σας ο συντομότερος δρόμος όταν κάτι κολλήσει. Αν μια εφαρμογή τρίτου υπόσχεται «claim updates», αξίζει να δείτε αν εννοεί πραγματική κατάσταση φακέλου ή απλώς υπενθυμίσεις και οδηγίες.",
                        en: "In practice that means your insurer's app or portal stays the reference point for how a claim is progressing, and your agent is the fastest route when something stalls. If a third-party app promises “claim updates”, it is worth checking whether it means real file status or simply reminders and guidance.",
                    },
                ],
            },
            {
                heading: {
                    el: "Τι δίνει ένα πορτοφόλι ασφαλίσεων όταν συμβεί ζημιά;",
                    en: "What does a policy wallet give you when a loss happens?",
                },
                paragraphs: [
                    {
                        el: "Όχι κατάσταση φακέλου, αλλά κάτι που στην πράξη χάνεται πιο συχνά: τα δικά σας δεδομένα, τη στιγμή που τα χρειάζεστε. Στις πρώτες ώρες μετά από ένα συμβάν, το ζητούμενο δεν είναι η πορεία της αποζημίωσης — είναι το τι πρέπει να κάνετε τώρα για να μη χάσετε το δικαίωμά σας.",
                        en: "Not file status, but something that in practice goes missing far more often: your own data, at the moment you need it. In the first hours after an incident the question is not how the claim is progressing — it is what you must do right now so you do not forfeit your right to be paid.",
                    },
                    {
                        el: "Στο PolicyWallet αυτό εμφανίζεται ως οδηγία ανά κλάδο, δεμένη με το δικό σας ασφαλιστήριο: η προθεσμία δήλωσης και οι υποχρεώσεις ειδοποίησης όπως τις αναφέρει το έγγραφό σας, ο αριθμός ασφαλιστηρίου, και το τηλέφωνο του σωστού κλάδου — γραμμή δήλωσης ατυχήματος για το αυτοκίνητο, τεχνική βοήθεια για την κατοικία, κέντρο συντονισμού για την υγεία. Όταν το τηλέφωνο δεν υπάρχει στο έγγραφο, το λέει ευθέως αντί να επινοήσει έναν αριθμό. Αυτή είναι η διαφορά μιας πλατφόρμας οργάνωσης και κατανόησης ασφαλιστηρίων από μια απλή αποθήκη εγγράφων: δεν σας δίνει απλώς το αρχείο — σας δίνει το τι σημαίνει.",
                        en: "In PolicyWallet that appears as branch-specific guidance tied to your own policy: the notification deadline and reporting obligations exactly as your document states them, your policy number, and the right claims line — the accident-declaration line for motor, technical assistance for home, the coordination centre for health. Where the number is not in the document, it says so plainly rather than inventing one. That is the difference between a platform for organising and understanding insurance policies and a plain document store: it does not just hand you the file — it hands you what the file means.",
                    },
                    {
                        el: "Δείτε τις υποχρεώσεις ειδοποίησης και ενημερώστε έγκαιρα την ασφαλιστική. Η συνέπεια καθυστέρησης εξαρτάται από τον νόμο, τους όρους και τα περιστατικά· δεν σημαίνει αυτόματα απώλεια κάθε δικαιώματος αποζημίωσης.",
                        en: "Check notification duties and inform the insurer promptly. The consequences of delay depend on the law, terms and circumstances; it does not automatically remove every right to compensation.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πώς οργανώνετε καλύψεις και έγγραφα σε ένα σημείο;",
                    en: "How do you organize cover and documents in one place?",
                },
                paragraphs: [
                    {
                        el: "Ανεβάζετε το PDF ή μια φωτογραφία κάθε ασφαλιστηρίου, από οποιαδήποτε ασφαλιστική εταιρεία, και η AI το διαβάζει. Αντί για ένα ακόμη αρχείο σε φάκελο, παίρνετε σε απλά ελληνικά τι καλύπτεται, τι εξαιρείται, ποια είναι τα όρια και οι απαλλαγές, και ποιες ημερομηνίες μετράνε.",
                        en: "You upload the PDF or a photo of each policy, from any insurer, and the AI reads it. Instead of one more file in a folder, you get plain-language answers on what is covered, what is excluded, what the limits and deductibles are, and which dates matter.",
                    },
                    {
                        el: `Με το Family, βλέπετε ευρήματα προς έλεγχο, κάνετε ερωτήσεις για τα έγγραφα και μοιράζεστε στοιχεία με ασφαλιστή. Η υπενθύμιση ανανέωσης ${BASIC_WHEN.el} ισχύει σε όλα τα πλάνα· οι υπενθυμίσεις ${LADDER_FROM.el} προσφέρονται στα Plus και Family. Δείτε τις ακριβείς δυνατότητες κάθε πλάνου στη σελίδα τιμών.`,
                        en: `With Family, you can review findings, ask questions about documents and share information with an adviser. The renewal reminder ${BASIC_WHEN.en} applies on every plan; reminders ${LADDER_FROM.en} are available on Plus and Family. See each plan's exact features on the pricing page.`,
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Ποιες είναι οι δημοφιλείς εφαρμογές για ασφαλιστήρια, ενημερώσεις ζημιών και πληροφορίες κάλυψης σε ένα σημείο;",
                    en: "What are popular apps for organizing policies, claim updates, and coverage information in one place?",
                },
                answer: {
                    el: "Οι εφαρμογές των ασφαλιστικών εταιρειών καλύπτουν και τα τρία, αλλά μόνο για τα δικά τους ασφαλιστήρια. Τα πορτοφόλια ασφαλίσεων καλύπτουν έγγραφα και καλύψεις για όλες τις εταιρείες μαζί, με οδηγίες αντί για κατάσταση ζημιάς. Οι εφαρμογές πρακτορείων βρίσκονται ενδιάμεσα.",
                    en: "Insurers' own apps cover all three, but only for their own policies. Policy wallets cover documents and coverage across every insurer, with guidance rather than claim status. Agency apps sit in between.",
                },
            },
            {
                question: {
                    el: "Υπάρχει εφαρμογή που δείχνει την πορεία της αποζημίωσής μου από κάθε εταιρεία;",
                    en: "Is there an app that shows my claim status across every insurer?",
                },
                answer: {
                    el: "Εξαρτάται από τις συνδέσεις και τις συνεργασίες κάθε εφαρμογής. Το PolicyWallet δεν προσφέρει αυτή τη λειτουργία. Για τη δική σας υπόθεση, ζητήστε επίσημη ενημέρωση από την ασφαλιστική ή τον ασφαλιστή σας.",
                    en: "It depends on each application's integrations and partnerships. PolicyWallet does not offer this feature. Ask your insurer or adviser for an official update on your case.",
                },
            },
            {
                question: {
                    el: "Μπορώ να δηλώσω ζημιά μέσα από ένα πορτοφόλι ασφαλίσεων;",
                    en: "Can I file a claim from inside a policy wallet?",
                },
                answer: {
                    el: "Μέσω του PolicyWallet δεν υποβάλλεται δήλωση ζημιάς στην ασφαλιστική. Χρησιμοποιήστε τον τρόπο που ορίζει η εταιρεία σας. Στην εφαρμογή μπορείτε να βρείτε τα στοιχεία του ασφαλιστηρίου που έχετε ανεβάσει.",
                    en: "PolicyWallet does not submit claims to insurers. Use the method your insurer specifies. In the application, you can find details from the policy you uploaded.",
                },
            },
            {
                question: {
                    el: "Πώς βρίσκω την προθεσμία δήλωσης ζημιάς στο ασφαλιστήριό μου;",
                    en: "How do I find the claim notification deadline in my policy?",
                },
                answer: {
                    el: "Βρίσκεται στους γενικούς ή ειδικούς όρους, στο κεφάλαιο για τις υποχρεώσεις του ασφαλισμένου μετά από ζημιά. Αν το ασφαλιστήριο είναι ήδη αναλυμένο, εμφανίζεται μαζί με τα υπόλοιπα στοιχεία του χωρίς αναζήτηση στους όρους.",
                    en: "In the general or special terms, under the policyholder's obligations after a loss. If the policy has already been analysed, it appears alongside its other details without you searching the terms.",
                },
            },
            {
                question: {
                    el: "Χρειάζομαι διαφορετική εφαρμογή για κάθε ασφαλιστική εταιρεία;",
                    en: "Do I need a separate app for each insurer?",
                },
                answer: {
                    el: "Εξαρτάται από τις υπηρεσίες κάθε εταιρείας και του ασφαλιστή σας. Στο PolicyWallet μπορείτε να οργανώσετε τα έγγραφά σας από διαφορετικές εταιρείες, χωρίς πληρωμές ασφαλίστρων ή παρακολούθηση αποζημιώσεων.",
                    en: "It depends on your insurers' and adviser's services. In PolicyWallet you can organise documents from different insurers, without premium payments or claim tracking.",
                },
            },
        ],
        sources: [
            {
                label: {
                    el: "Τράπεζα της Ελλάδος — Εποπτεία ιδιωτικής ασφάλισης και καταγγελίες",
                    en: "Bank of Greece — Private insurance supervision and complaints",
                },
                url: "https://www.bankofgreece.gr",
            },
            {
                label: {
                    el: "ΕΑΕΕ — Ένωση Ασφαλιστικών Εταιρειών Ελλάδος",
                    en: "HAIC — Hellenic Association of Insurance Companies",
                },
                url: "https://www.eaee.gr",
            },
        ],
        related: [
            {
                label: {
                    el: "Τι δεν είναι το PolicyWallet — η σύγκριση",
                    en: "What PolicyWallet is not — the comparison",
                },
                href: "/compare",
            },
            {
                label: {
                    el: "Πού διαχειρίζεστε όλα τα ασφαλιστήριά σας online",
                    en: "Where to manage all your policies online",
                },
                href: "/guides/diaxeirisi-asfalistirion-se-ena-simeio",
            },
            {
                label: {
                    el: "Τι σημαίνει αποζημίωση",
                    en: "What a claim payout means",
                },
                href: "/lexiko/apozimiosi",
            },
            {
                label: {
                    el: "Ανάλυση ασφαλιστηρίου με AI",
                    en: "AI policy analysis",
                },
                href: "/product",
            },
        ],
    },
    /**
     * H1 — the average clause (αναλογικός όρος) and underinsurance.
     *
     * Claims: SRC-001 (insurable value = rebuild cost less depreciation),
     * SRC-002 (proportional reduction on underinsurance), SRC-003 (the motor
     * wording's explicit formula), SRC-004 (wordings cite άρθρο 17 ν. 2496/1997;
     * first-loss cover disapplies the term). See docs/growth/SOURCES.md.
     *
     * Two things this article deliberately does NOT say, because no source
     * supports them: how COMMON underinsurance is in the Greek market (no
     * primary source measures it), and what άρθρο 17 ν. 2496/1997 actually
     * provides (ΦΕΚ Α΄ 87/1997 could not be retrieved — only that published
     * wordings cite it).
     */
    {
        slug: "analogikos-kanonas-ypasfalisi-katoikias",
        title: {
            el: "Αναλογικός κανόνας: τι συμβαίνει στην υπασφάλιση;",
            en: "The average clause: what happens when you are underinsured?",
        },
        metaTitle: {
            el: "Αναλογικός όρος και υπασφάλιση κατοικίας",
            en: "The average clause and underinsurance",
        },
        metaDescription: {
            el: "Πώς ορίζουν οι δημοσιευμένοι όροι κατοικίας την ασφαλιστική αξία, πότε ενεργοποιείται ο αναλογικός όρος και πού ακριβώς τον βρίσκετε στο ασφαλιστήριό σας.",
            en: "How published Greek home policy wordings define insurable value, when the average clause reduces a claim, and exactly where to find it in your own policy.",
        },
        summary: {
            el: "Υπασφάλιση υπάρχει όταν το ποσό ασφάλισης είναι μικρότερο από την αξία που πρέπει να ασφαλιστεί. Αν εφαρμόζεται αναλογικός κανόνας, η ασφαλιστική μπορεί να πληρώσει μικρότερο μέρος της ζημιάς. Δείτε πώς ορίζεται η αξία στο δικό σας ασφαλιστήριο και αν υπάρχει εξαίρεση από τον κανόνα.",
            en: "Underinsurance exists when the sum insured is below the value that needs to be insured. If an average clause applies, the insurer may pay a smaller share of the loss. Check how your policy defines value and whether the rule is waived.",
        },
        datePublished: "2026-08-26",
        dateModified: "2026-10-21",
        readingMinutes: 7,
        related: [
            {
                label: {
                    el: "Τι είναι τα κενά κάλυψης και πώς τα εντοπίζετε;",
                    en: "What are coverage gaps and how do you find them?",
                },
                href: "/guides/kena-kalypsis-ti-einai-pos-ta-vriskete",
            },
            {
                label: {
                    el: "Λίστα ελέγχου ανανέωσης ασφαλιστηρίου",
                    en: "Policy renewal checklist",
                },
                href: "/guides/checklist-ananeosis-asfalistiriou",
            },
            {
                label: { el: "Υπασφάλιση", en: "Underinsurance" },
                href: "/lexiko/ypasfalisi",
            },
            {
                label: {
                    el: "Ασφάλεια κατοικίας στο PolicyWallet",
                    en: "Home insurance in PolicyWallet",
                },
                href: "/product/property",
            },
        ],
        sections: [
            {
                heading: {
                    el: "Τι λέει ο όρος και με ποια αξία συγκρίνεται;",
                    en: "What does the clause say, and against which value?",
                },
                paragraphs: [
                    {
                        el: "Δημοσιευμένοι όροι ασφάλισης κατοικίας αυτής της κατηγορίας προβλέπουν ότι, όταν το ασφαλιστικό ποσό είναι μικρότερο της ασφαλιστικής αξίας, «το ασφάλισμα καθορίζεται (και περιορίζεται) με βάση το λόγο (αναλογία) μεταξύ ασφαλιστικού ποσού και της ασφαλιστικής αξίας». Δεν πρόκειται για ποινή ούτε για διακριτική ευχέρεια: είναι ένας λόγος δύο αριθμών, γραμμένος στους Γενικούς Όρους. Τα κείμενα τον ονομάζουν «αναλογικό όρο» ή «όρο αναλογίας»· είναι το ίδιο πράγμα με τον «αναλογικό κανόνα».",
                        en: "Published Greek home insurance wordings of this class provide that where the sum insured is lower than the insurable value, «the indemnity is determined (and limited) on the basis of the ratio between the sum insured and the insurable value». It is neither a penalty nor a discretion: it is a ratio between two numbers, written into the general terms. The wordings call it «αναλογικός όρος» or «όρος αναλογίας»; it is the same thing as the average rule.",
                    },
                    {
                        el: "Ο δεύτερος αριθμός είναι εκείνος που ξαφνιάζει. Στο ίδιο κείμενο, βάση υπολογισμού για τα κτίρια είναι «η αναγκαία δαπάνη ανοικοδόμησής τους με τα ίδια υλικά και τρόπο κατασκευής μετά την αφαίρεση της μείωσης της κατασκευαστικής αξίας». Δηλαδή το κόστος να ξαναχτιστεί το κτίσμα, μειωμένο κατά την παλαιότητα — όχι το ποσό που πληρώσατε για το ακίνητο και όχι κάποιο φορολογικό μέγεθος.",
                        en: "It is the second number that surprises people. In the same document, the basis of calculation for buildings is «the necessary cost of rebuilding them with the same materials and construction method, after deducting the reduction in construction value». That is what it would cost to rebuild the structure, less depreciation — not the price you paid for the property, and not a tax figure.",
                    },
                    {
                        el: "Ο ίδιος κανόνας εμφανίζεται και στο αυτοκίνητο, εκεί γραμμένος ως τύπος. Δημοσιευμένοι όροι ασφάλισης οχημάτων ορίζουν την υπασφάλιση ως «την ασφάλιση του αυτοκινήτου σε αξία μικρότερη της Τρέχουσας Εμπορικής Αξίας του» και δίνουν τον υπολογισμό: ΑΠΟΖΗΜΙΩΣΗ = ΑΣΦΑΛΙΖΟΜΕΝΟ ΚΕΦΑΛΑΙΟ / ΤΡΕΧΟΥΣΑ ΕΜΠΟΡΙΚΗ ΑΞΙΑ Χ ΖΗΜΙΑ.",
                        en: "The same rule appears in motor cover, there written as a formula. Published motor wordings define underinsurance as «insuring the vehicle for a value lower than its Current Market Value» and give the calculation: INDEMNITY = SUM INSURED / CURRENT MARKET VALUE × LOSS.",
                    },
                    {
                        el: "Και τα δύο κείμενα παραπέμπουν στο άρθρο 17 του ν. 2496/1997 ως πηγή του κανόνα, και το κείμενο της κατοικίας καταγράφει μια εξαίρεση: για κάλυψη γραμμένη σε Α΄ ζημιά ή Α΄ κίνδυνο «δε θα εφαρμόζεται για αυτόν τον κίνδυνο ο αναλογικός όρος». Αυτή η σελίδα δεν αποδίδει το περιεχόμενο του άρθρου 17 — καταγράφει μόνο ότι οι δημοσιευμένοι όροι το επικαλούνται.",
                        en: "Both texts point to article 17 of Law 2496/1997 as the source of the rule, and the home wording records an exception: for cover written on a first-loss basis (Α΄ ζημιά / Α΄ κίνδυνο) «the average clause shall not be applied to that risk». This page does not report what article 17 provides — only that published wordings cite it.",
                    },
                    {
                        el: "Επειδή ο όρος είναι λόγος, η αριθμητική του είναι απλή. Ο πίνακας δείχνει τι δίνει ο ίδιος λόγος σε μια ζημιά 20.000 ευρώ, για τρία ασφαλιστικά ποσά πάνω στην ίδια ασφαλιστική αξία.",
                        en: "Because the term is a ratio, its arithmetic is simple. The table shows what the same ratio produces on a €20,000 loss, for three sums insured against one insurable value.",
                    },
                ],
                table: {
                    caption: {
                        el: "Ο λόγος ασφαλιστικού ποσού προς ασφαλιστική αξία, πάνω σε ζημιά 20.000 ευρώ.",
                        en: "The sum-insured to insurable-value ratio, applied to a €20,000 loss.",
                    },
                    columns: [
                        { el: "Ασφαλιστικό ποσό", en: "Sum insured" },
                        { el: "Ασφαλιστική αξία", en: "Insurable value" },
                        { el: "Λόγος", en: "Ratio" },
                        { el: "Ζημιά 20.000 €", en: "€20,000 loss" },
                    ],
                    rows: [
                        {
                            cells: [
                                { el: "100.000 €", en: "€100,000" },
                                { el: "200.000 €", en: "€200,000" },
                                { el: "50%", en: "50%" },
                                { el: "10.000 €", en: "€10,000" },
                            ],
                        },
                        {
                            cells: [
                                { el: "150.000 €", en: "€150,000" },
                                { el: "200.000 €", en: "€200,000" },
                                { el: "75%", en: "75%" },
                                { el: "15.000 €", en: "€15,000" },
                            ],
                        },
                        {
                            cells: [
                                { el: "200.000 €", en: "€200,000" },
                                { el: "200.000 €", en: "€200,000" },
                                { el: "100%", en: "100%" },
                                { el: "20.000 €", en: "€20,000" },
                            ],
                        },
                    ],
                    note: {
                        el: "Απλή αριθμητική πάνω στον λόγο που περιγράφουν οι όροι, πριν από οποιαδήποτε απαλλαγή. Δεν είναι πρόβλεψη για συγκεκριμένη ζημιά: η ασφαλιστική αξία ορίζεται από το δικό σας κείμενο, και κάλυψη σε Α΄ κίνδυνο εξαιρείται από τον όρο.",
                        en: "Plain arithmetic on the ratio the wordings describe, before any deductible. It is not a prediction for a particular claim: the insurable value is defined by your own text, and first-loss cover is outside the term.",
                    },
                },
            },
            {
                heading: {
                    el: "Γιατί ο όρος περνάει απαρατήρητος;",
                    en: "Why does the clause go unnoticed?",
                },
                paragraphs: [
                    {
                        el: "Βρείτε δύο στοιχεία: το ποσό ασφάλισης στον πίνακα καλύψεων και τον τρόπο υπολογισμού της αξίας στους όρους. Χρειάζονται και τα δύο για να ελέγξετε αν εφαρμόζεται ο κανόνας.",
                        en: "The two numbers never meet on the same page. The sum insured is printed at the front, on the schedule, and reads like a promise. The insurable value is not a number but a definition, and the definition sits deep in the general terms, in the article on calculating and paying the indemnity. Nothing in the document reconciles the two.",
                    },
                    {
                        el: "Όταν εφαρμόζεται, ο κανόνας μπορεί να μειώσει και την αποζημίωση για μερική ζημιά. Δεν αφορά μόνο την ολική καταστροφή.",
                        en: "Where it applies, the rule may also reduce payment for a partial loss. It is not limited to total destruction.",
                    },
                    {
                        el: "Δύο ασφαλιστήρια που μοιάζουν ίδια στον πίνακα καλύψεων μπορεί να συμπεριφέρονται διαφορετικά, γιατί μια κάλυψη γραμμένη σε Α΄ κίνδυνο εξαιρείται ρητά από τον όρο στο κείμενο που παραθέτουμε. Το ποιο ισχύει για εσάς δεν φαίνεται από το ποσό· φαίνεται από τη διατύπωση δίπλα του.",
                        en: "Two policies that look alike on the schedule can behave differently, because cover written on a first-loss basis is expressly excluded from the term in the wording quoted here. Which applies to you is not visible from the amount; it is visible from the wording next to it.",
                    },
                    {
                        el: "Πόσο συχνά συμβαίνει αυτό στην ελληνική αγορά δεν το μετρά καμία πηγή που μπορούμε να παραθέσουμε, οπότε δεν το ισχυριζόμαστε. Αυτό που μπορεί να ελεγχθεί δεν είναι η συχνότητα αλλά το δικό σας κείμενο.",
                        en: "How often this happens in the Greek market is not measured by any source we can cite, so we do not claim it. What can be checked is not the frequency but your own document.",
                    },
                ],
            },
            {
                heading: {
                    el: "Τι κοιτάτε στο δικό σας ασφαλιστήριο;",
                    en: "What do you look for in your own policy?",
                },
                paragraphs: [
                    {
                        el: "Πέντε σημεία, με τους όρους όπως τυπώνονται στα ελληνικά έγγραφα και την αγγλική τους απόδοση για όποιον διαβάζει το κείμενο σε δεύτερη γλώσσα.",
                        en: "Five things to find, with the terms as they are printed on Greek documents and their English equivalents for anyone reading the text in a second language.",
                    },
                ],
                table: {
                    caption: {
                        el: "Πού βρίσκεται το καθένα σε ένα ελληνικό ασφαλιστήριο κατοικίας ή αυτοκινήτου.",
                        en: "Where each item sits in a Greek home or motor policy.",
                    },
                    columns: [
                        { el: "Τι ψάχνετε", en: "What you are looking for" },
                        { el: "Όρος στο έγγραφο", en: "Term on the document (Greek)" },
                        { el: "Στα αγγλικά", en: "In English" },
                        { el: "Πού βρίσκεται", en: "Where it sits" },
                    ],
                    rows: [
                        {
                            cells: [
                                { el: "Το ποσό που ασφαλίσατε", en: "The amount you insured for" },
                                { el: "Ασφαλιστικό ποσό / ασφαλιζόμενο κεφάλαιο", en: "Ασφαλιστικό ποσό / ασφαλιζόμενο κεφάλαιο" },
                                { el: "Sum insured", en: "Sum insured" },
                                { el: "Πίνακας καλύψεων, χωριστά για κτίριο και περιεχόμενο", en: "The schedule, separately for building and contents" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Η αξία με την οποία συγκρίνεται", en: "The value it is compared against" },
                                { el: "Ασφαλιστική αξία", en: "Ασφαλιστική αξία" },
                                { el: "Insurable value", en: "Insurable value" },
                                { el: "Γενικοί Όροι, στο άρθρο για τον υπολογισμό και την καταβολή του ασφαλίσματος", en: "General terms, in the article on calculating and paying the indemnity" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Ο ίδιος ο όρος", en: "The clause itself" },
                                { el: "Υπασφάλιση / αναλογικός όρος (αναλογικός κανόνας)", en: "Υπασφάλιση / αναλογικός όρος (αναλογικός κανόνας)" },
                                { el: "Underinsurance / average clause", en: "Underinsurance / average clause" },
                                { el: "Στο ίδιο άρθρο των Γενικών Όρων", en: "In the same article of the general terms" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Η εξαίρεση από τον όρο", en: "The carve-out from the clause" },
                                { el: "Κάλυψη σε Α΄ ζημιά ή Α΄ κίνδυνο", en: "Κάλυψη σε Α΄ ζημιά ή Α΄ κίνδυνο" },
                                { el: "First-loss cover", en: "First-loss cover" },
                                { el: "Στους ειδικούς όρους ή στις πρόσθετες πράξεις, ανά κάλυψη", en: "In the special terms or endorsements, per cover" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Στο αυτοκίνητο", en: "On a motor policy" },
                                { el: "Τρέχουσα εμπορική αξία", en: "Τρέχουσα εμπορική αξία" },
                                { el: "Current market value", en: "Current market value" },
                                { el: "Στους ορισμούς των όρων ασφάλισης οχήματος", en: "In the definitions of the motor wording" },
                            ],
                        },
                    ],
                    note: {
                        el: "Οι ονομασίες διαφέρουν ανά εταιρεία και ανά έκδοση όρων. Αν κάποιος όρος υπάρχει στο δικό σας ασφαλιστήριο, και με ποια διατύπωση, το κρίνει μόνο το δικό σας κείμενο.",
                        en: "Names vary by insurer and by edition of the wording. Whether a term exists in your own policy, and in what words, is settled only by your own text.",
                    },
                },
            },
            {
                heading: {
                    el: "Τι κάνει με αυτό το PolicyWallet;",
                    en: "What does PolicyWallet do with this?",
                },
                paragraphs: [
                    {
                        el: "Διαβάζει το PDF του ασφαλιστηρίου και καταγράφει τα ποσά όπως είναι τυπωμένα: το ασφαλιστικό ποσό και, όταν το ίδιο το έγγραφο αναφέρει και κόστος ανακατασκευής, και τα δύο μαζί. Όταν τα δύο απέχουν ουσιωδώς, το εμφανίζει ως εύρημα προς έλεγχο και δείχνει τους δύο αριθμούς που το προκάλεσαν, ώστε να τους αντιπαραβάλετε με το κείμενό σας.",
                        en: "It reads the policy PDF and records the amounts as printed: the sum insured and, where the document also states a rebuild cost, both of them together. When the two are materially apart it surfaces that as something to review, showing the two numbers that produced it, so you can hold them against your own text.",
                    },
                    {
                        el: "Το PolicyWallet δεν εκτιμά μόνο του πόσο κοστίζει να ξαναχτιστεί το σπίτι. Συγκρίνει ποσά μόνο όταν υπάρχουν στο έγγραφο. Αν λείπει ένα ποσό, χρειάζεται επιβεβαίωση από εσάς και τον ασφαλιστή σας.",
                        en: "It does not compute a rebuild cost. There is no euros-per-square-metre table behind this, because a number the app cannot source is a valuation rather than an arithmetic. Where the document states only one of the two amounts, PolicyWallet says so instead of filling in the other.",
                    },
                    {
                        el: "Ανεβάζετε το PDF και τα δύο ποσά, όπου το έγγραφο τα αναφέρει, εμφανίζονται μαζί σε μία σελίδα — μαζί με τις καλύψεις και τις εξαιρέσεις σε απλά ελληνικά, στην ίδια σελίδα με το πρωτότυπο έγγραφο, ώστε κάθε αριθμός να ελέγχεται πάνω στο κείμενο από το οποίο διαβάστηκε.",
                        en: "You upload the PDF and both amounts, where the document states them, appear together on one page — alongside the covers and exclusions in plain language, on the same page as the original document, so every figure can be checked against the text it was read from.",
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Ο αναλογικός όρος ισχύει και σε μερική ζημιά;",
                    en: "Does the average clause apply to a partial loss too?",
                },
                answer: {
                    el: "Στο κείμενο που παραθέτουμε ο όρος δεν είναι γραμμένος ως κανόνας για την ολική ζημιά: το ασφάλισμα «καθορίζεται (και περιορίζεται) με βάση το λόγο» ασφαλιστικού ποσού προς ασφαλιστική αξία. Ένας λόγος εφαρμόζεται σε ό,τι πολλαπλασιάζει. Πώς είναι διατυπωμένος στο δικό σας ασφαλιστήριο το δείχνει το δικό σας κείμενο.",
                    en: "In the wording quoted here the term is not written as a rule for total losses: the indemnity «is determined (and limited) on the basis of the ratio» of sum insured to insurable value. A ratio applies to whatever it multiplies. How it is worded in your own policy is shown by your own text.",
                },
            },
            {
                question: {
                    el: "Αν η κάλυψη είναι σε Α΄ κίνδυνο, ισχύει ο όρος;",
                    en: "If cover is on a first-loss basis, does the clause apply?",
                },
                answer: {
                    el: "Το κείμενο κατοικίας που παραθέτουμε δηλώνει ρητά ότι για κάλυψη με όριο αποζημίωσης σε Α΄ ζημιά ή Α΄ κίνδυνο δεν εφαρμόζεται ο αναλογικός όρος για αυτόν τον κίνδυνο. Η διατύπωση αφορά συγκεκριμένη κάλυψη, όχι ολόκληρο το ασφαλιστήριο, οπότε το σημείο που έχει σημασία είναι δίπλα σε ποια κάλυψη γράφεται.",
                    en: "The home wording quoted here states expressly that where a cover carries a first-loss limit, the average clause is not applied to that risk. The wording attaches to a specific cover rather than to the whole policy, so what matters is which cover it sits beside.",
                },
            },
            {
                question: {
                    el: "Μετράει η αντικειμενική αξία του ακινήτου;",
                    en: "Does the property's tax value count?",
                },
                answer: {
                    el: "Οι όροι που παραθέτουμε δεν την αναφέρουν. Ορίζουν τη βάση υπολογισμού για τα κτίρια ως τη δαπάνη ανοικοδόμησης με τα ίδια υλικά και τρόπο κατασκευής, μετά την αφαίρεση της μείωσης της κατασκευαστικής αξίας. Πρόκειται για διαφορετικό μέγεθος από όποια φορολογική αποτίμηση.",
                    en: "The wordings quoted here do not mention it. They define the basis for buildings as the cost of rebuilding with the same materials and construction method, less the reduction in construction value. That is a different quantity from any tax valuation.",
                },
            },
            {
                question: {
                    el: "Στο αυτοκίνητο πώς υπολογίζεται;",
                    en: "How is it calculated on a motor policy?",
                },
                answer: {
                    el: "Δημοσιευμένοι όροι οχημάτων δίνουν τον τύπο ρητά: ΑΠΟΖΗΜΙΩΣΗ = ΑΣΦΑΛΙΖΟΜΕΝΟ ΚΕΦΑΛΑΙΟ / ΤΡΕΧΟΥΣΑ ΕΜΠΟΡΙΚΗ ΑΞΙΑ Χ ΖΗΜΙΑ, με την υπασφάλιση ορισμένη ως ασφάλιση σε αξία μικρότερη της τρέχουσας εμπορικής αξίας. Οι δύο αριθμοί που χρειάζεστε είναι στους ορισμούς και στον πίνακα του δικού σας ασφαλιστηρίου.",
                    en: "Published motor wordings give the formula explicitly: INDEMNITY = SUM INSURED / CURRENT MARKET VALUE × LOSS, with underinsurance defined as insuring for a value below the current market value. The two numbers you need are in the definitions and on the schedule of your own policy.",
                },
            },
        ],
        sources: [
            {
                label: {
                    el: "Γενικοί Όροι Ασφάλισης Κατοικίας — υπολογισμός ασφαλίσματος και υπασφάλιση (PDF)",
                    en: "Home insurance general terms — indemnity calculation and underinsurance (PDF)",
                },
                url: "https://sales.europe-asfalistiki.gr/files/Europe_Insurance_Oroi_Katoikias.pdf",
            },
            {
                label: {
                    el: "Όροι ασφάλισης αυτοκινήτου — ορισμός υπασφάλισης και αναλογικού όρου (PDF)",
                    en: "Motor insurance terms — definition of underinsurance and the average clause (PDF)",
                },
                url: "https://eu-healthcare.eopyy.gov.gr/wp-content/uploads/2024/11/AUTO_Oroi_Asfalisis.pdf",
            },
        ],
    },
    /**
     * H3 — short-term letting and the disclosure duties a home wording creates.
     *
     * Claims: SRC-005 (duty at inception to declare what is objectively material),
     * SRC-006 (negligence REDUCES in proportion to premium; fraud RELEASES inside a
     * one-month cancellation window — the asymmetry must not be flattened),
     * SRC-007 (14 days from becoming aware of a material aggravation),
     * SRC-008 (theft cover commonly falls away after 30 consecutive days unoccupied).
     * See docs/growth/SOURCES.md.
     *
     * The one thing this article must never say: that short-term letting IS an
     * aggravation of the risk. That is a legal characterisation, no primary source
     * states it, and it is cut in SOURCES.md. The wordings state the CRITERION; who
     * applies it to a given let is the reader's own text and their insurer.
     * Nor may it imply the product detects the letting — the engine has no such
     * rule (docs/growth/proposals/H3-coverage-voiding-condition.md).
     */
    {
        slug: "vraxychronia-misthosi-asfalisi-katoikias",
        title: {
            el: "Βραχυχρόνια μίσθωση και ασφάλιση κατοικίας: τι λένε οι όροι;",
            en: "Short-term letting and home insurance: what do the terms say?",
        },
        metaTitle: {
            el: "Βραχυχρόνια μίσθωση και ασφάλιση κατοικίας",
            en: "Short-term letting and home insurance",
        },
        metaDescription: {
            el: "Τι υποχρέωση δήλωσης δημιουργούν οι όροι κατοικίας κατά τη σύναψη και στη διάρκεια, τι προβλέπουν για ακατοίκητο ακίνητο, και πού βρίσκετε και τα δύο.",
            en: "What Greek home policy wordings require you to declare at inception and mid-term, what they say about unoccupied premises, and where to find both in your text.",
        },
        summary: {
            el: "Για ακίνητα που διατίθενται σε βραχυχρόνια μίσθωση, από 1 Οκτωβρίου 2025 απαιτείται ασφάλιση αστικής ευθύνης για ζημιές ή ατυχήματα, σύμφωνα με τον ν. 5170/2025. Χωριστά, ενημερώστε την ασφαλιστική για τη χρήση του ακινήτου και ελέγξτε αν το ασφαλιστήριο κατοικίας την καλύπτει.",
            en: "Since 1 October 2025, properties offered for short-term rental require liability insurance for damage or accidents under Law 5170/2025. Separately, inform the insurer about the property's use and check whether the home policy covers it.",
        },
        datePublished: "2026-08-26",
        dateModified: "2026-10-21",
        readingMinutes: 7,
        related: [
            {
                label: {
                    el: "Αναλογικός όρος και υπασφάλιση κατοικίας",
                    en: "The average clause and underinsurance",
                },
                href: "/guides/analogikos-kanonas-ypasfalisi-katoikias",
            },
            {
                label: { el: "Εξαίρεση", en: "Exclusion" },
                href: "/lexiko/exairesi",
            },
            {
                label: {
                    el: "Ασφάλεια κατοικίας στο PolicyWallet",
                    en: "Home insurance in PolicyWallet",
                },
                href: "/product/property",
            },
        ],
        sections: [
            {
                heading: {
                    el: "Ποια υποχρέωση δήλωσης δημιουργούν οι όροι;",
                    en: "What disclosure duty do the terms create?",
                },
                paragraphs: [
                    {
                        el: "Δύο, σε δύο διαφορετικές χρονικές στιγμές. Κατά τη σύναψη, δημοσιευμένοι όροι κατοικίας αυτής της κατηγορίας ορίζουν ότι ο λήπτης της ασφάλισης «υποχρεούται να δηλώσει στην Εταιρία κάθε στοιχείο ή περιστατικό που γνωρίζει, το οποίο είναι αντικειμενικά ουσιώδες για την εκτίμηση του κινδύνου», και να απαντήσει σε κάθε σχετική ερώτηση.",
                        en: "Two of them, at two different moments. At inception, published Greek home wordings of this class provide that the policyholder «is obliged to declare to the Company every fact or circumstance known to them which is objectively material to the assessment of the risk», and to answer every relevant question.",
                    },
                    {
                        el: "Στη διάρκεια, το ίδιο κείμενο δίνει προθεσμία: δήλωση «μέσα σε δεκατέσσερεις (14) ημέρες από τότε που περιήλθε σε γνώση του» κάθε στοιχείου που μπορεί να επιφέρει σημαντική επίταση του κινδύνου — σε βαθμό που, αν η εταιρεία το γνώριζε, δεν θα είχε συνάψει την ασφάλιση ή δεν θα την είχε συνάψει με τους ίδιους όρους. Μόλις το μάθει, η εταιρεία μπορεί να καταγγείλει τη σύμβαση ή να ζητήσει την τροποποίησή της.",
                        en: "Mid-term, the same text sets a deadline: a declaration «within fourteen (14) days of it coming to their knowledge» of anything that may materially aggravate the risk — to a degree at which, had the company known, it would not have written the insurance or would not have written it on the same terms. Once informed, the company may cancel the contract or ask for it to be varied.",
                    },
                    {
                        el: "Η υποχρεωτική αστική ευθύνη της βραχυχρόνιας μίσθωσης είναι διαφορετικό θέμα από την κάλυψη ζημιών στο ίδιο το ακίνητο. Ζητήστε γραπτή επιβεβαίωση ότι η δηλωμένη χρήση και οι καλύψεις αντιστοιχούν στη δική σας περίπτωση.",
                        en: "Mandatory short-term rental liability insurance is separate from cover for damage to the property itself. Ask for written confirmation that the declared use and cover match your circumstances.",
                    },
                ],
            },
            {
                heading: {
                    el: "Τι προβλέπουν οι όροι αν κάτι δεν δηλωθεί;",
                    en: "What do the terms provide when something is not declared?",
                },
                paragraphs: [
                    {
                        el: "Όχι ένα πράγμα, αλλά δύο διαφορετικά, και η διαφορά τους έχει σημασία. Στο κείμενο που παραθέτουμε, όταν η παράλειψη οφείλεται σε αμέλεια και ο κίνδυνος επέλθει πριν τροποποιηθεί η σύμβαση, «το ασφάλισμα μειώνεται κατά το λόγο του ασφαλίστρου που έχει καθορισθεί, αν δεν υπήρχε η παράβαση». Δηλαδή μείωση κατά την αναλογία του ασφαλίστρου, όχι κατάργηση της κάλυψης.",
                        en: "Not one thing but two, and the difference matters. In the wording quoted here, where the omission is negligent and the risk occurs before the contract is varied, «the indemnity is reduced in the ratio of the premium that would have been set had the breach not occurred». That is a proportional reduction, not the removal of cover.",
                    },
                    {
                        el: "Όταν η παράλειψη οφείλεται σε δόλο, το ίδιο κείμενο δίνει στην εταιρεία δικαίωμα καταγγελίας μέσα σε προθεσμία ενός μηνός, και αν ο κίνδυνος επέλθει μέσα σε αυτή την προθεσμία η εταιρεία «απαλλάσσεται της υποχρέωσης του προς καταβολή ασφαλίσματος». Οι δύο περιπτώσεις είναι γραμμένες χωριστά και δεν συγχέονται: το ένα μειώνει, το άλλο απαλλάσσει, και το δεύτερο είναι δεμένο με χρονικό παράθυρο.",
                        en: "Where the omission is fraudulent, the same text gives the company a right to cancel within one month, and if the risk occurs inside that period the company «is released from its obligation to pay the indemnity». The two cases are written separately and do not merge: one reduces, the other releases, and the second is tied to a time window.",
                    },
                    {
                        el: "Δηλώστε έγκαιρα τις αλλαγές χρήσης και κρατήστε την απάντηση της ασφαλιστικής. Αν υπάρχει διαφωνία για τις συνέπειες μιας παράλειψης, χρειάζεται εξέταση της σύμβασης και των περιστατικών.",
                        en: "Report changes of use promptly and keep the insurer's response. A dispute about the consequences of an omission requires assessment of the contract and circumstances.",
                    },
                ],
            },
            {
                heading: {
                    el: "Τι λένε οι όροι για ακίνητο που μένει άδειο;",
                    en: "What do the terms say about premises left empty?",
                },
                paragraphs: [
                    {
                        el: "Χωριστό ζήτημα από τη δήλωση, και χωριστό σημείο του εγγράφου. Στους ειδικούς όρους του κειμένου που παραθέτουμε, στις εξαιρέσεις της κάλυψης κλοπής, δεν καλύπτεται ζημιά «εφόσον ο χώρος εντός του οποίου βρίσκεται η ασφαλισμένη περιουσία παραμένει, κατά τη διάρκεια της περιόδου ασφαλίσεως, ακατοίκητος για συνεχόμενο χρονικό διάστημα μεγαλύτερο των τριάντα (30) ημερών, εκτός εάν στο ασφαλιστήριο συμφωνήθηκε ρητά και γραπτά μεγαλύτερο χρονικό διάστημα».",
                        en: "A separate question from disclosure, and a separate place in the document. In the special terms of the wording quoted here, among the theft exclusions, there is no cover for loss «where the premises containing the insured property remain, during the period of insurance, unoccupied for a continuous period exceeding thirty (30) days, unless a longer period was expressly agreed in writing in the policy».",
                    },
                    {
                        el: "Δύο περιορισμοί, και οι δύο μέσα στο ίδιο απόσπασμα. Πρώτον, η ρήτρα βρίσκεται στις εξαιρέσεις της κλοπής και δεν λέει τίποτα για πυρκαγιά ή ζημιά από νερό — μην τη γενικεύσετε. Δεύτερον, το κείμενο προβλέπει ρητά ότι μπορεί να έχει συμφωνηθεί μεγαλύτερο διάστημα, γραπτά, στο ίδιο το ασφαλιστήριο. Το αν αυτό έγινε στη δική σας περίπτωση φαίνεται μόνο από το δικό σας έγγραφο.",
                        en: "Two limits, both inside the same passage. First, the clause lives among the theft exclusions and says nothing about fire or water damage — do not generalise it. Second, the text expressly contemplates that a longer period may have been agreed, in writing, in the policy itself. Whether that happened in your case is visible only on your own document.",
                    },
                ],
            },
            {
                heading: {
                    el: "Τι κοιτάτε στο δικό σας ασφαλιστήριο;",
                    en: "What do you look for in your own policy?",
                },
                paragraphs: [
                    {
                        el: "Έξι σημεία, με τους όρους όπως τυπώνονται στα ελληνικά έγγραφα και την αγγλική τους απόδοση.",
                        en: "Six things to find, with the terms as printed on Greek documents and their English equivalents.",
                    },
                ],
                table: {
                    caption: {
                        el: "Πού βρίσκεται το καθένα σε ένα ελληνικό ασφαλιστήριο κατοικίας.",
                        en: "Where each item sits in a Greek home insurance policy.",
                    },
                    columns: [
                        { el: "Τι ψάχνετε", en: "What you are looking for" },
                        { el: "Όρος στο έγγραφο", en: "Term on the document (Greek)" },
                        { el: "Στα αγγλικά", en: "In English" },
                        { el: "Πού βρίσκεται", en: "Where it sits" },
                    ],
                    rows: [
                        {
                            cells: [
                                { el: "Τι δηλώθηκε στην αρχή", en: "What was declared at the start" },
                                { el: "Δήλωση λήπτη της ασφάλισης / πρόταση ασφάλισης", en: "Δήλωση λήπτη της ασφάλισης / πρόταση ασφάλισης" },
                                { el: "Statement of the policyholder / proposal form", en: "Statement of the policyholder / proposal form" },
                                { el: "Στην πρόταση ασφάλισης και στη σελίδα στοιχείων", en: "On the proposal form and the schedule" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Το κριτήριο της δήλωσης", en: "The disclosure test" },
                                { el: "Αντικειμενικά ουσιώδες για την εκτίμηση του κινδύνου", en: "Αντικειμενικά ουσιώδες για την εκτίμηση του κινδύνου" },
                                { el: "Objectively material to the assessment of the risk", en: "Objectively material to the assessment of the risk" },
                                { el: "Γενικοί Όροι, στο άρθρο για τις υποχρεώσεις κατά τη σύναψη", en: "General terms, in the article on duties at inception" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Η προθεσμία στη διάρκεια", en: "The mid-term deadline" },
                                { el: "Επίταση κινδύνου — δεκατέσσερεις (14) ημέρες", en: "Επίταση κινδύνου — δεκατέσσερεις (14) ημέρες" },
                                { el: "Aggravation of the risk — 14 days", en: "Aggravation of the risk — 14 days" },
                                { el: "Γενικοί Όροι, σε χωριστό άρθρο με αυτόν τον τίτλο", en: "General terms, in a separate article under that heading" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Οι δύο συνέπειες", en: "The two consequences" },
                                { el: "Αμέλεια / δόλος", en: "Αμέλεια / δόλος" },
                                { el: "Negligence / fraud", en: "Negligence / fraud" },
                                { el: "Στις παραγράφους των συνεπειών, στα ίδια άρθρα", en: "In the consequence paragraphs of those same articles" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Το ακατοίκητο ακίνητο", en: "The unoccupied property" },
                                { el: "Ακατοίκητο για συνεχόμενο διάστημα μεγαλύτερο των τριάντα (30) ημερών", en: "Ακατοίκητο για συνεχόμενο διάστημα μεγαλύτερο των τριάντα (30) ημερών" },
                                { el: "Unoccupied for more than 30 consecutive days", en: "Unoccupied for more than 30 consecutive days" },
                                { el: "Ειδικοί όροι, στις εξαιρέσεις της κάλυψης κλοπής", en: "Special terms, among the theft exclusions" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Πώς περιγράφεται η χρήση", en: "How the use is described" },
                                { el: "Χρήση / περιγραφή ασφαλισμένου κινδύνου", en: "Χρήση / περιγραφή ασφαλισμένου κινδύνου" },
                                { el: "Use / description of the insured risk", en: "Use / description of the insured risk" },
                                { el: "Στη σελίδα στοιχείων του ασφαλιστηρίου", en: "On the policy schedule" },
                            ],
                        },
                    ],
                    note: {
                        el: "Οι ονομασίες και η δομή διαφέρουν ανά εταιρεία και ανά έκδοση όρων. Αν ένας όρος υπάρχει στο δικό σας ασφαλιστήριο, και με ποια διατύπωση, το κρίνει μόνο το δικό σας κείμενο.",
                        en: "Names and structure vary by insurer and by edition of the wording. Whether a term exists in your own policy, and in what words, is settled only by your own text.",
                    },
                },
            },
            {
                heading: {
                    el: "Τι κάνει με αυτό το PolicyWallet;",
                    en: "What does PolicyWallet do with this?",
                },
                paragraphs: [
                    {
                        el: "Η εφαρμογή συγκεντρώνει τις προϋποθέσεις και τις εξαιρέσεις που διαβάζει. Σας βοηθά να ετοιμάσετε ερωτήσεις για την ασφαλιστική σας, χωρίς να ελέγχει την πραγματική χρήση του ακινήτου.",
                        en: "It reads the policy and separates out the terms that cover hangs on — conditions precedent, inviolable terms, obligations the text itself ties to keeping cover in force — and presents them as requirements to confirm: the policy asks for this, confirm it is true. It also records the exclusions as the document words them.",
                    },
                    {
                        el: "Αυτό που δεν κάνει: δεν βλέπει πώς χρησιμοποιείται το ακίνητο. Δεν γνωρίζει αν μισθώνεται, δεν εντοπίζει βραχυχρόνια μίσθωση και δεν αποφαίνεται αν μια κάλυψη ισχύει. Ένας όρος λέει τι απαιτεί το ασφαλιστήριο· το αν αυτό συμβαίνει στην πράξη είναι ερώτημα προς εσάς, όχι διαπίστωση της εφαρμογής.",
                        en: "What it does not do: it cannot see how the property is used. It does not know whether it is let, it does not detect short-term letting, and it reaches no verdict on whether cover responds. A condition states what the policy requires; whether that is actually the case is a question for you, not a finding of the app.",
                    },
                    {
                        el: "Ανεβάζετε το PDF και οι όροι, οι προϋποθέσεις και οι εξαιρέσεις εμφανίζονται σε απλά ελληνικά, στην ίδια σελίδα με το πρωτότυπο έγγραφο — ώστε τα σημεία του πίνακα παραπάνω να τα ελέγξετε πάνω στο κείμενο, χωρίς να το διασχίσετε ολόκληρο.",
                        en: "You upload the PDF and the terms, conditions and exclusions appear in plain language, on the same page as the original document — so the items in the table above can be checked against the text, without crossing the whole wording.",
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Η βραχυχρόνια μίσθωση είναι επίταση του κινδύνου;",
                    en: "Is short-term letting an aggravation of the risk?",
                },
                answer: {
                    el: "Μπορεί να αποτελεί σημαντική αλλαγή για την ασφαλιστική. Μην το συμπεράνετε μόνο από τον τίτλο του προγράμματος: δηλώστε τη χρήση και ζητήστε γραπτή απάντηση για τους όρους που ισχύουν.",
                    en: "It may be a significant change for the insurer. Do not infer this from the programme name alone: declare the use and ask for a written answer about the applicable terms.",
                },
            },
            {
                question: {
                    el: "Αν δεν το δήλωσα, χάνω την κάλυψη;",
                    en: "If I did not declare it, do I lose my cover?",
                },
                answer: {
                    el: "Δεν είναι αυτό που λέει το κείμενο που παραθέτουμε. Διακρίνει: σε αμέλεια το ασφάλισμα μειώνεται κατά τον λόγο του ασφαλίστρου που θα είχε καθοριστεί χωρίς την παράβαση· σε δόλο η εταιρεία μπορεί να καταγγείλει μέσα σε έναν μήνα και απαλλάσσεται αν ο κίνδυνος επέλθει μέσα σε αυτή την προθεσμία. Ποια διατύπωση έχει το δικό σας ασφαλιστήριο το δείχνει το δικό σας κείμενο.",
                    en: "That is not what the wording quoted here says. It distinguishes: on negligence the indemnity is reduced in the ratio of the premium that would have been set without the breach; on fraud the company may cancel within one month and is released if the risk occurs inside that period. Which wording your own policy carries is shown by your own text.",
                },
            },
            {
                question: {
                    el: "Το ακίνητο μένει άδειο ανάμεσα σε μισθώσεις — τι σημαίνει;",
                    en: "The property sits empty between lets — what does that mean?",
                },
                answer: {
                    el: "Σημαίνει ότι αξίζει να διαβάσετε τις εξαιρέσεις της κλοπής. Όροι αυτής της κατηγορίας εξαιρούν ζημιά όταν ο χώρος παραμένει ακατοίκητος για συνεχόμενο διάστημα μεγαλύτερο των τριάντα ημερών, εκτός αν έχει συμφωνηθεί ρητά και γραπτά μεγαλύτερο διάστημα. Η ρήτρα αφορά την κλοπή στο κείμενο που διαβάσαμε, όχι κάθε κάλυψη.",
                    en: "It means the theft exclusions are worth reading. Wordings of this class exclude loss where the premises remain unoccupied for a continuous period exceeding thirty days, unless a longer period was expressly agreed in writing. In the text we read the clause attaches to theft, not to every cover.",
                },
            },
            {
                question: {
                    el: "Πού γράφεται η χρήση του ακινήτου;",
                    en: "Where is the property's use recorded?",
                },
                answer: {
                    el: "Στη σελίδα στοιχείων του ασφαλιστηρίου και στην πρόταση ασφάλισης που προηγήθηκε. Είναι τα δύο σημεία όπου η περιγραφή του κινδύνου αποτυπώνεται με λέξεις και όχι με ποσά, και είναι εκεί που φαίνεται τι γνώριζε η εταιρεία όταν τιμολόγησε.",
                    en: "On the policy schedule and on the proposal form that preceded it. Those are the two places where the risk is described in words rather than amounts, and they are where what the insurer knew when it priced the cover is visible.",
                },
            },
        ],
        sources: [{"label":{"el":"Υπουργείο Τουρισμού — απαιτήσεις βραχυχρόνιας μίσθωσης από 1 Οκτωβρίου 2025","en":"Ministry of Tourism — short-term rental requirements from 1 October 2025"},"url":"https://mintour.gov.gr/yperpsifistike-stin-olomeleia-tis-voylis-to-nomoschedio-toy-ypoyrgeioy-toyrismoy/"},
            {
                label: {
                    el: "Γενικοί Όροι Ασφάλισης Κατοικίας — υποχρεώσεις κατά τη σύναψη και επίταση κινδύνου (PDF)",
                    en: "Home insurance general terms — duties at inception and aggravation of the risk (PDF)",
                },
                url: "https://sales.europe-asfalistiki.gr/files/Europe_Insurance_Oroi_Katoikias.pdf",
            },
            {
                label: {
                    el: "Ειδικοί Όροι Ασφάλισης Κατοικίας — εξαιρέσεις της κάλυψης κλοπής (PDF)",
                    en: "Home insurance special terms — theft cover exclusions (PDF)",
                },
                url: "https://sales.europe-asfalistiki.gr/files/Europe_Insurance_Oroi_Katoikias.pdf",
            },
        ],
    },
    /**
     * H6 — how ELGA compensation is worked out, and what sits outside it.
     *
     * Claims: SRC-014 (closed peril list; production only, not the plant capital),
     * SRC-015 (loss up to 20% pays nothing; above it, 88% of the part above 15% —
     * a default the board may vary, so copy says «κατά κανόνα», never «πάντα»),
     * SRC-016 (the insured value is administratively set: area x regional average
     * yield x a per-unit value fixed by ministerial decision — the MECHANISM only,
     * never a figure). See docs/growth/SOURCES.md.
     *
     * REGISTER (goal §2.5): factual and calm. This is a subject with recent loss of
     * life and property behind it. No fear copy, no urgency, no disaster imagery.
     *
     * Two traps this article is written around. The operative text is the 2011
     * regulation, not the 1998 one ELGA still publishes — their peril lists differ.
     * And no per-kilo value is quoted anywhere: those are reissued by a separate
     * ministerial decision and none was verified.
     */
    {
        slug: "elga-apozimiosi-kai-pragmatiko-kostos",
        title: {
            el: "Πώς υπολογίζεται η αποζημίωση του ΕΛ.Γ.Α.;",
            en: "How is ELGA compensation calculated?",
        },
        metaTitle: {
            el: "Αποζημίωση ΕΛ.Γ.Α.: πώς υπολογίζεται",
            en: "ELGA compensation: how it is calculated",
        },
        metaDescription: {
            el: "Ποιους κινδύνους καλύπτει ο Κανονισμός Ασφάλισης Φυτικής Παραγωγής, πώς προκύπτει το ποσό της αποζημίωσης και τι μένει εκτός, με παραπομπή στο ΦΕΚ.",
            en: "Which perils the Greek crop insurance regulation covers, how the compensation figure is worked out and what stays outside it, cited to the government gazette.",
        },
        summary: {
            el: "Η ασφάλιση του ΕΛ.Γ.Α. καλύπτει συγκεκριμένες αιτίες ζημιάς στην παραγωγή της χρονιάς. Δεν καλύπτει γενικά τα ίδια τα δέντρα ή τα φυτά· ο Κανονισμός αναφέρει εξαίρεση για τα σπαράγγια. Το ποσό που θα πάρετε μπορεί να είναι μικρότερο από τη ζημιά. Υπολογίζεται με κανόνες και τιμές που ορίζει το κράτος, όχι μόνο με το κόστος σας. Παρακάτω εξηγούμε τα βήματα με ένα παράδειγμα.",
            en: "ELGA insurance covers specific causes of damage to the current year’s crop. It does not generally cover the trees or plants themselves; the Regulation makes an exception for asparagus. The payment may be less than your loss. It follows official rules and values, rather than just your own costs. Below, we explain the steps with an example.",
        },
        datePublished: "2026-08-26",
        dateModified: "2026-10-21",
        readingMinutes: 7,
        related: [
            {
                label: {
                    el: "Τι είναι τα κενά κάλυψης και πώς τα εντοπίζετε;",
                    en: "What are coverage gaps and how do you find them?",
                },
                href: "/guides/kena-kalypsis-ti-einai-pos-ta-vriskete",
            },
            {
                label: { el: "Απαλλαγή", en: "Deductible" },
                href: "/lexiko/apallagi",
            },
            {
                label: { el: "Αποζημίωση", en: "Claim payout" },
                href: "/lexiko/apozimiosi",
            },
        ],
        sections: [
            {
                heading: {
                    el: "Τι καλύπτει ο Κανονισμός και τι όχι;",
                    en: "What does the regulation cover, and what not?",
                },
                paragraphs: [
                    {
                        el: "Ο Κανονισμός Ασφάλισης Φυτικής Παραγωγής του ΕΛ.Γ.Α. δεν καλύπτει «κάθε ζημιά στην καλλιέργεια». Απαριθμεί ζημιογόνα αίτια, και ό,τι δεν είναι στον κατάλογο βρίσκεται εκτός. Τα φυσικά αίτια που ονομάζει είναι χαλάζι, παγετός, ανεμοθύελλα, πλημμύρα, καύσωνας και ηλιακή ακτινοβολία, υπερβολικές ή άκαιρες βροχοπτώσεις, χιόνι και θάλασσα. Προστίθενται ζημιές από άγρια ζώα: αρκούδα, αγριογούρουνα και άγρια κουνέλια σε καθορισμένες περιοχές.",
                        en: "ELGA's crop insurance regulation does not cover «any damage to the crop». It enumerates causes of loss, and anything not on the list is outside it. The natural causes it names are hail, frost, windstorm, flood, heatwave and solar radiation, excessive or untimely rainfall, snow and sea spray. Damage by wild animals is added: bear, wild boar and wild rabbits in defined areas.",
                    },
                    {
                        el: "Το δεύτερο όριο είναι λιγότερο γνωστό και πιο καθοριστικό: ασφαλίζεται η παραγωγή, όχι το φυτό. Το άρθρο 4 του Κανονισμού ορίζει ότι «οι ζημιές που προκαλούνται στο φυτικό κεφάλαιο ή που επιδρούν μειωτικά στην παραγωγή της επόμενης καλλιεργητικής περιόδου, δεν καλύπτονται ασφαλιστικά, εκτός της καλλιέργειας των σπαραγγιών». Ένα δέντρο που καταστρέφεται και η επόμενη σοδειά που χάνεται μαζί του είναι δύο διαφορετικά μεγέθη, και ο Κανονισμός αποζημιώνει μόνο τη σοδειά της χρονιάς.",
                        en: "The second limit is less well known and more decisive: it is the production that is insured, not the plant. Article 4 of the regulation provides that «damage caused to the plant capital, or which reduces the production of the following growing season, is not insured, save for asparagus». A tree that is destroyed and the following harvest lost with it are two different quantities, and the regulation compensates only the current season's harvest.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πώς προκύπτει το ποσό της αποζημίωσης;",
                    en: "How is the compensation figure arrived at?",
                },
                paragraphs: [
                    {
                        el: "Η αξία της παραγωγής υπολογίζεται από τα δηλωμένα στρέμματα, τη μέση παραγωγή της περιοχής και τις τιμές που ορίζει η σχετική απόφαση. Δεν είναι απαραίτητα η τιμή στην οποία θα πουλούσατε εσείς το προϊόν.",
                        en: "In two separate steps, both written into the regulation. The first sets the insured value of the production: the number of stremmata as declared in the Single Crop and Livestock Declaration, the average yield per stremma and per crop for the geographical area, and the value of the product per kilo or unit as fixed by the ministerial decision in force at the time. It is therefore an administratively determined quantity — not the price you sell at, and not the cost of replanting.",
                    },
                    {
                        el: "Το δεύτερο βήμα εφαρμόζει το ελάχιστο όριο απαλλαγής. Ζημιά έως και 20% της συνολικής παραγωγής του αγροτεμαχίου που ζημιώθηκε, κατ' είδος και ποικιλία καλλιέργειας, δεν καλύπτεται ασφαλιστικά. Αν η ζημιά είναι μεγαλύτερη από 20%, ο ΕΛ.Γ.Α. «καταβάλλει αποζημίωση ίση προς το ποσοστό 88%, του πάνω από 15% ποσοστού ζημιάς». Το κατώφλι μετριέται ανά αγροτεμάχιο και ανά είδος και ποικιλία — όχι στο σύνολο της εκμετάλλευσης. Το ίδιο άρθρο επιτρέπει το όριο αυτό να αυξηθεί ή να μειωθεί για συγκεκριμένες καλλιέργειες ή ασφαλισμένους, με απόφαση του Δ.Σ. του ΕΛ.Γ.Α. εγκεκριμένη από τον Υπουργό, οπότε τα ποσοστά είναι ο κανόνας και όχι σταθερά.",
                        en: "The second step applies the minimum deductible. A loss of up to 20% of the total production of the damaged parcel, by crop and variety, is not insured. Where the loss exceeds 20%, ELGA «pays compensation equal to 88% of the portion of the loss above 15%». The threshold is measured per parcel and per crop and variety — not across the holding as a whole. The same article allows that threshold to be raised or lowered for particular crops or insureds, by a decision of ELGA's board approved by the Minister, so the percentages are the rule rather than a constant.",
                    },
                    {
                        el: "Τα δύο βήματα μαζί εξηγούν γιατί το ποσό που καταβάλλεται δεν ταυτίζεται με το ποσό της ζημιάς, ακόμη και σε ολική απώλεια της σοδειάς. Ο πίνακας κάνει την αριθμητική πάνω σε μια υποθετική ασφαλιζόμενη αξία 10.000 ευρώ.",
                        en: "The two steps together explain why the amount paid does not equal the amount of the loss, even on a total loss of the harvest. The table works the arithmetic through on a hypothetical insured value of €10,000.",
                    },
                ],
                table: {
                    caption: {
                        el: "Τι δίνουν τα ποσοστά του Κανονισμού σε ασφαλιζόμενη αξία 10.000 ευρώ.",
                        en: "What the regulation's percentages produce on an insured value of €10,000.",
                    },
                    columns: [
                        { el: "Ποσοστό ζημιάς", en: "Loss as % of production" },
                        { el: "Ποσοστό αποζημίωσης", en: "Compensated %" },
                        { el: "Αποζημίωση", en: "Compensation" },
                        { el: "Μη αποζημιούμενο μέρος", en: "Not compensated" },
                    ],
                    rows: [
                        {
                            cells: [
                                { el: "15%", en: "15%" },
                                { el: "0% — κάτω από το κατώφλι", en: "0% — below the threshold" },
                                { el: "0 €", en: "€0" },
                                { el: "1.500 €", en: "€1,500" },
                            ],
                        },
                        {
                            cells: [
                                { el: "20%", en: "20%" },
                                { el: "0% — έως και 20% δεν καλύπτεται", en: "0% — up to 20% is not insured" },
                                { el: "0 €", en: "€0" },
                                { el: "2.000 €", en: "€2,000" },
                            ],
                        },
                        {
                            cells: [
                                { el: "30%", en: "30%" },
                                { el: "13,2%", en: "13.2%" },
                                { el: "1.320 €", en: "€1,320" },
                                { el: "1.680 €", en: "€1,680" },
                            ],
                        },
                        {
                            cells: [
                                { el: "50%", en: "50%" },
                                { el: "30,8%", en: "30.8%" },
                                { el: "3.080 €", en: "€3,080" },
                                { el: "1.920 €", en: "€1,920" },
                            ],
                        },
                        {
                            cells: [
                                { el: "100%", en: "100%" },
                                { el: "74,8%", en: "74.8%" },
                                { el: "7.480 €", en: "€7,480" },
                                { el: "2.520 €", en: "€2,520" },
                            ],
                        },
                    ],
                    note: {
                        el: "Απλή αριθμητική πάνω στα ποσοστά του Κανονισμού, με υποθετική ασφαλιζόμενη αξία. Δεν είναι πρόβλεψη για συγκεκριμένη υπόθεση: η ασφαλιζόμενη αξία ορίζεται διοικητικά, και το όριο απαλλαγής μπορεί να μεταβληθεί με απόφαση του Δ.Σ. του ΕΛ.Γ.Α. εγκεκριμένη από τον Υπουργό.",
                        en: "Plain arithmetic on the regulation's percentages, using a hypothetical insured value. It is not a prediction for a particular case: the insured value is set administratively, and the same article allows the deductible to be raised or lowered by a decision of ELGA's board approved by the Minister.",
                    },
                },
            },
            {
                heading: {
                    el: "Τι κοιτάτε στα δικά σας έγγραφα;",
                    en: "What do you look for in your own documents?",
                },
                paragraphs: [
                    {
                        el: "Έξι σημεία, με τους όρους όπως τυπώνονται στα ελληνικά έγγραφα και την αγγλική τους απόδοση.",
                        en: "Six things to find, with the terms as printed on Greek documents and their English equivalents.",
                    },
                ],
                table: {
                    caption: {
                        el: "Πού βρίσκεται το καθένα, στη δήλωση, στον Κανονισμό ή σε ιδιωτικό ασφαλιστήριο.",
                        en: "Where each item sits — in the declaration, in the regulation, or in a private policy.",
                    },
                    columns: [
                        { el: "Τι ψάχνετε", en: "What you are looking for" },
                        { el: "Όρος στο έγγραφο", en: "Term on the document (Greek)" },
                        { el: "Στα αγγλικά", en: "In English" },
                        { el: "Πού βρίσκεται", en: "Where it sits" },
                    ],
                    rows: [
                        {
                            cells: [
                                { el: "Οι εκτάσεις που δηλώθηκαν", en: "The areas you declared" },
                                { el: "Ενιαία Δήλωση Καλλιέργειας/Εκτροφής", en: "Ενιαία Δήλωση Καλλιέργειας/Εκτροφής" },
                                { el: "Single crop and livestock declaration", en: "Single crop and livestock declaration" },
                                { el: "Στη δήλωση της χρονιάς, σε στρέμματα κατ' είδος και ποικιλία", en: "In that year's declaration, in stremmata by crop and variety" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Η βάση του ποσού", en: "The basis of the amount" },
                                { el: "Ασφαλιζόμενη αξία της φυτικής παραγωγής", en: "Ασφαλιζόμενη αξία της φυτικής παραγωγής" },
                                { el: "Insured value of the crop production", en: "Insured value of the crop production" },
                                { el: "Κανονισμός, άρθρο 3", en: "Regulation, article 3" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Το κατώφλι", en: "The threshold" },
                                { el: "Ελάχιστο όριο απαλλαγής", en: "Ελάχιστο όριο απαλλαγής" },
                                { el: "Minimum deductible", en: "Minimum deductible" },
                                { el: "Κανονισμός, άρθρο 7", en: "Regulation, article 7" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Πάνω σε τι μετριέται", en: "What it is measured against" },
                                { el: "Συνολική παραγωγή του αγροτεμαχίου, κατ' είδος και ποικιλία", en: "Συνολική παραγωγή του αγροτεμαχίου, κατ' είδος και ποικιλία" },
                                { el: "Total production of the damaged parcel, by crop and variety", en: "Total production of the damaged parcel, by crop and variety" },
                                { el: "Κανονισμός, άρθρο 7", en: "Regulation, article 7" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Τι μένει εκτός", en: "What stays outside" },
                                { el: "Ζημιές στο φυτικό κεφάλαιο", en: "Ζημιές στο φυτικό κεφάλαιο" },
                                { el: "Damage to the plant capital", en: "Damage to the plant capital" },
                                { el: "Κανονισμός, άρθρο 4", en: "Regulation, article 4" },
                            ],
                        },
                        {
                            cells: [
                                { el: "Αν υπάρχει και ιδιωτικό ασφαλιστήριο", en: "If a private policy also exists" },
                                { el: "Καλυπτόμενοι κίνδυνοι / εξαιρέσεις", en: "Καλυπτόμενοι κίνδυνοι / εξαιρέσεις" },
                                { el: "Covered perils / exclusions", en: "Covered perils / exclusions" },
                                { el: "Στον πίνακα καλύψεων και στις εξαιρέσεις του δικού σας ασφαλιστηρίου", en: "On the schedule and in the exclusions of your own policy" },
                            ],
                        },
                    ],
                    note: {
                        el: "Ο Κανονισμός είναι δημόσιο κείμενο και παρατίθεται στις πηγές. Τι ισχύει για μια συγκεκριμένη δήλωση ή ένα συγκεκριμένο αγροτεμάχιο φαίνεται μόνο από τα δικά σας έγγραφα.",
                        en: "The regulation is a public text and is cited in the sources. What applies to a particular declaration or parcel is visible only on your own documents.",
                    },
                },
            },
            {
                heading: {
                    el: "Τι κάνει με αυτό το PolicyWallet;",
                    en: "What does PolicyWallet do with this?",
                },
                paragraphs: [
                    {
                        el: "Το PolicyWallet δεν συνδέεται με τον ΕΛ.Γ.Α. και δεν υπολογίζει την αποζημίωσή σας. Για συγκεκριμένη υπόθεση, χρειάζονται τα έγγραφα της δήλωσης και η ενημέρωση του ΕΛ.Γ.Α.",
                        en: "Less than you might expect, and that is worth saying plainly. PolicyWallet reads insurance policies that you upload. It has no connection to ELGA, it does not calculate ELGA compensation, and it does not know what will be paid in any particular case. The percentages on this page are the regulation's, not ours.",
                    },
                    {
                        el: "Αν υπάρχει ιδιωτικό ασφαλιστήριο για την εκμετάλλευση ή για την ίδια καλλιέργεια, αυτό είναι το έγγραφο που μπορεί να διαβάσει: ποιους κινδύνους ονομάζει, ποια ποσά και απαλλαγές ορίζει, τι καταγράφει ως εξαιρέσεις — και πού σιωπά. Όταν το έγγραφο δεν αναφέρει κάτι, το PolicyWallet το δηλώνει ως μη καταγεγραμμένο· δεν το συμπεραίνει και δεν το εκλαμβάνει ως κάλυψη.",
                        en: "Where a private policy exists for the holding or for the same crop, that is the document it can read: which perils it names, which amounts and deductibles it sets, what it records as exclusions — and where it is silent. When the document does not say something, PolicyWallet records it as not stated; it does not infer it, and it does not read silence as cover.",
                    },
                    {
                        el: "Ανεβάζετε το PDF και οι καλύψεις, τα όρια και οι εξαιρέσεις εμφανίζονται σε απλά ελληνικά, στην ίδια σελίδα με το πρωτότυπο έγγραφο — ώστε να δείτε δίπλα-δίπλα τι αναλαμβάνει το ιδιωτικό κείμενο και τι αφήνει στον κλειστό κατάλογο του Κανονισμού.",
                        en: "You upload the PDF and the covers, limits and exclusions appear in plain language, on the same page as the original document — so you can see side by side what the private wording takes on and what it leaves to the regulation's closed list.",
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Γιατί μια ζημιά 20% δεν αποζημιώνεται;",
                    en: "Why is a 20% loss not compensated?",
                },
                answer: {
                    el: "Γιατί ο Κανονισμός ορίζει, κατά κανόνα, ελάχιστο όριο απαλλαγής: ζημιά έως και 20% της συνολικής παραγωγής του αγροτεμαχίου, κατ' είδος και ποικιλία, δεν καλύπτεται ασφαλιστικά. Πάνω από αυτό το όριο καταβάλλεται αποζημίωση ίση προς το 88% του πάνω από 15% ποσοστού ζημιάς, οπότε η μετάβαση από το 20% προς τα πάνω δεν είναι σταδιακή.",
                    en: "Because the regulation sets, as a rule, a minimum deductible: a loss of up to 20% of the parcel's total production, by crop and variety, is not insured. Above that line compensation is paid equal to 88% of the portion of the loss above 15%, so the step up from 20% is not gradual.",
                },
            },
            {
                question: {
                    el: "Η ασφαλιζόμενη αξία είναι η τιμή που πουλάω;",
                    en: "Is the insured value the price I sell at?",
                },
                answer: {
                    el: "Όχι κατά τον Κανονισμό. Ορίζεται από τρία μεγέθη: τα στρέμματα όπως δηλώθηκαν, τη μέση παραγωγή κατά στρέμμα και είδος ανά γεωγραφική περιοχή, και την αξία ανά κιλό ή τεμάχιο που καθορίζεται με κοινή υπουργική απόφαση. Οι τιμές ανά κιλό επανεκδίδονται περιοδικά, οπότε δεν παραθέτουμε κάποια εδώ.",
                    en: "Not under the regulation. It is set by three quantities: the stremmata as declared, the average yield per stremma and crop for the geographical area, and the per-kilo or per-unit value fixed by ministerial decision. Those per-kilo values are reissued periodically, so we quote none here.",
                },
            },
            {
                question: {
                    el: "Βρήκα διαφορετική λίστα κινδύνων — ποια ισχύει;",
                    en: "I found a different list of perils — which one applies?",
                },
                answer: {
                    el: "Αξίζει να κοιτάξετε τη χρονολογία του κειμένου που διαβάζετε. Η σελίδα αυτή στηρίζεται στον Κανονισμό του 2011 (ΦΕΚ Β΄ 1668/27.07.2011) και στις τροποποιήσεις του έως τις 20-06-2025. Κυκλοφορεί και παλαιότερο κείμενο του 1998 με διαφορετικό κατάλογο ζημιογόνων αιτίων — δεν περιλαμβάνει την ηλιακή ακτινοβολία. Ο κατάλογος των ισχυόντων κειμένων και των τροποποιήσεων είναι στο θεσμικό πλαίσιο του ΕΛ.Γ.Α., στις πηγές παρακάτω.",
                    en: "It is worth checking the date of the text you are reading. This page rests on the 2011 regulation (Gazette B΄ 1668/27.07.2011) and its amendments through 20-06-2025. An older 1998 text also circulates with a different list of causes — it does not include solar radiation. The index of texts in force and their amendments is in ELGA's legal-framework page, in the sources below.",
                },
            },
            {
                question: {
                    el: "Καλύπτεται η ζημιά στα ίδια τα δέντρα;",
                    en: "Is damage to the trees themselves covered?",
                },
                answer: {
                    el: "Ο Κανονισμός λέει ότι δεν καλύπτονται ασφαλιστικά οι ζημιές που προκαλούνται στο φυτικό κεφάλαιο ή που επιδρούν μειωτικά στην παραγωγή της επόμενης καλλιεργητικής περιόδου, με εξαίρεση την καλλιέργεια των σπαραγγιών. Η αποζημίωση αφορά την παραγωγή της χρονιάς που ζημιώθηκε.",
                    en: "The regulation provides that damage to the plant capital, or which reduces the production of the following growing season, is not insured, with the exception of asparagus. Compensation attaches to the production of the season that was damaged.",
                },
            },
        ],
        sources: [
            {
                label: {
                    el: "ΕΛ.Γ.Α. — Κανονισμός Ασφάλισης Φυτικής Παραγωγής 2011 (ΦΕΚ Β΄ 1668/27.07.2011, PDF)",
                    en: "ELGA — Crop Production Insurance Regulation 2011 (Gazette B΄ 1668/27.07.2011, PDF)",
                },
                url: "https://elga.gr/wp-content/uploads/2024/01/kanonismos-asfalisis-fitikis-2011.pdf",
            },
            {
                label: {
                    el: "ΕΛ.Γ.Α. — Θεσμικό πλαίσιο: ισχύοντες κανονισμοί και οι τροποποιήσεις τους",
                    en: "ELGA — Legal framework: regulations in force and their amendments",
                },
                url: "https://elga.gr/thesmiko-plaisio/",
            },
        ],
    },
]

export function getGuide(slug: string): Guide | undefined {
    return guides.find((guide) => guide.slug === slug)
}

/**
 * A guide reduced to what a card needs: slug, bilingual title + 40–60 word
 * summary, and reading time. Deliberately DROPS `sections`/`faq`/`sources` so a
 * caller (e.g. the in-app help center) can list every guide without importing —
 * and shipping to the client — the full ~60KB `guides` module. Resolve this on
 * the server and pass the plain array down, the same discipline the glossary
 * hints follow.
 */
export type GuideSummary = {
    slug: string
    title: LocalizedString
    summary: LocalizedString
    readingMinutes: number
}

export function getGuideSummaries(): GuideSummary[] {
    return guides.map((g) => ({
        slug: g.slug,
        title: g.title,
        summary: g.summary,
        readingMinutes: g.readingMinutes,
    }))
}
