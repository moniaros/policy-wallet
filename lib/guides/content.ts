/**
 * Insurance guides — long-form, bilingual content targeting long-tail Greek
 * insurance queries (AEO/GEO). Greek is the primary (server-rendered)
 * language; English is available through the client language toggle.
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

export type Guide = {
    slug: string
    title: LocalizedString
    /** Metadata title (Greek, sized for the "%s | PolicyWallet" template). */
    metaTitle: string
    metaDescription: string
    /** Direct-answer opening paragraph (snippet-shaped, 40–60 words). */
    summary: LocalizedString
    datePublished: string
    dateModified: string
    readingMinutes: number
    sections: GuideSection[]
    faq: GuideFaqItem[]
    sources: GuideSource[]
}

export const guides: Guide[] = [
    {
        slug: "ekptosi-enfia-asfalisi-katoikias",
        title: {
            el: "Πώς παίρνετε έκπτωση ΕΝΦΙΑ με ασφάλιση κατοικίας;",
            en: "How do you get the ENFIA tax discount with home insurance?",
        },
        metaTitle: "Έκπτωση ΕΝΦΙΑ με ασφάλιση κατοικίας: πλήρης οδηγός",
        metaDescription:
            "Ποιες προϋποθέσεις χρειάζεται η ασφάλεια κατοικίας για έκπτωση στον ΕΝΦΙΑ: κάλυψη σεισμού, πυρκαγιάς και πλημμύρας, ελάχιστη διάρκεια και πώς δηλώνεται στην ΑΑΔΕ.",
        summary: {
            el: "Αν η κατοικία σας είναι ασφαλισμένη και για τους τρεις κινδύνους — σεισμό, πυρκαγιά και πλημμύρα — δικαιούστε έκπτωση στον ΕΝΦΙΑ. Η έκπτωση ξεκίνησε στο 10% το 2022 και έχει αυξηθεί για κατοικίες με χαμηλότερη φορολογητέα αξία. Απαιτείται ελάχιστη διάρκεια ασφάλισης και επαρκές ασφαλιζόμενο κεφάλαιο· η ασφαλιστική σας εταιρεία διαβιβάζει τα στοιχεία στην ΑΑΔΕ.",
            en: "If your home is insured against all three risks — earthquake, fire, and flood — you are entitled to an ENFIA property-tax discount. The discount started at 10% in 2022 and has since been increased for homes with lower taxable value. A minimum policy duration and adequate insured sum are required; your insurer reports the data to the Greek tax authority (AADE).",
        },
        datePublished: "2026-07-07",
        dateModified: "2026-07-07",
        readingMinutes: 6,
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
                        el: "Ανοίξτε τον πίνακα καλύψεων του ασφαλιστηρίου και αναζητήστε ρητά τις λέξεις «σεισμός», «πυρκαγιά» και «πλημμύρα» στις καλυπτόμενες ζημιές — όχι στις προαιρετικές ή στις εξαιρέσεις. Ελέγξτε επίσης το ασφαλιζόμενο κεφάλαιο κτίσματος σε σχέση με τα τετραγωνικά μέτρα. Εναλλακτικά, ανεβάστε το PDF του συμβολαίου στο PolicyWallet: η ανάλυση AI επισημαίνει αυτόματα αν λείπει κάποιος από τους τρεις κινδύνους της έκπτωσης ΕΝΦΙΑ και αν το κεφάλαιο ανακατασκευής φαίνεται ανεπαρκές.",
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
        metaTitle: "Κενά κάλυψης: τι είναι και πώς τα εντοπίζετε",
        metaDescription:
            "Κενό κάλυψης είναι ο κίνδυνος που νομίζετε ότι καλύπτεται αλλά δεν καλύπτεται. Τα συχνότερα κενά στην Ελλάδα, ο αναλογικός όρος και πώς τα εντοπίζετε σε λεπτά.",
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
        metaTitle: "Ανανέωση ασφαλιστηρίου: λίστα ελέγχου 7 βημάτων",
        metaDescription:
            "Μην ανανεώνετε στα τυφλά: 7 βήματα πριν από κάθε ανανέωση ασφαλιστηρίου — αξίες, απαλλαγές, εξαιρέσεις, σύγκριση αγοράς και συνέχεια κάλυψης χωρίς κενά ημερών.",
        summary: {
            el: "Πριν από κάθε ανανέωση ασφαλιστηρίου ελέγξτε επτά πράγματα: τι άλλαξε στη ζωή σας, αν τα κεφάλαια αντιστοιχούν στις σημερινές αξίες, το ύψος της απαλλαγής, τις εξαιρέσεις, την αύξηση του ασφαλίστρου, τουλάχιστον μία εναλλακτική προσφορά και τη συνέχεια της κάλυψης χωρίς κενό ημερών. Ξεκινήστε 30 ημέρες πριν από τη λήξη.",
            en: "Before every policy renewal, check seven things: what changed in your life, whether insured sums match today's values, the deductible level, the exclusions, the premium increase, at least one alternative quote, and continuity of coverage with no gap days. Start 30 days before expiry.",
        },
        datePublished: "2026-07-07",
        dateModified: "2026-07-07",
        readingMinutes: 5,
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
        ],
        sources: [
            {
                label: {
                    el: "Τράπεζα της Ελλάδος — Οδηγίες για καταναλωτές ιδιωτικής ασφάλισης",
                    en: "Bank of Greece — Consumer guidance on private insurance",
                },
                url: "https://www.bankofgreece.gr",
            },
        ],
    },
]

export function getGuide(slug: string): Guide | undefined {
    return guides.find((guide) => guide.slug === slug)
}
