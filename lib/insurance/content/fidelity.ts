import type { BranchContent } from './types'

/**
 * Fidelity guarantee — loss caused by an employee's own dishonesty.
 *
 * Two features shape the copy. The cover is written against NAMED or scheduled
 * staff with a limit per employee, and it is governed by a discovery period
 * that keeps running after someone leaves — so the timing question ("when was
 * it discovered?") decides claims more often than the amount does.
 *
 * PRIVACY: schedules in this line list real people. PolicyWallet reads roles
 * and counts; `whatWeAnalyze` says so explicitly, because a customer is
 * entitled to know we are not ingesting their staff list.
 */
export const fidelityContent: BranchContent = {
    branchId: 'fidelity',
    tagline: {
        el: 'Η ημερομηνία που ανακαλύφθηκε η πράξη μετράει συχνά περισσότερο από την ημερομηνία που έγινε.',
        en: 'The date an act was discovered often counts for more than the date it happened.',
    },
    shortDescription: {
        el: 'Κάλυψη ζημιάς από υπεξαίρεση, κατάχρηση ή πλαστογραφία υπαλλήλου: όριο ανά υπάλληλο και συνολικό όριο, προθεσμίες ανακάλυψης μετά την αποχώρηση ή τη λήξη, και προϋποθέσεις όπως εσωτερικός έλεγχος και έλεγχος προσωπικού.',
        en: 'Cover for loss from embezzlement, misappropriation or forgery by an employee: a limit per employee and an overall limit, discovery deadlines running after departure or expiry, and conditions such as internal audit and staff vetting.',
    },
    whyItMatters: [
        {
            el: 'Η κάλυψη λειτουργεί με βάση την ανακάλυψη. Τυπικά η πράξη πρέπει να αποκαλυφθεί εντός λίγων μηνών από τον θάνατο, την απόλυση ή την αποχώρηση του υπαλλήλου, και εντός σύντομης προθεσμίας από τη λήξη του συμβολαίου — με την πιο σύντομη από τις δύο να υπερισχύει.',
            en: 'The cover works on discovery. Typically the act must come to light within a few months of the employee’s death, dismissal or departure, and within a short window after the policy expires — with the shorter of the two prevailing.',
        },
        {
            el: 'Το όριο ορίζεται ανά υπάλληλο, όχι μόνο συνολικά. Μια σειρά πράξεων από το ίδιο πρόσωπο συναντά το ατομικό όριο πολύ πριν αγγίξει το συνολικό.',
            en: 'The limit is set per employee, not only in aggregate. A run of acts by the same person meets the individual limit long before it reaches the overall one.',
        },
        {
            el: 'Η ύπαρξη εσωτερικού ελέγχου είναι συνήθως προϋπόθεση κάλυψης. Η ίδια δικλείδα που περιορίζει τον κίνδυνο είναι και ο όρος που κρατά την ασφάλιση ενεργή.',
            en: 'Having an internal audit function is usually a condition of cover. The same control that limits the risk is also the term that keeps the insurance alive.',
        },
        {
            el: 'Οι όροι για τα καλυπτόμενα πρόσωπα είναι συγκεκριμένοι: μόνιμοι υπάλληλοι, με καθαρό ποινικό μητρώο, συχνά με ελάχιστο χρόνο υπηρεσίας και εντός ηλικιακού εύρους. Νέες προσλήψεις και εξωτερικοί συνεργάτες δεν εντάσσονται αυτόματα.',
            en: 'The conditions on who is covered are specific: permanent staff, with a clean record, often with a minimum length of service and within an age range. New hires and contractors are not enrolled automatically.',
        },
        {
            el: 'Η αποζημίωση υπολογίζεται μετά την αφαίρεση μισθών, αμοιβών και περιουσιακών στοιχείων του υπαλλήλου που περιέρχονται στον εργοδότη — η ανάκτηση μειώνει την απαίτηση αντί να προστίθεται σε αυτήν.',
            en: 'A claim is calculated after deducting salaries, fees and any assets of the employee that come into the employer’s hands — recovery reduces the claim rather than adding to it.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Από το έγγραφο που ανέβασες: το όριο ανά υπάλληλο και το συνολικό ανώτατο όριο, μαζί με την απαλλαγή ανά ζημιογόνο γεγονός.',
            en: 'From the document you uploaded: the per-employee limit and the overall ceiling, together with the deductible per loss occurrence.',
        },
        {
            el: 'Τις προθεσμίες ανακάλυψης και τη σχέση τους με την αποχώρηση του υπαλλήλου και με τη λήξη του συμβολαίου.',
            en: 'The discovery deadlines and how they relate to an employee’s departure and to the policy’s expiry.',
        },
        {
            el: 'Τα καλυπτόμενα τμήματα και τον αριθμό των θέσεων ανά τμήμα. Καταγράφουμε ρόλους και πλήθος, όχι ονόματα προσωπικού.',
            en: 'The departments covered and the number of positions in each. We record roles and counts, not staff names.',
        },
        {
            el: 'Τις ειδικές προϋποθέσεις κάλυψης — εσωτερικός έλεγχος, χρόνος υπηρεσίας, έλεγχος ποινικού μητρώου — όπως είναι διατυπωμένες.',
            en: 'The special conditions of cover — internal audit, length of service, criminal-record checks — as they are worded.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Επικαιροποίησε την κατάσταση καλυπτόμενων θέσεων σε κάθε πρόσληψη ή αλλαγή τμήματος· μια θέση που δεν περιλαμβάνεται δεν αποκτά κάλυψη επειδή υπάρχει το συμβόλαιο.',
            en: 'Refresh the schedule of covered positions at every hire or transfer; a role that is not listed does not gain cover simply because a policy exists.',
        },
        {
            el: 'Διατήρησε διαχωρισμό καθηκόντων στα σημεία που διακινούν χρήμα, και τεκμηρίωσε τους ελέγχους. Ο ίδιος φάκελος εξυπηρετεί την πρόληψη και την απόδειξη του όρου.',
            en: 'Keep duties separated wherever money moves, and document the checks. The same file serves both prevention and proof of the condition.',
        },
        {
            el: 'Στην αποχώρηση υπαλλήλου με πρόσβαση σε χρήμα, προγραμμάτισε επισκόπηση λογαριασμών μέσα στην προθεσμία ανακάλυψης αντί να την αφήσεις στον επόμενο ετήσιο έλεγχο.',
            en: 'When someone with access to money leaves, schedule an account review inside the discovery window rather than leaving it to the next annual audit.',
        },
        {
            el: 'Κράτα το μητρώο επιταγών και τις εγκρίσεις πληρωμών σε μορφή που μπορεί να ανακτηθεί αναδρομικά· η ζημιά εδώ αποκαλύπτεται συνήθως μήνες μετά.',
            en: 'Keep the cheque register and payment approvals in a form that can be reconstructed retrospectively; losses in this line usually surface months later.',
        },
    ],
    commonGaps: [
        {
            id: 'fidelity_discovery_window_gap',
            title: { el: 'Προθεσμία ανακάλυψης που έχει ήδη τρέξει', en: 'Discovery window already run down' },
            description: {
                el: 'Αν ο υπάλληλος έχει αποχωρήσει πριν από μήνες και δεν έγινε επισκόπηση, η προθεσμία ανακάλυψης μπορεί να έχει εξαντληθεί πριν εντοπιστεί οτιδήποτε.',
                en: 'If the employee left months ago and no review took place, the discovery window can be spent before anything is found.',
            },
        },
        {
            id: 'fidelity_schedule_gap',
            title: { el: 'Θέσεις εκτός της καλυπτόμενης κατάστασης', en: 'Positions outside the covered schedule' },
            description: {
                el: 'Νέες προσλήψεις ή μετακινήσεις σε τμήματα με πρόσβαση σε χρήμα ενδέχεται να μην περιλαμβάνονται, αφήνοντας ακάλυπτα ακριβώς τα σημεία που άλλαξαν.',
                en: 'New hires or moves into money-handling departments may not be included, leaving uncovered exactly the points that changed.',
            },
        },
        {
            id: 'fidelity_internal_control_gap',
            title: { el: 'Εσωτερικός έλεγχος που δεν τεκμηριώνεται', en: 'Internal audit that is not documented' },
            description: {
                el: 'Όταν ο εσωτερικός έλεγχος είναι όρος κάλυψης, η απουσία γραπτών ευρημάτων δυσκολεύει την απόδειξη ότι ο όρος τηρήθηκε.',
                en: 'Where internal audit is a condition of cover, the absence of written findings makes it hard to show the condition was met.',
            },
        },
        {
            id: 'fidelity_per_employee_limit_gap',
            title: { el: 'Ατομικό όριο μικρότερο από την πιθανή έκθεση', en: 'Per-employee limit below the likely exposure' },
            description: {
                el: 'Αν ένα πρόσωπο διαχειρίζεται ποσά μεγαλύτερα από το ατομικό του όριο, η διαφορά μένει στην επιχείρηση ακόμη και σε επιτυχή απαίτηση.',
                en: 'If one person handles sums above their individual limit, the difference stays with the business even on a successful claim.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'fidelity_check_discovery',
            label: { el: 'Δες τις προθεσμίες ανακάλυψης', en: 'See the discovery deadlines' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Μέσα σε πόσο χρόνο πρέπει να ανακαλυφθεί η πράξη για να καλύπτεται;',
                en: 'Within what time must an act be discovered for it to be covered?',
            },
        },
        {
            id: 'fidelity_check_limits',
            label: { el: 'Έλεγξε το όριο ανά υπάλληλο', en: 'Check the per-employee limit' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιο είναι το όριο ανά υπάλληλο και ποιο το συνολικό;',
                en: 'What is the limit per employee and what is the overall one?',
            },
        },
        {
            id: 'fidelity_check_conditions',
            label: { el: 'Δες τις προϋποθέσεις για τα καλυπτόμενα πρόσωπα', en: 'See the conditions on who is covered' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιες προϋποθέσεις ισχύουν για τους καλυπτόμενους υπαλλήλους;',
                en: 'What conditions apply to the employees who are covered?',
            },
        },
        {
            id: 'fidelity_review_schedule',
            label: { el: 'Επικαιροποίησε τις καλυπτόμενες θέσεις', en: 'Refresh the covered positions' },
            href: '/coverage-insights',
            ctaType: 'review',
        },
        {
            id: 'fidelity_ask_agent_controls',
            label: { el: 'Ρώτησε τον σύμβουλό σου για τις απαιτούμενες δικλείδες', en: 'Ask your advisor about the controls required' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Ποιες πράξεις καλύπτονται από το συμβόλαιο;', en: 'Which acts does the policy cover?' },
        { el: 'Μέχρι πότε μπορεί να δηλωθεί πράξη υπαλλήλου που έχει φύγει;', en: 'Until when can an act by a departed employee be reported?' },
        { el: 'Απαιτείται εσωτερικός έλεγχος για να ισχύει η κάλυψη;', en: 'Is internal audit required for the cover to apply?' },
        { el: 'Καλύπτονται οι νέοι υπάλληλοι αυτόματα;', en: 'Are new employees covered automatically?' },
        { el: 'Πώς υπολογίζεται η αποζημίωση αν ανακτηθούν χρήματα;', en: 'How is the claim calculated if money is recovered?' },
    ],
    claimsSteps: [
        {
            el: 'Δήλωσε στον ασφαλιστή μόλις υπάρξει βάσιμη υπόνοια, χωρίς να περιμένεις την ολοκλήρωση της εσωτερικής έρευνας — η προθεσμία τρέχει από την ανακάλυψη.',
            en: 'Notify the insurer as soon as there is a reasonable suspicion, without waiting for the internal investigation to finish — the deadline runs from discovery.',
        },
        {
            el: 'Διατήρησε τα ηλεκτρονικά ίχνη και τα πρωτότυπα παραστατικά πριν από οποιαδήποτε τακτοποίηση λογαριασμών.',
            en: 'Preserve the electronic trail and the original documents before any tidying of accounts.',
        },
        {
            el: 'Κατάγραψε ποσά, ημερομηνίες και τον τρόπο με τον οποίο ανακαλύφθηκε η πράξη· η αλληλουχία είναι αυτό που εξετάζεται πρώτο.',
            en: 'Record amounts, dates and how the act came to light; the sequence is what gets examined first.',
        },
        {
            el: 'Συντόνισε την ποινική διαδικασία με τον ασφαλιστή, και κράτα χωριστό λογαριασμό για ό,τι ανακτάται από τον υπάλληλο.',
            en: 'Coordinate any criminal process with the insurer, and keep a separate account of whatever is recovered from the employee.',
        },
    ],
    renewalNote: {
        el: 'Η ανανέωση είναι η στιγμή να ξαναδεί κανείς ποιες θέσεις διαχειρίζονται χρήμα σήμερα — η κατάσταση προσωπικού αλλάζει πιο γρήγορα από το συμβόλαιο.',
        en: 'Renewal is the moment to revisit which roles handle money today — a staff list changes faster than a policy does.',
    },
    emptyState: {
        headline: { el: 'Δεν έχεις προσθέσει ασφάλιση εμπιστοσύνης υπαλλήλων', en: 'No fidelity policy added yet' },
        description: {
            el: 'Ανέβασε το ασφαλιστήριο και δες τα όρια ανά υπάλληλο, τις προθεσμίες ανακάλυψης και τις δικλείδες που ζητά.',
            en: 'Upload the policy and see the per-employee limits, the discovery deadlines and the controls it asks for.',
        },
        ctaLabel: { el: 'Ανέβασε ασφαλιστήριο', en: 'Upload policy' },
    },
}
