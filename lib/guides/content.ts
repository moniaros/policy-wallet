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

export type GuideSection = {
    heading: LocalizedString
    paragraphs: LocalizedString[]
    bullets?: LocalizedString[]
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
                        en: "The insured sum must cover the building's reconstruction value. AADE sets a minimum value per square metre — confirm the current threshold at aade.gr.",
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
                        en: "For the 2022 and 2023 ENFIA the discount was 10% for a full year of coverage. From the 2024 ENFIA the discount was doubled to 20% for homes with a taxable value up to €500,000 insured for the full year; above that, 10% still applies. Because the details can change with new ministerial decisions, always check the current AADE announcement before assessment time.",
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
                        el: "Ανοίξτε τον πίνακα καλύψεων του ασφαλιστηρίου και αναζητήστε ρητά τις λέξεις «σεισμός», «πυρκαγιά» και «πλημμύρα» στις καλυπτόμενες ζημιές — όχι στις προαιρετικές ή στις εξαιρέσεις. Ελέγξτε επίσης το ασφαλιζόμενο κεφάλαιο κτίσματος σε σχέση με τα τετραγωνικά μέτρα. Εναλλακτικά, ανεβάστε το PDF του συμβολαίου στο PolicyWallet: η ανάλυση AI επισημαίνει αν λείπει κάποιος από τους τρεις κινδύνους της έκπτωσης ΕΝΦΙΑ, και — εφόσον το έγγραφο αναφέρει και τα δύο ποσά — αν το ασφαλισμένο κεφάλαιο υπολείπεται του κόστους ανακατασκευής.",
                        en: "Open your policy's coverage table and look for earthquake, fire, and flood explicitly listed among the covered perils — not in the optional add-ons or the exclusions. Also check the insured building sum against your square metres. Alternatively, upload the policy PDF to PolicyWallet: the AI analysis automatically flags a missing ENFIA-discount peril and an insufficient reconstruction sum.",
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
            el: "Κενό κάλυψης είναι ο κίνδυνος που νομίζετε ότι καλύπτεται αλλά δεν καλύπτεται. Τα συχνότερα κενά στην Ελλάδα, ο αναλογικός όρος και πώς τα εντοπίζετε σε λεπτά.",
            en: "A coverage gap is the risk you think is insured but is not. The most common gaps in Greece, the pro-rata average clause and how to find yours in minutes.",
        },
        summary: {
            el: "Κενό κάλυψης είναι η διαφορά ανάμεσα σε αυτό που νομίζετε ότι καλύπτει το ασφαλιστήριό σας και σε αυτό που πραγματικά καλύπτει. Εμφανίζεται σε εξαιρέσεις, σε ανεπαρκή κεφάλαια και σε κινδύνους που δεν προστέθηκαν ποτέ. Εντοπίζεται με προσεκτική ανάγνωση των όρων ή αυτόματα, ανεβάζοντας το συμβόλαιο σε ένα εργαλείο ανάλυσης όπως το PolicyWallet.",
            en: "A coverage gap is the difference between what you think your policy covers and what it actually covers. It hides in exclusions, insufficient insured sums, and risks that were never added. You find it by carefully reading the terms — or automatically, by uploading the policy to an analysis tool like PolicyWallet.",
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
                        en: "The Greek market has one of the lowest insurance penetration rates in the European Union — according to published EAEE data, only a small minority of homes carry insurance. But even policyholders run into recurring gaps:",
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
                        el: "Υψηλή απαλλαγή υγείας: μια απαλλαγή 1.500€ σημαίνει ότι τα περισσότερα περιστατικά πληρώνονται εξ ολοκλήρου από εσάς.",
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
                    el: "Τι είναι ο αναλογικός όρος και γιατί σας αφορά;",
                    en: "What is the average clause and why does it matter?",
                },
                paragraphs: [
                    {
                        el: "Αν το σπίτι σας κοστίζει 200.000€ να ξαναχτιστεί αλλά το έχετε ασφαλίσει για 100.000€, δεν θα πάρετε 100.000€ σε ολική ζημιά — ο «αναλογικός όρος» (pro-rata) σημαίνει ότι κάθε αποζημίωση, ακόμη και μερική, μειώνεται στο ποσοστό της υπασφάλισης. Ζημιά 20.000€ αποζημιώνεται με 10.000€. Γι' αυτό ο έλεγχος του κεφαλαίου ανακατασκευής είναι το πιο σημαντικό, και πιο παραμελημένο, σημείο κάθε ανανέωσης.",
                        en: "If your home costs €200,000 to rebuild but you insured it for €100,000, you will not receive €100,000 on a total loss — the average clause (pro-rata rule) means every claim, even a partial one, is reduced by the underinsurance ratio. A €20,000 loss pays out €10,000. That is why checking the reconstruction sum is the most important — and most neglected — step of every renewal.",
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
                        el: "Ο χειροκίνητος έλεγχος θέλει τρία βήματα: πρώτον, διαβάστε τον πίνακα καλύψεων και σημειώστε τι πραγματικά περιλαμβάνεται — όχι τι υποθέτετε. Δεύτερον, διαβάστε τις εξαιρέσεις: εκεί κρύβονται τα περισσότερα κενά. Τρίτον, συγκρίνετε τα ασφαλιζόμενα κεφάλαια με τις σημερινές αξίες (ανακατασκευή, εξοπλισμός, εισόδημα). Το PolicyWallet αυτοματοποιεί και τα τρία: ανεβάζετε τα PDF των συμβολαίων και η AI εξάγει καλύψεις και εξαιρέσεις, τα διασταυρώνει μεταξύ τους και βαθμολογεί το επίπεδο προστασίας σας, επισημαίνοντας κενά και επικαλύψεις σε απλά ελληνικά.",
                        en: "A manual check takes three steps: first, read the coverage table and note what is actually included — not what you assume. Second, read the exclusions: that is where most gaps hide. Third, compare insured sums against today's values (reconstruction, contents, income). PolicyWallet automates all three: you upload the policy PDFs and the AI extracts coverages and exclusions, cross-checks them, and scores your protection level, flagging gaps and overlaps in plain language.",
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
        // guide route when howToSteps is present).
        howToSteps: [
            {
                name: {
                    el: "Καταγράψτε τι άλλαξε",
                    en: "Note what changed",
                },
                text: {
                    el: "Μετακόμιση, ανακαίνιση, νέο όχημα, οικογενειακές αλλαγές, νέος εξοπλισμός — κάθε αλλαγή επηρεάζει την κάλυψη που χρειάζεστε.",
                    en: "Moving, renovation, a new vehicle, family changes, new equipment — every change affects the coverage you need.",
                },
            },
            {
                name: {
                    el: "Επικαιροποιήστε τα κεφάλαια",
                    en: "Update the insured sums",
                },
                text: {
                    el: "Κόστος ανακατασκευής κατοικίας, εμπορική αξία οχήματος, αξία περιεχομένου — τα κεφάλαια πρέπει να αντιστοιχούν στις σημερινές αξίες.",
                    en: "Home reconstruction cost, vehicle market value, contents value — insured sums must match today's values.",
                },
            },
            {
                name: {
                    el: "Ελέγξτε την απαλλαγή",
                    en: "Review the deductible",
                },
                text: {
                    el: "Μεγαλύτερη απαλλαγή σημαίνει μικρότερο ασφάλιστρο — και αντίστροφα. Βεβαιωθείτε ότι ταιριάζει ακόμη στα οικονομικά σας.",
                    en: "A higher deductible means a lower premium — and vice versa. Make sure it still fits your finances.",
                },
            },
            {
                name: {
                    el: "Ξαναδιαβάστε τις εξαιρέσεις",
                    en: "Re-read the exclusions",
                },
                text: {
                    el: "Οι όροι αλλάζουν στις ανανεώσεις, συχνά χωρίς να το προσέξετε.",
                    en: "Terms change at renewal, often without you noticing.",
                },
            },
            {
                name: {
                    el: "Συγκρίνετε την αύξηση",
                    en: "Question the increase",
                },
                text: {
                    el: "Αν το ασφάλιστρο ανέβηκε, ζητήστε αιτιολόγηση και ελέγξτε τι δίνει η αγορά.",
                    en: "If the premium went up, ask why and check what the market offers.",
                },
            },
            {
                name: {
                    el: "Πάρτε εναλλακτική προσφορά",
                    en: "Get an alternative quote",
                },
                text: {
                    el: "Τουλάχιστον μία προσφορά με ίδιες καλύψεις — αλλιώς η σύγκριση τιμής είναι παραπλανητική.",
                    en: "At least one quote with identical coverages — otherwise the price comparison is misleading.",
                },
            },
            {
                name: {
                    el: "Εξασφαλίστε συνέχεια",
                    en: "Ensure continuity",
                },
                text: {
                    el: "Η νέα κάλυψη πρέπει να ξεκινά την ημέρα που λήγει η παλιά. Ένα κενό ημερών μπορεί να κοστίσει και την έκπτωση ΕΝΦΙΑ.",
                    en: "The new coverage must start the day the old one ends. A gap of days can even cost you the ENFIA discount.",
                },
            },
        ],
        related: [
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
                        el: "Τριάντα ημέρες πριν από τη λήξη. Έτσι προλαβαίνετε να ζητήσετε προσφορές, να διαπραγματευτείτε και να μην βρεθείτε προ τετελεσμένου με αυτόματη ανανέωση σε χειρότερους όρους. Το PolicyWallet παρακολουθεί τις ημερομηνίες λήξης όλων των συμβολαίων σας και σας ειδοποιεί εγκαίρως, με έτοιμη τη σύνοψη καλύψεων για να συγκρίνετε προσφορές σε ίση βάση.",
                        en: "Thirty days before expiry. That leaves time to request quotes, negotiate, and avoid being locked into an automatic renewal on worse terms. PolicyWallet tracks the expiry dates of all your policies and alerts you in time, with a ready coverage summary so you can compare quotes on equal footing.",
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
            en: "Mandatory car insurance covers only the damage you cause to others — not your own vehicle. Basic packages typically add glass breakage and roadside assistance, while comprehensive (mikti) also covers own damage subject to a deductible. Critical exclusions: driving under the influence, without a licence, or by an undeclared driver.",
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
                        en: "Most \"basic\" packages on the market combine liability with covers such as glass breakage, roadside assistance or accident care, and legal protection. Mid-tier packages add fire, total theft, and natural phenomena.",
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
                        en: "Exclusions are where most drivers get surprised at claim time. The most common: driving under the influence of alcohol or drugs, a driver without a valid licence or outside the declared drivers, participation in racing, using the vehicle for a purpose other than declared (e.g. commercial delivery on a private-use policy), and normal wear or mechanical failure.",
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
                    el: "Η αστική ευθύνη ισχύει σε όλο τον Ενιαίο Οικονομικό Χώρο. Για χώρες εκτός συστήματος χρειάζεστε Πράσινη Κάρτα από την εταιρεία σας — συνήθως εκδίδεται δωρεάν ή με μικρό κόστος.",
                    en: "Liability cover applies across the European Economic Area. For countries outside the system you need a Green Card from your insurer — usually issued free or at small cost.",
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
            el: "Η απαλλαγή είναι το ποσό των εξόδων νοσηλείας που πληρώνετε εσείς πριν ενεργοποιηθεί το συμβόλαιο υγείας. Ορίζεται ετησίως ή ανά περιστατικό — συνήθως από 300 έως 5.000 ευρώ — και όσο υψηλότερη είναι, τόσο χαμηλότερο το ασφάλιστρο. Συχνά μπορεί να καλυφθεί από τον ΕΟΠΥΥ ή από ομαδικό συμβόλαιο εργασίας, ώστε να μην πληρώσετε τίποτα.",
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
                        en: "A deductible is not a \"hidden fee\" — it is a pricing tool. Zero-deductible plans exist, but cost noticeably more, especially past age 40-45.",
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
                    en: "What does \"deductible coverage\" via a group policy mean?",
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
        dateModified: "2026-07-13",
        readingMinutes: 5,
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
                ],
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
                        el: "Αν δηλώσετε κεφάλαιο χαμηλότερο από το πραγματικό κόστος ανακατασκευής για να μειώσετε το ασφάλιστρο, σε ζημιά θα αποζημιωθείτε αναλογικά (όρος «pro-rata»): κατοικία που κοστίζει 200.000 να ξαναχτιστεί, ασφαλισμένη για 100.000, εισπράττει το 50% κάθε ζημιάς — και μετά την απαλλαγή. Ενημερώνετε το κεφάλαιο σε κάθε ανανέωση, ειδικά όταν το κατασκευαστικό κόστος αυξάνεται.",
                        en: "If you declare a sum lower than the true reconstruction cost to cut the premium, claims are paid proportionally (the pro-rata rule): a home costing €200,000 to rebuild but insured for €100,000 collects 50% of any damage — after the deductible. Update the sum at every renewal, especially when construction costs rise.",
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
                    en: "Modern buildings fare better, but \"seismic-code\" does not mean invulnerable — it means designed not to collapse. Repairable yet costly damage remains possible, and premiums for new buildings are correspondingly lower.",
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
                        en: "Some plans distinguish \"curable\" pre-existing conditions (e.g. a fully healed ear infection) from chronic ones; the former may become coverable again after a symptom-free interval. Ask explicitly — the difference matters.",
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
            el: "Τα ανασφάλιστα οχήματα εντοπίζονται με ηλεκτρονικές διασταυρώσεις της ΑΑΔΕ και ελέγχους της Τροχαίας. Η διασταύρωση επιφέρει διοικητικό παράβολο κλιμακούμενο ανά κατηγορία οχήματος — ενδεικτικά από 100 έως 250 ευρώ — ενώ ο έλεγχος στον δρόμο προσθέτει πρόστιμο και αφαίρεση στοιχείων κυκλοφορίας. Σε ατύχημα, το Επικουρικό Κεφάλαιο αποζημιώνει τον τρίτο και αναζητά το σύνολο από τον ιδιοκτήτη.",
            en: "Uninsured vehicles are detected through AADE electronic cross-checks and traffic police stops. A cross-check triggers an administrative fee scaled by vehicle category — indicatively €100 to €250 — while a roadside stop adds a fine and confiscation of plates. In an accident, the Auxiliary Fund compensates the third party and then recovers the full amount from the owner.",
        },
        datePublished: "2026-07-13",
        dateModified: "2026-07-13",
        readingMinutes: 5,
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
                        el: "Δύο μηχανισμοί λειτουργούν παράλληλα. Ο πρώτος είναι ηλεκτρονικός: η ΑΑΔΕ διασταυρώνει περιοδικά το μητρώο οχημάτων με το Κέντρο Πληροφοριών ασφαλισμένων οχημάτων· όποιο όχημα με ενεργή άδεια κυκλοφορίας δεν εμφανίζεται ασφαλισμένο, εντοπίζεται χωρίς να χρειαστεί έλεγχος στον δρόμο. Ο δεύτερος είναι ο κλασικός έλεγχος από την Τροχαία.",
                        en: "Two mechanisms run in parallel. The first is electronic: AADE periodically cross-references the vehicle registry with the insured-vehicle Information Center; any vehicle with active registration that does not appear insured is flagged without a roadside stop. The second is the classic traffic police check.",
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
                        el: "Από την ηλεκτρονική διασταύρωση επιβάλλεται διοικητικό παράβολο κλιμακούμενο με τον κυβισμό — ενδεικτικά 100 ευρώ για δίκυκλα, 150 ευρώ για επιβατικά μικρότερου κυβισμού και 250 ευρώ για μεγαλύτερα. Τα ακριβή κλιμάκια ορίζονται από την κείμενη νομοθεσία και δημοσιεύονται από την ΑΑΔΕ. Η πληρωμή του παραβόλου δεν «νομιμοποιεί»: πρέπει και να ασφαλίσετε το όχημα εντός της ταχθείσας προθεσμίας, αλλιώς ακολουθούν αυστηρότερες κυρώσεις.",
                        en: "The electronic cross-check triggers an administrative fee scaled by engine size — indicatively €100 for motorcycles, €150 for smaller-displacement cars, and €250 for larger ones. The exact brackets are set by current legislation and published by AADE. Paying the fee does not legalize you: the vehicle must also be insured within the set deadline, or stricter penalties follow.",
                    },
                    {
                        el: "Σε έλεγχο της Τροχαίας, οι κυρώσεις είναι βαρύτερες και άμεσες: χρηματικό πρόστιμο, αφαίρεση πινακίδων, άδειας κυκλοφορίας και διπλώματος, ενώ η οδήγηση ανασφάλιστου οχήματος συνιστά και ποινικό αδίκημα.",
                        en: "At a police stop, penalties are heavier and immediate: a monetary fine, confiscation of plates, registration, and licence — and driving uninsured is also a criminal offence.",
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
                        el: "Αν λάβετε ειδοποίηση: ασφαλίστε το όχημα άμεσα — η κάλυψη ενεργοποιείται από την έκδοση του συμβολαίου — και πληρώστε το παράβολο μέσα στην προθεσμία που αναγράφεται. Αν το όχημα δεν κυκλοφορεί, δηλώστε ακινησία ώστε να μην εμφανίζεται ξανά στις επόμενες διασταυρώσεις. Αν θεωρείτε την ειδοποίηση εσφαλμένη (π.χ. ήσασταν ασφαλισμένοι), η ένσταση υποβάλλεται με τη διαδικασία που περιγράφει η ΑΑΔΕ, με αποδεικτικό ασφάλισης για την επίμαχη περίοδο.",
                        en: "If you receive a notice: insure the vehicle immediately — cover activates upon policy issuance — and pay the fee within the stated deadline. If the vehicle is off the road, declare immobility so it stops appearing in future cross-checks. If you believe the notice is wrong (e.g. you were insured), file an objection through AADE's published process with proof of insurance for the disputed period.",
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
        ],
        sources: [
            {
                label: {
                    el: "ΑΑΔΕ — Διασταυρώσεις ανασφάλιστων οχημάτων",
                    en: "AADE — Uninsured vehicle cross-checks",
                },
                url: "https://www.aade.gr",
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
        ],
    },
]

export function getGuide(slug: string): Guide | undefined {
    return guides.find((guide) => guide.slug === slug)
}
