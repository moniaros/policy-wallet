import type { BranchContent } from './types'

/**
 * Employer's liability — what the employer owes an employee beyond what the
 * state social-insurance fund pays.
 *
 * The Greek framing matters and is what the copy leads with: EFKA covers the
 * statutory benefit, and the employer's exposure is the DIFFERENCE a court
 * awards on top of it. Confusing the two is the reason this line is so often
 * assumed to be already handled.
 */
export const employerLiabilityContent: BranchContent = {
    branchId: 'employer_liability',
    tagline: {
        el: 'Ο ασφαλιστικός φορέας καλύπτει την παροχή· ο εργοδότης καλύπτει τη διαφορά που επιδικάζεται πάνω από αυτήν.',
        en: 'The state fund pays the benefit; the employer carries the difference a court awards on top of it.',
    },
    shortDescription: {
        el: 'Κάλυψη της ευθύνης του εργοδότη για σωματική βλάβη ή θάνατο εργαζομένου από εργατικό ατύχημα ή επαγγελματική ασθένεια: όρια ανά άτομο, ανά γεγονός και συνολικά, καλυπτόμενες ειδικότητες, και οι υποχρεώσεις ασφάλειας και υγείας που συνοδεύουν την κάλυψη.',
        en: 'Cover for an employer’s liability for injury or death of an employee from a workplace accident or occupational disease: limits per person, per event and in aggregate, the occupations covered, and the health-and-safety obligations that come with it.',
    },
    whyItMatters: [
        {
            el: 'Η παροχή του ασφαλιστικού φορέα και η αστική ευθύνη του εργοδότη είναι δύο διαφορετικά πράγματα. Το δικαστήριο επιδικάζει τη διαφορά, μαζί με ηθική βλάβη, και αυτή η διαφορά είναι το αντικείμενο της κάλυψης.',
            en: 'The state benefit and the employer’s civil liability are two different things. A court awards the difference, along with damages for pain and suffering, and that difference is what this cover answers.',
        },
        {
            el: 'Τα όρια δουλεύουν σε τρία επίπεδα: ανά εργαζόμενο, ανά γεγονός και συνολικά για την περίοδο. Ένα ατύχημα που αφορά περισσότερους από έναν δοκιμάζει το μεσαίο επίπεδο πρώτα.',
            en: 'The limits work on three levels: per employee, per event and in aggregate for the period. An accident involving more than one person tests the middle level first.',
        },
        {
            el: 'Η τήρηση της νομοθεσίας για την ασφάλεια και την υγεία στην εργασία συχνά αποτελεί όρο του συμβολαίου. Εκπαίδευση, μέσα ατομικής προστασίας και γραπτή εκτίμηση κινδύνου είναι ταυτόχρονα πρόληψη και προϋπόθεση.',
            en: 'Compliance with health-and-safety law is often a term of the contract. Training, protective equipment and a written risk assessment are prevention and precondition at the same time.',
        },
        {
            el: 'Οι καλυπτόμενες ειδικότητες και ο αριθμός εργαζομένων δηλώνονται στην ανάληψη. Νέες δραστηριότητες με διαφορετικό προφίλ κινδύνου δεν εντάσσονται αυτόματα επειδή υπάρχει συμβόλαιο.',
            en: 'The occupations covered and the headcount are declared at inception. New activities with a different risk profile are not enrolled automatically because a policy exists.',
        },
        {
            el: 'Η επαγγελματική ασθένεια εμφανίζεται χρόνια μετά την έκθεση. Το ποια χρονιά «ανήκει» η απαίτηση εξαρτάται από τη βάση ενεργοποίησης του συμβολαίου και όχι από το πότε δηλώθηκε.',
            en: 'An occupational disease surfaces years after exposure. Which year a claim “belongs” to depends on the policy’s trigger basis rather than on when it was reported.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Από το έγγραφο που ανεβάσατε: τα όρια ευθύνης ανά εργαζόμενο, ανά γεγονός και συνολικά για την περίοδο.',
            en: 'From the document you uploaded: the liability limits per employee, per event and in aggregate for the period.',
        },
        {
            el: 'Τις δηλωμένες δραστηριότητες και ειδικότητες, καθώς και τον αριθμό εργαζομένων στον οποίο βασίστηκε το ασφάλιστρο.',
            en: 'The declared activities and occupations, plus the headcount the premium was based on.',
        },
        {
            el: 'Τις εξαιρέσεις και τις προϋποθέσεις που αφορούν ασφάλεια και υγεία, όπως είναι διατυπωμένες στους ειδικούς όρους.',
            en: 'The exclusions and conditions relating to health and safety, as worded in the special terms.',
        },
        {
            el: 'Την απαλλαγή και τυχόν όρους για υπεργολάβους ή προσωπικό μέσω τρίτων.',
            en: 'The deductible and any terms on subcontractors or agency staff.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Κρατήστε τη γραπτή εκτίμηση επαγγελματικού κινδύνου ενημερωμένη και αρχειοθετημένη μαζί με το συμβόλαιο — ζητούνται μαζί μετά από ατύχημα.',
            en: 'Keep the written occupational risk assessment current and filed with the policy — they are asked for together after an accident.',
        },
        {
            el: 'Τηρήστε αποδεικτικά εκπαίδευσης και παραλαβής μέσων ατομικής προστασίας με υπογραφή· η προφορική ενημέρωση δεν αφήνει ίχνος.',
            en: 'Keep signed records of training and of protective equipment issued; a verbal briefing leaves no trace.',
        },
        {
            el: 'Δηλώστε νέες δραστηριότητες ή αλλαγή στον αριθμό εργαζομένων πριν ξεκινήσουν, όχι στην επόμενη ανανέωση.',
            en: 'Declare new activities or a change in headcount before they start, not at the next renewal.',
        },
        {
            el: 'Ελέγξτε αν το προσωπικό μέσω τρίτων ή οι υπεργολάβοι περιλαμβάνονται· συχνά χρειάζονται ρητή μνεία ή δική τους κάλυψη.',
            en: 'Check whether agency staff or subcontractors are included; they often need an explicit mention or cover of their own.',
        },
    ],
    commonGaps: [
        {
            id: 'employer_liability_undeclared_activity_gap',
            title: { el: 'Δραστηριότητες που δεν έχουν δηλωθεί', en: 'Activities that were never declared' },
            description: {
                el: 'Νέα εργασία με διαφορετικό προφίλ κινδύνου ενδέχεται να μην περιλαμβάνεται στις δηλωμένες δραστηριότητες, οπότε το ατύχημα σε αυτήν κρίνεται εκτός.',
                en: 'New work with a different risk profile may not sit within the declared activities, so an accident there is judged outside.',
            },
        },
        {
            id: 'employer_liability_safety_condition_gap',
            title: { el: 'Υποχρεώσεις ασφάλειας χωρίς τεκμηρίωση', en: 'Safety obligations with no records' },
            description: {
                el: 'Εκπαιδεύσεις που έγιναν αλλά δεν καταγράφηκαν είναι δύσκολο να αποδειχθούν όταν εξετάζεται η τήρηση των όρων.',
                en: 'Training that happened but was not recorded is hard to prove when compliance with the terms is examined.',
            },
        },
        {
            id: 'employer_liability_contractor_gap',
            title: { el: 'Υπεργολάβοι και προσωπικό τρίτων εκτός κάλυψης', en: 'Subcontractors and agency staff outside cover' },
            description: {
                el: 'Πρόσωπα που εργάζονται στον χώρο χωρίς να είναι εργαζόμενοι της επιχείρησης ενδέχεται να μην καλύπτονται από το συμβόλαιο.',
                en: 'People working on site who are not employees of the business may not be covered by the policy.',
            },
        },
        {
            id: 'employer_liability_aggregate_gap',
            title: { el: 'Συνολικό όριο κοντά σε μία σοβαρή απαίτηση', en: 'Aggregate close to one serious claim' },
            description: {
                el: 'Όταν το συνολικό όριο περιόδου δεν απέχει πολύ από το όριο ανά άτομο, μια δεύτερη απαίτηση μέσα στη χρονιά βρίσκει την κάλυψη περιορισμένη.',
                en: 'When the period aggregate is not far above the per-person limit, a second claim within the year finds the cover already narrowed.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'employer_liability_check_limits',
            label: { el: 'Δείτε τα όρια ανά εργαζόμενο και ανά γεγονός', en: 'See the per-employee and per-event limits' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποια είναι τα όρια ευθύνης ανά εργαζόμενο, ανά γεγονός και συνολικά;',
                en: 'What are the liability limits per employee, per event and in aggregate?',
            },
        },
        {
            id: 'employer_liability_check_activities',
            label: { el: 'Ελέγξτε ποιες δραστηριότητες καλύπτονται', en: 'Check which activities are covered' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιες δραστηριότητες και ειδικότητες έχουν δηλωθεί στο συμβόλαιο;',
                en: 'Which activities and occupations are declared in the policy?',
            },
        },
        {
            id: 'employer_liability_check_safety_terms',
            label: { el: 'Δείτε τις υποχρεώσεις ασφάλειας και υγείας', en: 'See the health-and-safety obligations' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιες υποχρεώσεις ασφάλειας θέτει το συμβόλαιο ως προϋπόθεση;',
                en: 'Which safety obligations does the policy set as a condition?',
            },
        },
        {
            id: 'employer_liability_review_headcount',
            label: { el: 'Επικαιροποιήστε αριθμό εργαζομένων και δραστηριότητες', en: 'Refresh headcount and activities' },
            href: '/protection',
            ctaType: 'review',
        },
        {
            id: 'employer_liability_ask_agent_contractors',
            label: { el: 'Ρωτήστε τον σύμβουλό σας για υπεργολάβους', en: 'Ask your advisor about subcontractors' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Τι καλύπτει η ευθύνη εργοδότη πέρα από τον ασφαλιστικό φορέα;', en: 'What does employer’s liability cover beyond the state fund?' },
        { el: 'Καλύπτονται οι υπεργολάβοι που εργάζονται στον χώρο;', en: 'Are subcontractors working on site covered?' },
        { el: 'Ποιο είναι το όριο ανά εργαζόμενο;', en: 'What is the limit per employee?' },
        { el: 'Καλύπτεται η επαγγελματική ασθένεια;', en: 'Is occupational disease covered?' },
        { el: 'Ποιες υποχρεώσεις ασφάλειας πρέπει να τηρούνται;', en: 'Which safety obligations have to be met?' },
    ],
    claimsSteps: [
        {
            el: 'Παρέχε πρώτες βοήθειες και δηλώστε το εργατικό ατύχημα στις αρμόδιες αρχές μέσα στις προβλεπόμενες προθεσμίες.',
            en: 'Give first aid and report the workplace accident to the competent authorities within the statutory deadlines.',
        },
        {
            el: 'Καταγράψτε τον χώρο, τον εξοπλισμό και τις συνθήκες πριν αποκατασταθεί η λειτουργία, και συγκεντρώστε καταθέσεις μαρτύρων νωρίς.',
            en: 'Record the area, the equipment and the conditions before operations resume, and gather witness accounts early.',
        },
        {
            el: 'Ετοιμάστε τον φάκελο τήρησης υποχρεώσεων — εκτίμηση κινδύνου, εκπαιδεύσεις, μέσα ατομικής προστασίας — μαζί με τη δήλωση προς τον ασφαλιστή.',
            en: 'Prepare the compliance file — risk assessment, training, protective equipment — alongside the notice to the insurer.',
        },
        {
            el: 'Μην συμφωνήσετε αποζημίωση με τον εργαζόμενο χωρίς τη συναίνεση του ασφαλιστή· ο συμβιβασμός εκτός συμβολαίου μπορεί να μην αναγνωριστεί.',
            en: 'Do not agree compensation with the employee without the insurer’s consent; a settlement made outside the contract may not be recognised.',
        },
    ],
    renewalNote: {
        el: 'Ο αριθμός εργαζομένων και οι δραστηριότητες είναι τα δύο στοιχεία που αλλάζουν σιωπηλά μέσα στη χρονιά — η ανανέωση είναι η στιγμή να ξαναδηλωθούν.',
        en: 'Headcount and activities are the two things that change quietly during the year — renewal is when they are worth redeclaring.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει ασφάλιση ευθύνης εργοδότη', en: 'No employer’s liability policy added yet' },
        description: {
            el: 'Ανεβάστε το ασφαλιστήριο και δείτε τα όρια ανά εργαζόμενο, τις δηλωμένες δραστηριότητες και τις υποχρεώσεις που το συνοδεύουν.',
            en: 'Upload the policy and see the per-employee limits, the declared activities and the obligations that come with it.',
        },
        ctaLabel: { el: 'Ανεβάστε ασφαλιστήριο', en: 'Upload policy' },
    },
}
