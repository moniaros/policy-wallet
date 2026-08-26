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
            el: "Αν η κατοικία σας είναι ασφαλισμένη και για τους τρεις κινδύνους — σεισμό, πυρκαγιά και πλημμύρα — δικαιούστε έκπτωση στον ΕΝΦΙΑ. Η έκπτωση ξεκίνησε στο 10% το 2022 και έχει αυξηθεί για κατοικίες με χαμηλότερη φορολογητέα αξία. Απαιτείται ελάχιστη διάρκεια ασφάλισης και επαρκές ασφαλιζόμενο κεφάλαιο· η ασφαλιστική σας εταιρεία διαβιβάζει τα στοιχεία στην ΑΑΔΕ.",
            en: "If your home is insured against all three risks — earthquake, fire, and flood — you are entitled to an ENFIA property-tax discount. The discount started at 10% in 2022 and has since been increased for homes with lower taxable value. A minimum policy duration and adequate insured sum are required; your insurer reports the data to the Greek tax authority (AADE).",
        },
        datePublished: "2026-07-07",
        // TODO(quarterly-review): ENFIA discount rates/thresholds change with
        // tax legislation — re-verify against aade.gr every quarter (next due
        // 2026-10-01) and bump dateModified ONLY when actually reviewed.
        dateModified: "2026-07-07",
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
                        el: "Η έκπτωση θεσπίστηκε με τον ν. 4916/2022 και εφαρμόζεται από τον ΕΝΦΙΑ του 2022. Για να τη δικαιούστε, το ασφαλιστήριο κατοικίας πρέπει να πληροί σωρευτικά συγκεκριμένες προϋποθέσεις:",
                        en: "The discount was introduced by Law 4916/2022 and applies from the 2022 ENFIA onward. To qualify, your home policy must cumulatively meet specific conditions:",
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
                        el: "Το ασφαλιζόμενο κεφάλαιο πρέπει να καλύπτει την αξία ανακατασκευής του κτίσματος. Η ΑΑΔΕ ορίζει ελάχιστη αξία ανά τετραγωνικό μέτρο — επιβεβαιώστε το ισχύον όριο στο aade.gr.",
                        en: "The insured sum must cover the building's reconstruction value. AADE sets a minimum value per square meter — confirm the current threshold at aade.gr.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πόση είναι η έκπτωση σήμερα;",
                    en: "How large is the discount today?",
                },
                paragraphs: [
                    {
                        el: "Για τον ΕΝΦΙΑ του 2022 και του 2023 η έκπτωση ήταν 10% για πλήρες έτος ασφάλισης. Από τον ΕΝΦΙΑ του 2024 η έκπτωση διπλασιάστηκε σε 20% για κατοικίες με φορολογητέα αξία έως 500.000 ευρώ που είναι ασφαλισμένες για ολόκληρο το έτος· για μεγαλύτερες αξίες παραμένει το 10%. Επειδή οι λεπτομέρειες ενδέχεται να αλλάζουν με νέες αποφάσεις, ελέγχετε πάντα την τρέχουσα ανακοίνωση της ΑΑΔΕ πριν από την εκκαθάριση.",
                        en: "For the 2022 and 2023 ENFIA the discount was 10% for a full year of coverage. From the 2024 ENFIA the discount was doubled to 20% for homes with a taxable value up to €500,000 insured for the full year; above that, 10% still applies. Because the details can change with new decisions, always check the current AADE announcement before assessment time.",
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
                        el: "Δεν χρειάζεται να κάνετε αίτηση. Οι ασφαλιστικές εταιρείες διαβιβάζουν ηλεκτρονικά στην ΑΑΔΕ τα στοιχεία των ασφαλισμένων κατοικιών (ΑΤΑΚ ακινήτου, διάρκεια, καλύψεις). Εσείς πρέπει μόνο να βεβαιωθείτε ότι ο ΑΤΑΚ του ακινήτου έχει δηλωθεί σωστά στο ασφαλιστήριο και ότι τα στοιχεία του Ε9 σας είναι ενημερωμένα. Η έκπτωση εμφανίζεται αυτόματα στο εκκαθαριστικό του ΕΝΦΙΑ στο myAADE.",
                        en: "You do not need to apply. Insurers electronically submit the insured-home data to AADE (the property's ATAK identifier, duration, coverages). You only need to make sure the property's ATAK is correctly recorded on the policy and that your E9 property declaration is up to date. The discount then appears automatically on your ENFIA assessment in myAADE.",
                    },
                ],
            },
            {
                heading: {
                    el: "Πώς ελέγχετε ότι το συμβόλαιό σας πληροί τα κριτήρια;",
                    en: "How do you check that your policy qualifies?",
                },
                paragraphs: [
                    {
                        el: "Ανοίξτε τον πίνακα καλύψεων του ασφαλιστηρίου και αναζητήστε ρητά τις λέξεις «σεισμός», «πυρκαγιά» και «πλημμύρα» στις καλυπτόμενες ζημιές — όχι στις προαιρετικές ή στις εξαιρέσεις. Ελέγξτε επίσης το ασφαλιζόμενο κεφάλαιο κτίσματος σε σχέση με τα τετραγωνικά μέτρα. Εναλλακτικά, ανεβάστε το PDF του συμβολαίου στο PolicyWallet: η ανάλυση AI σας δείχνει ποιες καλύψεις αναφέρει το συμβόλαιο, ώστε να δείτε αν λείπει κάποιος από τους τρεις κινδύνους της έκπτωσης ΕΝΦΙΑ — και, εφόσον το έγγραφο αναφέρει και τα δύο ποσά, αν το ασφαλισμένο κεφάλαιο υπολείπεται του κόστους ανακατασκευής.",
                        en: "Open your policy's coverage table and look for earthquake, fire, and flood explicitly listed among the covered perils — not in the optional add-ons or the exclusions. Also check the insured building sum against your square meters. Alternatively, upload the policy PDF to PolicyWallet: the AI analysis shows you which perils the policy names, so you can see whether one of the three ENFIA-discount perils is missing — and, provided the document states both amounts, whether the insured sum falls below the reconstruction cost.",
                    },
                ],
            },
        ],
        faq: [
            {
                question: {
                    el: "Ισχύει η έκπτωση ΕΝΦΙΑ αν η ασφάλεια καλύπτει μόνο πυρκαγιά;",
                    en: "Does the ENFIA discount apply if the policy only covers fire?",
                },
                answer: {
                    el: "Όχι. Απαιτείται σωρευτική κάλυψη και των τριών κινδύνων — σεισμού, πυρκαγιάς και πλημμύρας. Συμβόλαιο μόνο πυρός δεν θεμελιώνει δικαίωμα έκπτωσης.",
                    en: "No. Cumulative coverage of all three risks — earthquake, fire, and flood — is required. A fire-only policy does not qualify.",
                },
            },
            {
                question: {
                    el: "Χρειάζεται αίτηση για την έκπτωση ΕΝΦΙΑ;",
                    en: "Do I need to apply for the ENFIA discount?",
                },
                answer: {
                    el: "Όχι, η διαδικασία είναι αυτόματη: η ασφαλιστική εταιρεία διαβιβάζει τα στοιχεία στην ΑΑΔΕ. Βεβαιωθείτε μόνο ότι ο ΑΤΑΚ του ακινήτου αναγράφεται σωστά στο ασφαλιστήριο.",
                    en: "No, the process is automatic: your insurer submits the data to AADE. Just make sure the property's ATAK identifier appears correctly on the policy.",
                },
            },
            {
                question: {
                    el: "Αξίζει οικονομικά η ασφάλιση κατοικίας μόνο για την έκπτωση;",
                    en: "Is home insurance worth it just for the discount?",
                },
                answer: {
                    el: "Η έκπτωση μειώνει το πραγματικό κόστος της ασφάλισης, αλλά η ουσιαστική αξία είναι η κάλυψη: στην Ελλάδα — χώρα με υψηλή σεισμικότητα — μόνο μία μικρή μειοψηφία κατοικιών είναι ασφαλισμένη. Η έκπτωση είναι το κίνητρο, όχι ο λόγος.",
                    en: "The discount lowers the effective cost of the policy, but the real value is the coverage itself: in Greece — a highly seismic country — only a small minority of homes are insured. The discount is the incentive, not the reason.",
                },
            },
        ],
        sources: [
            {
                label: {
                    el: "ΑΑΔΕ — Ανεξάρτητη Αρχή Δημοσίων Εσόδων (ΕΝΦΙΑ)",
                    en: "AADE — Independent Authority for Public Revenue (ENFIA)",
                },
                url: "https://www.aade.gr",
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
            el: "Κενό κάλυψης είναι ο κίνδυνος που νομίζετε ότι καλύπτεται αλλά δεν καλύπτεται. Τα συχνότερα κενά στην Ελλάδα, ο αναλογικός κανόνας και πώς τα εντοπίζετε.",
            en: "A coverage gap is the risk you think is insured but is not. The most common gaps in Greece, the average rule (pro-rata) and how to find yours in minutes.",
        },
        summary: {
            el: "Κενό κάλυψης είναι η διαφορά ανάμεσα σε αυτό που νομίζετε ότι καλύπτει το ασφαλιστήριό σας και σε αυτό που πραγματικά καλύπτει. Εμφανίζεται σε εξαιρέσεις, σε ανεπαρκή κεφάλαια και σε κινδύνους που δεν προστέθηκαν ποτέ. Εντοπίζεται με προσεκτική ανάγνωση των όρων ή αυτόματα, με ένα εργαλείο ανάλυσης όπως το PolicyWallet — στο πλάνο Plus.",
            en: "A coverage gap is the difference between what you think your policy covers and what it actually covers. It hides in exclusions, insufficient insured sums, and risks that were never added. You find it by carefully reading the terms — or automatically, with an analysis tool like PolicyWallet, on the Plus plan.",
        },
        datePublished: "2026-07-07",
        dateModified: "2026-07-07",
        readingMinutes: 7,
        sections: [
            {
                heading: {
                    el: "Ποια είναι τα συχνότερα κενά κάλυψης στην Ελλάδα;",
                    en: "What are the most common coverage gaps in Greece?",
                },
                paragraphs: [
                    {
                        el: "Η ελληνική αγορά έχει από τα χαμηλότερα ποσοστά ασφάλισης στην Ευρωπαϊκή Ένωση — σύμφωνα με τα δημοσιευμένα στοιχεία της ΕΑΕΕ, μόνο μία μικρή μειοψηφία κατοικιών διαθέτει ασφάλιση. Ακόμα όμως και όσοι έχουν συμβόλαια συναντούν επαναλαμβανόμενα κενά:",
                        en: "The Greek market has one of the lowest insurance penetration rates in the European Union — according to data published by the Hellenic Association of Insurance Companies (HAIC), only a small minority of homes carry insurance. But even policyholders run into recurring gaps:",
                    },
                ],
                bullets: [
                    {
                        el: "Σεισμός εκτός κάλυψης: σε πολλά στεγαστικά συμβόλαια ο σεισμός είναι προαιρετική επέκταση και δεν προστέθηκε ποτέ.",
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
                        el: "Επικαλύψεις: δύο συμβόλαια που πληρώνετε για τον ίδιο κίνδυνο (π.χ. ταξιδιωτική κάλυψη σε κάρτα και σε αυτόνομο συμβόλαιο) — χρήματα χαμένα.",
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
                        el: "Αν το σπίτι σας κοστίζει 200.000 € να ξαναχτιστεί αλλά το έχετε ασφαλίσει για 100.000 €, δεν θα πάρετε 100.000 € σε ολική ζημιά — ο «αναλογικός κανόνας» (pro-rata) σημαίνει ότι κάθε αποζημίωση, ακόμη και μερική, μειώνεται στο ποσοστό της υπασφάλισης. Ζημιά 20.000 € αποζημιώνεται με 10.000 €. Γι' αυτό ο έλεγχος του κεφαλαίου ανακατασκευής είναι το πιο σημαντικό, και πιο παραμελημένο, σημείο κάθε ανανέωσης.",
                        en: "If your home costs €200,000 to rebuild but you insured it for €100,000, you will not receive €100,000 on a total loss — the average rule (pro-rata) means every claim, even a partial one, is reduced by the underinsurance ratio. A €20,000 loss pays out €10,000. That is why checking the reconstruction sum is the most important — and most neglected — step of every renewal.",
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
                        el: "Ο χειροκίνητος έλεγχος θέλει τρία βήματα: πρώτον, διαβάστε τον πίνακα καλύψεων και σημειώστε τι πραγματικά περιλαμβάνεται — όχι τι υποθέτετε. Δεύτερον, διαβάστε τις εξαιρέσεις: εκεί κρύβονται τα περισσότερα κενά. Τρίτον, συγκρίνετε τα ασφαλιζόμενα κεφάλαια με τις σημερινές αξίες (ανακατασκευή, εξοπλισμός, εισόδημα). Το PolicyWallet αυτοματοποιεί και τα τρία: ανεβάζετε τα PDF των συμβολαίων και η AI διαβάζει καλύψεις και εξαιρέσεις και επισημαίνει τα κενά σε απλά ελληνικά — και, στο πλάνο Family, τα διασταυρώνει μεταξύ τους και εντοπίζει τα κενά και τις επικαλύψεις.",
                        en: "A manual check takes three steps: first, read the coverage table and note what is actually included — not what you assume. Second, read the exclusions: that is where most gaps hide. Third, compare insured sums against today's values (reconstruction, contents, income). PolicyWallet automates all three: you upload the policy PDFs and the AI reads coverages and exclusions — and, on the Family plan, cross-checks them and flags gaps and overlaps in plain language.",
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
                    el: "Όχι απαραίτητα. Οι ανάγκες αλλάζουν πιο γρήγορα από τα συμβόλαια. Ένα ουδέτερο εργαλείο ανάλυσης σας δίνει καθαρή εικόνα, ώστε η συζήτηση με τον ασφαλιστή σας να γίνεται με συγκεκριμένα δεδομένα.",
                    en: "Not necessarily. Needs change faster than policies do. A neutral analysis tool gives you a clear picture so the conversation with your agent starts from concrete data.",
                },
            },
            {
                question: {
                    el: "Μπορεί η AI να διαβάσει οποιοδήποτε ασφαλιστήριο;",
                    en: "Can the AI read any insurance policy?",
                },
                answer: {
                    el: "Ναι — εφόσον έχετε το συμβόλαιο σε PDF, η ανάλυση λειτουργεί ανεξάρτητα από ασφαλιστική εταιρεία ή διαμεσολαβητή, για όλες τις βασικές κατηγορίες: αυτοκίνητο, κατοικία, υγεία, ομαδικά, κυβερνοασφάλεια και κατοικίδια.",
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
        dateModified: "2026-07-07",
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
                    el: "Επικαιροποιήστε τα κεφάλαια: κόστος ανακατασκευής κατοικίας, εμπορική αξία οχήματος, αξία περιεχομένου.",
                    en: "Update insured sums: home reconstruction cost, vehicle market value, contents value.",
                },
            },
            {
                name: {
                    el: "Ελέγξτε την απαλλαγή",
                    en: "Review the deductible",
                },
                text: {
                    el: "Ελέγξτε την απαλλαγή: ταιριάζει ακόμη στα οικονομικά σας; Μεγαλύτερη απαλλαγή σημαίνει μικρότερο ασφάλιστρο — και αντίστροφα.",
                    en: "Review the deductible: does it still fit your finances? A higher deductible means a lower premium — and vice versa.",
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
                        el: "Η ανανέωση δεν είναι διοικητική αγγαρεία — είναι η μοναδική στιγμή του χρόνου που μπορείτε να διορθώσετε την κάλυψή σας χωρίς κόστος. Η λίστα ελέγχου:",
                        en: "Renewal is not admin drudgery — it is the one moment each year when you can fix your coverage at no cost. The checklist:",
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
                        el: "3. Ελέγξτε την απαλλαγή: ταιριάζει ακόμη στα οικονομικά σας; Μεγαλύτερη απαλλαγή σημαίνει μικρότερο ασφάλιστρο — και αντίστροφα.",
                        en: "3. Review the deductible: does it still fit your finances? A higher deductible means a lower premium — and vice versa.",
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
                        el: "Τριάντα ημέρες πριν από τη λήξη. Έτσι προλαβαίνετε να ζητήσετε προσφορές, να διαπραγματευτείτε και να μην βρεθείτε προ τετελεσμένου με αυτόματη ανανέωση σε χειρότερους όρους. Το PolicyWallet κρατά τις ημερομηνίες λήξης των συμβολαίων σας σε ένα σημείο και — από το πλάνο Starter — σας ειδοποιεί εγκαίρως, με έτοιμη τη σύνοψη καλύψεων για να συγκρίνετε προσφορές σε ίση βάση.",
                        // The Greek says «από το πλάνο Starter»; the English had
                        // dropped it, so it promised renewal alerts on a page
                        // whose CTA is "Start free with one policy". Free has
                        // notifications off — reminders begin at Starter.
                        en: "Thirty days before expiry. That leaves time to request quotes, negotiate, and avoid being locked into an automatic renewal on worse terms. PolicyWallet tracks the expiry dates of all your policies and — from the Starter plan — alerts you in time, with a ready coverage summary so you can compare quotes on equal footing.",
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
                    el: "Ναι — η ανανέωση είναι νομικά νέα σύμβαση. Ασφάλιστρο, απαλλαγές και εξαιρέσεις μπορούν να αλλάξουν, γι' αυτό η σύγκριση του νέου συμβολαίου με το παλιό είναι απαραίτητη κάθε χρόνο.",
                    en: "Yes — a renewal is legally a new contract. Premium, deductibles, and exclusions can all change, which is why comparing the new policy against the old one is essential every year.",
                },
            },
            {
                question: {
                    el: "Τι γίνεται αν αφήσω το συμβόλαιο να λήξει για λίγες μέρες;",
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
                    el: "Ναι — η λήξη είναι η φυσική στιγμή αλλαγής χωρίς κόστος. Προσοχή σε όρους αυτόματης ανανέωσης: αν το συμβόλαιο ανανεώνεται σιωπηρά, στείλτε έγκαιρα έγγραφη ειδοποίηση μη ανανέωσης με βάση την προθεσμία των όρων.",
                    en: "Yes — expiry is the natural moment to switch at no cost. Watch auto-renewal clauses: if the policy renews tacitly, send timely written non-renewal notice per the deadline in the terms.",
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
            el: "Η υποχρεωτική ασφάλεια αυτοκινήτου καλύπτει μόνο τις ζημιές που προκαλείτε σε τρίτους — όχι το δικό σας όχημα. Η βασική προσθέτει συνήθως θραύση κρυστάλλων και οδική βοήθεια, ενώ η μικτή καλύπτει και τις ίδιες ζημιές με απαλλαγή. Κρίσιμες εξαιρέσεις: οδήγηση υπό μέθη, χωρίς δίπλωμα ή από μη δηλωμένο οδηγό.",
            en: "Mandatory car insurance covers only the damage you cause to others — not your own vehicle. Basic packages typically add glass breakage and roadside assistance, while comprehensive (mikti) also covers own damage subject to a deductible. Critical exclusions: driving under the influence, without a license, or by an undeclared driver.",
        },
        datePublished: "2026-07-13",
        dateModified: "2026-07-13",
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
                        el: "Τα περισσότερα «βασικά» πακέτα της αγοράς συνδυάζουν την αστική ευθύνη με καλύψεις όπως θραύση κρυστάλλων, οδική βοήθεια ή φροντίδα ατυχήματος και νομική προστασία. Ενδιάμεσα πακέτα προσθέτουν πυρκαγιά, ολική κλοπή και φυσικά φαινόμενα.",
                        en: "Most “basic” packages on the market combine liability with covers such as glass breakage, roadside assistance or accident care, and legal protection. Mid-tier packages add fire, total theft, and natural phenomena.",
                    },
                    {
                        el: "Η μικτή (πλήρης) ασφάλεια καλύπτει επιπλέον τις ίδιες ζημιές: επισκευή του δικού σας οχήματος ακόμη και αν ευθύνεστε εσείς. Σχεδόν πάντα προβλέπει απαλλαγή — ένα ποσό, συνήθως από 300 έως 1.000 ευρώ ανά ζημιά, που επιβαρύνει εσάς πριν πληρώσει η εταιρεία.",
                        en: "Comprehensive (mikti) insurance additionally covers own damage: repairing your own vehicle even when you are at fault. It almost always carries a deductible — an amount, typically €300 to €1,000 per claim, that you bear before the insurer pays.",
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
                        el: "Μικτή: + ίδιες ζημιές με απαλλαγή — έχει νόημα κυρίως για νεότερα ή χρηματοδοτούμενα οχήματα.",
                        en: "Comprehensive: + own damage with a deductible — mainly worthwhile for newer or financed vehicles.",
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
                        el: "Οι εξαιρέσεις είναι το σημείο όπου οι περισσότεροι οδηγοί εκπλήσσονται τη στιγμή της ζημιάς. Οι πιο συνηθισμένες: οδήγηση υπό την επήρεια αλκοόλ ή ουσιών, οδηγός χωρίς ισχύουσα άδεια ή εκτός των δηλωμένων οδηγών, συμμετοχή σε αγώνες, χρήση του οχήματος για σκοπό διαφορετικό από τον δηλωμένο (π.χ. επαγγελματική διανομή με συμβόλαιο ιδιωτικής χρήσης) και φυσιολογική φθορά ή μηχανικές βλάβες.",
                        en: "Exclusions are where most drivers get surprised at claim time. The most common: driving under the influence of alcohol or drugs, a driver without a valid license or outside the declared drivers, participation in racing, using the vehicle for a purpose other than declared (e.g. commercial delivery on a private-use policy), and normal wear or mechanical failure.",
                    },
                    {
                        el: "Στην αστική ευθύνη, η εταιρεία μπορεί να αποζημιώσει τον τρίτο και στη συνέχεια να στραφεί αναγωγικά εναντίον σας αν συνέτρεχε λόγος εξαίρεσης — π.χ. μέθη. Διαβάστε τους γενικούς και ειδικούς όρους: εκεί ορίζεται τι ακριβώς εξαιρείται στο δικό σας συμβόλαιο.",
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
                        el: "Ο πρακτικός κανόνας συγκρίνει την εμπορική αξία του οχήματος με τη διαφορά ασφαλίστρου. Για ένα όχημα αξίας 3.000 ευρώ, η μικτή σπάνια συμφέρει: με απαλλαγή 500 ευρώ, η πραγματική προστασία είναι μικρή σε σχέση με το επιπλέον κόστος. Για νεότερα οχήματα ή οχήματα με δάνειο/leasing, η μικτή είναι συχνά απαραίτητη — και μπορεί να απαιτείται από τον χρηματοδότη.",
                        en: "The practical rule compares the vehicle's market value with the premium difference. For a €3,000 car, comprehensive rarely pays off: with a €500 deductible, the real protection is small relative to the extra cost. For newer or financed/leased vehicles, comprehensive is often essential — and may be required by the lender.",
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
                    el: "Ναι — κάθε όχημα με άδεια κυκλοφορίας πρέπει να είναι ασφαλισμένο για αστική ευθύνη, ακόμη και αν δεν κυκλοφορεί, εκτός αν έχει κατατεθεί η άδεια και οι πινακίδες (ακινησία).",
                    en: "Yes — every registered vehicle must carry liability insurance, even if it is not being driven, unless its plates and registration have been deposited (declared immobility).",
                },
            },
            {
                question: {
                    el: "Τι είναι η απαλλαγή στη μικτή ασφάλεια;",
                    en: "What is the deductible in comprehensive insurance?",
                },
                answer: {
                    el: "Το ποσό κάθε ζημιάς που επιβαρύνει εσάς. Αν η απαλλαγή είναι 500 ευρώ και η ζημιά 2.000, η εταιρεία πληρώνει 1.500. Μεγαλύτερη απαλλαγή σημαίνει χαμηλότερο ασφάλιστρο.",
                    en: "The part of each claim you bear yourself. With a €500 deductible and €2,000 of damage, the insurer pays €1,500. A higher deductible means a lower premium.",
                },
            },
            {
                question: {
                    el: "Καλύπτομαι αν οδηγήσει το αυτοκίνητό μου άλλος;",
                    en: "Am I covered if someone else drives my car?",
                },
                answer: {
                    el: "Εξαρτάται από τους όρους: κάποια συμβόλαια καλύπτουν οποιονδήποτε νόμιμο οδηγό, άλλα μόνο δηλωμένους. Οδηγοί κάτω των 23-25 ετών ή με νέο δίπλωμα συχνά απαιτούν επασφάλιστρο ή δήλωση.",
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
        sources: [
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
            el: "Η απαλλαγή είναι το ποσό των εξόδων νοσηλείας που πληρώνετε εσείς πριν ενεργοποιηθεί το συμβόλαιο υγείας. Ορίζεται ετησίως ή ανά περιστατικό — συνήθως από 300 έως 5.000 ευρώ — και όσο υψηλότερη είναι, τόσο χαμηλότερο το ασφάλιστρο. Συχνά μπορεί να καλυφθεί από τον ΕΟΠΥΥ ή από ομαδικό συμβόλαιο εργασίας, ώστε ίσως να μην πληρώσετε τίποτα.",
            en: "A deductible is the portion of hospital costs you pay before your health policy kicks in. It is defined annually or per incident — typically €300 to €5,000 — and the higher it is, the lower your premium. It can often be absorbed by the public fund (EOPYY) or an employer group policy, so you may end up paying nothing.",
        },
        datePublished: "2026-07-13",
        dateModified: "2026-07-13",
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
                        el: "Στην ασφάλεια υγείας, απαλλαγή (ή «εκπιπτόμενο ποσό») είναι το τμήμα των αναγνωρισμένων εξόδων που αναλαμβάνετε εσείς. Αν το συμβόλαιό σας έχει απαλλαγή 1.500 ευρώ και η νοσηλεία κοστίσει 6.000, η εταιρεία καλύπτει τα 4.500 — εφόσον τα έξοδα είναι εντός των όρων και των ανώτατων ορίων.",
                        en: "In health insurance, the deductible is the portion of recognized expenses you bear yourself. If your policy has a €1,500 deductible and a hospitalization costs €6,000, the insurer covers €4,500 — provided the expenses fall within the terms and the policy limits.",
                    },
                    {
                        el: "Η απαλλαγή δεν είναι «κρυφή χρέωση» — είναι εργαλείο τιμολόγησης. Προγράμματα με μηδενική απαλλαγή υπάρχουν, αλλά κοστίζουν αισθητά περισσότερο, ιδίως μετά τα 40-45 έτη.",
                        en: "A deductible is not a “hidden fee” — it is a pricing tool. Zero-deductible plans exist, but cost noticeably more, especially past age 40-45.",
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
                        el: "Η ετήσια απαλλαγή εφαρμόζεται μία φορά ανά ασφαλιστικό έτος: αν την «εξαντλήσετε» σε μία νοσηλεία, οι επόμενες μέσα στο ίδιο έτος καλύπτονται χωρίς νέα επιβάρυνση. Η απαλλαγή ανά περιστατικό εφαρμόζεται σε κάθε νοσηλεία ξεχωριστά — δύο νοσηλείες σημαίνουν δύο φορές το ποσό.",
                        en: "An annual deductible applies once per policy year: exhaust it on one hospitalization and subsequent ones within the same year are covered with no further charge. A per-incident deductible applies to each hospitalization separately — two stays mean paying it twice.",
                    },
                    {
                        el: "Στους όρους θα δείτε επίσης «κλιμακωτές» εκδοχές: π.χ. η απαλλαγή μειώνεται ή μηδενίζεται όταν χρησιμοποιηθεί δημόσιος φορέας ή άλλο συμβόλαιο. Αυτή η λεπτομέρεια αλλάζει δραστικά το πραγματικό κόστος.",
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
                        el: "Τα περισσότερα σύγχρονα προγράμματα προβλέπουν ότι, αν μέρος των εξόδων καλυφθεί από τον ΕΟΠΥΥ ή από ομαδικό συμβόλαιο εργοδότη, το ποσό αυτό «μετρά» έναντι της απαλλαγής. Έτσι, ένα ομαδικό που καλύπτει π.χ. 1.500 ευρώ μπορεί να μηδενίσει πλήρως τη δική σας επιβάρυνση σε ατομικό πρόγραμμα με ίση απαλλαγή.",
                        en: "Most modern plans provide that when part of the costs is covered by EOPYY or an employer group policy, that amount counts toward the deductible. A group policy covering, say, €1,500 can fully offset your out-of-pocket share on an individual plan with an equal deductible.",
                    },
                    {
                        el: "Αυτός ο συνδυασμός — ομαδικό ως πρώτο επίπεδο, ατομικό με απαλλαγή ως δεύτερο — είναι συχνά η πιο οικονομική στρατηγική για εργαζομένους. Προσοχή όμως: το ομαδικό λήγει με την αποχώρηση από την εταιρεία.",
                        en: "This combination — group policy as the first layer, an individual deductible plan as the second — is often the most economical strategy for employees. Beware though: group cover ends when you leave the company.",
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
                        el: "Η ακριβής σχέση διαφέρει ανά εταιρεία και ηλικία, αλλά η τάξη μεγέθους είναι σημαντική: η μετάβαση από μηδενική απαλλαγή σε 1.500 ευρώ συχνά μειώνει το ασφάλιστρο κατά 30-50%. Ζητήστε από τον ασφαλιστή σας προσφορές για 2-3 επίπεδα απαλλαγής πριν αποφασίσετε — η σύγκριση αποκαλύπτει πού βρίσκεται το δικό σας σημείο ισορροπίας.",
                        en: "The exact relationship varies by insurer and age, but the magnitude matters: moving from zero deductible to €1,500 often cuts the premium by 30-50%. Ask your agent to quote 2-3 deductible levels before deciding — the comparison reveals where your own balance point lies.",
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
            el: "Από τι εξαρτάται το κόστος της ασφάλισης σεισμού: κεφάλαιο, έτος κατασκευής, απαλλαγή. Ενδεικτικά κόστη και η σχέση με την έκπτωση ΕΝΦΙΑ για την κατοικία σας.",
            en: "What drives the cost of earthquake insurance in Greece: insured sum, construction year, deductible — plus indicative rates and the ENFIA tax discount.",
        },
        summary: {
            el: "Η κάλυψη σεισμού τιμολογείται ως ποσοστό επί του ασφαλιζόμενου κεφαλαίου — ενδεικτικά λίγα ευρώ ανά 1.000 ευρώ κεφαλαίου ετησίως, ανάλογα με το έτος κατασκευής και την περιοχή. Για κατοικία με κεφάλαιο 150.000 ευρώ, το επιπλέον κόστος κινείται συνήθως σε μερικές δεκάδες έως λίγες εκατοντάδες ευρώ τον χρόνο, με απαλλαγή περίπου 2% του κεφαλαίου. Η τριπλή κάλυψη σεισμού-πυρκαγιάς-πλημμύρας ξεκλειδώνει και την έκπτωση ΕΝΦΙΑ.",
            en: "Earthquake cover is priced as a rate on the insured sum — indicatively a few euros per €1,000 of capital per year, depending on construction year and location. For a home insured for €150,000, the extra cost typically runs from tens to a few hundred euros annually, with a deductible around 2% of the sum insured. Combined earthquake-fire-flood cover also unlocks the ENFIA tax discount.",
        },
        datePublished: "2026-07-13",
        dateModified: "2026-07-27",
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
                        el: "Τρεις παράγοντες καθορίζουν το ασφάλιστρο: το ασφαλιζόμενο κεφάλαιο (κόστος ανακατασκευής, όχι εμπορική αξία), το έτος κατασκευής σε σχέση με τους αντισεισμικούς κανονισμούς και η σεισμικότητα της περιοχής. Κτίρια χτισμένα μετά τον κανονισμό του 1985 — και ακόμη περισσότερο μετά τον ΕΑΚ 2000 — τιμολογούνται ευνοϊκότερα.",
                        en: "Three factors set the premium: the insured sum (reconstruction cost, not market value), the construction year relative to Greek seismic codes, and the seismicity of the area. Buildings erected after the 1985 code — and even more so after the 2000 EAK code — are priced more favorably.",
                    },
                    {
                        el: "Η τιμολόγηση εκφράζεται συνήθως σε τοις χιλίοις (‰) επί του κεφαλαίου. Οι δείκτες της αγοράς κινούνται ενδεικτικά κάτω από το ένα έως λίγα τοις χιλίοις ετησίως — για ακριβή εικόνα ζητήστε προσφορές, καθώς οι συντελεστές αναθεωρούνται.",
                        en: "Pricing is usually expressed per mille (‰) of the insured sum. Market rates run indicatively from below one to a few per mille annually — get quotes for an exact picture, as coefficients are revised over time.",
                    },
                    {
                        el: "Επειδή ο συντελεστής εφαρμόζεται πάνω στο κεφάλαιο, η αριθμητική είναι απλή. Ο πίνακας δείχνει τι σημαίνουν στην πράξη τρεις τυπικοί συντελεστές για τρία συνηθισμένα κεφάλαια, μαζί με την απαλλαγή που αντιστοιχεί στο καθένα.",
                        en: "Because the rate is applied to the insured sum, the arithmetic is simple. The table shows what three typical rates mean in practice for three common insured sums, alongside the deductible each one implies.",
                    },
                ],
                table: {
                    caption: {
                        el: "Ενδεικτικό ετήσιο κόστος κάλυψης σεισμού ανά κεφάλαιο και συντελεστή.",
                        en: "Indicative annual cost of earthquake cover by insured sum and rate.",
                    },
                    columns: [
                        { el: "Ασφαλιζόμενο κεφάλαιο", en: "Insured sum" },
                        { el: "Στο 0,5‰", en: "At 0.5‰" },
                        { el: "Στο 1‰", en: "At 1‰" },
                        { el: "Στο 3‰", en: "At 3‰" },
                        { el: "Απαλλαγή 2%", en: "2% deductible" },
                    ],
                    rows: [
                        {
                            cells: [
                                { el: "100.000 €", en: "€100,000" },
                                { el: "50 € / έτος", en: "€50 / year" },
                                { el: "100 € / έτος", en: "€100 / year" },
                                { el: "300 € / έτος", en: "€300 / year" },
                                { el: "2.000 €", en: "€2,000" },
                            ],
                        },
                        {
                            cells: [
                                { el: "150.000 €", en: "€150,000" },
                                { el: "75 € / έτος", en: "€75 / year" },
                                { el: "150 € / έτος", en: "€150 / year" },
                                { el: "450 € / έτος", en: "€450 / year" },
                                { el: "3.000 €", en: "€3,000" },
                            ],
                        },
                        {
                            cells: [
                                { el: "250.000 €", en: "€250,000" },
                                { el: "125 € / έτος", en: "€125 / year" },
                                { el: "250 € / έτος", en: "€250 / year" },
                                { el: "750 € / έτος", en: "€750 / year" },
                                { el: "5.000 €", en: "€5,000" },
                            ],
                        },
                    ],
                    note: {
                        el: "Τα ποσά είναι απλή αριθμητική επί του συντελεστή, όχι προσφορές. Ο πραγματικός συντελεστής εξαρτάται από το έτος κατασκευής, την περιοχή και την εταιρεία.",
                        en: "The figures are plain arithmetic on the rate, not quotes. The rate you are actually offered depends on construction year, location and insurer.",
                    },
                },
            },
            {
                heading: {
                    el: "Τι σημαίνει η απαλλαγή 2% στον σεισμό;",
                    en: "What does the 2% earthquake deductible mean?",
                },
                paragraphs: [
                    {
                        el: "Στην κάλυψη σεισμού η απαλλαγή ορίζεται σχεδόν πάντα ως ποσοστό του ασφαλιζόμενου κεφαλαίου — τυπικά 2% — και όχι ως σταθερό ποσό. Σε κατοικία ασφαλισμένη για 150.000 ευρώ, αυτό σημαίνει ότι τα πρώτα 3.000 ευρώ κάθε σεισμικής ζημιάς σας επιβαρύνουν. Ορισμένα προγράμματα προσφέρουν χαμηλότερη απαλλαγή με αντίστοιχα υψηλότερο ασφάλιστρο.",
                        en: "In earthquake cover the deductible is almost always defined as a percentage of the insured sum — typically 2% — rather than a fixed amount. On a home insured for €150,000, the first €3,000 of any earthquake damage is yours. Some plans offer a lower deductible for a correspondingly higher premium.",
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
                        el: "Η κάλυψη σεισμού είναι ο ένας από τους τρεις κινδύνους — μαζί με πυρκαγιά και πλημμύρα — που απαιτούνται για την έκπτωση στον ΕΝΦΙΑ. Για πολλές κατοικίες, το φορολογικό όφελος καλύπτει σημαντικό μέρος του κόστους της κάλυψης, αλλάζοντας ουσιαστικά τη σχέση κόστους-οφέλους. Δείτε τον αναλυτικό οδηγό μας για τις προϋποθέσεις και τη διαδικασία δήλωσης.",
                        en: "Earthquake is one of the three risks — together with fire and flood — required for the ENFIA property-tax discount. For many homes the tax benefit offsets a meaningful share of the cover's cost, materially changing the cost-benefit math. See our detailed guide for the conditions and the declaration process.",
                    },
                ],
            },
            {
                heading: {
                    el: "Το λάθος που ακυρώνει την προστασία: υπασφάλιση",
                    en: "The mistake that voids protection: underinsurance",
                },
                paragraphs: [
                    {
                        el: "Αν δηλώσετε κεφάλαιο χαμηλότερο από το πραγματικό κόστος ανακατασκευής για να μειώσετε το ασφάλιστρο, σε ζημιά θα αποζημιωθείτε με τον «αναλογικό κανόνα» (pro-rata): κατοικία που κοστίζει 200.000 € να ξαναχτιστεί, ασφαλισμένη για 100.000 €, εισπράττει το 50% κάθε ζημιάς — και μετά την απαλλαγή. Ενημερώνετε το κεφάλαιο σε κάθε ανανέωση, ειδικά όταν το κατασκευαστικό κόστος αυξάνεται.",
                        en: "If you declare a sum lower than the true reconstruction cost to cut the premium, claims are paid proportionally (the average rule, pro-rata): a home costing €200,000 to rebuild but insured for €100,000 collects 50% of any damage — after the deductible. Update the sum at every renewal, especially when construction costs rise.",
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
                    el: "Τα σύγχρονα κτίρια αντέχουν καλύτερα, αλλά «αντισεισμικό» δεν σημαίνει άτρωτο — σημαίνει σχεδιασμένο να μην καταρρεύσει. Ζημιές επισκευάσιμες αλλά δαπανηρές παραμένουν πιθανές, και το ασφάλιστρο για νέα κτίρια είναι αντίστοιχα χαμηλότερο.",
                    en: "Modern buildings fare better, but “seismic-code” does not mean invulnerable — it means designed not to collapse. Repairable yet costly damage remains possible, and premiums for new buildings are correspondingly lower.",
                },
            },
            {
                question: {
                    el: "Καλύπτεται το περιεχόμενο από τον σεισμό;",
                    en: "Are contents covered against earthquake?",
                },
                answer: {
                    el: "Μόνο αν έχει ασφαλιστεί ρητά και το περιεχόμενο με κάλυψη σεισμού — η κάλυψη κτιρίου δεν το περιλαμβάνει αυτόματα. Ελέγξτε τον πίνακα καλύψεων του συμβολαίου σας.",
                    en: "Only if contents are explicitly insured with earthquake cover — building cover does not include them automatically. Check your policy's coverage schedule.",
                },
            },
            {
                question: {
                    el: "Ισχύει η κάλυψη αμέσως μετά την αγορά;",
                    en: "Does the cover apply immediately after purchase?",
                },
                answer: {
                    el: "Κατά κανόνα ναι, από την έναρξη του συμβολαίου — αλλά ορισμένα προγράμματα προβλέπουν σύντομη περίοδο αναμονής για τον κίνδυνο σεισμού. Επιβεβαιώστε το στους όρους πριν βασιστείτε στην κάλυψη.",
                    en: "Generally yes, from the policy start date — but some plans apply a short waiting period to the earthquake peril. Confirm it in the terms before relying on the cover.",
                },
            },
            {
                question: {
                    el: "Πόσο κοστίζει η ασφάλιση σεισμού για διαμέρισμα 100 τ.μ.;",
                    en: "How much is earthquake insurance for a 100 m² apartment?",
                },
                answer: {
                    el: "Το κρίσιμο μέγεθος δεν είναι τα τετραγωνικά αλλά το κόστος ανακατασκευής. Ένα διαμέρισμα που ξαναχτίζεται με 100.000 έως 150.000 ευρώ κινείται, με τους ενδεικτικούς συντελεστές του πίνακα, από μερικές δεκάδες έως λίγες εκατοντάδες ευρώ τον χρόνο για την κάλυψη σεισμού.",
                    en: "The number that matters is the rebuild cost, not the floor area. A flat that would cost €100,000 to €150,000 to rebuild lands, at the indicative rates in the table, anywhere from tens to a few hundred euros a year for earthquake cover.",
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
            el: "Η ασφάλεια κατοικιδίου δεν καλύπτει σχεδόν ποτέ προϋπάρχουσες παθήσεις, ενώ οι περισσότερες καλύψεις ενεργοποιούνται μετά από περίοδο αναμονής ημερών έως μηνών. Συχνές είναι επίσης οι εξαιρέσεις ή επιβαρύνσεις για συγκεκριμένες φυλές, τα όρια ηλικίας εισόδου και η μη κάλυψη πρόληψης — εμβόλια και αποπαρασίτωση μένουν συνήθως εκτός βασικού προγράμματος.",
            en: "Pet insurance almost never covers pre-existing conditions, and most benefits activate only after waiting periods of days to months. Breed-specific exclusions or surcharges, entry age limits, and no preventive care are also common — vaccinations and antiparasitics usually sit outside the basic plan.",
        },
        datePublished: "2026-07-13",
        dateModified: "2026-07-13",
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
                        el: "Προϋπάρχουσα θεωρείται κάθε πάθηση που εκδηλώθηκε — ή έδωσε συμπτώματα — πριν από την έναρξη του συμβολαίου ή μέσα στην περίοδο αναμονής. Οι εταιρείες την εξαιρούν για να μην ασφαλίζεται ζημιά που έχει ήδη συμβεί. Στην πράξη αυτό σημαίνει ότι όσο νωρίτερα ασφαλίσετε το ζώο, τόσο περισσότερα καλύπτονται στη διάρκεια της ζωής του.",
                        en: "Pre-existing means any condition that appeared — or showed symptoms — before the policy started or within the waiting period. Insurers exclude it so that already-occurred loss cannot be insured. In practice this means the earlier you insure the animal, the more of its lifetime is coverable.",
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
                        el: "Μετά την έναρξη του συμβολαίου, κάθε ομάδα καλύψεων ενεργοποιείται με διαφορετική καθυστέρηση: τα ατυχήματα συνήθως άμεσα ή μέσα σε λίγες ημέρες, οι ασθένειες σε 14-30 ημέρες, ενώ χειρουργεία συγκεκριμένων κατηγοριών (π.χ. ορθοπεδικά) μπορεί να απαιτούν αρκετούς μήνες. Ό,τι εκδηλωθεί μέσα στην αναμονή αντιμετωπίζεται ως προϋπάρχον.",
                        en: "After the policy starts, each benefit group activates with a different delay: accidents usually immediately or within days, illnesses in 14-30 days, while certain surgery categories (e.g. orthopedic) may require several months. Anything arising during the wait is treated as pre-existing.",
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
                        el: "Οι όροι πολλών προγραμμάτων εξαιρούν ή επιβαρύνουν φυλές με αυξημένο στατιστικό κίνδυνο — συχνά βραχυκέφαλες φυλές (μπουλντόγκ, παγκ) λόγω αναπνευστικών προβλημάτων, ή φυλές που κατατάσσονται ως «υψηλού κινδύνου» για αστική ευθύνη. Υπάρχουν επίσης όρια ηλικίας εισόδου (συνήθως έως 6-8 ετών) και, σε ορισμένα προγράμματα, μειούμενες παροχές σε μεγάλες ηλικίες.",
                        en: "Many plans' terms exclude or surcharge breeds with elevated statistical risk — often brachycephalic breeds (bulldogs, pugs) due to respiratory issues, or breeds classified as high-risk for liability. Entry age limits also apply (typically up to 6-8 years), and some plans reduce benefits at older ages.",
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
                        el: "Ελέγξτε: αν το συμβόλαιο απαιτεί ηλεκτρονική σήμανση (τσιπ) — που είναι ούτως ή άλλως υποχρεωτική από τον νόμο.",
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
                    el: "Πολλά προγράμματα κατοικιδίων περιλαμβάνουν ή προσφέρουν προαιρετικά αστική ευθύνη για ζημιές σε τρίτους. Αν έχετε ασφάλεια κατοικίας, ελέγξτε πρώτα μήπως ήδη σας καλύπτει — οι επικαλύψεις κοστίζουν.",
                    en: "Many pet plans include or optionally offer third-party liability. If you have home insurance, first check whether it already covers this — overlaps cost money.",
                },
            },
            {
                question: {
                    el: "Αξίζει η ασφάλεια για γάτα εσωτερικού χώρου;",
                    en: "Is insurance worth it for an indoor cat?",
                },
                answer: {
                    el: "Ο κίνδυνος ατυχήματος είναι μικρότερος, αλλά οι σοβαρές ασθένειες — νεφρική ανεπάρκεια, διαβήτης, καρκίνος — δεν εξαρτώνται από τον τρόπο ζωής. Συγκρίνετε το ετήσιο ασφάλιστρο με το κόστος μιας μεγάλης κτηνιατρικής θεραπείας.",
                    en: "Accident risk is lower, but serious illnesses — kidney failure, diabetes, cancer — do not depend on lifestyle. Compare the annual premium against the cost of one major veterinary treatment.",
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
        sources: [
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
            el: "Ομαδικό συμβόλαιο εργασίας: τι παρέχει και τι να συμπληρώσετε ατομικά;",
            en: "Employer group policies: what they provide and what to add individually",
        },
        metaTitle: {
            el: "Ομαδικό συμβόλαιο: τι καλύπτει, τι λείπει",
            en: "Employer group insurance: what is missing",
        },
        metaDescription: {
            el: "Τι καλύπτει συνήθως το ομαδικό συμβόλαιο εργασίας, πού σταματά — λήξη με την αποχώρηση, χαμηλά όρια — και ποιες καλύψεις αξίζει να συμπληρώσετε ατομικά.",
            en: "What an employer group policy usually covers, where it stops — it ends when you leave, sums are often low — and which covers are worth adding individually.",
        },
        summary: {
            el: "Το ομαδικό συμβόλαιο εργασίας προσφέρει συνήθως νοσοκομειακή και εξωνοσοκομειακή κάλυψη, ασφάλεια ζωής και μόνιμης ανικανότητας — χωρίς έλεγχο ασφαλισιμότητας και με κόστος που επιβαρύνει κυρίως τον εργοδότη. Τα όριά του: παύει με την αποχώρηση, τα κεφάλαια είναι συχνά χαμηλά και δεν το προσαρμόζετε εσείς. Γι' αυτό λειτουργεί καλύτερα ως βάση που συμπληρώνεται ατομικά.",
            en: "An employer group policy typically provides in-hospital and outpatient cover, life insurance, and permanent disability benefits — with no medical underwriting and costs borne mostly by the employer. Its limits: it ends when you leave, sums are often low, and you cannot customize it. That is why it works best as a base layer topped up individually.",
        },
        datePublished: "2026-07-13",
        dateModified: "2026-07-13",
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
                        el: "Το τυπικό ομαδικό πρόγραμμα ελληνικής επιχείρησης περιλαμβάνει: νοσοκομειακή περίθαλψη (με όριο ανά έτος ή περιστατικό), εξωνοσοκομειακές παροχές με πλαφόν, ασφάλεια ζωής ως πολλαπλάσιο του μισθού και κάλυψη μόνιμης ολικής ή μερικής ανικανότητας. Μεγαλύτερα προγράμματα προσθέτουν επίδομα μητρότητας, οδοντιατρικά ή check-up.",
                        en: "A typical Greek company plan includes: hospital care (with an annual or per-incident limit), capped outpatient benefits, life insurance as a salary multiple, and permanent total or partial disability cover. Larger schemes add maternity allowances, dental, or check-ups.",
                    },
                    {
                        el: "Το μεγάλο πλεονέκτημα: εντάσσεστε χωρίς ερωτηματολόγιο υγείας. Παθήσεις που θα εξαιρούνταν σε ατομικό συμβόλαιο καλύπτονται στο ομαδικό — όσο παραμένετε στην εταιρεία.",
                        en: "The big advantage: you join without medical underwriting. Conditions that an individual policy would exclude are covered under the group scheme — for as long as you stay with the company.",
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
                        el: "Τρία δομικά όρια: πρώτον, η κάλυψη λήγει όταν αποχωρήσετε — παραίτηση, απόλυση ή συνταξιοδότηση σημαίνει απώλεια της προστασίας τη στιγμή ίσως που τη χρειάζεστε περισσότερο, και σε ηλικία που το ατομικό συμβόλαιο κοστίζει ακριβότερα ή απαιτεί νέο έλεγχο υγείας. Δεύτερον, τα κεφάλαια είναι συχνά χαμηλά σε σχέση με το πραγματικό κόστος μιας σοβαρής νοσηλείας σε ιδιωτικό θεραπευτήριο. Τρίτον, τους όρους τους διαπραγματεύεται ο εργοδότης — δεν προσαρμόζονται στις δικές σας ανάγκες.",
                        en: "Three structural limits: first, cover ends when you leave — resignation, dismissal, or retirement means losing protection possibly when you need it most, at an age when an individual policy costs more or requires fresh underwriting. Second, sums are often low relative to the real cost of a serious private-hospital stay. Third, the employer negotiates the terms — they are not tailored to your needs.",
                    },
                    {
                        el: "Ορισμένα ομαδικά προβλέπουν δικαίωμα μετατροπής σε ατομικό κατά την αποχώρηση, χωρίς νέο έλεγχο ασφαλισιμότητας και μέσα σε συγκεκριμένη προθεσμία. Αν υπάρχει, είναι πολύτιμο — μάθετε αν το δικό σας το προσφέρει πριν το χρειαστείτε.",
                        en: "Some group schemes include a conversion right to an individual policy upon leaving, without new underwriting and within a set deadline. Where it exists it is valuable — find out whether yours offers it before you need it.",
                    },
                ],
            },
            {
                heading: {
                    el: "Ποιες καλύψεις αξίζει να συμπληρώσετε ατομικά;",
                    en: "Which covers are worth adding individually?",
                },
                paragraphs: [
                    {
                        el: "Η πιο αποδοτική στρατηγική για εργαζόμενο με ομαδικό: ατομικό νοσοκομειακό πρόγραμμα με υψηλή απαλλαγή. Το ομαδικό απορροφά την απαλλαγή στις μικρομεσαίες νοσηλείες, ενώ το ατομικό εξασφαλίζει υψηλά κεφάλαια, συνέχεια μετά την αποχώρηση και ελεύθερη επιλογή θεραπευτηρίου στις σοβαρές. Αντίστοιχα, η ασφάλεια ζωής του ομαδικού (συνήθως 1-2 ετήσιοι μισθοί) σπάνια αρκεί για οικογένεια με στεγαστικό δάνειο.",
                        en: "The most efficient strategy for an employee with group cover: an individual hospital plan with a high deductible. The group scheme absorbs the deductible on small and mid-size stays, while the individual plan secures high limits, continuity after leaving, and free hospital choice for serious cases. Likewise, group life cover (usually 1-2 annual salaries) is rarely enough for a family with a mortgage.",
                    },
                ],
                bullets: [
                    {
                        el: "Ατομικό νοσοκομειακό με υψηλή απαλλαγή: συνέχεια + υψηλά κεφάλαια με λογικό κόστος.",
                        en: "Individual hospital plan with a high deductible: continuity + high limits at reasonable cost.",
                    },
                    {
                        el: "Ατομική ασφάλεια ζωής: αν έχετε εξαρτώμενα μέλη ή δάνειο, το ομαδικό κεφάλαιο σπάνια αρκεί.",
                        en: "Individual life cover: with dependents or a loan, the group sum is rarely sufficient.",
                    },
                    {
                        el: "Απώλεια εισοδήματος: σχεδόν ποτέ δεν περιλαμβάνεται στα ομαδικά — αφορά ιδίως ελεύθερους συνεργάτες.",
                        en: "Income protection: almost never in group schemes — especially relevant for contractors.",
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
                    el: "Κατά κανόνα όχι — η παροχή είναι συλλογική και δεν ανταλλάσσεται με μισθό. Ακόμη κι αν έχετε ήδη ατομική κάλυψη, το ομαδικό αξίζει ως πρώτο επίπεδο που απορροφά απαλλαγές και μικροέξοδα.",
                    en: "Generally no — the benefit is collective and not exchangeable for salary. Even with existing individual cover, the group scheme is worth keeping as a first layer that absorbs deductibles and small costs.",
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
        dateModified: "2026-08-26",
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
                        el: "Η ακινησία δεν τεκμαίρεται: αν δεν κυκλοφορείτε το όχημα, πρέπει να έχετε καταθέσει πινακίδες ή να έχετε δηλώσει ψηφιακή ακινησία — αλλιώς η υποχρέωση ασφάλισης παραμένει.",
                        en: "Non-use is not presumed: if you do not drive the vehicle, you must have deposited the plates or declared digital immobility — otherwise the insurance obligation stands.",
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
                        el: "Ο ζημιωθείς τρίτος δεν μένει απροστάτευτος: αποζημιώνεται από το Επικουρικό Κεφάλαιο Ασφάλισης Ευθύνης από Ατυχήματα Αυτοκινήτων. Το Κεφάλαιο όμως στη συνέχεια στρέφεται αναγωγικά κατά του ιδιοκτήτη και του οδηγού του ανασφάλιστου, διεκδικώντας το σύνολο των ποσών — αποζημιώσεις που σε σωματικές βλάβες φτάνουν σε εξαψήφια νούμερα. Αυτός είναι ο πραγματικός κίνδυνος του ανασφάλιστου: όχι το παράβολο, αλλά μια οφειλή ζωής.",
                        en: "The injured third party is not left unprotected: the Auxiliary Fund for motor liability compensates them. The Fund then pursues the uninsured vehicle's owner and driver for the full amounts — compensation that in bodily-injury cases reaches six figures. That is the real risk of driving uninsured: not the fee, but a lifelong debt.",
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
                        el: "Αν λάβετε ειδοποίηση: ασφαλίστε το όχημα άμεσα — η κάλυψη ενεργοποιείται από την έκδοση του συμβολαίου — και πληρώστε το παράβολο μέσα στην προθεσμία που αναγράφεται. Αν το όχημα δεν κυκλοφορεί, δηλώστε ακινησία ώστε να μην εμφανίζεται ξανά στις επόμενες διασταυρώσεις. Αν θεωρείτε την ειδοποίηση εσφαλμένη (π.χ. ήσασταν ασφαλισμένοι), η ένσταση υποβάλλεται ηλεκτρονικά, μέσω ειδικής εφαρμογής της Ενιαίας Ψηφιακής Πύλης της Δημόσιας Διοίκησης, εντός δέκα (10) εργάσιμων ημερών από την κοινοποίηση, με αποδεικτικό ασφάλισης για την επίμαχη περίοδο.",
                        en: "If you receive a notice: insure the vehicle immediately — cover activates upon policy issuance — and pay the fee within the stated deadline. If the vehicle is off the road, declare immobility so it stops appearing in future cross-checks. If you believe the notice is wrong (e.g. you were insured), file an objection electronically through the national digital portal within 10 working days of notification, with proof of insurance for the disputed period.",
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
                    el: "Το όχημα είναι στην αυλή μου και δεν κυκλοφορεί — χρειάζεται ασφάλεια;",
                    en: "My vehicle sits in my yard unused — does it need insurance?",
                },
                answer: {
                    el: "Ναι, εκτός αν έχει δηλωθεί ακινησία με κατάθεση πινακίδων ή ψηφιακά. Όσο η άδεια κυκλοφορίας είναι ενεργή, η υποχρέωση ασφάλισης ισχύει και οι διασταυρώσεις το εντοπίζουν.",
                    en: "Yes, unless immobility has been declared by depositing the plates or digitally. While the registration is active, the insurance obligation applies and cross-checks will flag it.",
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
        sources: [
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
            el: "Portal ασφαλιστικής, εφαρμογή πράκτορα ή ψηφιακό πορτοφόλι; Σύγκριση ανά κατηγορία: έγγραφα, ανάλυση καλύψεων, ανανεώσεις, πληρωμές, αποζημιώσεις.",
            en: "Insurer portal, agent app or a policy wallet? A category-by-category comparison: documents, coverage analysis, renewals, premium payments and claims.",
        },
        summary: {
            el: "Τα εργαλεία που υπόσχονται «όλα τα ασφαλιστήρια σε ένα σημείο» χωρίζονται σε πέντε κατηγορίες: portal ασφαλιστικής εταιρείας, εφαρμογή πράκτορα, συγκριτική πλατφόρμα, γενική αποθήκευση αρχείων και ψηφιακό πορτοφόλι ασφαλίσεων. Μόνο η τελευταία δέχεται συμβόλαια από όλες τις εταιρείες μαζί και διαβάζει το περιεχόμενό τους. Καμία τους όμως δεν εισπράττει ασφάλιστρα και δεν δίνει επίσημη κατάσταση αποζημίωσης.",
            en: "Tools that promise “all your policies in one place” fall into five categories: an insurer's own portal, an agent's app, a comparison site, generic file storage, and an insurance policy wallet. Only the last accepts policies from every insurer at once and actually reads what they say. None of them, however, collects premiums or returns official claim status.",
        },
        datePublished: "2026-07-27",
        dateModified: "2026-07-27",
        readingMinutes: 8,
        sections: [
            {
                heading: {
                    el: "Ποιες επιλογές υπάρχουν σήμερα;",
                    en: "What options exist today?",
                },
                paragraphs: [
                    {
                        el: "Το ερώτημα «πού τα βάζω όλα μαζί» έχει πέντε πιθανές απαντήσεις στην ελληνική αγορά, και καμία τους δεν κάνει ακριβώς το ίδιο πράγμα. Η ουσιαστική διαφορά δεν είναι η εμφάνιση αλλά το εύρος: άλλα εργαλεία βλέπουν μόνο τα συμβόλαια μιας εταιρείας, άλλα μόνο όσα πέρασαν από έναν διαμεσολαβητή, και άλλα ό,τι ανεβάσετε εσείς.",
                        en: "The question “where do I keep everything together” has five possible answers in the Greek market, and no two of them do quite the same job. The real difference is not the interface but the scope: some tools see only one insurer's policies, some only what was written through one intermediary, and some whatever you upload yourself.",
                    },
                ],
                bullets: [
                    {
                        el: "Το portal ή η εφαρμογή της ασφαλιστικής σας εταιρείας: πλήρης εικόνα, αλλά μόνο για τα δικά της συμβόλαια. Με τρεις εταιρείες χρειάζεστε τρεις λογαριασμούς.",
                        en: "Your insurer's own portal or app: a complete picture, but only of its own policies. With three insurers you need three logins.",
                    },
                    {
                        el: "Η εφαρμογή του πράκτορα ή του πρακτορείου σας: βλέπει όσα συμβόλαια εκδόθηκαν μέσω αυτού, ανεξάρτητα από εταιρεία. Ό,τι κλείσατε αλλού λείπει.",
                        en: "Your agent's or agency's app: it sees whatever was written through them, across insurers. Anything you bought elsewhere is missing.",
                    },
                    {
                        el: "Οι συγκριτικές πλατφόρμες: φτιαγμένες για τη στιγμή της αγοράς. Μετά την έκδοση του συμβολαίου δεν το διαχειρίζονται.",
                        en: "Comparison sites: built for the moment of purchase. Once the policy is issued they do not manage it.",
                    },
                    {
                        el: "Η γενική αποθήκευση αρχείων, όπως ένα cloud drive ή φωτογραφίες στο κινητό: κρατά τα PDF, δεν καταλαβαίνει το περιεχόμενό τους.",
                        en: "Generic file storage, such as a cloud drive or photos on your phone: it keeps the PDFs but understands nothing inside them.",
                    },
                    {
                        el: "Το ψηφιακό πορτοφόλι ασφαλίσεων: δέχεται συμβόλαια από οποιαδήποτε εταιρεία και διαβάζει τι λένε. Δεν εισπράττει όμως ασφάλιστρα.",
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
                                { el: "Εφαρμογή πράκτορα ή πρακτορείου", en: "Agent or agency app" },
                                { el: "Μόνο του χαρτοφυλακίου του", en: "Only their own book" },
                                true,
                                { el: "Μερικώς", en: "Partly" },
                                true,
                                { el: "Κατά περίπτωση", en: "Case by case" },
                                { el: "Μέσω του πράκτορα", en: "Via the agent" },
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
                    el: "Τι δεν κάνει καμία πλατφόρμα διαχείρισης;",
                    en: "What can no management platform do?",
                },
                paragraphs: [
                    {
                        el: "Δύο πράγματα δεν μεταφέρονται σε καμία εφαρμογή τρίτου. Το πρώτο είναι η είσπραξη του ασφαλίστρου: πληρώνεται στην ασφαλιστική εταιρεία ή στον διαμεσολαβητή, με web banking, πάγια εντολή, κάρτα στο portal της εταιρείας ή στο γραφείο του πράκτορα. Μια πλατφόρμα διαχείρισης δεν είναι ίδρυμα πληρωμών και δεν μπαίνει σε αυτή τη ροή.",
                        en: "Two things never move to a third-party app. The first is collecting the premium: it is paid to the insurer or the intermediary — by web banking, a standing order, a card on the insurer's own portal, or at the agent's office. A management platform is not a payment institution and does not sit in that flow.",
                    },
                    {
                        el: "Το δεύτερο είναι η επίσημη κατάσταση μιας αποζημίωσης. Ο φάκελος ζημιάς ζει στα συστήματα της εταιρείας· χωρίς σύνδεση με αυτά, καμία τρίτη εφαρμογή δεν ξέρει σε ποιο στάδιο βρίσκεται. Αυτό που μπορεί να κάνει είναι να σας δώσει τα δικά σας δεδομένα τη στιγμή που τα χρειάζεστε: προθεσμία δήλωσης, υποχρεώσεις, αριθμό συμβολαίου και το τηλέφωνο του σωστού κλάδου.",
                        en: "The second is official claim status. The claim file lives in the insurer's systems; without a feed from them, no third-party app knows what stage it has reached. What it can do is hand you your own data at the moment you need it: the notification deadline, your obligations, your policy number, and the right claims line for that branch.",
                    },
                    {
                        el: "Το ίδιο ισχύει για τον έλεγχο συμβολαίου με τον αριθμό ασφαλιστηρίου: αυτή η αναζήτηση δουλεύει στο portal της εταιρείας που το εξέδωσε. Ένα πορτοφόλι ασφαλίσεων σάς δείχνει την κατάσταση που προκύπτει από το ίδιο σας το έγγραφο — σε ισχύ, λήγει σύντομα ή έληξε — όχι την εγγραφή της εταιρείας.",
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
                        el: "Το PolicyWallet ανήκει στην τελευταία κατηγορία — και την πηγαίνει ένα βήμα πιο πέρα: είναι πλατφόρμα προσωπικής ανάλυσης ρίσκου, που δεν αποθηκεύει απλώς τα συμβόλαια αλλά σας λέει αν είστε καλυμμένοι. Ανεβάζετε το PDF ή μια φωτογραφία κάθε ασφαλιστηρίου — αυτοκίνητο, κατοικία, υγεία, ομαδικό, ταξίδι, κατοικίδιο — και η AI το διαβάζει και βγάζει σε απλά ελληνικά τι καλύπτεται, τι εξαιρείται, ποια είναι τα όρια, οι απαλλαγές και οι κρίσιμες ημερομηνίες.",
                        en: "PolicyWallet sits in that last category — and takes it one step further: it is a personal risk intelligence platform, which does not just store your policies but tells you whether you are covered. You upload the PDF or a photo of each policy — motor, home, health, group, travel, pet — and the AI reads it and sets out in plain language what is covered, what is excluded, and what the limits, deductibles and key dates are.",
                    },
                    {
                        el: "Επειδή τα βλέπει όλα μαζί, κάνει και κάτι που κανένα portal μεμονωμένης εταιρείας δεν μπορεί: τα διασταυρώνει μεταξύ τους — στο πλάνο Family. Εντοπίζει κενά — για παράδειγμα κατοικία χωρίς κάλυψη σεισμού — υπασφάλιση σε σχέση με το κόστος ανακατασκευής, και επικαλύψεις όπου πληρώνετε δύο φορές για τον ίδιο κίνδυνο. Κάθε εύρημα εμφανίζεται ξεχωριστά μέσα στην εφαρμογή, με το σκεπτικό του και την παραπομπή στο ίδιο σας το έγγραφο — μαζί με το τι δεν σημαίνει.",
                        en: "Because it sees them together, it does something no single insurer's portal can: it cross-checks them against each other, on the Family plan. It flags gaps — a home with no earthquake cover, for instance — underinsurance against rebuild cost, and overlaps where you pay twice for the same risk. Each finding appears on its own inside the app, with its reasoning and a pointer to your own document — along with what it does not mean.",
                    },
                    {
                        el: "Από εκεί και πέρα: υπενθυμίσεις ανανέωσης από τις 90 ημέρες πριν από τη λήξη στα πληρωμένα πλάνα, και — με το πλάνο Family — ερωτήσεις στην AI για ένα συγκεκριμένο συμβόλαιο, ασφαλής κοινοποίηση σε σύμβουλο που ανακαλείται όποτε θέλετε, και εξαγωγή αναφοράς. Το PolicyWallet δεν πουλά ασφάλειες και δεν παίρνει προμήθειες: δεν είναι ασφαλιστική επιχείρηση ούτε διαμεσολαβητής.",
                        en: "Beyond that: renewal reminders from 90 days before expiry on paid plans, and — on the Family plan — AI questions about a specific policy, secure sharing with an advisor that you can revoke at any time, and report export. PolicyWallet does not sell insurance and takes no commission: it is neither an insurance undertaking nor an intermediary.",
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
                        el: "Δεν χρειάζονται όλοι το ίδιο εργαλείο. Ο αριθμός των εταιρειών με τις οποίες συνεργάζεστε, και όχι ο αριθμός των συμβολαίων, είναι αυτός που καθορίζει την απάντηση.",
                        en: "Not everyone needs the same tool. It is the number of insurers you deal with, rather than the number of policies, that decides the answer.",
                    },
                ],
                bullets: [
                    {
                        el: "Ένα συμβόλαιο σε μία εταιρεία: το portal της εταιρείας αρκεί και είναι δωρεάν.",
                        en: "One policy with one insurer: the insurer's own portal is enough, and it is free.",
                    },
                    {
                        el: "Όλα τα συμβόλαια μέσω ενός πράκτορα: η εφαρμογή του πρακτορείου καλύπτει τα περισσότερα — αρκεί να μη διαφεύγει κάτι που κλείσατε αλλού.",
                        en: "Everything through one agent: the agency's app covers most of it — as long as nothing you bought elsewhere slips through.",
                    },
                    {
                        el: "Συμβόλαια σε δύο ή περισσότερες εταιρείες: μόνο ένα εργαλείο ανεξάρτητο από εταιρεία σάς δίνει ενιαία εικόνα.",
                        en: "Policies across two or more insurers: only an insurer-independent tool gives you a single view.",
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
                    el: "Σε ένα ψηφιακό πορτοφόλι ασφαλίσεων ανεξάρτητο από ασφαλιστική εταιρεία. Τα portal των εταιρειών δείχνουν μόνο τα δικά τους συμβόλαια, ενώ ένα πορτοφόλι δέχεται συμβόλαια από όλες τις εταιρείες μαζί και τα διαβάζει.",
                    en: "In an insurer-independent policy wallet. Insurers' portals show only their own contracts, whereas a wallet accepts policies from every insurer at once and reads them.",
                },
            },
            {
                question: {
                    el: "Μπορώ να πληρώνω τα ασφάλιστρά μου από την ίδια εφαρμογή;",
                    en: "Can I pay my premiums from the same app?",
                },
                answer: {
                    el: "Όχι σε μια πλατφόρμα διαχείρισης. Το ασφάλιστρο πληρώνεται στην ασφαλιστική εταιρεία ή στον διαμεσολαβητή — με web banking, πάγια εντολή, κάρτα στο portal της εταιρείας ή στο γραφείο. Η εφαρμογή σάς δείχνει πόσο και πότε, όχι από πού φεύγουν τα χρήματα.",
                    en: "Not in a management platform. The premium is paid to the insurer or the intermediary — by web banking, standing order, a card on the insurer's portal, or at the office. The app shows you how much and when, not where the money leaves from.",
                },
            },
            {
                question: {
                    el: "Μπορώ να ελέγξω κατάσταση συμβολαίου με τον αριθμό ασφαλιστηρίου;",
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
                    el: "Από μηδέν έως λίγα ευρώ τον μήνα. Τα portal των εταιρειών και οι εφαρμογές πρακτορείων είναι δωρεάν για τους πελάτες τους. Το PolicyWallet έχει δωρεάν πακέτο για τρία ασφαλιστήρια και συνδρομές που ξεκινούν από €39 τον χρόνο.",
                    en: "From nothing to a few euros a month. Insurer portals and agency apps are free to their own customers. PolicyWallet has a free plan for three policies and subscriptions starting at €39 a year.",
                },
            },
            {
                question: {
                    el: "Ποια είναι η καλύτερη επιλογή αν έχω πολλά συμβόλαια;",
                    en: "What is the best option if I have several policies?",
                },
                answer: {
                    el: "Ένα εργαλείο που δέχεται συμβόλαια από οποιαδήποτε εταιρεία και τα διαβάζει, όχι απλώς τα αποθηκεύει. Με τρία ή περισσότερα συμβόλαια η αξία δεν είναι στο να τα βρίσκετε, αλλά στο να βλέπετε τι λείπει και τι πληρώνετε δύο φορές.",
                    en: "A tool that accepts policies from any insurer and reads them, rather than merely storing them. With three or more policies the value is not in finding them, but in seeing what is missing and what you are paying for twice.",
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
            el: "Στην ασφάλιση ο όρος «ψηφιακό πορτοφόλι» σημαίνει δύο εντελώς διαφορετικά πράγματα. Το πορτοφόλι πληρωμών κρατά κάρτες και μεταφέρει χρήματα, οπότε μπορεί να εξοφλήσει ένα ασφάλιστρο όπου η εταιρεία δέχεται τη μέθοδο. Το πορτοφόλι ασφαλίσεων κρατά τα συμβόλαια και τις καλύψεις σας: σας δείχνει πόσο πληρώνετε και πότε λήγει η κάλυψη, χωρίς να κινεί χρήματα.",
            en: "In insurance, “digital wallet” means two entirely different things. A payment wallet holds cards and moves money, so it can settle a premium wherever the insurer accepts that method. A policy wallet holds your contracts and your cover: it shows you what you pay and when cover ends, without moving any money at all.",
        },
        datePublished: "2026-07-27",
        dateModified: "2026-07-27",
        readingMinutes: 7,
        sections: [
            {
                heading: {
                    el: "Τι εννοούμε «ψηφιακό πορτοφόλι» στην ασφάλιση;",
                    en: "What does “digital wallet” mean in insurance?",
                },
                paragraphs: [
                    {
                        el: "Η σύγχυση είναι λογική, γιατί η ίδια λέξη περιγράφει δύο εργαλεία με αντίθετη δουλειά. Το ένα κινεί χρήματα και δεν ξέρει τίποτα για την κάλυψή σας. Το άλλο ξέρει τα πάντα για την κάλυψή σας και δεν αγγίζει χρήματα.",
                        en: "The confusion is understandable, because the same word describes two tools with opposite jobs. One moves money and knows nothing about your cover. The other knows everything about your cover and never touches money.",
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
                        el: "Πληρωμή με κάρτα στο portal ή στην εφαρμογή της εταιρείας — εκεί εμφανίζονται και τα πορτοφόλια κινητού, όπου το checkout τα υποστηρίζει.",
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
                        el: "Δεν εισπράττει και δεν προωθεί ασφάλιστρα. Δεν κρατά IBAN, δεν καταχωρεί πάγιες εντολές και δεν είναι ίδρυμα πληρωμών. Το PolicyWallet συγκεκριμένα δεν είναι ασφαλιστική επιχείρηση και δεν ασκεί διανομή ασφαλιστικών προϊόντων: δεν διαμεσολαβεί στη σύναψη ή τη διαχείριση ασφαλιστικών συμβάσεων, όπως ορίζει το πλαίσιο της διανομής (IDD, ν. 4583/2018).",
                        en: "It does not collect or forward premiums. It holds no IBAN, registers no standing orders, and is not a payment institution. PolicyWallet specifically is not an insurance undertaking and does not distribute insurance products: it does not intermediate in the conclusion or management of insurance contracts, as the distribution framework (IDD, Greek Law 4583/2018) defines it.",
                    },
                    {
                        el: "Αυτό είναι σχεδιαστική επιλογή, όχι ελλιπής υλοποίηση. Ένα εργαλείο που δεν πουλά, δεν εισπράττει και δεν παίρνει προμήθεια δεν έχει λόγο να σας δείξει το ένα συμβόλαιο καλύτερα από το άλλο. Η ουδετερότητα είναι ακριβώς αυτό που κάνει την ανάλυση κενών χρήσιμη.",
                        en: "That is a design choice, not a missing feature. A tool that does not sell, does not collect and takes no commission has no reason to show one policy in a better light than another. That neutrality is precisely what makes the gap analysis worth reading.",
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
                        el: "Σχεδόν όλα όσα εννοεί κανείς όταν λέει «θέλω να παρακολουθώ τα ασφάλιστρά μου». Όταν ανεβάσετε ένα ασφαλιστήριο στο PolicyWallet, η AI διαβάζει και το οικονομικό μέρος του εγγράφου, όχι μόνο τις καλύψεις. Γι' αυτό το PolicyWallet δεν είναι απλώς πορτοφόλι ασφαλίσεων αλλά πλατφόρμα προσωπικής ανάλυσης ρίσκου: δεν σας δείχνει μόνο τι πληρώνετε — σας λέει αν είστε καλυμμένοι.",
                        en: "Almost everything people mean when they say “I want to keep track of my premiums”. When you upload a policy to PolicyWallet, the AI reads the financial side of the document too, not just the cover. That is why PolicyWallet is not just a policy wallet but a personal risk intelligence platform: it does not only show you what you pay — it tells you whether you are covered.",
                    },
                ],
                bullets: [
                    {
                        el: "Το ασφάλιστρο και τη συχνότητα πληρωμής όπως αναγράφονται στο συμβόλαιο.",
                        en: "The premium and the payment frequency exactly as the policy states them.",
                    },
                    {
                        el: "Το συνολικό ετήσιο κόστος όλων των συμβολαίων μαζί — συνήθως η πρώτη έκπληξη.",
                        en: "The combined annual cost of every policy together — usually the first surprise.",
                    },
                    {
                        el: "Τις ημερομηνίες λήξης και ανανέωσης, με υπενθυμίσεις από τις 90 ημέρες πριν στα πληρωμένα πλάνα.",
                        en: "Expiry and renewal dates, with reminders from 90 days out on paid plans.",
                    },
                    {
                        el: "Τι άλλαξε ανάμεσα σε δύο εκδόσεις του ίδιου συμβολαίου, ώστε μια αύξηση ασφαλίστρου να συγκρίνεται με το τι πήρατε επιπλέον.",
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
                    el: "Τα πορτοφόλια πληρωμών λειτουργούν ως τρόπος εξόφλησης: παρουσιάζουν την κάρτα σας στο checkout της ασφαλιστικής εταιρείας, όπου αυτό τα υποστηρίζει. Τα πορτοφόλια ασφαλίσεων παίζουν διαφορετικό ρόλο — δείχνουν τι πληρώνετε, πότε και για ποια κάλυψη, χωρίς να συμμετέχουν στη συναλλαγή.",
                    en: "Payment wallets act as a settlement method: they present your card at the insurer's checkout, where it supports them. Policy wallets play a different role — they show what you pay, when, and for which cover, without taking part in the transaction.",
                },
            },
            {
                question: {
                    el: "Μπορώ να πληρώσω το ασφάλιστρό μου μέσα από το PolicyWallet;",
                    en: "Can I pay my premium inside PolicyWallet?",
                },
                answer: {
                    el: "Όχι. Το PolicyWallet δεν εισπράττει ασφάλιστρα και δεν είναι ίδρυμα πληρωμών. Η πληρωμή γίνεται στην ασφαλιστική εταιρεία ή στον διαμεσολαβητή σας· η εφαρμογή σάς θυμίζει πόσο και πότε — από το πλάνο Starter.",
                    en: "No. PolicyWallet does not collect premiums and is not a payment institution. Payment happens with your insurer or intermediary; the app reminds you how much and when — from the Starter plan.",
                },
            },
            {
                question: {
                    el: "Πώς βλέπω πόσα πληρώνω συνολικά σε ασφάλιστρα;",
                    en: "How do I see what I pay in premiums overall?",
                },
                answer: {
                    el: "Ανεβάζοντας όλα τα συμβόλαια σε ένα σημείο. Το ασφάλιστρο κάθε συμβολαίου εξάγεται από το ίδιο το έγγραφο, οπότε το άθροισμα προκύπτει χωρίς να το υπολογίσετε εσείς.",
                    en: "By uploading every policy to one place. Each premium is extracted from the document itself, so the total adds up without you working it out.",
                },
            },
            {
                question: {
                    el: "Είναι το PolicyWallet ασφαλιστική εταιρεία ή διαμεσολαβητής;",
                    en: "Is PolicyWallet an insurer or an intermediary?",
                },
                answer: {
                    el: "Ούτε το ένα ούτε το άλλο. Δεν εκδίδει, δεν πουλά και δεν διαχειρίζεται ασφαλιστικές συμβάσεις, και δεν λαμβάνει προμήθειες. Είναι εργαλείο κατανόησης και οργάνωσης των συμβολαίων που ήδη έχετε.",
                    en: "Neither. It does not issue, sell or administer insurance contracts, and it receives no commission. It is a tool for understanding and organizing the policies you already hold.",
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
            el: "Η φράση «όλα σε ένα σημείο» κρύβει τρεις διαφορετικές δουλειές: οργάνωση εγγράφων, κατανόηση καλύψεων και ενημέρωση για αποζημιώσεις. Καμία εφαρμογή δεν τις κάνει και τις τρεις. Την πορεία μιας αποζημίωσης τη δίνει μόνο η ασφαλιστική εταιρεία ή ο διαμεσολαβητής σας. Ένα πορτοφόλι ασφαλίσεων καλύπτει τις δύο πρώτες και, όταν συμβεί ζημιά, σας δίνει προθεσμίες, υποχρεώσεις και το σωστό τηλέφωνο.",
            en: "The phrase “all in one place” hides three different jobs: organizing documents, understanding cover, and getting claim updates. No single app does all three. Only your insurer or your intermediary can tell you where a claim stands. A policy wallet covers the first two and, when a loss happens, hands you the deadlines, the obligations and the right phone number.",
        },
        datePublished: "2026-07-27",
        dateModified: "2026-07-27",
        readingMinutes: 6,
        sections: [
            {
                heading: {
                    el: "«Όλα σε ένα σημείο»: τρεις διαφορετικές δουλειές",
                    en: "“All in one place”: three different jobs",
                },
                paragraphs: [
                    {
                        el: "Όποιος ψάχνει εφαρμογή για τα ασφαλιστήριά του συνήθως θέλει τρία πράγματα ταυτόχρονα, χωρίς να τα ξεχωρίζει. Το πρόβλημα είναι ότι λύνονται σε διαφορετικά σημεία, και μια εφαρμογή που υπόσχεται και τα τρία μάλλον υπερβάλλει σε ένα από αυτά.",
                        en: "Anyone looking for a policy app usually wants three things at once, without separating them. The problem is that they are solved in different places, and an app promising all three is probably overstating at least one.",
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
                        el: "Η ασφαλιστική εταιρεία που εξέδωσε το συμβόλαιο και ο διαμεσολαβητής σας. Κανείς άλλος. Ο φάκελος ζημιάς — αριθμός, πραγματογνώμονας, εγκρίσεις, ποσό, ημερομηνία πληρωμής — υπάρχει μόνο στα συστήματά της. Μια εφαρμογή τρίτου χωρίς σύνδεση με αυτά δεν έχει από πού να αντλήσει την πληροφορία, όσο καλή κι αν είναι.",
                        en: "The insurer that issued the policy, and your intermediary. Nobody else. The claim file — its number, the loss adjuster, approvals, the amount, the payment date — exists only in their systems. A third-party app with no feed from them has nowhere to read that from, however good it is.",
                    },
                    {
                        el: "Πρακτικά αυτό σημαίνει ότι η εφαρμογή ή το portal της εταιρείας σας παραμένει το σημείο αναφοράς για την πορεία μιας ζημιάς, και ο πράκτοράς σας ο συντομότερος δρόμος όταν κάτι κολλήσει. Αν μια εφαρμογή τρίτου υπόσχεται «claim updates», αξίζει να δείτε αν εννοεί πραγματική κατάσταση φακέλου ή απλώς υπενθυμίσεις και οδηγίες.",
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
                        el: "Στο PolicyWallet αυτό εμφανίζεται ως οδηγία ανά κλάδο, δεμένη με το δικό σας συμβόλαιο: η προθεσμία δήλωσης και οι υποχρεώσεις ειδοποίησης όπως τις αναφέρει το έγγραφό σας, ο αριθμός ασφαλιστηρίου, και το τηλέφωνο του σωστού κλάδου — γραμμή δήλωσης ατυχήματος για το αυτοκίνητο, τεχνική βοήθεια για την κατοικία, κέντρο συντονισμού για την υγεία. Όταν το τηλέφωνο δεν υπάρχει στο έγγραφο, το λέει ευθέως αντί να επινοήσει έναν αριθμό. Αυτή είναι η διαφορά μιας πλατφόρμας προσωπικής ανάλυσης ρίσκου από μια απλή αποθήκη εγγράφων: δεν σας δίνει απλώς το αρχείο — σας δίνει το τι σημαίνει.",
                        en: "In PolicyWallet that appears as branch-specific guidance tied to your own policy: the notification deadline and reporting obligations exactly as your document states them, your policy number, and the right claims line — the accident-declaration line for motor, technical assistance for home, the coordination centre for health. Where the number is not in the document, it says so plainly rather than inventing one. That is the difference between a personal risk intelligence platform and a plain document store: it does not just hand you the file — it hands you what the file means.",
                    },
                    {
                        el: "Η προθεσμία δήλωσης είναι το σημείο όπου χάνονται αποζημιώσεις που θα πληρώνονταν κανονικά. Είναι γραμμένη στους όρους, συνήθως σε ημέρες από τη στιγμή που λάβατε γνώση του συμβάντος, και σχεδόν ποτέ δεν τη θυμάται κανείς την ώρα που τη χρειάζεται.",
                        en: "The notification deadline is where otherwise payable claims get lost. It is written in the terms, usually as a number of days from when you became aware of the incident, and almost nobody remembers it at the moment it matters.",
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
                        el: "Επειδή τα συμβόλαια βρίσκονται μαζί, με το πλάνο Family εντοπίζονται και τα κενά ανάμεσά τους: κατοικία χωρίς κάλυψη σεισμού, ασφαλιζόμενο κεφάλαιο κάτω από το κόστος ανακατασκευής, ή δύο συμβόλαια που πληρώνουν τον ίδιο κίνδυνο. Στο ίδιο πλάνο ανήκουν και οι ερωτήσεις στην AI για ένα συγκεκριμένο συμβόλαιο και η ασφαλής κοινοποίηση σε σύμβουλο· υπενθυμίσεις ανανέωσης υπάρχουν από το πλάνο Starter.",
                        en: "Because the policies sit together, the Family plan surfaces the gaps between them too: a home with no earthquake cover, a sum insured below rebuild cost, or two policies paying for the same risk. AI questions about a specific policy and secure sharing with an advisor belong to the same plan; renewal reminders start from the Starter plan.",
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
                    el: "Οι εφαρμογές των ασφαλιστικών εταιρειών καλύπτουν και τα τρία, αλλά μόνο για τα δικά τους συμβόλαια. Τα πορτοφόλια ασφαλίσεων καλύπτουν έγγραφα και καλύψεις για όλες τις εταιρείες μαζί, με οδηγίες αντί για κατάσταση ζημιάς. Οι εφαρμογές πρακτορείων βρίσκονται ενδιάμεσα.",
                    en: "Insurers' own apps cover all three, but only for their own policies. Policy wallets cover documents and coverage across every insurer, with guidance rather than claim status. Agency apps sit in between.",
                },
            },
            {
                question: {
                    el: "Υπάρχει εφαρμογή που δείχνει την πορεία της αποζημίωσής μου από κάθε εταιρεία;",
                    en: "Is there an app that shows my claim status across every insurer?",
                },
                answer: {
                    el: "Όχι. Η κατάσταση του φακέλου ζημιάς υπάρχει μόνο στα συστήματα της εταιρείας που εξέδωσε το συμβόλαιο, οπότε η ενημέρωση έρχεται από τη δική της εφαρμογή ή από τον διαμεσολαβητή σας.",
                    en: "No. Claim file status lives only in the systems of the insurer that issued the policy, so updates come from that insurer's own app or from your intermediary.",
                },
            },
            {
                question: {
                    el: "Μπορώ να δηλώσω ζημιά μέσα από ένα πορτοφόλι ασφαλίσεων;",
                    en: "Can I file a claim from inside a policy wallet?",
                },
                answer: {
                    el: "Όχι. Η δήλωση γίνεται στην ασφαλιστική εταιρεία ή μέσω του διαμεσολαβητή σας. Αυτό που παίρνετε από το πορτοφόλι είναι η προθεσμία, οι υποχρεώσεις σας και το σωστό τηλέφωνο για τον κλάδο.",
                    en: "No. The claim is filed with the insurer or through your intermediary. What the wallet gives you is the deadline, your obligations and the right phone number for that branch.",
                },
            },
            {
                question: {
                    el: "Πώς βρίσκω την προθεσμία δήλωσης ζημιάς στο συμβόλαιό μου;",
                    en: "How do I find the claim notification deadline in my policy?",
                },
                answer: {
                    el: "Βρίσκεται στους γενικούς ή ειδικούς όρους, στο κεφάλαιο για τις υποχρεώσεις του ασφαλισμένου μετά από ζημιά. Αν το συμβόλαιο είναι ήδη αναλυμένο, εμφανίζεται μαζί με τα υπόλοιπα στοιχεία του χωρίς αναζήτηση στους όρους.",
                    en: "In the general or special terms, under the policyholder's obligations after a loss. If the policy has already been analysed, it appears alongside its other details without you searching the terms.",
                },
            },
            {
                question: {
                    el: "Χρειάζομαι διαφορετική εφαρμογή για κάθε ασφαλιστική εταιρεία;",
                    en: "Do I need a separate app for each insurer?",
                },
                answer: {
                    el: "Για πληρωμές και πορεία ζημιάς, ναι — αυτά μένουν στην κάθε εταιρεία. Για έγγραφα και καλύψεις, όχι: ένα εργαλείο ανεξάρτητο από εταιρεία τα φέρνει όλα σε μία εικόνα.",
                    en: "For payments and claim progress, yes — those stay with each insurer. For documents and cover, no: an insurer-independent tool brings them into a single view.",
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
            el: "Ο αναλογικός κανόνας — στα κείμενα των όρων «αναλογικός όρος» — μειώνει την αποζημίωση στην ίδια αναλογία που το ασφαλιστικό ποσό υπολείπεται της ασφαλιστικής αξίας. Δημοσιευμένοι όροι κατοικίας ορίζουν αυτή την αξία ως τη δαπάνη ανοικοδόμησης με τα ίδια υλικά και τρόπο κατασκευής, μετά την αφαίρεση της μείωσης της κατασκευαστικής αξίας. Ο όρος γράφεται ως λόγος, οπότε αφορά κάθε ζημιά και όχι μόνο την ολική. Εδώ είναι τι λέει το κείμενο και πού το εντοπίζετε στο δικό σας έγγραφο.",
            en: "The average clause reduces a claim in the same proportion as the sum insured falls short of the insurable value. Published Greek home wordings define that value as the cost of rebuilding with the same materials and construction method, less the reduction in construction value. Because the term is written as a ratio, it reaches every claim, not only a total loss. Here is what the text says and where to find it in your own document.",
        },
        datePublished: "2026-08-26",
        dateModified: "2026-08-26",
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
                        el: "Οι δύο αριθμοί δεν συναντιούνται ποτέ στην ίδια σελίδα. Το ασφαλιστικό ποσό είναι τυπωμένο μπροστά, στον πίνακα καλύψεων, και διαβάζεται σαν υπόσχεση. Η ασφαλιστική αξία δεν είναι αριθμός αλλά ορισμός, και ο ορισμός βρίσκεται βαθιά στους Γενικούς Όρους, στο άρθρο για τον υπολογισμό και την καταβολή του ασφαλίσματος. Κανένα σημείο του εγγράφου δεν συμφιλιώνει τα δύο.",
                        en: "The two numbers never meet on the same page. The sum insured is printed at the front, on the schedule, and reads like a promise. The insurable value is not a number but a definition, and the definition sits deep in the general terms, in the article on calculating and paying the indemnity. Nothing in the document reconciles the two.",
                    },
                    {
                        el: "Επειδή ο όρος είναι λόγος, δεν περιμένει την ολική καταστροφή. Μια σπασμένη σωλήνα ή μια μερική ζημιά από πυρκαγιά μειώνεται με το ίδιο κλάσμα — και οι μερικές ζημιές είναι οι συνηθισμένες. Έτσι, μια διαφορά που κανείς δεν πρόσεξε επί χρόνια εμφανίζεται για πρώτη φορά τη μέρα του συμβάντος, όταν πλέον δεν διορθώνεται αναδρομικά.",
                        en: "Because the term is a ratio, it does not wait for a total loss. A burst pipe or a partial fire loss is reduced by the same fraction — and partial losses are the ordinary kind. So a difference nobody noticed for years shows up for the first time on the day of the incident, when it can no longer be corrected retrospectively.",
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
                        el: "Δεν υπολογίζει κόστος ανακατασκευής. Δεν υπάρχει πίνακας ευρώ ανά τετραγωνικό πίσω από αυτό, γιατί ένας αριθμός που η εφαρμογή δεν μπορεί να τεκμηριώσει είναι εκτίμηση αξίας και όχι αριθμητική. Αν το έγγραφο αναφέρει μόνο το ένα από τα δύο ποσά, το PolicyWallet το δηλώνει ως μη καταγεγραμμένο αντί να συμπληρώσει το άλλο.",
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
            el: "Οι δημοσιευμένοι όροι κατοικίας ζητούν, κατά τη σύναψη, δήλωση κάθε στοιχείου αντικειμενικά ουσιώδους για την εκτίμηση του κινδύνου, και στη διάρκεια δήλωση μέσα σε δεκατέσσερις ημέρες για ό,τι επιτείνει σημαντικά τον κίνδυνο. Αν η βραχυχρόνια μίσθωση εμπίπτει σε αυτά, δεν το απαντά ένας οδηγός: το κριτήριο το ορίζουν οι όροι και το εφαρμόζει η εταιρεία σας. Εδώ είναι τι λέει το κείμενο και πού το βρίσκετε.",
            en: "Published Greek home wordings require, at inception, disclosure of everything objectively material to the assessment of the risk, and mid-term a declaration within fourteen days of anything that materially aggravates it. Whether short-term letting falls inside that is not something a guide can answer: the wording sets the criterion and your insurer applies it. Here is what the text says and where to find it.",
        },
        datePublished: "2026-08-26",
        dateModified: "2026-08-26",
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
                        el: "Καμία από τις πηγές αυτής της σελίδας δεν χαρακτηρίζει τη βραχυχρόνια μίσθωση επίταση του κινδύνου, και δεν το χαρακτηρίζουμε ούτε εμείς. Οι όροι δίνουν το κριτήριο και την προθεσμία· η υπαγωγή ενός συγκεκριμένου ακινήτου σε αυτό κρίνεται από το δικό σας κείμενο και από την εταιρεία σας, όχι από έναν οδηγό.",
                        en: "None of the sources behind this page characterises short-term letting as an aggravation of the risk, and neither do we. The wordings give the criterion and the deadline; whether a particular property falls inside it is settled by your own text and by your insurer, not by a guide.",
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
                        el: "Τρία πράγματα κάνουν αυτό το σημείο εύκολο να χαθεί. Η προθεσμία των δεκατεσσάρων ημερών μετρά από τη στιγμή που το μάθατε, όχι από τη στιγμή που θα το θυμηθείτε. Το κριτήριο είναι αντικειμενικό — «ουσιώδες για την εκτίμηση του κινδύνου» — και όχι το τι σας φάνηκε σημαντικό. Και η συνέπεια είναι αναλογική μείωση, που δεν εμφανίζεται πουθενά μέσα στη χρονιά: εμφανίζεται μόνο πάνω σε μια αποζημίωση.",
                        en: "Three things make this easy to miss. The fourteen-day clock runs from when you learned of the fact, not from when you get round to it. The test is objective — «material to the assessment of the risk» — rather than whatever struck you as important. And the consequence is a proportional reduction, which appears nowhere during the year: it appears only on a claim.",
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
                        el: "Διαβάζει το ασφαλιστήριο και ξεχωρίζει τους όρους από τους οποίους κρέμεται η κάλυψη — προϋποθέσεις κάλυψης, απαράβατους όρους, υποχρεώσεις που το ίδιο το κείμενο συνδέει με τη διατήρησή της — και τους παρουσιάζει ως απαιτήσεις προς επιβεβαίωση: το ασφαλιστήριο ζητά αυτό, επιβεβαιώστε ότι ισχύει. Καταγράφει επίσης τις εξαιρέσεις όπως τις γράφει το έγγραφο.",
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
                    el: "Δεν το λέει καμία πηγή που μπορούμε να παραθέσουμε, οπότε δεν το λέμε ούτε εμείς. Οι όροι ορίζουν το κριτήριο — στοιχείο που επιτείνει σημαντικά τον κίνδυνο — και την προθεσμία των δεκατεσσάρων ημερών. Η υπαγωγή σε αυτό κρίνεται από το δικό σας κείμενο και από την εταιρεία σας.",
                    en: "No source we can cite says so, so neither do we. The wordings set the criterion — a fact that materially aggravates the risk — and the fourteen-day deadline. Whether a given case falls inside it is settled by your own text and by your insurer.",
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
        sources: [
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
            el: "Η υποχρεωτική ασφάλιση του ΕΛ.Γ.Α. καλύπτει κλειστό κατάλογο ζημιογόνων αιτίων και αφορά την παραγωγή της χρονιάς, όχι το φυτικό κεφάλαιο. Ζημιά έως και είκοσι τοις εκατό της παραγωγής του αγροτεμαχίου κατά κανόνα δεν αποζημιώνεται· πάνω από αυτό, ο Κανονισμός δίνει ογδόντα οκτώ τοις εκατό του πάνω από δεκαπέντε τοις εκατό ποσοστού. Η ασφαλιζόμενη αξία ορίζεται διοικητικά. Εδώ είναι πώς προκύπτει το ποσό.",
            en: "Greece's compulsory crop insurance scheme covers a closed list of causes and insures the season's production, not the plant capital. A loss of up to twenty per cent of the parcel's production is, as a rule, not compensated; above that, the regulation pays eighty-eight per cent of the portion above fifteen per cent. The insured value is set administratively. Here is how the figure is arrived at.",
        },
        datePublished: "2026-08-26",
        dateModified: "2026-08-26",
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
                        el: "Από δύο ξεχωριστά βήματα, και τα δύο γραμμένα στον Κανονισμό. Το πρώτο ορίζει την ασφαλιζόμενη αξία της παραγωγής: τον αριθμό των στρεμμάτων όπως δηλώνονται στην Ενιαία Δήλωση Καλλιέργειας/Εκτροφής, τη μέση παραγωγή κατά στρέμμα και είδος ανά γεωγραφική περιοχή, και την αξία του παραγόμενου προϊόντος ανά κιλό ή τεμάχιο, όπως καθορίζεται στην εκάστοτε ισχύουσα κοινή υπουργική απόφαση. Είναι δηλαδή διοικητικά καθορισμένο μέγεθος, όχι η τιμή στην οποία πουλάτε ούτε το κόστος να ξαναφυτέψετε.",
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
                        el: "Λιγότερα από όσα ίσως περιμένετε, και αξίζει να ειπωθεί καθαρά. Το PolicyWallet διαβάζει ασφαλιστήρια που ανεβάζετε εσείς. Δεν συνδέεται με τον ΕΛ.Γ.Α., δεν υπολογίζει αποζημίωση ΕΛ.Γ.Α. και δεν γνωρίζει τι θα καταβληθεί σε μια συγκεκριμένη υπόθεση. Τα ποσοστά αυτής της σελίδας είναι του Κανονισμού, όχι δικά μας.",
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
