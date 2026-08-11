import type { BranchContent } from './types'

/**
 * Transports — the carrier's own liability for goods entrusted to them.
 *
 * Deliberately distinct from `marine_cargo`: cargo insures the OWNER's goods
 * and pays regardless of fault; carrier's liability answers what the HAULIER
 * owes when they are at fault, and it is capped by convention (CMR) rather than
 * by the value of the load.
 */
export const transportsContent: BranchContent = {
    branchId: 'transports',
    tagline: {
        el: 'Η ευθύνη του μεταφορέα δεν αποζημιώνει την αξία του φορτίου αλλά ό,τι ορίζει η σύμβαση μεταφοράς.',
        en: 'A carrier’s liability does not pay the value of the load; it pays what the contract of carriage says it owes.',
    },
    shortDescription: {
        el: 'Κάλυψη της ευθύνης του μεταφορέα για εμπορεύματα που του έχουν εμπιστευθεί: όρια κατά βάρος ή κατά αποστολή, γεωγραφικό πεδίο, εξαιρέσεις για συγκεκριμένα φορτία, και όροι φύλαξης και στάθμευσης του οχήματος.',
        en: 'Cover for a haulier’s liability for goods entrusted to them: limits by weight or by consignment, geographic scope, exclusions for particular cargoes, and conditions on how the vehicle is kept and parked.',
    },
    whyItMatters: [
        {
            el: 'Η αποζημίωση συνήθως υπολογίζεται με βάση όριο ανά κιλό μεικτού βάρους και όχι με βάση την εμπορική αξία. Για ελαφρύ και ακριβό φορτίο, η διαφορά μεταξύ των δύο είναι το ρίσκο.',
            en: 'Compensation is usually calculated on a limit per kilo of gross weight rather than on commercial value. For light, expensive cargo the difference between the two is the risk.',
        },
        {
            el: 'Ο μεταφορέας ευθύνεται εφόσον υπάρχει υπαιτιότητα ή δεν συντρέχει λόγος απαλλαγής. Το φορτίο που καταστρέφεται χωρίς υπαιτιότητά του μπορεί να μην παράγει καμία απαίτηση εναντίον του, και άρα καμία αποζημίωση προς τον πελάτη του.',
            en: 'A carrier is liable where there is fault and no exonerating cause. Cargo destroyed without their fault may generate no claim against them at all, and therefore no payment to their customer.',
        },
        {
            el: 'Οι όροι στάθμευσης και φύλαξης του οχήματος είναι από τους πιο συχνούς λόγους άρνησης: φυλασσόμενος χώρος, απαγόρευση διανυκτέρευσης σε ανοικτό δρόμο, ενεργός ιχνηλάτης.',
            en: 'Parking and custody conditions are among the most common grounds for declining: a guarded yard, no overnight stops on the open road, an active tracker.',
        },
        {
            el: 'Ορισμένα φορτία — χρήματα, τιμαλφή, ζωντανά ζώα, επικίνδυνα υλικά, μετακομίσεις — συχνά εξαιρούνται ή χρειάζονται ξεχωριστή συμφωνία πριν φορτωθούν.',
            en: 'Some cargoes — money, valuables, live animals, dangerous goods, household removals — are often excluded or need a separate agreement before they are loaded.',
        },
        {
            el: 'Η υπεργολαβία σε άλλο μεταφορέα δεν μεταθέτει αυτόματα την ευθύνη. Χωρίς έλεγχο της ασφάλισης του υπεργολάβου, η απαίτηση επιστρέφει στον αρχικό μεταφορέα.',
            en: 'Subcontracting to another haulier does not automatically move the liability. Without checking the subcontractor’s insurance, the claim comes back to the original carrier.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Από το έγγραφο που ανέβασες: τα όρια ευθύνης και τη βάση υπολογισμού τους, όπως αναγράφονται στο συμβόλαιο.',
            en: 'From the document you uploaded: the liability limits and the basis on which they are calculated, as stated in the policy.',
        },
        {
            el: 'Το γεωγραφικό πεδίο και τη σύμβαση μεταφοράς που επικαλείται το συμβόλαιο, καθώς ορίζει τι οφείλεται και σε πόσο χρόνο.',
            en: 'The geographic scope and the carriage convention the policy invokes, since it sets what is owed and within what time.',
        },
        {
            el: 'Τις εξαιρέσεις ανά είδος φορτίου και τους όρους φύλαξης, στάθμευσης και υπεργολαβίας, με τη διατύπωσή τους.',
            en: 'The exclusions by type of cargo and the conditions on custody, parking and subcontracting, in their own wording.',
        },
        {
            el: 'Την απαλλαγή και τυχόν συνολικό όριο για την περίοδο ασφάλισης.',
            en: 'The deductible and any aggregate limit for the period of cover.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Σύγκρινε το όριο ανά κιλό με τη μέση αξία ανά κιλό των φορτίων που πραγματικά μεταφέρεις — εκεί φαίνεται αν το όριο αντιστοιχεί στο έργο.',
            en: 'Compare the limit per kilo against the average value per kilo of what you actually carry — that shows whether the limit matches the work.',
        },
        {
            el: 'Ενημέρωσε τους πελάτες σου ότι η ευθύνη μεταφορέα δεν αντικαθιστά ασφάλιση εμπορευμάτων· η διαφορά συνήθως ανακαλύπτεται μετά τη ζημιά.',
            en: 'Tell your customers that carrier’s liability does not replace cargo insurance; the difference is usually discovered after a loss.',
        },
        {
            el: 'Καθιέρωσε κανόνα στάθμευσης σύμφωνο με τους όρους και κατάγραψέ τον, ώστε ο οδηγός να ξέρει τι επιτρέπεται πριν χρειαστεί να το αποφασίσει στον δρόμο.',
            en: 'Set a parking rule that matches the conditions and write it down, so the driver knows what is allowed before having to decide it on the road.',
        },
        {
            el: 'Ζήτησε και αρχειοθέτησε βεβαιώσεις ασφάλισης από κάθε υπεργολάβο πριν από την πρώτη φόρτωση.',
            en: 'Ask for and file certificates of insurance from every subcontractor before the first load.',
        },
    ],
    commonGaps: [
        {
            id: 'transports_value_vs_weight_gap',
            title: { el: 'Όριο κατά βάρος έναντι αξίας φορτίου', en: 'Weight-based limit against cargo value' },
            description: {
                el: 'Σε ελαφρύ και υψηλής αξίας φορτίο, το όριο ανά κιλό μπορεί να καλύπτει μικρό μέρος της πραγματικής ζημιάς.',
                en: 'On light, high-value cargo the per-kilo limit can cover a small part of the actual loss.',
            },
        },
        {
            id: 'transports_parking_condition_gap',
            title: { el: 'Όροι στάθμευσης που δεν εφαρμόζονται στη διαδρομή', en: 'Parking conditions that do not fit the route' },
            description: {
                el: 'Αν η διαδρομή απαιτεί διανυκτέρευση εκεί όπου δεν υπάρχει φυλασσόμενος χώρος, ο όρος και η πραγματικότητα δεν συμπίπτουν.',
                en: 'If the route requires an overnight stop where no guarded yard exists, the condition and the reality do not meet.',
            },
        },
        {
            id: 'transports_excluded_cargo_gap',
            title: { el: 'Φορτία εκτός κάλυψης', en: 'Cargo outside the cover' },
            description: {
                el: 'Ορισμένες κατηγορίες εμπορευμάτων εξαιρούνται ρητά· η ανάληψη τέτοιου φορτίου χωρίς προηγούμενη συμφωνία αφήνει τη μεταφορά ακάλυπτη.',
                en: 'Certain categories of goods are expressly excluded; taking such a load without prior agreement leaves the movement uncovered.',
            },
        },
        {
            id: 'transports_subcontractor_gap',
            title: { el: 'Υπεργολάβοι χωρίς επιβεβαιωμένη ασφάλιση', en: 'Subcontractors with unverified insurance' },
            description: {
                el: 'Όταν δεν έχει ελεγχθεί η κάλυψη του υπεργολάβου, η απαίτηση του πελάτη επιστρέφει στον αρχικό μεταφορέα.',
                en: 'Where a subcontractor’s cover has not been checked, the customer’s claim comes back to the original carrier.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'transports_check_limit_basis',
            label: { el: 'Δες πώς υπολογίζεται το όριο ευθύνης', en: 'See how the liability limit is calculated' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Με ποια βάση υπολογίζεται η αποζημίωση στο συμβόλαιό μου;',
                en: 'On what basis is compensation calculated in my policy?',
            },
        },
        {
            id: 'transports_check_excluded_cargo',
            label: { el: 'Έλεγξε ποια φορτία εξαιρούνται', en: 'Check which cargoes are excluded' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποια είδη φορτίου εξαιρούνται από την κάλυψη;',
                en: 'Which types of cargo are excluded from the cover?',
            },
        },
        {
            id: 'transports_check_parking',
            label: { el: 'Δες τους όρους στάθμευσης και φύλαξης', en: 'See the parking and custody conditions' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιοι όροι ισχύουν για τη στάθμευση και τη φύλαξη του οχήματος;',
                en: 'What conditions apply to parking and keeping the vehicle?',
            },
        },
        {
            id: 'transports_review_cargo_pairing',
            label: { el: 'Δες πώς συνδυάζεται με ασφάλιση εμπορευμάτων', en: 'See how it pairs with cargo insurance' },
            href: '/coverage-insights',
            ctaType: 'review',
        },
        {
            id: 'transports_ask_agent_subcontractors',
            label: { el: 'Ρώτησε τον σύμβουλό σου για τους υπεργολάβους', en: 'Ask your advisor about subcontractors' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Ποιο είναι το όριο ευθύνης ανά αποστολή;', en: 'What is the liability limit per consignment?' },
        { el: 'Σε ποιες χώρες ισχύει η κάλυψη;', en: 'In which countries does the cover apply?' },
        { el: 'Καλύπτεται η μεταφορά με υπεργολάβο;', en: 'Is carriage by a subcontractor covered?' },
        { el: 'Τι ισχύει αν το όχημα σταθμεύσει σε ανοικτό χώρο;', en: 'What applies if the vehicle parks in an open area?' },
        { el: 'Σε πόσο χρόνο πρέπει να δηλωθεί μια ζημιά;', en: 'Within what time must a loss be reported?' },
    ],
    claimsSteps: [
        {
            el: 'Κατάγραψε επιφύλαξη στη φορτωτική κατά την παράδοση όταν υπάρχει ορατή ζημιά ή έλλειμμα, και κράτησε αντίγραφο υπογεγραμμένο από τον παραλήπτη.',
            en: 'Note a reservation on the waybill at delivery where there is visible damage or a shortage, and keep a copy signed by the consignee.',
        },
        {
            el: 'Ειδοποίησε τον ασφαλιστή γραπτώς μέσα στην προθεσμία της σύμβασης μεταφοράς, ακόμη κι αν η ευθύνη αμφισβητείται.',
            en: 'Notify the insurer in writing within the deadline set by the contract of carriage, even where liability is disputed.',
        },
        {
            el: 'Συγκέντρωσε ταχογράφο, δεδομένα ιχνηλάτη και στοιχεία στάθμευσης· σε κλοπή αυτά κρίνουν αν τηρήθηκαν οι όροι.',
            en: 'Gather tachograph data, tracker records and parking details; in a theft these decide whether the conditions were kept.',
        },
        {
            el: 'Μην αναγνωρίσεις ευθύνη προς τον πελάτη πριν εξεταστεί αν συντρέχει λόγος απαλλαγής κατά τη σύμβαση μεταφοράς.',
            en: 'Do not accept liability towards the customer before it is examined whether an exonerating cause applies under the contract of carriage.',
        },
    ],
    renewalNote: {
        el: 'Αν άλλαξαν οι διαδρομές, ο στόλος ή το είδος των φορτίων, η ανανέωση είναι η στιγμή να ευθυγραμμιστούν τα όρια με το σημερινό μεταφορικό έργο.',
        en: 'If routes, fleet or the kind of cargo have changed, renewal is the moment to align the limits with the work as it is now.',
    },
    emptyState: {
        headline: { el: 'Δεν έχεις προσθέσει ασφάλιση ευθύνης μεταφορέα', en: 'No carrier’s liability policy added yet' },
        description: {
            el: 'Ανέβασε το ασφαλιστήριο και δες τα όρια ευθύνης, τις εξαιρέσεις ανά φορτίο και τους όρους στάθμευσης.',
            en: 'Upload the policy and see the liability limits, the exclusions by cargo and the parking conditions.',
        },
        ctaLabel: { el: 'Ανέβασε ασφαλιστήριο', en: 'Upload policy' },
    },
}
