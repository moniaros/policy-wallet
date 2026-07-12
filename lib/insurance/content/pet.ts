import type { BranchContent } from './types'

export const petContent: BranchContent = {
    branchId: 'pet',
    tagline: {
        el: 'Κτηνίατρος, ατύχημα, ασθένεια: δες τι καλύπτει το συμβόλαιο του κατοικιδίου σου — και με ποιες αναμονές.',
        en: 'Vet, accident, illness: see what your pet policy covers — and with what waiting periods.',
    },
    shortDescription: {
        el: 'Κτηνιατρικά έξοδα, χειρουργεία, αστική ευθύνη και ηλικιακά όρια — τι φαίνεται να προβλέπει η κάλυψη του κατοικιδίου σου.',
        en: 'Vet costs, surgery, liability and age limits — what your pet cover appears to provide.',
    },
    whyItMatters: [
        {
            el: 'Ένα έκτακτο χειρουργείο μπορεί να κοστίσει εκατοντάδες ή χιλιάδες ευρώ — οι καλύψεις όμως έχουν όρια ανά περιστατικό και ανά έτος.',
            en: 'An emergency surgery can cost hundreds or thousands of euros — but covers carry per-incident and annual limits.',
        },
        {
            el: 'Οι αναμονές στα κατοικίδια είναι συχνά μεγαλύτερες για ασθένεια από ό,τι για ατύχημα — μετράει πότε ξεκίνησε η κάλυψη.',
            en: 'Pet waiting periods are often longer for illness than accident — when cover started matters.',
        },
        {
            el: 'Η αστική ευθύνη (ζημιά ή τραυματισμός που προκαλεί το κατοικίδιο σε τρίτους) είναι δική σου ευθύνη κατά τον νόμο.',
            en: 'Liability (damage or injury your pet causes to others) is legally your responsibility.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Με βάση το έγγραφο που ανέβασες: κτηνιατρικά έξοδα για ατύχημα και ασθένεια, όρια, απαλλαγές και συμμετοχές.',
            en: 'Based on the document you uploaded: vet costs for accident and illness, limits, deductibles and co-payments.',
        },
        {
            el: 'Αναμονές, ηλικιακά όρια και εξαιρέσεις (π.χ. προϋπάρχουσες παθήσεις, συγκεκριμένες φυλές, λεϊσμανίαση).',
            en: 'Waiting periods, age limits and exclusions (e.g. pre-existing conditions, specific breeds, leishmaniasis).',
        },
        {
            el: 'Αστική ευθύνη προς τρίτους και τυχόν παροχές όπως έξοδα φιλοξενίας ή απώλειας.',
            en: 'Third-party liability and any perks like boarding or loss-related costs.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Κράτα το βιβλιάριο υγείας και τα ιστορικά του κατοικιδίου οργανωμένα — ζητούνται σχεδόν σε κάθε αποζημίωση.',
            en: 'Keep the pet’s health booklet and history organised — they are requested in almost every claim.',
        },
        {
            el: 'Δες αν ο κτηνίατρός σου συνεργάζεται με τον ασφαλιστή — σε δίκτυο, η διαδικασία είναι συνήθως απλούστερη.',
            en: 'See whether your vet works with the insurer — in-network, the process is usually simpler.',
        },
        {
            el: 'Έλεγξε την κάλυψη για λεϊσμανίαση — στην Ελλάδα είναι από τις πιο σημαντικές παθήσεις για σκύλους.',
            en: 'Check leishmaniasis cover — in Greece it is one of the most relevant canine conditions.',
        },
    ],
    commonGaps: [
        {
            id: 'pet_leishmania_gap',
            title: { el: 'Χωρίς κάλυψη λεϊσμανίασης', en: 'No leishmaniasis coverage' },
            description: {
                el: 'Συχνή και χρόνια πάθηση στην Ελλάδα — αρκετά συμβόλαια την εξαιρούν ή τη καλύπτουν με όρους.',
                en: 'Common and chronic in Greece — several policies exclude it or cover it conditionally.',
            },
            relatedRuleId: 'missing_leishmaniasis',
        },
        {
            id: 'pet_age_gap',
            title: { el: 'Ηλικιακά όρια κάλυψης', en: 'Age limits on cover' },
            description: {
                el: 'Πολλά προγράμματα σταματούν νέες καλύψεις ή περιορίζουν παροχές μετά από κάποια ηλικία του ζώου.',
                en: 'Many plans stop new covers or restrict benefits past a certain pet age.',
            },
        },
        {
            id: 'pet_liability_gap',
            title: { el: 'Χωρίς αστική ευθύνη', en: 'No liability cover' },
            description: {
                el: 'Αν το κατοικίδιο προκαλέσει ζημιά ή τραυματισμό, η ευθύνη είναι δική σου — δες αν το συμβόλαιο την καλύπτει.',
                en: 'If your pet causes damage or injury, the responsibility is yours — see if the policy covers it.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'pet_check_vet',
            label: { el: 'Δες τι καλύπτεται στον κτηνίατρο', en: 'See what is covered at the vet' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Τι κτηνιατρικά έξοδα καλύπτονται;', en: 'Which vet costs are covered?' },
        },
        {
            id: 'pet_check_waits',
            label: { el: 'Έλεγξε αναμονές και όρια', en: 'Check waits and limits' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Ποιες αναμονές και ποια όρια ισχύουν;', en: 'Which waiting periods and limits apply?' },
        },
        {
            id: 'pet_prepare_records',
            label: { el: 'Προετοίμασε τα στοιχεία του κατοικιδίου', en: 'Prepare your pet’s records' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Τι έγγραφα χρειάζομαι για αποζημίωση κτηνιάτρου;', en: 'What documents do I need for a vet claim?' },
        },
    ],
    suggestedQuestions: [
        { el: 'Τι καλύπτεται στον κτηνίατρο;', en: 'What is covered at the vet?' },
        { el: 'Ποιες αναμονές ισχύουν;', en: 'Which waiting periods apply?' },
        { el: 'Καλύπτεται χειρουργείο;', en: 'Is surgery covered?' },
        { el: 'Υπάρχει όριο ηλικίας;', en: 'Is there an age limit?' },
        { el: 'Καλύπτεται η λεϊσμανίαση;', en: 'Is leishmaniasis covered?' },
    ],
    claimsSteps: [
        {
            el: 'Σε ατύχημα ή αιφνίδια ασθένεια, πήγαινε πρώτα στον κτηνίατρο — η υγεία του ζώου προηγείται της διαδικασίας.',
            en: 'In an accident or sudden illness, go to the vet first — the animal’s health comes before paperwork.',
        },
        {
            el: 'Ζήτησε αναλυτική απόδειξη και γνωμάτευση με διάγνωση — τα δύο βασικά έγγραφα κάθε φακέλου.',
            en: 'Ask for an itemised receipt and a report with diagnosis — the two core documents of any claim.',
        },
        {
            el: 'Δήλωσε το περιστατικό στον ασφαλιστή εντός της προθεσμίας του συμβολαίου, μαζί με το ιστορικό εμβολίων αν ζητηθεί.',
            en: 'Report to the insurer within the policy deadline, with the vaccination record if requested.',
        },
    ],
    renewalNote: {
        el: 'Στην ανανέωση, δες αν αλλάζουν όρια ή όροι λόγω ηλικίας του κατοικιδίου — και αν οι αναμονές που πέρασες διατηρούνται.',
        en: 'At renewal, check whether limits or terms change with your pet’s age — and whether served waiting periods carry over.',
    },
    emptyState: {
        headline: { el: 'Δεν έχεις προσθέσει ασφάλιση κατοικιδίου', en: 'No pet policy added yet' },
        description: {
            el: 'Ανέβασε το συμβόλαιο του κατοικιδίου σου και δες κτηνιατρικά όρια, αναμονές και τι ισχύει για λεϊσμανίαση.',
            en: 'Upload your pet policy and see vet limits, waiting periods and what applies for leishmaniasis.',
        },
        ctaLabel: { el: 'Ανέβασε συμβόλαιο', en: 'Upload policy' },
    },
}
