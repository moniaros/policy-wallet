import type { BranchContent } from './types'

/**
 * Professional liability / professional indemnity — the financial loss a client
 * suffers from a professional's error, as distinct from injury or property
 * damage, which general liability answers.
 *
 * The structural fact that decides these claims is the trigger: almost all
 * professional indemnity is written claims-made, so the policy that responds is
 * the one in force when the CLAIM arrives, not when the work was done. That is
 * what makes the retroactive date and the run-off period the load-bearing terms.
 */
export const professionalLiabilityContent: BranchContent = {
    branchId: 'professional_liability',
    tagline: {
        el: 'Απαντά το συμβόλαιο που ισχύει όταν έρχεται η απαίτηση — όχι εκείνο που ίσχυε όταν έγινε η δουλειά.',
        en: 'The policy that answers is the one in force when the claim arrives — not the one in force when the work was done.',
    },
    shortDescription: {
        el: 'Κάλυψη της επαγγελματικής ευθύνης για οικονομική ζημιά πελάτη από λάθος, παράλειψη ή αμέλεια κατά την άσκηση του επαγγέλματος: όριο ανά απαίτηση και συνολικά, αναδρομική ημερομηνία, περίοδος γνωστοποίησης μετά τη λήξη, και έξοδα υπεράσπισης.',
        en: 'Cover for professional liability for a client’s financial loss from an error, omission or negligence in practising the profession: a limit per claim and in aggregate, a retroactive date, a notification period after expiry, and defence costs.',
    },
    whyItMatters: [
        {
            el: 'Στη βάση «εγειρόμενων απαιτήσεων», μια εργασία του 2023 που παράγει απαίτηση το 2026 κρίνεται από το συμβόλαιο του 2026. Αν η κάλυψη έχει διακοπεί στο μεταξύ, δεν υπάρχει συμβόλαιο να απαντήσει.',
            en: 'On a claims-made basis, work done in 2023 that produces a claim in 2026 is judged by the 2026 policy. If cover lapsed in between, there is no policy left to answer.',
        },
        {
            el: 'Η αναδρομική ημερομηνία ορίζει πόσο πίσω πηγαίνει η κάλυψη. Μια αλλαγή ασφαλιστή που μηδενίζει την αναδρομική ημερομηνία αφήνει όλη την προηγούμενη επαγγελματική ζωή ακάλυπτη.',
            en: 'The retroactive date sets how far back cover reaches. Changing insurer in a way that resets it leaves the whole earlier professional life uncovered.',
        },
        {
            el: 'Τα έξοδα υπεράσπισης μπορεί να περιλαμβάνονται μέσα στο όριο ή να προστίθενται πάνω από αυτό. Στην πρώτη περίπτωση, μια μακρά δικαστική διαμάχη μειώνει το ποσό που μένει για την ίδια την αποζημίωση.',
            en: 'Defence costs may sit inside the limit or on top of it. In the first case a long dispute eats into the amount left for the compensation itself.',
        },
        {
            el: 'Η παύση της δραστηριότητας δεν τερματίζει την έκθεση. Χωρίς κάλυψη εκκαθάρισης μετά τη διακοπή, οι απαιτήσεις που θα έρθουν αργότερα βρίσκουν τον επαγγελματία χωρίς συμβόλαιο.',
            en: 'Stopping practice does not end the exposure. Without run-off cover after ceasing, claims that arrive later find the professional with no policy.',
        },
        {
            el: 'Η υποχρέωση γνωστοποίησης είναι αυστηρή: περιστατικά που ενδέχεται να οδηγήσουν σε απαίτηση συνήθως πρέπει να δηλώνονται μόλις γίνουν γνωστά, όχι όταν επιβεβαιωθούν.',
            en: 'The notification duty is strict: circumstances that might give rise to a claim usually have to be reported as soon as they are known, not once they are confirmed.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Από το έγγραφο που ανέβασες: το όριο ανά απαίτηση και το συνολικό όριο για την περίοδο, μαζί με την απαλλαγή.',
            en: 'From the document you uploaded: the limit per claim and the aggregate for the period, together with the deductible.',
        },
        {
            el: 'Την αναδρομική ημερομηνία και τυχόν περίοδο γνωστοποίησης μετά τη λήξη, όπου αναγράφονται.',
            en: 'The retroactive date and any notification period after expiry, where stated.',
        },
        {
            el: 'Αν τα έξοδα υπεράσπισης περιλαμβάνονται στο όριο ή προστίθενται σε αυτό, όπως το διατυπώνει το συμβόλαιο.',
            en: 'Whether defence costs sit inside the limit or in addition to it, in the policy’s own words.',
        },
        {
            el: 'Τις δηλωμένες επαγγελματικές δραστηριότητες και τις εξαιρέσεις που τις περιορίζουν.',
            en: 'The declared professional activities and the exclusions that narrow them.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Σημείωσε την αναδρομική ημερομηνία δίπλα στην ημερομηνία έναρξης και έλεγξέ την σε κάθε αλλαγή ασφαλιστή — είναι το στοιχείο που χάνεται πιο εύκολα στη μετάβαση.',
            en: 'Note the retroactive date beside the inception date and check it at every change of insurer — it is the detail most easily lost in a transfer.',
        },
        {
            el: 'Δήλωσε περιστατικά που ενδέχεται να εξελιχθούν σε απαίτηση όσο το συμβόλαιο είναι σε ισχύ, ακόμη κι αν ο πελάτης δεν έχει ζητήσει τίποτα ακόμη.',
            en: 'Report circumstances that could develop into a claim while the policy is live, even if the client has asked for nothing yet.',
        },
        {
            el: 'Κράτα αρχείο εντολών, παραδοτέων και επικοινωνίας ανά έργο· στην επαγγελματική ευθύνη η υπεράσπιση στηρίζεται στο τι συμφωνήθηκε και πότε.',
            en: 'Keep a record of instructions, deliverables and correspondence per engagement; in professional liability the defence rests on what was agreed and when.',
        },
        {
            el: 'Πριν σταματήσεις τη δραστηριότητα, ρώτησε γραπτώς για κάλυψη εκκαθάρισης και για τη διάρκειά της.',
            en: 'Before ceasing practice, ask in writing about run-off cover and how long it lasts.',
        },
    ],
    commonGaps: [
        {
            id: 'professional_liability_retroactive_gap',
            title: { el: 'Αναδρομική ημερομηνία που κόβει το παρελθόν', en: 'Retroactive date that cuts off the past' },
            description: {
                el: 'Όταν η αναδρομική ημερομηνία συμπίπτει με την έναρξη του τρέχοντος συμβολαίου, εργασίες προηγούμενων ετών μένουν εκτός κάλυψης.',
                en: 'Where the retroactive date coincides with the current policy’s inception, work from earlier years falls outside cover.',
            },
        },
        {
            id: 'professional_liability_defence_costs_gap',
            title: { el: 'Έξοδα υπεράσπισης μέσα στο όριο', en: 'Defence costs inside the limit' },
            description: {
                el: 'Αν τα έξοδα υπεράσπισης αφαιρούνται από το ίδιο όριο, το διαθέσιμο ποσό για αποζημίωση μειώνεται όσο διαρκεί η διαμάχη.',
                en: 'If defence costs come out of the same limit, the amount available for compensation shrinks as the dispute runs.',
            },
        },
        {
            id: 'professional_liability_runoff_gap',
            title: { el: 'Χωρίς κάλυψη μετά τη διακοπή δραστηριότητας', en: 'No cover after ceasing practice' },
            description: {
                el: 'Απαιτήσεις που εμφανίζονται μετά τη διακοπή δεν βρίσκουν συμβόλαιο σε ισχύ, εκτός αν έχει συμφωνηθεί κάλυψη εκκαθάρισης.',
                en: 'Claims that appear after practice stops find no policy in force, unless run-off cover has been arranged.',
            },
        },
        {
            id: 'professional_liability_activity_scope_gap',
            title: { el: 'Δραστηριότητες εκτός των δηλωμένων', en: 'Activities beyond those declared' },
            description: {
                el: 'Νέες υπηρεσίες που δεν περιλαμβάνονται στη δηλωμένη δραστηριότητα ενδέχεται να μην καλύπτονται, ακόμη κι όταν ασκούνται από το ίδιο πρόσωπο.',
                en: 'New services outside the declared activity may not be covered, even when the same person performs them.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'professional_liability_check_retroactive',
            label: { el: 'Δες την αναδρομική ημερομηνία', en: 'See the retroactive date' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποια είναι η αναδρομική ημερομηνία του συμβολαίου μου;',
                en: 'What is the retroactive date on my policy?',
            },
        },
        {
            id: 'professional_liability_check_defence',
            label: { el: 'Έλεγξε πού εντάσσονται τα έξοδα υπεράσπισης', en: 'Check where defence costs sit' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Τα έξοδα υπεράσπισης περιλαμβάνονται στο όριο ή προστίθενται;',
                en: 'Are defence costs inside the limit or in addition to it?',
            },
        },
        {
            id: 'professional_liability_check_activities',
            label: { el: 'Δες ποιες δραστηριότητες καλύπτονται', en: 'See which activities are covered' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιες επαγγελματικές δραστηριότητες καλύπτει το συμβόλαιο;',
                en: 'Which professional activities does the policy cover?',
            },
        },
        {
            id: 'professional_liability_review_continuity',
            label: { el: 'Έλεγξε τη συνέχεια της κάλυψης στον χρόνο', en: 'Check the continuity of cover over time' },
            href: '/renewals',
            ctaType: 'renewals',
        },
        {
            id: 'professional_liability_ask_agent_runoff',
            label: { el: 'Ρώτησε τον σύμβουλό σου για κάλυψη εκκαθάρισης', en: 'Ask your advisor about run-off cover' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Καλύπτονται εργασίες που έγιναν πριν από την έναρξη του συμβολαίου;', en: 'Is work done before the policy started covered?' },
        { el: 'Ποιο είναι το όριο ανά απαίτηση και ποιο συνολικά;', en: 'What is the limit per claim and what in aggregate?' },
        { el: 'Πότε πρέπει να δηλώσω ένα περιστατικό;', en: 'When do I have to report a circumstance?' },
        { el: 'Τι ισχύει αν σταματήσω τη δραστηριότητα;', en: 'What applies if I stop practising?' },
        { el: 'Καλύπτονται οι συνεργάτες μου ή μόνο εγώ;', en: 'Are my associates covered, or only me?' },
    ],
    claimsSteps: [
        {
            el: 'Γνωστοποίησε στον ασφαλιστή μόλις γίνει γνωστό περιστατικό που ενδέχεται να οδηγήσει σε απαίτηση, ακόμη και χωρίς επίσημη όχληση.',
            en: 'Notify the insurer as soon as a circumstance that might give rise to a claim is known, even without a formal demand.',
        },
        {
            el: 'Μην απαντήσεις ουσιαστικά στον πελάτη και μην αναγνωρίσεις υπαιτιότητα πριν συνεννοηθείς με τον ασφαλιστή.',
            en: 'Do not respond substantively to the client or admit fault before speaking with the insurer.',
        },
        {
            el: 'Συγκέντρωσε τη σύμβαση έργου, τις οδηγίες του πελάτη και τα παραδοτέα με τις ημερομηνίες τους — η αλληλουχία ορίζει το πεδίο της ευθύνης.',
            en: 'Gather the engagement contract, the client’s instructions and the deliverables with their dates — the sequence defines the scope of the duty.',
        },
        {
            el: 'Κράτα χωριστό αρχείο για τα έξοδα υπεράσπισης, ώστε να παρακολουθείται πώς επηρεάζουν το διαθέσιμο όριο.',
            en: 'Keep a separate record of defence costs, so their effect on the remaining limit can be tracked.',
        },
    ],
    renewalNote: {
        el: 'Σε κάθε ανανέωση αξίζει έλεγχος ότι η αναδρομική ημερομηνία δεν μετακινήθηκε και ότι οι δηλωμένες δραστηριότητες περιλαμβάνουν ό,τι προστέθηκε μέσα στη χρονιά.',
        en: 'At each renewal it is worth confirming the retroactive date has not moved and that the declared activities include whatever was added during the year.',
    },
    emptyState: {
        headline: { el: 'Δεν έχεις προσθέσει επαγγελματική αστική ευθύνη', en: 'No professional liability policy added yet' },
        description: {
            el: 'Ανέβασε το ασφαλιστήριο και δες το όριο ανά απαίτηση, την αναδρομική ημερομηνία και τη θέση των εξόδων υπεράσπισης.',
            en: 'Upload the policy and see the limit per claim, the retroactive date and where defence costs sit.',
        },
        ctaLabel: { el: 'Ανέβασε ασφαλιστήριο', en: 'Upload policy' },
    },
}
