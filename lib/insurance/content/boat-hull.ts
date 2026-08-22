import type { BranchContent } from './types'

/**
 * Pleasure-craft hull & machinery — the "own damage" half of a boat programme.
 *
 * Split from `boat` because the two halves are sold, priced and lapsed
 * separately: a craft can carry the compulsory liability with no hull cover at
 * all, and the deductibles that decide a hull claim have nothing to do with the
 * liability tower.
 *
 * HONESTY: hull policies in the Greek market run on the Institute Yacht Clauses
 * (1/11/85) and their extensions, which arrive as free text plus a schedule.
 * `whatWeAnalyze` therefore promises to read what the schedule states — the
 * deductible ladder, the warranties, the scheduled equipment — not to know the
 * market's standard terms on the customer's behalf.
 */
export const boatHullContent: BranchContent = {
    branchId: 'boat_hull',
    tagline: {
        el: 'Το ποσό που θα πάρετε για ζημιά στο ίδιο το σκάφος κρίνεται από την απαλλαγή, όχι από το ασφαλισμένο κεφάλαιο.',
        en: 'What a claim on the boat itself pays out is decided by the deductible, not by the sum insured.',
    },
    shortDescription: {
        el: 'Κάλυψη ιδίων ζημιών σκάφους και μηχανών: ασφαλισμένη αξία, κλίμακα απαλλαγών ανά είδος ζημιάς, επέκταση μηχανικών βλαβών, εξοπλισμός και βοηθητικά σκάφη σε ξεχωριστές αξίες, και οι απαράβατοι όροι που πρέπει να τηρούνται για να ισχύει η κάλυψη.',
        en: 'Own-damage cover for hull and machinery: the insured value, the ladder of deductibles by type of damage, the machinery-damage extension, equipment and tenders at their own separate values, and the warranties that must hold for the cover to respond.',
    },
    whyItMatters: [
        {
            el: 'Οι απαλλαγές στο σκάφος δεν είναι ένα νούμερο αλλά κλίμακα: άλλη για ζημιά στο σκάφος, άλλη για μηχανική βλάβη, άλλη για το ελικοαξονικό, άλλη για τα βοηθητικά. Όταν ένα συμβάν αγγίζει περισσότερες από μία, συνήθως εφαρμόζεται η μεγαλύτερη.',
            en: 'Hull deductibles are not one number but a ladder: one for damage to the boat, another for machinery breakdown, another for the shaft and propeller, another for tenders. When one incident touches more than one, the largest is usually the one applied.',
        },
        {
            el: 'Η επέκταση μηχανικών βλαβών συνήθως συνοδεύεται από απαράβατο όρο συντήρησης σύμφωνα με τις οδηγίες του κατασκευαστή — με βάση ώρες λειτουργίας ή έτη. Χωρίς τα service, η επέκταση που πληρώθηκε ενδέχεται να μην ενεργοποιηθεί.',
            en: 'The machinery-damage extension normally comes with a warranty to service to the manufacturer’s instructions — by engine hours or by age. Without those services, the extension that was paid for may not respond.',
        },
        {
            el: 'Ο εξοπλισμός, τα βοηθητικά σκάφη και οι εξωλέμβιες ασφαλίζονται συχνά με δικές τους αξίες, χωριστά από το κύριο σκάφος. Αν δεν έχει δοθεί αναλυτική κατάσταση, η απόδειξη της αξίας μετά τη ζημιά γίνεται δύσκολη.',
            en: 'Equipment, tenders and outboards are often insured at their own values, separate from the parent craft. Where no itemised schedule has been given, proving value after a loss becomes hard.',
        },
        {
            el: 'Ο τόπος ελλιμενισμού συνήθως αποτελεί όρο κάλυψης, όχι λεπτομέρεια. Οργανωμένη μαρίνα, φυλασσόμενος χώρος ή parking σκαφών ενδέχεται να ζητούνται ρητά, ενώ ο μόνιμος ελλιμενισμός με ρεμέτζο μπορεί να εξαιρείται.',
            en: 'Where the craft is berthed is usually a condition of cover, not a detail. An organised marina, a fenced yard or a boat park may be required in terms, while a permanent swinging mooring can be excluded outright.',
        },
        {
            el: 'Πολλά συμβόλαια προβλέπουν ότι σε περίπτωση ολικής απώλειας το σύνολο των ετήσιων ασφαλίστρων καθίσταται άμεσα απαιτητό — η αποζημίωση και η οφειλή συναντιούνται στο ίδιο σημείο.',
            en: 'Many policies provide that on a total loss the whole annual premium falls due at once — the payout and the debt meet at the same point.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Από το έγγραφο που ανεβάσατε: την ασφαλισμένη αξία σκάφους και μηχανών, καθώς και τις χωριστές αξίες βοηθητικών σκαφών, εξωλέμβιων και εξοπλισμού όπου αναγράφονται.',
            en: 'From the document you uploaded: the insured value of hull and machinery, plus the separate values of tenders, outboards and equipment where they are stated.',
        },
        {
            el: 'Την κλίμακα απαλλαγών ανά είδος ζημιάς και τον κανόνα που ορίζει ποια εφαρμόζεται όταν ένα συμβάν αγγίζει περισσότερες από μία.',
            en: 'The ladder of deductibles by type of damage, and the rule that decides which one applies when a single incident touches more than one.',
        },
        {
            el: 'Τους απαράβατους όρους και τις προϋποθέσεις κάλυψης — συντήρηση, δίπλωμα κυβερνήτη, τόπος ελλιμενισμού, ισχύ εγγράφων — όπως είναι διατυπωμένοι, χωρίς δικές μας συμπληρώσετε.',
            en: 'The warranties and conditions of cover — servicing, skipper licence, place of berthing, validity of the craft’s papers — as they are worded, with nothing added by us.',
        },
        {
            el: 'Τις ρήτρες και επεκτάσεις που κατονομάζονται στο συμβόλαιο, ώστε να φαίνεται ποιες καλύψεις προστίθενται και ποιες αφαιρούνται από το βασικό κείμενο.',
            en: 'The named clauses and extensions the policy cites, so it is visible which covers they add to the base wording and which they take away.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Κρατήστε τα δελτία service μηχανής μαζί με το συμβόλαιο. Στη μηχανική βλάβη το πρώτο ερώτημα είναι σχεδόν πάντα πότε έγινε η τελευταία συντήρηση και με ποιες προδιαγραφές.',
            en: 'Keep the engine service records with the policy. In a machinery claim the first question is nearly always when the last service happened and to what specification.',
        },
        {
            el: 'Δώστε αναλυτική κατάσταση εξοπλισμού και προσωπικών αντικειμένων με φωτογραφίες και αριθμούς σειράς, και ανανέωσέ την όταν προσθέτετε ηλεκτρονικά.',
            en: 'Provide an itemised list of equipment and personal effects with photos and serial numbers, and refresh it whenever you add electronics.',
        },
        {
            el: 'Συγκρίνετε την ασφαλισμένη αξία με την τρέχουσα αγοραία αξία του σκάφους μία φορά τον χρόνο. Η υπερασφάλιση δεν αποδίδει παραπάνω και η υπασφάλιση μειώνει την αποζημίωση.',
            en: 'Compare the insured value against the boat’s current market value once a year. Over-insuring pays no more, and under-insuring reduces what a claim returns.',
        },
        {
            el: 'Αν αλλάξετε σημείο ελλιμενισμού ή περάσετε σε χειμερινό παροπλισμό, ενημερώστε γραπτώς — ο τόπος φύλαξης είναι από τους λίγους όρους που αλλάζουν χωρίς να το σκεφτούμε.',
            en: 'If you change berth or move into winter lay-up, say so in writing — where the boat is kept is one of the few terms that changes without our thinking about it.',
        },
    ],
    commonGaps: [
        {
            id: 'boat_hull_deductible_gap',
            title: { el: 'Απαλλαγή μεγαλύτερη από τη συνηθισμένη ζημιά', en: 'Deductible larger than the usual loss' },
            description: {
                el: 'Όταν η απαλλαγή ιδίων ζημιών είναι υψηλή, οι μικρές και μεσαίες ζημιές μένουν στην πράξη ακάλυπτες, ακόμη κι όταν το είδος τους καλύπτεται κανονικά.',
                en: 'Where the own-damage deductible is high, small and mid-sized losses stay uncovered in practice, even when their type is otherwise covered.',
            },
        },
        {
            id: 'boat_hull_machinery_warranty_gap',
            title: { el: 'Επέκταση μηχανικών βλαβών χωρίς τεκμηριωμένη συντήρηση', en: 'Machinery extension without documented servicing' },
            description: {
                el: 'Η επέκταση ενδέχεται να τελεί υπό όρο τακτικής συντήρησης. Χωρίς αποδεικτικά service, η κάλυψη που πληρώθηκε μπορεί να μην ενεργοποιηθεί.',
                en: 'The extension can be conditional on regular servicing. Without service records, the cover that was paid for may not respond.',
            },
        },
        {
            id: 'boat_hull_tender_schedule_gap',
            title: { el: 'Βοηθητικά και εξοπλισμός χωρίς αναλυτική κατάσταση', en: 'Tenders and equipment with no itemised schedule' },
            description: {
                el: 'Αν οι αξίες δεν έχουν δηλωθεί αναλυτικά, η αποζημίωση για εξοπλισμό ή βοηθητικό σκάφος ενδέχεται να περιοριστεί σε ό,τι μπορεί να αποδειχθεί.',
                en: 'If values have not been declared item by item, a claim for equipment or a tender can be limited to whatever can be proven.',
            },
        },
        {
            id: 'boat_hull_berthing_condition_gap',
            title: { el: 'Τόπος ελλιμενισμού εκτός των όρων', en: 'Berthing outside the policy’s terms' },
            description: {
                el: 'Ο μόνιμος ελλιμενισμός με ρεμέτζο ή σε μη οργανωμένο χώρο ενδέχεται να εξαιρείται ρητά, οπότε η κάλυψη δεν ισχύει εκεί που φυλάσσεται το σκάφος τον περισσότερο καιρό.',
                en: 'A permanent swinging mooring or an unmanaged yard can be expressly excluded, so cover does not apply where the boat spends most of its time.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'boat_hull_check_deductibles',
            label: { el: 'Δείτε την κλίμακα απαλλαγών', en: 'See the deductible ladder' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιες απαλλαγές ισχύουν ανά είδος ζημιάς στο σκάφος μου;',
                en: 'Which deductibles apply per type of damage on my boat policy?',
            },
        },
        {
            id: 'boat_hull_check_warranties',
            label: { el: 'Ελέγξτε τους απαράβατους όρους', en: 'Check the warranties' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιοι απαράβατοι όροι πρέπει να τηρούνται για να ισχύει η κάλυψη;',
                en: 'Which warranties have to be kept for the cover to apply?',
            },
        },
        {
            id: 'boat_hull_check_machinery',
            label: { el: 'Δείτε αν καλύπτονται μηχανικές βλάβες', en: 'See whether machinery breakdown is covered' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Καλύπτονται οι μηχανικές βλάβες και υπό ποιες προϋποθέσεις;',
                en: 'Is machinery breakdown covered, and on what conditions?',
            },
        },
        {
            id: 'boat_hull_review_value',
            label: { el: 'Συγκρίνετε ασφαλισμένη και αγοραία αξία', en: 'Compare insured and market value' },
            href: '/coverage-insights',
            ctaType: 'review',
        },
        {
            id: 'boat_hull_ask_agent_schedule',
            label: { el: 'Ρωτήστε τον σύμβουλό σας για την κατάσταση εξοπλισμού', en: 'Ask your advisor about the equipment schedule' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Ποια απαλλαγή θα εφαρμοστεί σε ζημιά της μηχανής;', en: 'Which deductible applies to engine damage?' },
        { el: 'Ποια είναι η ασφαλισμένη αξία του σκάφους και των μηχανών;', en: 'What is the insured value of the hull and machinery?' },
        { el: 'Καλύπτεται το βοηθητικό σκάφος και η εξωλέμβια;', en: 'Are the tender and the outboard covered?' },
        { el: 'Τι ζητά το συμβόλαιο για τη συντήρηση της μηχανής;', en: 'What does the policy require for engine servicing?' },
        { el: 'Πού επιτρέπεται να ελλιμενίζεται το σκάφος;', en: 'Where is the boat allowed to be berthed?' },
    ],
    claimsSteps: [
        {
            el: 'Ειδοποιήστε τον ασφαλιστή πριν από οποιαδήποτε επισκευή ή ανέλκυση, ώστε να προηγηθεί πραγματογνωμοσύνη όπου προβλέπεται.',
            en: 'Notify the insurer before any repair or lifting, so that a survey can come first where the policy provides for one.',
        },
        {
            el: 'Σε κλοπή ή κακόβουλη ζημιά, κάντε καταγγελία στην αστυνομία ή στη λιμενική αρχή αμέσως — η καθυστέρηση της δήλωσης σχολιάζεται στον φάκελο.',
            en: 'For theft or malicious damage, report to the police or the port authority at once — a late report is remarked upon in the file.',
        },
        {
            el: 'Συγκεντρώστε δελτία service, τιμολόγια εξοπλισμού και την κατάσταση αντικειμένων που είχε δοθεί στην ανάληψη· εκεί κρίνεται η αξία, όχι στην εκτίμηση της στιγμής.',
            en: 'Gather service records, equipment invoices and the schedule submitted at inception; that is where value is settled, not in an on-the-spot estimate.',
        },
        {
            el: 'Καταγράψτε ώρα, στίγμα και συνθήκες πριν μετακινηθεί οτιδήποτε, και κρατήστε φωτογραφίες πριν και μετά την επέμβαση διάσωσης.',
            en: 'Record time, position and conditions before anything is moved, and keep photographs from before and after any salvage operation.',
        },
    ],
    renewalNote: {
        el: 'Στην ανανέωση αξίζει έλεγχος σε τρία σημεία: αξία σκάφους, κατάσταση εξοπλισμού και αν τηρήθηκαν τα service που ζητά το συμβόλαιο.',
        en: 'At renewal three things are worth checking: the boat’s value, the equipment schedule, and whether the servicing the policy asks for was actually done.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει κάλυψη ιδίων ζημιών σκάφους', en: 'No boat hull cover added yet' },
        description: {
            el: 'Ανεβάστε το ασφαλιστήριο και δείτε την ασφαλισμένη αξία, τις απαλλαγές ανά είδος ζημιάς και τους όρους που πρέπει να τηρούνται.',
            en: 'Upload the policy and see the insured value, the deductibles per type of damage, and the conditions that have to be kept.',
        },
        ctaLabel: { el: 'Ανεβάστε ασφαλιστήριο', en: 'Upload policy' },
    },
}
