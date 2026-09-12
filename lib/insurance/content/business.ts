import type { BranchContent } from './types'

export const businessContent: BranchContent = {
    branchId: 'business',
    tagline: {
        el: 'Στέγη, εξοπλισμός, εμπορεύματα, ευθύνη: δείτε αν οι καλύψεις της επιχείρησής σας ταιριάζουν με τη δραστηριότητά της.',
        en: 'Premises, equipment, stock, liability: see whether your business covers match what the business actually does.',
    },
    shortDescription: {
        el: 'Επαγγελματική στέγη, εξοπλισμός, διακοπή εργασιών, αστική και εργοδοτική ευθύνη — τι φαίνεται να καλύπτει το ασφαλιστήριο της επιχείρησής σας.',
        en: 'Business premises, equipment, business interruption, general and employer liability — what your business policy appears to cover.',
    },
    whyItMatters: [
        {
            el: 'Μια πυρκαγιά ή πλημμύρα δεν κοστίζει μόνο τη ζημιά — κοστίζει και τις μέρες που η επιχείρηση μένει κλειστή. Η διακοπή εργασιών συχνά λείπει από βασικά πακέτα.',
            en: 'A fire or flood does not only cost the damage — it costs the days the business stays shut. Business interruption is often missing from basic packages.',
        },
        {
            el: 'Η αστική ευθύνη προς πελάτες και τρίτους (π.χ. ατύχημα στον χώρο σας) μπορεί να ξεπεράσει κατά πολύ τη ζημιά σε πράγματα.',
            en: 'Liability to customers and third parties (e.g. an accident on your premises) can far exceed property damage.',
        },
        {
            el: 'Αν απασχολείς προσωπικό, η ευθύνη εργοδότη είναι ξεχωριστή κάλυψη — δεν προκύπτει αυτόματα από τη γενική αστική ευθύνη.',
            en: 'If you employ staff, employer liability is a separate cover — it does not follow automatically from general liability.',
        },
        {
            el: 'Οι καλύψεις πρέπει να παρακολουθούν την πραγματική δραστηριότητα: νέος εξοπλισμός, νέο υποκατάστημα ή e-shop αλλάζουν την εικόνα κινδύνου.',
            en: 'Covers must track the real activity: new equipment, a new branch or an e-shop change the risk picture.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Με βάση το έγγραφο που ανεβάσατε: ασφαλισμένα κεφάλαια για κτίριο/στέγη, εξοπλισμό και εμπορεύματα, με τις απαλλαγές τους.',
            en: 'Based on the document you uploaded: insured amounts for premises, equipment and stock, with their deductibles.',
        },
        {
            el: 'Καλύψεις πυρκαγιάς, κλοπής, φυσικών φαινομένων και διακοπής εργασιών — και τα όρια της καθεμιάς.',
            en: 'Fire, theft, natural events and business-interruption covers — and each one’s limits.',
        },
        {
            el: 'Αστική ευθύνη (γενική, επαγγελματική, εργοδοτική) όπως εμφανίζεται στο ασφαλιστήριο.',
            en: 'Liability (general, professional, employer) as it appears in the policy.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Μετά από κάθε επένδυση σε εξοπλισμό ή αύξηση αποθέματος, ενημερώστε τα ασφαλισμένα κεφάλαια — η υπασφάλιση μειώνει την αποζημίωση αναλογικά.',
            en: 'After every equipment purchase or stock increase, update the insured amounts — underinsurance reduces payouts proportionally.',
        },
        {
            el: 'Κρατήστε απογραφή εξοπλισμού και αποθέματος με φωτογραφίες και τιμολόγια — ο φάκελος ζημιάς χτίζεται πριν τη ζημιά.',
            en: 'Keep an inventory of equipment and stock with photos and invoices — a claim file is built before the loss.',
        },
        {
            el: 'Μία φορά τον χρόνο, διαβάστε τις εξαιρέσεις μαζί με τον σύμβουλό σας — οι δραστηριότητες αλλάζουν πιο γρήγορα από τα ασφαλιστήρια.',
            en: 'Once a year, go through the exclusions with your advisor — activities change faster than policies.',
        },
    ],
    commonGaps: [
        {
            id: 'business_interruption_gap',
            title: { el: 'Χωρίς κάλυψη διακοπής εργασιών', en: 'No business-interruption cover' },
            description: {
                el: 'Αν η επιχείρηση κλείσει προσωρινά μετά από ζημιά, τα σταθερά έξοδα και τα χαμένα έσοδα μένουν ακάλυπτα χωρίς αυτή την κάλυψη.',
                en: 'If the business shuts temporarily after damage, fixed costs and lost income go uncovered without this cover.',
            },
        },
        {
            id: 'business_employer_gap',
            title: { el: 'Χωρίς ευθύνη εργοδότη', en: 'No employer liability' },
            description: {
                el: 'Εργατικό ατύχημα χωρίς εργοδοτική ευθύνη σημαίνει προσωπική έκθεση της επιχείρησης — ξεχωριστή κάλυψη από τη γενική.',
                en: 'A workplace accident without employer liability exposes the business directly — a separate cover from general liability.',
            },
        },
        {
            id: 'business_underinsurance_gap',
            title: { el: 'Κεφάλαια που έμειναν πίσω', en: 'Insured amounts left behind' },
            description: {
                el: 'Αν εξοπλισμός και εμπορεύματα μεγάλωσαν αλλά τα κεφάλαια έμειναν ίδια, η επιχείρηση φαίνεται υπασφαλισμένη.',
                en: 'If equipment and stock grew but insured amounts stayed flat, the business appears underinsured.',
            },
        },
        {
            id: 'business_liability_gap',
            title: { el: 'Ελλιπής αστική ευθύνη προς τρίτους', en: 'Insufficient third-party liability' },
            description: {
                el: 'Χαμηλά όρια ευθύνης μπροστά σε σωματική βλάβη τρίτου μπορεί να μην επαρκούν — ίσως αξίζει έλεγχος των ορίων.',
                en: 'Low liability limits may fall short against third-party injury — the limits may be worth a review.',
            },
            relatedRuleId: 'self_employed_no_liability',
        },
    ],
    recommendedActions: [
        {
            id: 'business_check_equipment',
            label: { el: 'Ελέγξτε αν καλύπτεται ο εξοπλισμός', en: 'Check the equipment is covered' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Καλύπτεται ο εξοπλισμός της επιχείρησης;', en: 'Is the business equipment covered?' },
        },
        {
            id: 'business_check_interruption',
            label: { el: 'Δείτε αν υπάρχει κάλυψη διακοπής εργασιών', en: 'See if business interruption is covered' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Έχω κάλυψη διακοπής εργασιών;', en: 'Do I have business-interruption cover?' },
        },
        {
            id: 'business_check_liability',
            label: { el: 'Ελέγξτε την αστική ευθύνη προς τρίτους', en: 'Check third-party liability' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Τι όρια έχει η αστική ευθύνη προς τρίτους;', en: 'What are my third-party liability limits?' },
        },
        {
            id: 'business_claim_folder',
            label: { el: 'Προετοιμάστε φάκελο ζημιάς', en: 'Prepare a claim file' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Τι χρειάζεται ο φάκελος ζημιάς της επιχείρησης;', en: 'What does a business claim file need?' },
        },
        {
            id: 'business_ask_agent_fit',
            label: { el: 'Δείτε με τον σύμβουλό σας αν οι καλύψεις ταιριάζουν με τη δραστηριότητα', en: 'Review with your advisor whether covers match the activity' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Καλύπτεται ο εξοπλισμός;', en: 'Is the equipment covered?' },
        { el: 'Υπάρχει κάλυψη διακοπής εργασιών;', en: 'Is business interruption covered?' },
        { el: 'Τι ισχύει για αστική ευθύνη προς τρίτους;', en: 'What applies for third-party liability?' },
        { el: 'Καλύπτονται φυσικά φαινόμενα;', en: 'Are natural events covered?' },
        { el: 'Καλύπτεται εργατικό ατύχημα;', en: 'Is a workplace accident covered?' },
    ],
    claimsSteps: [
        {
            el: 'Ασφαλίστε τον χώρο και περιορίστε τη ζημιά αν γίνεται με ασφάλεια — μην πετάξετε κατεστραμμένα αντικείμενα πριν την πραγματογνωμοσύνη.',
            en: 'Secure the site and limit the damage if safe — do not discard damaged items before the loss adjuster’s visit.',
        },
        {
            el: 'Φωτογραφίστε και καταγράψτε ζημιές σε στέγη, εξοπλισμό και εμπορεύματα, με ημερομηνίες.',
            en: 'Photograph and log damage to premises, equipment and stock, with dates.',
        },
        {
            el: 'Δηλώστε τη ζημιά άμεσα στον ασφαλιστή και, αν υπάρχει κλοπή ή φθορά από τρίτους, και στην αστυνομία.',
            en: 'Report to the insurer promptly and, for theft or third-party damage, also to the police.',
        },
        {
            el: 'Για διακοπή εργασιών, κρατήστε στοιχεία τζίρου πριν και μετά — η αποζημίωση υπολογίζεται πάνω σε αυτά.',
            en: 'For interruption claims, keep revenue records from before and after — compensation is computed on them.',
        },
    ],
    renewalNote: {
        el: 'Πριν την ανανέωση, ξαναμετρήστε: αξία εξοπλισμού, ύψος αποθέματος, αριθμός προσωπικού, νέες δραστηριότητες. Ό,τι άλλαξε, πρέπει να αποτυπωθεί.',
        en: 'Before renewal, re-measure: equipment value, stock level, headcount, new activities. Whatever changed should be reflected.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει ασφαλιστήριο επιχείρησης', en: 'No business policy added yet' },
        description: {
            el: 'Ανεβάστε το ασφαλιστήριο της επιχείρησής σας και δείτε αν στέγη, εξοπλισμός, εμπορεύματα και ευθύνη καλύπτονται όπως νομίζετε.',
            en: 'Upload your business policy and see whether premises, equipment, stock and liability are covered the way you assume.',
        },
        ctaLabel: { el: 'Ανεβάστε ασφαλιστήριο', en: 'Upload policy' },
    },
}
