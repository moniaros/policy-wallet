import type { BranchContent } from './types'

/**
 * Money — cash in a safe, cash at tills, cash in transit.
 *
 * The line's defining feature is that the limits are nested (per event, per
 * safe, per till, per risk address, per period) and the cover is conditional on
 * physical security measures that have to be true on the day of the loss —
 * which makes prevention and cover the same conversation here.
 */
export const moneyContent: BranchContent = {
    branchId: 'money',
    tagline: {
        el: 'Τα μετρητά ασφαλίζονται ανά σημείο και ανά γεγονός — και μόνο όσο τα μέτρα ασφαλείας που δηλώθηκαν λειτουργούν.',
        en: 'Cash is insured point by point and event by event — and only while the security measures declared are actually working.',
    },
    shortDescription: {
        el: 'Ασφάλιση χρημάτων σε χρηματοκιβώτιο, σε ταμεία και κατά τη μεταφορά: επιμέρους όρια ανά σημείο και ανά γεγονός, απαλλαγή ανά ζημιογόνο γεγονός, γεωγραφικά όρια της χρηματαποστολής και οι προϋποθέσεις ασφαλείας που πρέπει να τηρούνται.',
        en: 'Cover for money in a safe, at tills and in transit: sub-limits per point and per event, a deductible per loss occurrence, the geographic scope of the transit, and the security conditions that have to be kept.',
    },
    whyItMatters: [
        {
            el: 'Το όριο δεν είναι ένα: υπάρχει όριο ανά γεγονός, ανά χρηματοκιβώτιο ή ταμείο, ανά διεύθυνση κινδύνου και συχνά συνολικό για την περίοδο. Το ποσό που τελικά αποζημιώνεται είναι το χαμηλότερο από όσα εφαρμόζονται.',
            en: 'There is not one limit: there is a limit per event, per safe or till, per risk address, and often an aggregate for the period. What finally pays is the lowest of those that apply.',
        },
        {
            el: 'Οι προϋποθέσεις ασφαλείας είναι όροι κάλυψης, όχι συστάσεις: συναγερμός συνδεδεμένος με κέντρο λήψης σημάτων, κλειδαριές ασφαλείας, κάμερες, και κλειδιά που φυλάσσονται εκτός των εγκαταστάσεων τις μη εργάσιμες ώρες.',
            en: 'The security requirements are conditions of cover, not advice: an alarm linked to a monitoring centre, security locks, cameras, and keys kept off the premises outside working hours.',
        },
        {
            el: 'Η κάλυψη επιταγών συνήθως εξαρτάται από την τήρηση αναλυτικού μητρώου με τράπεζα, αριθμό, εκδότη, ποσό και τελευταίο οπισθογράφο. Χωρίς το μητρώο, αποζημιώνονται τα έξοδα ακύρωσης και όχι η ονομαστική αξία.',
            en: 'Cover for cheques usually depends on keeping a detailed register with bank, number, drawer, amount and last endorser. Without the register, what is paid is the cost of cancellation rather than face value.',
        },
        {
            el: 'Η χρηματαποστολή έχει γεωγραφικό όριο και όρους για τα πρόσωπα που τη διενεργούν — μόνιμοι υπάλληλοι, εντός συγκεκριμένου ηλικιακού εύρους, με καθαρό ποινικό μητρώο. Οι επαγγελματικές εταιρείες μεταφοράς χρημάτων συχνά εξαιρούνται ρητά.',
            en: 'A transit has a geographic boundary and conditions on who carries it out — permanent staff, within a stated age range, with a clean record. Professional cash carriers are often expressly excluded.',
        },
        {
            el: 'Ορισμένα ασφαλιστήρια θέτουν ως προϋπόθεση την ύπαρξη ασφαλιστηρίου περιουσίας σε ισχύ για την ίδια διεύθυνση. Η λήξη του ενός ασφαλιστηρίου μπορεί έτσι να επηρεάσει το άλλο.',
            en: 'Some policies make an in-force property policy for the same address a condition. The lapse of one contract can therefore affect the other.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Από το έγγραφο που ανεβάσατε: τα ανώτατα όρια ανά κάλυψη και τα επιμέρους όρια ανά χρηματοκιβώτιο, ταμείο ή αποστολή, όπως αναγράφονται.',
            en: 'From the document you uploaded: the maximum limits per cover and the sub-limits per safe, till or transit, as stated.',
        },
        {
            el: 'Τις απαλλαγές ανά ζημιογόνο γεγονός, που μπορεί να διαφέρουν ανάμεσα στο περιεχόμενο και στις υλικές ζημιές του ίδιου του χρηματοκιβωτίου.',
            en: 'The deductibles per loss occurrence, which can differ between the contents and material damage to the safe itself.',
        },
        {
            el: 'Τις ειδικές εξαιρέσεις και προϋποθέσεις κάλυψης, με τη διατύπωση του ασφαλιστηρίου, ώστε να φαίνεται ποια μέτρα θεωρούνται δεδομένα.',
            en: 'The special exclusions and conditions of cover, in the policy’s own wording, so that which measures are being assumed is visible.',
        },
        {
            el: 'Τη διεύθυνση κινδύνου και τα γεωγραφικά όρια της μεταφοράς, όπου ορίζονται.',
            en: 'The risk address and the geographic scope of any transit, where defined.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Ελέγξτε ότι η σύνδεση του συναγερμού με το κέντρο λήψης σημάτων είναι ενεργή και πληρωμένη — είναι το μέτρο που δηλώνεται πιο συχνά και συντηρείται λιγότερο.',
            en: 'Check that the alarm’s link to the monitoring centre is live and paid up — it is the measure most often declared and least often maintained.',
        },
        {
            el: 'Καθιερώστε γραπτή διαδικασία για τα κλειδιά εκτός ωραρίου, με ονόματα και σημείο φύλαξης, ώστε ο όρος να είναι αποδείξιμος και όχι απλώς αληθής.',
            en: 'Put the out-of-hours key routine in writing, with names and where they are held, so the condition is provable rather than merely true.',
        },
        {
            el: 'Κρατήστε το μητρώο επιταγών ενημερωμένο την ίδια μέρα. Αναδρομική συμπλήρωση μετά από κλοπή δεν έχει την ίδια αξία.',
            en: 'Keep the cheque register current the same day. Filling it in after a theft does not carry the same weight.',
        },
        {
            el: 'Περιορίστε το μέγιστο υπόλοιπο ανά ταμείο κοντά στο επιμέρους όριο του ασφαλιστηρίου· τα μετρητά που ξεπερνούν το όριο μένουν εκτεθειμένα ακόμη κι όταν η κάλυψη ισχύει.',
            en: 'Cap the maximum balance per till near the policy’s sub-limit; cash above the sub-limit stays exposed even where the cover responds.',
        },
    ],
    commonGaps: [
        {
            id: 'money_sublimit_gap',
            title: { el: 'Υπόλοιπα ταμείων πάνω από το επιμέρους όριο', en: 'Till balances above the sub-limit' },
            description: {
                el: 'Όταν το πραγματικό υπόλοιπο ξεπερνά το όριο ανά ταμείο, η διαφορά μένει στην επιχείρηση παρότι η κάλυψη υφίσταται.',
                en: 'Where the actual balance exceeds the per-till limit, the difference stays with the business even though cover exists.',
            },
        },
        {
            id: 'money_security_condition_gap',
            title: { el: 'Μέτρα ασφαλείας που δεν συντηρούνται', en: 'Security measures not maintained' },
            description: {
                el: 'Συναγερμός εκτός λειτουργίας, κάμερα που δεν καταγράφει ή κλειδιά που έμειναν στον χώρο μπορούν να αναιρέσουν την κάλυψη τη στιγμή της ζημιάς.',
                en: 'An alarm out of service, a camera that is not recording or keys left on site can undo the cover at the moment of loss.',
            },
        },
        {
            id: 'money_transit_scope_gap',
            title: { el: 'Χρηματαποστολή εκτός γεωγραφικών ορίων', en: 'Transit outside the geographic scope' },
            description: {
                el: 'Αν η μεταφορά βγαίνει από την περιοχή που ορίζει το ασφαλιστήριο ή γίνεται από εξαιρούμενο πρόσωπο, η κάλυψη ενδέχεται να μην ισχύει.',
                en: 'If the movement leaves the area the policy names, or is carried out by an excluded party, the cover may not apply.',
            },
        },
        {
            id: 'money_cheque_register_gap',
            title: { el: 'Επιταγές χωρίς μητρώο καταχώρισης', en: 'Cheques with no register' },
            description: {
                el: 'Χωρίς αναλυτικό μητρώο, η αποζημίωση για επιταγές ενδέχεται να περιοριστεί στα έξοδα ακύρωσης αντί της ονομαστικής αξίας.',
                en: 'Without a detailed register, a cheque claim can be limited to cancellation costs rather than face value.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'money_check_sublimits',
            label: { el: 'Δείτε τα όρια ανά σημείο', en: 'See the limits per point' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποια όρια ισχύουν ανά χρηματοκιβώτιο, ταμείο και αποστολή;',
                en: 'What limits apply per safe, per till and per transit?',
            },
        },
        {
            id: 'money_check_conditions',
            label: { el: 'Ελέγξτε τις προϋποθέσεις ασφαλείας', en: 'Check the security conditions' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποια μέτρα ασφαλείας απαιτεί το ασφαλιστήριο για να ισχύει η κάλυψη;',
                en: 'Which security measures does the policy require for the cover to apply?',
            },
        },
        {
            id: 'money_check_transit',
            label: { el: 'Δείτε πού ισχύει η κάλυψη χρηματαποστολής', en: 'See where the transit cover applies' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Σε ποια περιοχή και από ποιους μπορεί να γίνει η μεταφορά χρημάτων;',
                en: 'In what area and by whom may money be carried?',
            },
        },
        {
            id: 'money_review_property_link',
            label: { el: 'Ελέγξτε αν απαιτείται ασφαλιστήριο περιουσίας σε ισχύ', en: 'Check whether an in-force property policy is required' },
            href: '/protection',
            ctaType: 'review',
        },
        {
            id: 'money_ask_agent_limits',
            label: { el: 'Ρωτήστε τον σύμβουλό σας για τα όρια ανά σημείο', en: 'Ask your advisor about the per-point limits' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Ποιο είναι το όριο ανά γεγονός για το χρηματοκιβώτιο;', en: 'What is the per-event limit for the safe?' },
        { el: 'Τι απαλλαγή ισχύει σε κλοπή μετρητών;', en: 'What deductible applies to a cash theft?' },
        { el: 'Καλύπτονται οι επιταγές και υπό ποιες προϋποθέσεις;', en: 'Are cheques covered, and on what conditions?' },
        { el: 'Μέχρι πού καλύπτεται η μεταφορά χρημάτων;', en: 'How far is the movement of money covered?' },
        { el: 'Ποιοι μπορούν να διενεργούν χρηματαποστολή;', en: 'Who is allowed to carry out a cash transit?' },
    ],
    claimsSteps: [
        {
            el: 'Δηλώστε το περιστατικό στην αστυνομία αμέσως και κρατήστε αντίγραφο της καταγγελίας — σε κλοπή μετρητών είναι το πρώτο έγγραφο του φακέλου.',
            en: 'Report the incident to the police at once and keep a copy of the report — in a cash theft it is the first document in the file.',
        },
        {
            el: 'Απομονώστε τον χώρο και διατηρήστε τα δεδομένα του συναγερμού και των καμερών πριν αντικατασταθούν από τον κύκλο εγγραφής.',
            en: 'Secure the area and preserve alarm and camera data before the recording cycle overwrites it.',
        },
        {
            el: 'Ετοιμάστε τα λογιστικά παραστατικά που αποδεικνύουν το ποσό τη στιγμή της απώλειας· η αποζημίωση κρίνεται από αυτά, όχι από εκτίμηση.',
            en: 'Prepare the accounting records proving the amount at the moment of loss; the claim is settled from those, not from an estimate.',
        },
        {
            el: 'Αν χάθηκαν επιταγές, ξεκινήστε αμέσως τη διαδικασία ακύρωσης με την τράπεζα — οι προθεσμίες σε αυτόν τον όρο μετριούνται σε ώρες.',
            en: 'If cheques were lost, start the cancellation process with the bank immediately — the deadlines in that condition are measured in hours.',
        },
    ],
    renewalNote: {
        el: 'Στην ανανέωση αξίζει να ξαναμετρηθούν τα πραγματικά υπόλοιπα ανά σημείο και να επιβεβαιωθεί ότι τα δηλωμένα μέτρα ασφαλείας εξακολουθούν να ισχύουν.',
        en: 'At renewal it is worth re-measuring the actual balances per point and confirming the declared security measures still hold.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει ασφάλιση χρημάτων', en: 'No money policy added yet' },
        description: {
            el: 'Ανεβάστε το ασφαλιστήριο και δείτε τα όρια ανά σημείο, τις απαλλαγές και τα μέτρα ασφαλείας που θεωρούνται δεδομένα.',
            en: 'Upload the policy and see the limits per point, the deductibles and the security measures being assumed.',
        },
        ctaLabel: { el: 'Ανεβάστε ασφαλιστήριο', en: 'Upload policy' },
    },
}
