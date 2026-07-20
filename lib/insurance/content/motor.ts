import type { BranchContent } from './types'

export const motorContent: BranchContent = {
    branchId: 'motor',
    tagline: {
        el: 'Κατάλαβε τι πραγματικά καλύπτει το συμβόλαιο του αυτοκινήτου σου — πριν το χρειαστείς.',
        en: 'Understand what your motor policy actually covers — before you need it.',
    },
    shortDescription: {
        el: 'Αστική ευθύνη, μικτή, κλοπή, φυσικά φαινόμενα, κρύσταλλα, οδική βοήθεια: το PolicyWallet διαβάζει το συμβόλαιό σου και σου δείχνει τι ισχύει, με απλά λόγια.',
        en: 'Liability, comprehensive, theft, natural events, glass, roadside assistance: PolicyWallet reads your policy and shows you what applies, in plain language.',
    },
    whyItMatters: [
        {
            el: 'Η βασική αστική ευθύνη είναι υποχρεωτική, αλλά καλύπτει μόνο τις ζημιές που προκαλείς σε τρίτους — όχι το δικό σου όχημα.',
            en: 'Basic liability is mandatory, but it only covers damage you cause to others — not your own vehicle.',
        },
        {
            el: 'Καλύψεις όπως θραύση κρυστάλλων, φυσικά φαινόμενα ή κλοπή συχνά έχουν δικές τους απαλλαγές και όρια που αξίζει να γνωρίζεις από πριν.',
            en: 'Coverages like glass breakage, natural events or theft often carry their own deductibles and limits worth knowing in advance.',
        },
        {
            el: 'Σε ένα ατύχημα, το τι θα πληρώσεις εσύ εξαρτάται από την απαλλαγή και τους όρους — όχι μόνο από το αν «έχεις μικτή».',
            en: 'In an accident, what you pay depends on the deductible and the terms — not just on whether you "have comprehensive".',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Με βάση το έγγραφο που ανέβασες: καλύψεις (αστική ευθύνη, ίδιες ζημιές, κλοπή, πυρκαγιά, φυσικά φαινόμενα, κρύσταλλα), απαλλαγές και όρια.',
            en: 'Based on the document you uploaded: coverages (liability, own damage, theft, fire, natural events, glass), deductibles and limits.',
        },
        {
            el: 'Οδική βοήθεια, νομική προστασία, φροντίδα ατυχήματος και όχημα αντικατάστασης — αν φαίνεται να περιλαμβάνονται.',
            en: 'Roadside assistance, legal protection, accident care and replacement vehicle — if they appear to be included.',
        },
        {
            el: 'Ημερομηνία λήξης, τρόπος ανανέωσης και στοιχεία για την Πράσινη Κάρτα αν εντοπιστούν στο έγγραφο.',
            en: 'Expiry date, renewal terms and Green Card details if found in the document.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Πριν από ταξίδι στο εξωτερικό, έλεγξε αν χρειάζεσαι Πράσινη Κάρτα και ζήτησέ την έγκαιρα από τον ασφαλιστή σου.',
            en: 'Before a trip abroad, check whether you need a Green Card and request it from your insurer in time.',
        },
        {
            el: 'Αν το συμβόλαιο φαίνεται να περιλαμβάνει οδική βοήθεια, αποθήκευσε το τηλέφωνο βοήθειας στο κινητό σου — θα το χρειαστείς στον δρόμο, όχι στο σπίτι.',
            en: 'If the policy appears to include roadside assistance, save the assistance number on your phone — you will need it on the road, not at home.',
        },
        {
            el: 'Πριν την ανανέωση, σύγκρινε τις βασικές καλύψεις και τις απαλλαγές — όχι μόνο το ασφάλιστρο.',
            en: 'Before renewal, compare the core coverages and deductibles — not just the premium.',
        },
    ],
    commonGaps: [
        {
            id: 'motor_theft_gap',
            title: { el: 'Χωρίς κάλυψη κλοπής', en: 'No theft coverage' },
            description: {
                el: 'Πολλά βασικά συμβόλαια δεν καλύπτουν ολική ή μερική κλοπή. Αν το όχημα έχει αξία, ίσως αξίζει να το ελέγξεις.',
                en: 'Many basic policies do not cover total or partial theft. If the vehicle holds value, it may be worth checking.',
            },
            relatedRuleId: 'motor-theft',
        },
        {
            id: 'motor_legal_gap',
            title: { el: 'Χωρίς νομική προστασία', en: 'No legal protection' },
            description: {
                el: 'Η νομική προστασία βοηθά στη διεκδίκηση αποζημίωσης μετά από ατύχημα που δεν προκάλεσες εσύ.',
                en: 'Legal protection helps you pursue compensation after an accident that was not your fault.',
            },
            relatedRuleId: 'motor-legal',
        },
        {
            id: 'motor_green_card_gap',
            title: { el: 'Πράσινη Κάρτα προς λήξη', en: 'Green Card expiring' },
            description: {
                el: 'Αν οδηγείς εκτός Ελλάδας, η Πράσινη Κάρτα πρέπει να ισχύει για όλη τη διάρκεια του ταξιδιού.',
                en: 'If you drive outside Greece, the Green Card must be valid for the whole trip.',
            },
            relatedRuleId: 'green_card_expiring',
        },
        {
            id: 'motor_expiry_gap',
            title: { el: 'Συμβόλαιο κοντά στη λήξη', en: 'Policy close to expiry' },
            description: {
                el: 'Ανασφάλιστο όχημα σημαίνει πρόστιμα και προσωπική ευθύνη για ζημιές. Η ανανέωση αξίζει να κλείνει πριν τη λήξη.',
                en: 'An uninsured vehicle means fines and personal liability for damage. Renewal is worth completing before expiry.',
            },
            relatedRuleId: 'motor_expiring_soon',
        },
    ],
    recommendedActions: [
        {
            id: 'motor_check_roadside',
            label: { el: 'Έλεγξε αν έχεις οδική βοήθεια', en: 'Check if you have roadside assistance' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Έχω οδική βοήθεια;', en: 'Do I have roadside assistance?' },
        },
        {
            id: 'motor_check_glass',
            label: { el: 'Δες τι ισχύει για θραύση κρυστάλλων', en: 'See what applies for glass breakage' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Τι ισχύει για θραύση κρυστάλλων;', en: 'What applies for glass breakage?' },
        },
        {
            id: 'motor_trip_prep',
            label: { el: 'Προετοιμάσου για ταξίδι με το αυτοκίνητο', en: 'Prepare for a road trip' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Ισχύει το συμβόλαιό μου για οδήγηση στο εξωτερικό;', en: 'Does my policy apply for driving abroad?' },
        },
        {
            id: 'motor_renewal_compare',
            label: { el: 'Σύγκρινε βασικές καλύψεις πριν την ανανέωση', en: 'Compare core coverages before renewal' },
            href: '/renewals',
            ctaType: 'renewals',
        },
        {
            id: 'motor_ask_agent_mikti',
            label: { el: 'Ρώτησε τον σύμβουλό σου για μικτή ασφάλιση', en: 'Ask your advisor about comprehensive cover' },
            href: '/agent',
            ctaType: 'askAgent',
        },
        {
            id: 'motor_request_green_card',
            label: { el: 'Ζήτησε πράσινη κάρτα', en: 'Request a green card' },
            href: '/agent',
            ctaType: 'askAgent',
        },
        {
            id: 'motor_save_emergency_line',
            label: { el: 'Αποθήκευσε τη γραμμή επείγουσας βοήθειας', en: 'Save the emergency assistance line' },
            href: null,
            ctaType: 'task',
            requiresPhone: true,
        },
    ],
    suggestedQuestions: [
        { el: 'Καλύπτομαι για φυσικά φαινόμενα;', en: 'Am I covered for natural events?' },
        { el: 'Έχω οδική βοήθεια;', en: 'Do I have roadside assistance?' },
        { el: 'Ποια είναι η απαλλαγή στη μικτή;', en: 'What is the deductible on my comprehensive cover?' },
        { el: 'Τι πρέπει να κάνω σε περίπτωση ατυχήματος;', en: 'What should I do in case of an accident?' },
        { el: 'Καλύπτεται η κλοπή του οχήματος;', en: 'Is vehicle theft covered?' },
    ],
    claimsSteps: [
        {
            el: 'Σε ατύχημα: κάλεσε πρώτα τη φροντίδα ατυχήματος του ασφαλιστή σου — καταγράφει το συμβάν και σε καθοδηγεί επί τόπου.',
            en: 'In an accident: call your insurer’s accident-care line first — it records the incident and guides you on the spot.',
        },
        {
            el: 'Φωτογράφισε τα οχήματα, τις πινακίδες και το σημείο. Αν υπάρχουν τραυματισμοί ή διαφωνία, κάλεσε και την Τροχαία.',
            en: 'Photograph the vehicles, the plates and the scene. If there are injuries or a dispute, also call the traffic police.',
        },
        {
            el: 'Συμπλήρωσε φιλική δήλωση αν συμφωνείτε — επιταχύνει σημαντικά τη διαδικασία.',
            en: 'Fill in the amicable accident statement if you both agree — it speeds up the process significantly.',
        },
        {
            el: 'Κράτα το συμβόλαιο και τον αριθμό του πρόχειρα — θα σου ζητηθούν σε κάθε επικοινωνία.',
            en: 'Keep your policy and its number at hand — you will be asked for them in every interaction.',
        },
    ],
    renewalNote: {
        el: 'Θα σου θυμίσουμε πριν τη λήξη. Πριν ανανεώσεις, αξίζει ένας γρήγορος έλεγχος: ίδιες καλύψεις, ίδιες απαλλαγές, σωστή αξία οχήματος.',
        en: 'We will remind you before expiry. Before renewing, a quick check is worth it: same coverages, same deductibles, correct vehicle value.',
    },
    emptyState: {
        headline: { el: 'Δεν έχεις προσθέσει συμβόλαιο αυτοκινήτου', en: 'No motor policy added yet' },
        description: {
            el: 'Ανέβασε το ασφαλιστήριο του οχήματός σου και δες με απλά λόγια τι καλύπτει — και τι ίσως λείπει.',
            en: 'Upload your vehicle policy and see in plain language what it covers — and what may be missing.',
        },
        ctaLabel: { el: 'Ανέβασε συμβόλαιο', en: 'Upload policy' },
    },
}
