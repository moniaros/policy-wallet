import type { BranchContent } from './types'

/**
 * Marine cargo — goods in transit, by sea, road, rail or air.
 *
 * The decisive fact in almost every cargo policy is which Institute Cargo
 * Clauses set applies. ICC (A) is all-risks; ICC (C) is a short list of major
 * casualties and leaves theft, non-delivery, water damage and handling damage
 * outside. Two policies that look identical in the schedule can differ by that
 * one letter, so the copy leads with it.
 *
 * HONESTY: the clause set is stated in the document; we read it and explain
 * what that named set does. We do not infer a set that is not written down.
 */
export const marineCargoContent: BranchContent = {
    branchId: 'marine_cargo',
    tagline: {
        el: 'Ένα γράμμα στη ρήτρα — A, B ή C — αλλάζει περισσότερα από κάθε άλλο νούμερο στο συμβόλαιο.',
        en: 'One letter in the clause — A, B or C — changes more than any number in the schedule.',
    },
    shortDescription: {
        el: 'Ασφάλιση εμπορευμάτων κατά τη μεταφορά: ασφαλισμένη αξία και βάση αποτίμησης, το ταξίδι και το μέσο, οι ρήτρες του Ινστιτούτου Ασφαλιστών Λονδίνου που ορίζουν τι καλύπτεται, οι όροι συσκευασίας και πρόσδεσης, και οι γεωγραφικές εξαιρέσεις.',
        en: 'Cover for goods while they move: the insured value and basis of valuation, the voyage and the conveyance, the London Institute Cargo Clauses that decide what is covered, the packing and securing conditions, and the territorial exclusions.',
    },
    whyItMatters: [
        {
            el: 'Οι ρήτρες (C) καλύπτουν ονομαστικά μεγάλα συμβάντα — πυρκαγιά, έκρηξη, προσάραξη, βύθιση, ανατροπή ή εκτροχιασμό, σύγκρουση. Η κλοπή, η μη παράδοση, η ζημιά από νερό και η ζημιά κατά τη φορτοεκφόρτωση δεν περιλαμβάνονται.',
            en: 'The (C) clauses cover a named list of major casualties — fire, explosion, stranding, sinking, overturning or derailment, collision. Theft, non-delivery, water damage and handling damage are not on it.',
        },
        {
            el: 'Η ανεπαρκής ή ακατάλληλη συσκευασία εξαιρείται όταν έγινε από τον ασφαλισμένο ή το προσωπικό του. Πολλά συμβόλαια προσθέτουν και θετικό όρο επαγγελματικής συσκευασίας και ασφαλούς πρόσδεσης — η ίδια απαίτηση, γραμμένη δύο φορές.',
            en: 'Insufficient or unsuitable packing is excluded where the assured or their employees carried it out. Many policies add a positive condition of professional packing and secure lashing as well — the same requirement, written twice.',
        },
        {
            el: 'Η κάλυψη είναι δεμένη σε συγκεκριμένο ταξίδι και μέσο. Μια αλλαγή διαδρομής, μια ενδιάμεση αποθήκευση ή μια δεύτερη φόρτωση που δεν είχε δηλωθεί μπορούν να βγάλουν το φορτίο εκτός.',
            en: 'Cover attaches to a specific voyage and conveyance. A change of route, an intermediate storage or a second loading that was not declared can take the consignment outside it.',
        },
        {
            el: 'Οι ρήτρες κυρώσεων και οι εδαφικές εξαιρέσεις δεν είναι τυπικές: αν η διαδρομή αγγίξει χώρα ή ύδατα υπό καθεστώς κυρώσεων, η κάλυψη μπορεί να πάψει να ισχύει για ολόκληρη την αποστολή.',
            en: 'Sanctions clauses and territorial exclusions are not boilerplate: if the route touches a sanctioned country or its waters, cover can cease for the whole shipment.',
        },
        {
            el: 'Η αποθετική ζημιά — καθυστέρηση, χαμένη πώληση, ποινική ρήτρα προς πελάτη — εξαιρείται σχεδόν πάντα, ακόμη κι όταν προκλήθηκε από καλυπτόμενο κίνδυνο.',
            en: 'Consequential loss — delay, a lost sale, a penalty owed to a customer — is almost always excluded, even when a covered peril caused it.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Από το έγγραφο που ανεβάσατε: την ασφαλισμένη αξία, τη βάση αποτίμησης και την περιγραφή των ασφαλισμένων αντικειμένων.',
            en: 'From the document you uploaded: the insured value, the basis of valuation and the description of the subject-matter insured.',
        },
        {
            el: 'Το ταξίδι και τον τρόπο μεταφοράς, καθώς και την περίοδο ισχύος, που σε αυτόν τον κλάδο συχνά αφορά μία μόνο αποστολή αντί για έτος.',
            en: 'The voyage and mode of transport, plus the period of cover, which in this line is often a single shipment rather than a year.',
        },
        {
            el: 'Τις ρήτρες που κατονομάζονται — σετ ρητρών φορτίου, ρήτρες απεργιών, εξαιρέσεις πολέμου και κυρώσεων — ώστε να φαίνεται τι προσθέτει και τι αφαιρεί καθεμία.',
            en: 'The named clauses — cargo clause sets, strikes clauses, war and sanctions exclusions — so that what each one adds and removes is visible.',
        },
        {
            el: 'Τις προϋποθέσεις κάλυψης για συσκευασία, στοιβασία και πρόσδεση, και την απαλλαγή, όπως αναγράφονται.',
            en: 'The conditions of cover for packing, stowage and securing, and the deductible, as stated.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Ζητήστε να αναγράφεται ρητά το σετ ρητρών στο συμβόλαιο και κρατήστε το δίπλα στο δελτίο αποστολής — στη ζημιά, αυτά τα δύο διαβάζονται μαζί.',
            en: 'Ask for the clause set to be written into the policy explicitly and keep it beside the consignment note — in a loss those two are read together.',
        },
        {
            el: 'Φωτογραφίστε τη φόρτωση και την πρόσδεση πριν κλείσει το όχημα. Η τεκμηρίωση της συσκευασίας είναι η απάντηση στην πιο συχνή εξαίρεση του κλάδου.',
            en: 'Photograph the load and the lashing before the vehicle is closed. Documenting the packing is the answer to this line’s most common exclusion.',
        },
        {
            el: 'Σημειώστε επιφύλαξη στη φορτωτική κατά την παραλαβή αν υπάρχει ορατή ζημιά ή σπασμένη σφραγίδα — η ανεπιφύλακτη παραλαβή περιορίζει τα δικαιώματα αργότερα.',
            en: 'Note a reservation on the consignment note at delivery if there is visible damage or a broken seal — accepting without comment narrows the rights available later.',
        },
        {
            el: 'Για επαναλαμβανόμενες αποστολές, συγκρίνετε το κόστος ανά μεμονωμένη ασφάλιση με ένα ανοικτό συμβόλαιο· η κάλυψη ανά ταξίδι αφήνει κενά ακριβώς στις αποστολές που ξεχάστηκαν.',
            en: 'For repeat shipments, compare the cost of insuring each one against an open cover; per-voyage insurance leaves gaps exactly on the shipments that were forgotten.',
        },
    ],
    commonGaps: [
        {
            id: 'marine_cargo_narrow_clauses_gap',
            title: { el: 'Στενό σετ ρητρών για το είδος του φορτίου', en: 'Narrow clause set for this type of cargo' },
            description: {
                el: 'Όταν εφαρμόζονται οι ρήτρες (C), η κλοπή και η ζημιά κατά τον χειρισμό μένουν εκτός — κίνδυνοι που σε οδικές μεταφορές είναι από τους πιο συχνούς.',
                en: 'Where the (C) clauses apply, theft and handling damage stay outside — among the most frequent risks in road movements.',
            },
        },
        {
            id: 'marine_cargo_packing_condition_gap',
            title: { el: 'Απαίτηση συσκευασίας χωρίς τεκμηρίωση', en: 'Packing requirement with no record' },
            description: {
                el: 'Η επαγγελματική συσκευασία και η ασφαλής πρόσδεση ενδέχεται να είναι όροι κάλυψης. Χωρίς φωτογραφίες ή παραστατικά, η απόδειξη γίνεται δύσκολη μετά το συμβάν.',
                en: 'Professional packing and secure lashing can be conditions of cover. Without photographs or paperwork, proving them after the event is hard.',
            },
        },
        {
            id: 'marine_cargo_route_gap',
            title: { el: 'Διαδρομή εκτός της δηλωμένης', en: 'Route outside the one declared' },
            description: {
                el: 'Αλλαγή διαδρομής ή ενδιάμεση αποθήκευση που δεν είχε δηλωθεί ενδέχεται να διακόπτει την κάλυψη στο σημείο ακριβώς όπου αυξάνεται ο κίνδυνος.',
                en: 'A change of route or an undeclared intermediate storage can interrupt cover at precisely the point where risk rises.',
            },
        },
        {
            id: 'marine_cargo_consequential_gap',
            title: { el: 'Αποθετική ζημιά εκτός κάλυψης', en: 'Consequential loss outside cover' },
            description: {
                el: 'Η καθυστέρηση παράδοσης και οι συνέπειές της προς τον πελάτη συνήθως εξαιρούνται, ακόμη κι όταν η αιτία καλύπτεται.',
                en: 'Late delivery and its consequences towards the customer are usually excluded, even when the cause itself is covered.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'marine_cargo_check_clause_set',
            label: { el: 'Δείτε ποιο σετ ρητρών εφαρμόζεται', en: 'See which clause set applies' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιες ρήτρες φορτίου εφαρμόζονται και τι καλύπτουν;',
                en: 'Which cargo clauses apply and what do they cover?',
            },
        },
        {
            id: 'marine_cargo_check_theft',
            label: { el: 'Ελέγξτε αν καλύπτεται η κλοπή', en: 'Check whether theft is covered' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Καλύπτεται η κλοπή ή η μη παράδοση του φορτίου;',
                en: 'Is theft or non-delivery of the consignment covered?',
            },
        },
        {
            id: 'marine_cargo_check_conditions',
            label: { el: 'Δείτε τις προϋποθέσεις συσκευασίας', en: 'See the packing conditions' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιες προϋποθέσεις συσκευασίας και πρόσδεσης θέτει το συμβόλαιο;',
                en: 'What packing and securing conditions does the policy set?',
            },
        },
        {
            id: 'marine_cargo_review_period',
            label: { el: 'Ελέγξτε αν η κάλυψη αφορά ένα ταξίδι ή περίοδο', en: 'Check whether cover is per voyage or per period' },
            href: '/renewals',
            ctaType: 'renewals',
        },
        {
            id: 'marine_cargo_ask_agent_open_cover',
            label: { el: 'Ρωτήστε τον σύμβουλό σας για ανοικτή κάλυψη', en: 'Ask your advisor about an open cover' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Ποιο σετ ρητρών ισχύει στο συμβόλαιό μου;', en: 'Which clause set applies to my policy?' },
        { el: 'Καλύπτεται η ζημιά κατά τη φορτοεκφόρτωση;', en: 'Is damage during loading and unloading covered?' },
        { el: 'Ποια είναι η βάση αποτίμησης της ζημιάς;', en: 'What is the basis of valuation for a loss?' },
        { el: 'Σε ποιες χώρες δεν ισχύει η κάλυψη;', en: 'In which countries does the cover not apply?' },
        { el: 'Καλύπτεται η καθυστέρηση παράδοσης;', en: 'Is delay in delivery covered?' },
    ],
    claimsSteps: [
        {
            el: 'Σημειώστε επιφύλαξη στη φορτωτική ή στο δελτίο παράδοσης πριν υπογράψετε παραλαβή, όταν υπάρχει ορατή ζημιά, έλλειμμα ή παραβιασμένη σφραγίδα.',
            en: 'Note a reservation on the waybill or delivery note before signing for receipt, where there is visible damage, a shortage or a broken seal.',
        },
        {
            el: 'Ειδοποιήστε ασφαλιστή και μεταφορέα γραπτώς μέσα στις προθεσμίες που ορίζει η σύμβαση μεταφοράς — οι δύο προθεσμίες τρέχουν παράλληλα και είναι διαφορετικές.',
            en: 'Notify insurer and carrier in writing within the deadlines the contract of carriage sets — the two run in parallel and are not the same.',
        },
        {
            el: 'Κρατήστε το φορτίο και τη συσκευασία στην κατάσταση που παραλήφθηκαν μέχρι την πραγματογνωμοσύνη, και φωτογραφίστε πριν από κάθε αποσυσκευασία.',
            en: 'Keep the goods and packaging as received until the survey, and photograph before any unpacking.',
        },
        {
            el: 'Συγκεντρώστε τιμολόγιο, packing list, φορτωτική και αποδεικτικά συσκευασίας· η αξία και η αιτία κρίνονται από αυτά μαζί, όχι από ένα.',
            en: 'Gather the invoice, packing list, waybill and packing evidence; value and cause are settled from those together, not from any one of them.',
        },
    ],
    renewalNote: {
        el: 'Αν οι αποστολές είναι τακτικές, αξίζει να δείτε στην ανανέωση αν οι διαδρομές και οι αξίες που δηλώθηκαν αντιστοιχούν ακόμη στο πραγματικό μεταφορικό έργο.',
        en: 'If shipments are regular, renewal is the moment to check whether the routes and values declared still match what is actually being moved.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει ασφάλιση μεταφοράς εμπορευμάτων', en: 'No cargo policy added yet' },
        description: {
            el: 'Ανεβάστε το ασφαλιστήριο και δείτε ποιο σετ ρητρών ισχύει, τι καλύπτει και ποιες προϋποθέσεις θέτει για τη συσκευασία.',
            en: 'Upload the policy and see which clause set applies, what it covers and what it requires of the packing.',
        },
        ctaLabel: { el: 'Ανεβάστε ασφαλιστήριο', en: 'Upload policy' },
    },
}
