import type { BranchContent } from './types'

export const motorContent: BranchContent = {
    branchId: 'motor',
    tagline: {
        el: 'Καταλάβετε τι πραγματικά καλύπτει το ασφαλιστήριο του αυτοκινήτου σας — πριν το χρειαστείτε.',
        en: 'Understand what your motor policy actually covers — before you need it.',
    },
    shortDescription: {
        el: 'Αστική ευθύνη, μικτή, κλοπή, φυσικά φαινόμενα, κρύσταλλα, οδική βοήθεια: το PolicyWallet διαβάζει το ασφαλιστήριό σας και σας δείχνει τι ισχύει, με απλά λόγια.',
        en: 'Liability, comprehensive, theft, natural events, glass, roadside assistance: PolicyWallet reads your policy and shows you what applies, in plain language.',
    },
    whyItMatters: [
        {
            el: 'Η βασική αστική ευθύνη είναι υποχρεωτική, αλλά καλύπτει μόνο τις ζημιές που προκαλείτε σε τρίτους — όχι το δικό σας όχημα.',
            en: 'Basic liability is mandatory, but it only covers damage you cause to others — not your own vehicle.',
        },
        {
            el: 'Καλύψεις όπως θραύση κρυστάλλων, φυσικά φαινόμενα ή κλοπή συχνά έχουν δικές τους απαλλαγές και όρια που αξίζει να γνωρίζετε από πριν.',
            en: 'Coverages like glass breakage, natural events or theft often carry their own deductibles and limits worth knowing in advance.',
        },
        {
            el: 'Σε ένα ατύχημα, το τι θα πληρώσετε εσείς εξαρτάται από την απαλλαγή και τους όρους — όχι μόνο από το αν «έχετε μικτή».',
            en: 'In an accident, what you pay depends on the deductible and the terms — not just on whether you "have comprehensive".',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Με βάση το έγγραφο που ανεβάσατε: καλύψεις (αστική ευθύνη, ίδιες ζημιές, κλοπή, πυρκαγιά, φυσικά φαινόμενα, κρύσταλλα), απαλλαγές και όρια.',
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
            el: 'Πριν από ταξίδι στο εξωτερικό, ελέγξτε αν χρειάζεστε Πράσινη Κάρτα και ζητήστε την έγκαιρα από τον ασφαλιστή σας.',
            en: 'Before a trip abroad, check whether you need a Green Card and request it from your insurer in time.',
        },
        {
            el: 'Αν το ασφαλιστήριο φαίνεται να περιλαμβάνει οδική βοήθεια, αποθηκεύστε το τηλέφωνο βοήθειας στο κινητό σας — θα το χρειαστείτε στον δρόμο, όχι στο σπίτι.',
            en: 'If the policy appears to include roadside assistance, save the assistance number on your phone — you will need it on the road, not at home.',
        },
        {
            el: 'Πριν την ανανέωση, συγκρίνετε τις βασικές καλύψεις και τις απαλλαγές — όχι μόνο το ασφάλιστρο.',
            en: 'Before renewal, compare the core coverages and deductibles — not just the premium.',
        },
    ],
    commonGaps: [
        {
            id: 'motor_theft_gap',
            title: { el: 'Χωρίς κάλυψη κλοπής', en: 'No theft coverage' },
            description: {
                el: 'Πολλά βασικά ασφαλιστήρια δεν καλύπτουν ολική ή μερική κλοπή. Αν το όχημα έχει αξία, ίσως αξίζει να το ελέγξεις.',
                en: 'Many basic policies do not cover total or partial theft. If the vehicle holds value, it may be worth checking.',
            },
            relatedRuleId: 'motor-theft',
        },
        {
            id: 'motor_legal_gap',
            title: { el: 'Χωρίς νομική προστασία', en: 'No legal protection' },
            description: {
                el: 'Η νομική προστασία βοηθά στη διεκδίκηση αποζημίωσης μετά από ατύχημα που δεν προκάλεσες εσείς.',
                en: 'Legal protection helps you pursue compensation after an accident that was not your fault.',
            },
            relatedRuleId: 'motor-legal',
        },
        {
            id: 'motor_green_card_gap',
            title: { el: 'Πράσινη Κάρτα προς λήξη', en: 'Green Card expiring' },
            description: {
                el: 'Αν οδηγείτε εκτός Ελλάδας, η Πράσινη Κάρτα πρέπει να ισχύει για όλη τη διάρκεια του ταξιδιού.',
                en: 'If you drive outside Greece, the Green Card must be valid for the whole trip.',
            },
            relatedRuleId: 'green_card_expiring',
        },
        {
            id: 'motor_expiry_gap',
            title: { el: 'Ασφαλιστήριο κοντά στη λήξη', en: 'Policy close to expiry' },
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
            label: { el: 'Ελέγξτε αν έχετε οδική βοήθεια', en: 'Check if you have roadside assistance' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Έχω οδική βοήθεια;', en: 'Do I have roadside assistance?' },
        },
        {
            id: 'motor_check_glass',
            label: { el: 'Δείτε τι ισχύει για θραύση κρυστάλλων', en: 'See what applies for glass breakage' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Τι ισχύει για θραύση κρυστάλλων;', en: 'What applies for glass breakage?' },
        },
        {
            id: 'motor_trip_prep',
            label: { el: 'Προετοιμαστείτε για ταξίδι με το αυτοκίνητο', en: 'Prepare for a road trip' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Ισχύει το ασφαλιστήριό μου για οδήγηση στο εξωτερικό;', en: 'Does my policy apply for driving abroad?' },
        },
        {
            id: 'motor_renewal_compare',
            label: { el: 'Συγκρίνετε βασικές καλύψεις πριν την ανανέωση', en: 'Compare core coverages before renewal' },
            href: '/renewals',
            ctaType: 'renewals',
        },
        {
            id: 'motor_ask_agent_mikti',
            label: { el: 'Ρωτήστε τον σύμβουλό σας για μικτή ασφάλιση', en: 'Ask your advisor about comprehensive cover' },
            href: '/agent',
            ctaType: 'askAgent',
        },
        {
            id: 'motor_request_green_card',
            label: { el: 'Ζητήστε πράσινη κάρτα', en: 'Request a green card' },
            href: '/agent',
            ctaType: 'askAgent',
        },
        {
            id: 'motor_save_emergency_line',
            label: { el: 'Αποθηκεύστε τη γραμμή επείγουσας βοήθειας', en: 'Save the emergency assistance line' },
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
            el: 'Σε ατύχημα: καλέστε πρώτα τη φροντίδα ατυχήματος του ασφαλιστή σας — καταγράφει το συμβάν και σας καθοδηγεί επί τόπου.',
            en: 'In an accident: call your insurer’s accident-care line first — it records the incident and guides you on the spot.',
        },
        {
            el: 'Φωτογραφίστε τα οχήματα, τις πινακίδες και το σημείο. Αν υπάρχουν τραυματισμοί ή διαφωνία, καλέστε και την Τροχαία.',
            en: 'Photograph the vehicles, the plates and the scene. If there are injuries or a dispute, also call the traffic police.',
        },
        {
            // Singular, like its three siblings. The operative content of this step
            // was written in a later pass and arrived in the formal plural, so the
            // most-read claims list in the product — motor is the compulsory line —
            // switched register halfway down, at the step someone reads standing at
            // the roadside. Every point it makes is unchanged.
            el: 'Συμπληρώστε φιλική δήλωση μόνο αν συμφωνείτε για το τι συνέβη — επιταχύνει τη διαδικασία. Αν δεν είστε σίγουροι ποιος φταίει, μην υπογράψετε δήλωση υπαιτιότητας· καταγράψτε μόνο τα γεγονότα και αφήστε τους ασφαλιστές να κρίνουν.',
            en: 'Fill in the amicable accident statement only if you agree on what happened — it speeds things up. If you are unsure who is at fault, do not sign an admission of fault; record only the facts and let the insurers assess.',
        },
        {
            el: 'Κρατήστε το ασφαλιστήριο και τον αριθμό του πρόχειρα — θα σας ζητηθούν σε κάθε επικοινωνία.',
            en: 'Keep your policy and its number at hand — you will be asked for them in every interaction.',
        },
    ],
    renewalNote: {
        el: 'Θα σας θυμίσουμε πριν τη λήξη. Πριν ανανεώσετε, αξίζει ένας γρήγορος έλεγχος: ίδιες καλύψεις, ίδιες απαλλαγές, σωστή αξία οχήματος.',
        en: 'We will remind you before expiry. Before renewing, a quick check is worth it: same coverages, same deductibles, correct vehicle value.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει ασφαλιστήριο αυτοκινήτου', en: 'No motor policy added yet' },
        description: {
            el: 'Ανεβάστε το ασφαλιστήριο του οχήματός σας και δείτε με απλά λόγια τι καλύπτει — και τι ίσως λείπει.',
            en: 'Upload your vehicle policy and see in plain language what it covers — and what may be missing.',
        },
        ctaLabel: { el: 'Ανεβάστε ασφαλιστήριο', en: 'Upload policy' },
    },
}
