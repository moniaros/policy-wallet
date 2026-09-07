import type { BranchContent } from './types'

export const homeContent: BranchContent = {
    branchId: 'home',
    tagline: {
        el: 'Το σπίτι σας είναι πιθανότατα το μεγαλύτερο περιουσιακό σας στοιχείο — δείτε τι πραγματικά προστατεύει το ασφαλιστήριό σας.',
        en: 'Your home is likely your biggest asset — see what your policy really protects.',
    },
    shortDescription: {
        el: 'Κτίριο, περιεχόμενο, πυρκαγιά, σεισμός, πλημμύρα, κλοπή, θραύση σωληνώσεων: το PolicyWallet σας δείχνει τι φαίνεται να καλύπτεται και με ποιους όρους.',
        en: 'Building, contents, fire, earthquake, flood, theft, pipe bursts: PolicyWallet shows what appears to be covered and on what terms.',
    },
    whyItMatters: [
        {
            el: 'Η κάλυψη σεισμού συνήθως ΔΕΝ είναι αυτόματη στα ελληνικά ασφαλιστήρια κατοικίας — είναι προαιρετική προσθήκη με δική της απαλλαγή.',
            en: 'Earthquake cover is usually NOT automatic in Greek home policies — it is an optional add-on with its own deductible.',
        },
        {
            el: 'Αν το κτίριο είναι ασφαλισμένο σε χαμηλότερη αξία από την πραγματική (υπασφάλιση), η αποζημίωση μπορεί να μειωθεί αναλογικά.',
            en: 'If the building is insured below its real value (underinsurance), compensation can be reduced proportionally.',
        },
        {
            el: 'Το περιεχόμενο (έπιπλα, συσκευές, προσωπικά είδη) ασφαλίζεται χωριστά από το κτίριο — πολλά ασφαλιστήρια καλύπτουν μόνο το ένα από τα δύο.',
            en: 'Contents (furniture, appliances, personal items) are insured separately from the building — many policies cover only one of the two.',
        },
        {
            el: 'Για ενυπόθηκη κατοικία, η τράπεζα συνήθως απαιτεί ενεργή κάλυψη πυρός/σεισμού σε όλη τη διάρκεια του δανείου.',
            en: 'For a mortgaged home, the bank usually requires active fire/earthquake cover for the life of the loan.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Με βάση το έγγραφο που ανεβάσατε: ασφαλισμένα κεφάλαια κτιρίου και περιεχομένου, καλύψεις (πυρκαγιά, σεισμός, πλημμύρα, καιρικά φαινόμενα, κλοπή, σωληνώσεις) και απαλλαγές.',
            en: 'Based on the document you uploaded: insured amounts for building and contents, coverages (fire, earthquake, flood, weather, theft, pipes) and deductibles.',
        },
        {
            el: 'Αστική ευθύνη προς τρίτους (π.χ. διαρροή στο διαμέρισμα από κάτω) και απώλεια ενοικίων, αν εμφανίζονται.',
            en: 'Third-party liability (e.g. a leak into the flat below) and loss of rent, where they appear.',
        },
        {
            // Was "we compare the insured amount with the square metres and the
            // details in your profile" — the profile holds nothing about the
            // property's size or value, and no such comparison existed. What the
            // engine does now is compare the two figures the DOCUMENT states.
            el: 'Ενδείξεις υπασφάλισης: όταν το ασφαλιστήριο αναφέρει και ασφαλισμένο κεφάλαιο και κόστος ανακατασκευής, τα συγκρίνουμε και σε ειδοποιούμε αν το κεφάλαιο υπολείπεται.',
            en: 'Signs of underinsurance: when the policy states both a sum insured and a rebuild cost, we compare them and tell you if the sum falls short.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Ελέγξτε αν το ασφαλισμένο κεφάλαιο αντιστοιχεί στο κόστος ανακατασκευής — όχι στην εμπορική αξία του ακινήτου.',
            en: 'Check that the insured amount matches rebuilding cost — not the property’s market value.',
        },
        {
            el: 'Κρατήστε πρόχειρες φωτογραφίες και αποδείξεις για αντικείμενα αξίας — κάνουν τον φάκελο ζημιάς πολύ πιο εύκολο.',
            en: 'Keep photos and receipts of valuable items handy — they make a claim file much easier.',
        },
        {
            el: 'Μετά από ανακαίνιση ή αγορά ακριβού εξοπλισμού, ενημερώστε τον ασφαλιστή σας — η κάλυψη δεν προσαρμόζεται αυτόματα.',
            en: 'After a renovation or an expensive purchase, inform your insurer — coverage does not adjust automatically.',
        },
    ],
    commonGaps: [
        {
            id: 'home_earthquake_gap',
            title: { el: 'Χωρίς κάλυψη σεισμού', en: 'No earthquake coverage' },
            description: {
                el: 'Δεν εντοπίσαμε κάλυψη σεισμού σε πολλά βασικά πακέτα — στην Ελλάδα είναι από τα σημαντικότερα κενά κατοικίας.',
                en: 'Earthquake cover is missing from many basic packages — in Greece it is one of the most important home gaps.',
            },
            relatedRuleId: 'home-earthquake',
        },
        {
            id: 'home_flood_gap',
            title: { el: 'Ασαφής κάλυψη πλημμύρας', en: 'Unclear flood coverage' },
            description: {
                el: 'Η πλημμύρα και τα καιρικά φαινόμενα συχνά έχουν χωριστούς όρους και απαλλαγές — ίσως χρειάζεται έλεγχος στο ασφαλιστήριο.',
                en: 'Flood and weather events often carry separate terms and deductibles — the policy may need a check.',
            },
        },
        {
            id: 'home_contents_gap',
            title: { el: 'Μόνο κτίριο, χωρίς περιεχόμενο', en: 'Building only, no contents' },
            description: {
                el: 'Αν καλύπτεται μόνο το κτίριο, τα πράγματα μέσα στο σπίτι (έπιπλα, συσκευές) μένουν χωρίς προστασία σε κλοπή ή ζημιά.',
                en: 'If only the building is covered, the things inside (furniture, appliances) are unprotected against theft or damage.',
            },
        },
        {
            id: 'home_underinsurance_gap',
            title: { el: 'Πιθανή υπασφάλιση', en: 'Possible underinsurance' },
            description: {
                el: 'Αν η ασφαλισμένη αξία φαίνεται χαμηλή για τα τετραγωνικά της κατοικίας, η αποζημίωση σε ζημιά μπορεί να μειωθεί αναλογικά.',
                en: 'If the insured value appears low for the home’s square metres, a claim payout can be reduced proportionally.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'home_check_earthquake',
            label: { el: 'Ελέγξτε αν έχετε κάλυψη σεισμού', en: 'Check if you have earthquake cover' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Έχω κάλυψη σεισμού;', en: 'Do I have earthquake coverage?' },
        },
        {
            id: 'home_check_contents',
            label: { el: 'Δείτε αν καλύπτεται το περιεχόμενο', en: 'See if contents are covered' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Καλύπτεται το περιεχόμενο της κατοικίας μου;', en: 'Are my home contents covered?' },
        },
        {
            id: 'home_check_value',
            label: { el: 'Ελέγξτε αν η κατοικία είναι ασφαλισμένη στη σωστή αξία', en: 'Check the home is insured at the right value' },
            href: '/protection',
            ctaType: 'review',
        },
        {
            id: 'home_claim_folder',
            label: { el: 'Προετοιμάστε φάκελο ζημιάς', en: 'Prepare a claim file' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Τι χρειάζεται ο φάκελος ζημιάς για την κατοικία;', en: 'What does a home claim file need?' },
        },
        {
            id: 'home_ask_agent',
            label: { el: 'Ρωτήστε τον σύμβουλό σας για πλημμύρα και φυσικά φαινόμενα', en: 'Ask your advisor about flood and natural events' },
            href: '/agent',
            ctaType: 'askAgent',
        },
        {
            id: 'home_save_emergency_line',
            label: { el: 'Αποθηκεύστε τη γραμμή επείγουσας βοήθειας', en: 'Save the emergency assistance line' },
            href: null,
            ctaType: 'task',
            requiresPhone: true,
        },
    ],
    suggestedQuestions: [
        { el: 'Έχω κάλυψη σεισμού;', en: 'Do I have earthquake coverage?' },
        { el: 'Καλύπτεται το περιεχόμενο του σπιτιού;', en: 'Are the contents of my home covered?' },
        { el: 'Τι ισχύει για πλημμύρα και καιρικά φαινόμενα;', en: 'What applies for flood and weather events?' },
        { el: 'Ποια είναι η απαλλαγή σε ζημιά από νερά;', en: 'What is the deductible for water damage?' },
        { el: 'Καλύπτεται ζημιά που προκαλώ σε γείτονα;', en: 'Is damage I cause to a neighbour covered?' },
    ],
    claimsSteps: [
        {
            el: 'Περιορίστε τη ζημιά αν είναι ασφαλές (π.χ. κλείστε τον γενικό διακόπτη νερού) — μην ξεκινήσετε επισκευές πριν την καταγραφή.',
            en: 'Limit the damage if safe to do so (e.g. shut the main water valve) — do not start repairs before the damage is recorded.',
        },
        {
            el: 'Φωτογραφίστε ή βιντεοσκοπήστε τη ζημιά από κοντά και από απόσταση, πριν μετακινήσεις οτιδήποτε.',
            en: 'Photograph or film the damage close-up and from a distance, before moving anything.',
        },
        {
            el: 'Δηλώστε τη ζημιά στον ασφαλιστή σας το συντομότερο — τα περισσότερα ασφαλιστήρια ορίζουν προθεσμία λίγων ημερών.',
            en: 'Report the damage to your insurer promptly — most policies set a deadline of a few days.',
        },
        {
            el: 'Συγκεντρώστε αποδείξεις και τιμολόγια για ό,τι καταστράφηκε — βοηθούν τον πραγματογνώμονα να αποτιμήσει σωστά.',
            en: 'Gather receipts and invoices for what was destroyed — they help the loss adjuster value things correctly.',
        },
    ],
    renewalNote: {
        el: 'Πριν την ανανέωση, ελέγξτε αν η ασφαλισμένη αξία συμβαδίζει με το σημερινό κόστος ανακατασκευής — ειδικά μετά από ανακαινίσεις.',
        en: 'Before renewal, check the insured value against today’s rebuilding cost — especially after renovations.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει ασφαλιστήριο κατοικίας', en: 'No home policy added yet' },
        description: {
            el: 'Ανεβάστε το ασφαλιστήριο της κατοικίας σας και δείτε αν καλύπτεστε για σεισμό, πλημμύρα και περιεχόμενο.',
            en: 'Upload your home policy and see whether you are covered for earthquake, flood and contents.',
        },
        ctaLabel: { el: 'Ανεβάστε ασφαλιστήριο', en: 'Upload policy' },
    },
}
