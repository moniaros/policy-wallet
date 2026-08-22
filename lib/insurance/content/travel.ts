import type { BranchContent } from './types'

export const travelContent: BranchContent = {
    branchId: 'travel',
    tagline: {
        el: 'Πριν φύγετε, μάθετε τι καλύπτει η ταξιδιωτική σας — προορισμός, ιατρικά, αποσκευές, ακύρωση.',
        en: 'Before you go, know what your travel policy covers — destination, medical, luggage, cancellation.',
    },
    shortDescription: {
        el: 'Ιατρικά έξοδα στο εξωτερικό, ακύρωση ταξιδιού, αποσκευές, καθυστερήσεις και επαναπατρισμός — τι φαίνεται να ισχύει στο δικό σας συμβόλαιο.',
        en: 'Medical expenses abroad, trip cancellation, luggage, delays and repatriation — what appears to apply in your own policy.',
    },
    whyItMatters: [
        {
            el: 'Τα ιατρικά έξοδα εκτός Ελλάδας (ειδικά εκτός ΕΕ) μπορούν να φτάσουν δεκάδες χιλιάδες ευρώ — η ΕΚΑΑ δεν καλύπτει τα πάντα.',
            en: 'Medical costs outside Greece (especially outside the EU) can reach tens of thousands of euros — the EHIC does not cover everything.',
        },
        {
            el: 'Τα γεωγραφικά όρια μετράνε: ένα συμβόλαιο «Ευρώπης» μπορεί να μην ισχύει σε ΗΠΑ ή Ασία.',
            en: 'Geographic limits matter: a "Europe" policy may not apply in the US or Asia.',
        },
        {
            el: 'Σπορ και δραστηριότητες (σκι, καταδύσεις, ενοικίαση μηχανής) συχνά εξαιρούνται — αν τα σχεδιάζετε, έλεγξέ το από πριν.',
            en: 'Sports and activities (ski, diving, renting a scooter) are often excluded — if you plan them, check beforehand.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Με βάση το έγγραφο που ανεβάσατε: όρια ιατρικών εξόδων, γεωγραφική ισχύ, διάρκεια ταξιδιού και εξαιρέσεις.',
            en: 'Based on the document you uploaded: medical limits, geographic validity, trip duration and exclusions.',
        },
        {
            el: 'Καλύψεις για ακύρωση, αποσκευές, καθυστερήσεις πτήσεων και επαναπατρισμό — με τα όρια και τις προϋποθέσεις τους.',
            en: 'Cancellation, luggage, flight-delay and repatriation covers — with their limits and conditions.',
        },
        {
            el: 'Τη γραμμή επείγουσας βοήθειας του ασφαλιστή, αν αναγράφεται — τον αριθμό που θέλετε πρόχειρο στο ταξίδι.',
            en: 'The insurer’s emergency assistance line, if stated — the number you want at hand while travelling.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Αποθηκεύστε τη γραμμή επείγουσας βοήθειας στο κινητό σας πριν φύγετε — σε επείγον δεν θα ψάχνετε PDF.',
            en: 'Save the emergency line on your phone before departure — in an emergency you will not be searching PDFs.',
        },
        {
            el: 'Κρατήστε αποδείξεις για ό,τι αγοράζεις λόγω καθυστέρησης ή απώλειας αποσκευών — χωρίς αυτές δύσκολα αποζημιώνεσαι.',
            en: 'Keep receipts for anything you buy due to delay or lost luggage — without them reimbursement is hard.',
        },
        {
            el: 'Για ακύρωση, δηλώστε το συμβάν άμεσα και κρατήστε κάθε έγγραφο (ιατρικά, ματαίωση πτήσης) — οι προθεσμίες είναι σύντομες.',
            en: 'For cancellation, report the event immediately and keep every document (medical, flight cancellation) — deadlines are short.',
        },
    ],
    commonGaps: [
        {
            id: 'travel_destination_gap',
            title: { el: 'Προορισμός εκτός γεωγραφικών ορίων', en: 'Destination outside geographic limits' },
            description: {
                el: 'Αν ο προορισμός δεν ανήκει στη ζώνη ισχύος του συμβολαίου, η κάλυψη ενδέχεται να μην ισχύει καθόλου.',
                en: 'If the destination is outside the policy’s zone, cover may not apply at all.',
            },
        },
        {
            id: 'travel_activities_gap',
            title: { el: 'Εξαιρέσεις σπορ και δραστηριοτήτων', en: 'Sports and activity exclusions' },
            description: {
                el: 'Χειμερινά σπορ, καταδύσεις ή ενοικίαση δικύκλου συχνά χρειάζονται ειδική επέκταση.',
                en: 'Winter sports, diving or two-wheeler rental often need a specific extension.',
            },
        },
        {
            id: 'travel_no_travel_gap',
            title: { el: 'Ταξιδεύεις συχνά χωρίς ετήσια κάλυψη', en: 'Frequent travel without annual cover' },
            description: {
                el: 'Αν ταξιδεύετε πολλές φορές τον χρόνο, μια ετήσια πολυταξιδιωτική κάλυψη μπορεί να συμφέρει από μεμονωμένες.',
                en: 'If you travel several times a year, an annual multi-trip policy can beat single-trip ones.',
            },
            relatedRuleId: 'travels_no_travel',
        },
    ],
    recommendedActions: [
        {
            id: 'travel_check_destination',
            label: { el: 'Ελέγξτε αν ο προορισμός σας καλύπτεται', en: 'Check your destination is covered' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Σε ποιες χώρες ισχύει το συμβόλαιό μου;', en: 'In which countries does my policy apply?' },
        },
        {
            id: 'travel_check_luggage',
            label: { el: 'Δείτε τι ισχύει για αποσκευές', en: 'See what applies for luggage' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Τι καλύπτεται για απώλεια αποσκευών;', en: 'What is covered for lost luggage?' },
        },
        {
            id: 'travel_prep',
            label: { el: 'Προετοιμαστείτε πριν το ταξίδι', en: 'Prepare before the trip' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Τι πρέπει να έχω μαζί μου από το συμβόλαιο στο ταξίδι;', en: 'What from my policy should I carry on the trip?' },
        },
        {
            id: 'travel_check_activities',
            label: { el: 'Δείτε αν καλύπτονται τα σπορ που σχεδιάζετε', en: 'See whether the sports you plan are covered' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Καλύπτονται δραστηριότητες όπως σκι, καταδύσεις ή ενοικίαση δικύκλου;',
                en: 'Are activities such as skiing, diving or renting a scooter covered?',
            },
        },
        {
            id: 'travel_find_hotline',
            label: { el: 'Βρείτε τη γραμμή επείγουσας βοήθειας', en: 'Find the emergency assistance line' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Ποιος είναι ο αριθμός επείγουσας βοήθειας;', en: 'What is the emergency assistance number?' },
        },
        {
            id: 'travel_ask_agent_scope',
            label: { el: 'Ρωτήστε τον σύμβουλό σας για επέκταση προορισμού ή δραστηριοτήτων', en: 'Ask your advisor about extending destination or activities' },
            href: '/agent',
            ctaType: 'askAgent',
        },
        {
            id: 'travel_save_trip_note',
            label: { el: 'Κρατήστε πρόχειρα τα στοιχεία του ταξιδιού', en: 'Keep your trip details at hand' },
            href: null,
            ctaType: 'task',
        },
    ],
    suggestedQuestions: [
        { el: 'Καλύπτονται ιατρικά έξοδα στο εξωτερικό;', en: 'Are medical expenses abroad covered?' },
        { el: 'Τι ισχύει για απώλεια αποσκευών;', en: 'What applies for lost luggage?' },
        { el: 'Καλύπτεται ακύρωση ταξιδιού;', en: 'Is trip cancellation covered?' },
        { el: 'Ισχύει το συμβόλαιο για χειμερινά σπορ;', en: 'Does the policy apply for winter sports?' },
        { el: 'Ποιος είναι ο αριθμός επείγουσας βοήθειας;', en: 'What is the emergency assistance number?' },
    ],
    claimsSteps: [
        {
            el: 'Σε ιατρικό περιστατικό στο εξωτερικό, καλέστε πρώτα τη γραμμή βοήθειας — συντονίζει νοσοκομείο και έξοδα πριν πληρώσετε εσείς.',
            en: 'For a medical event abroad, call the assistance line first — it coordinates hospital and costs before you pay.',
        },
        {
            el: 'Για αποσκευές, ζητήστε βεβαίωση από την αεροπορική (PIR) πριν φύγετε από το αεροδρόμιο.',
            en: 'For luggage, get the airline’s Property Irregularity Report before leaving the airport.',
        },
        {
            el: 'Κρατήστε κάθε απόδειξη και έγγραφο — οι ταξιδιωτικές αποζημιώσεις βασίζονται σχεδόν εξ ολοκλήρου σε παραστατικά.',
            en: 'Keep every receipt and document — travel claims rely almost entirely on paperwork.',
        },
    ],
    renewalNote: {
        el: 'Οι ταξιδιωτικές καλύψεις έχουν συγκεκριμένη διάρκεια ταξιδιού — για το επόμενο ταξίδι, ελέγξτε ημερομηνίες και προορισμό ξανά.',
        en: 'Travel covers run for a specific trip duration — for the next trip, check dates and destination again.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει ταξιδιωτική ασφάλιση', en: 'No travel policy added yet' },
        description: {
            el: 'Ανεβάστε την ταξιδιωτική σας κάλυψη και δείτε όρια ιατρικών, αποσκευές και τη γραμμή βοήθειας — πριν φύγετε.',
            en: 'Upload your travel cover and see medical limits, luggage terms and the assistance line — before you leave.',
        },
        ctaLabel: { el: 'Ανεβάστε συμβόλαιο', en: 'Upload policy' },
    },
}
