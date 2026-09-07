import type { BranchContent } from './types'

/**
 * Legal expenses (νομική προστασία) — the most misunderstood Greek line.
 * The copy deliberately leads with what the cover is NOT.
 *
 * HONESTY NOTE: `AcordDataSchema` has NO typed section for this branch. Scope,
 * waiting periods and limits exist only as free text inside `coverages[]` and
 * the conditions, so `whatWeAnalyze` says exactly that and enumerates nothing.
 */
export const legalExpensesContent: BranchContent = {
    branchId: 'legal_expenses',
    tagline: {
        el: 'Δεν είναι δικηγόρος στη διάθεσή σας — είναι κάλυψη εξόδων για συγκεκριμένα είδη διαφορών, με δικούς της όρους.',
        en: 'It is not a lawyer on retainer — it is cover for the costs of specific kinds of disputes, on its own terms.',
    },
    shortDescription: {
        el: 'Δικαστικά έξοδα, αμοιβές δικηγόρου και πραγματογνωμοσύνες σε διαφορές τροχαίου, εργασιακές, καταναλωτικές και συμβατικές: το PolicyWallet σας δείχνει τι πραγματικά περιγράφει το κείμενο του ασφαλιστηρίου σας.',
        en: 'Court costs, lawyer fees and expert reports in traffic, employment, consumer and contractual disputes: PolicyWallet shows what the wording of your contract actually describes.',
    },
    whyItMatters: [
        {
            el: 'Πρώτα τι ΔΕΝ είναι: δεν είναι νομικός σύμβουλος με πάγιο, διαθέσιμος για κάθε ερώτημα. Είναι κάλυψη εξόδων — αμοιβές, δικαστικά τέλη, πραγματογνώμονες — για διαφορές που πληρούν τους όρους του ασφαλιστηρίου.',
            en: 'First, what it is NOT: it is not a legal adviser on a monthly fee, available for every question. It is cost cover — fees, court dues, experts — for disputes that meet the contract’s terms.',
        },
        {
            el: 'Σχεδόν κάθε πρόγραμμα ορίζει χρόνο αναμονής. Μια διαφορά που γεννήθηκε πριν την έναρξη ή μέσα στους πρώτους μήνες ισχύος συνήθως μένει εκτός, ακόμη κι αν την πληροφορήθηκες αργότερα.',
            en: 'Almost every plan sets a waiting period. A dispute born before inception, or within the first months of cover, usually stays out — even if you learned of it later.',
        },
        {
            el: 'Πριν αναλάβει τα έξοδα, ο ασφαλιστής εξετάζει αν η υπόθεση έχει εύλογες πιθανότητες επιτυχίας. Αν κρίνει πως δεν έχει, ενδέχεται να αρνηθεί την ανάληψη — και το ασφαλιστήριο συνήθως προβλέπει διαδικασία για να αμφισβητήσεις αυτή την κρίση.',
            en: 'Before taking on the costs, the insurer assesses whether the case has reasonable prospects of success. If it decides there are none, it may decline — and the contract usually provides a route to challenge that assessment.',
        },
        {
            el: 'Η ελεύθερη επιλογή δικηγόρου αναγνωρίζεται όταν η υπόθεση φτάσει σε δικαστική ή διοικητική διαδικασία. Ο ασφαλιστής όμως αποζημιώνει μέχρι το όριο του ασφαλιστηρίου — ό,τι περισσεύει από την αμοιβή μένει σε εσάς.',
            en: 'Free choice of lawyer is recognised once the case reaches court or an administrative procedure. The insurer, though, reimburses only up to the contract’s limit — whatever the fee exceeds it stays with you.',
        },
        {
            el: 'Στην ελληνική αγορά η νομική προστασία πωλείται πολύ συχνά ως πρόσθετη κάλυψη μέσα στο ασφαλιστήριο του αυτοκινήτου, με πεδίο μόνο τα τροχαία. Αν περιμένετε να καλύψει εργασιακή ή καταναλωτική διαφορά, αξίζει να το επιβεβαιώσεις στο κείμενο.',
            en: 'In the Greek market legal expenses is very often sold as an add-on inside the motor policy, scoped to traffic matters only. If you expect it to cover an employment or consumer dispute, it is worth confirming in the wording.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Ποια πεδία διαφορών αναφέρει το κείμενο — τροχαία, εργασιακά, καταναλωτικά, συμβατικά, γειτονικά. Η γραμμή δεν έχει τυποποιημένα πεδία, οπότε βασιζόμαστε αποκλειστικά στο ελεύθερο κείμενο των καλύψεων του εγγράφου που ανεβάσατε.',
            en: 'Which fields of dispute the wording names — traffic, employment, consumer, contractual, neighbour matters. The line has no standardised fields, so we rely purely on the free-text coverages of the document you uploaded.',
        },
        {
            el: 'Αναφορές σε χρόνο αναμονής, σε γεωγραφική ισχύ και σε προϋποθέσεις ανάληψης της υπόθεσης, όπως εμφανίζονται στους όρους.',
            en: 'Mentions of waiting periods, territorial scope and conditions for taking on a case, as they appear in the terms.',
        },
        {
            el: 'Τις εξαιρέσεις, με τη διατύπωση του εγγράφου. Δεν υπολογίζουμε και δεν υποθέτουμε όρια εξόδων που δεν αναγράφονται.',
            en: 'The exclusions, in the document’s own wording. We do not compute or assume cost limits that are not written down.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Ενημερώστε τον ασφαλιστή πριν αναθέσεις υπόθεση σε δικηγόρο. Έξοδα που έγιναν χωρίς προηγούμενη αναγγελία συχνά δεν αναγνωρίζονται αναδρομικά.',
            en: 'Notify the insurer before instructing a lawyer. Costs incurred without prior notification are often not recognised retroactively.',
        },
        {
            el: 'Ελέγξτε αν η κάλυψη περιορίζεται στα τροχαία ή αν φτάνει και σε εργασιακές ή καταναλωτικές διαφορές — η διαφορά στην πράξη είναι τεράστια.',
            en: 'Check whether the cover stops at traffic matters or reaches employment and consumer disputes too — in practice the difference is enormous.',
        },
        {
            el: 'Κρατήστε αρχείο της αλληλογραφίας από την πρώτη μέρα της διαφοράς: η ημερομηνία γέννησης της υπόθεσης καθορίζει αν πέφτει μέσα ή έξω από την αναμονή.',
            en: 'Keep a record of the correspondence from day one of the dispute: the date the case arose decides whether it falls inside or outside the waiting period.',
        },
        {
            el: 'Αν ο ασφαλιστής κρίνει ότι η υπόθεση δεν έχει εύλογες πιθανότητες, ζητήστε την κρίση εγγράφως και δείτε τι προβλέπει το ασφαλιστήριο για δεύτερη γνώμη ή διαιτησία.',
            en: 'If the insurer judges the case lacks reasonable prospects, ask for that assessment in writing and see what the contract provides for a second opinion or arbitration.',
        },
    ],
    commonGaps: [
        {
            id: 'legal_scope_traffic_only_gap',
            title: { el: 'Κάλυψη μόνο για τροχαία', en: 'Traffic-only scope' },
            description: {
                el: 'Αν η νομική προστασία προήλθε από το ασφαλιστήριο του αυτοκινήτου, το πεδίο της ενδέχεται να σταματά στα τροχαία και να μην αγγίζει εργασιακές ή καταναλωτικές διαφορές.',
                en: 'If the legal cover came with your motor policy, its scope may stop at traffic matters and never reach employment or consumer disputes.',
            },
            relatedRuleId: 'no_legal_expenses',
        },
        {
            id: 'legal_waiting_period_gap',
            title: { el: 'Χρόνος αναμονής που δεν έχει συμπληρωθεί', en: 'Waiting period not yet served' },
            description: {
                el: 'Οι πρώτοι μήνες ισχύος συνήθως δεν καλύπτουν νέες διαφορές. Αν το ασφαλιστήριο είναι πρόσφατο, ίσως αξίζει να δείτε πότε ενεργοποιείται πραγματικά.',
                en: 'The first months of cover usually do not admit new disputes. If the contract is recent, it may be worth seeing when it truly switches on.',
            },
        },
        {
            id: 'legal_preapproval_gap',
            title: { el: 'Έξοδα χωρίς προηγούμενη αναγγελία', en: 'Costs incurred without prior notice' },
            description: {
                el: 'Αμοιβές που συμφωνήθηκαν πριν ενημερωθεί ο ασφαλιστής μένουν συχνά εκτός αποζημίωσης, ακόμη κι όταν η υπόθεση καλύπτεται.',
                en: 'Fees agreed before the insurer was informed are often left outside the settlement, even when the case itself is covered.',
            },
        },
        {
            id: 'legal_driving_record_gap',
            title: { el: 'Συχνές εμπλοκές σε τροχαία χωρίς νομική στήριξη', en: 'Frequent traffic incidents without legal support' },
            description: {
                el: 'Με βάση το προφίλ σας, η διεκδίκηση αποζημίωσης μετά από τροχαίο που δεν προκάλεσες συνήθως απαιτεί νομικά έξοδα που κάποιος πρέπει να προκαταβάλει.',
                en: 'Based on your profile, pursuing compensation after an accident you did not cause usually means legal costs somebody has to advance.',
            },
            relatedRuleId: 'poor_driving_record_needs_legal',
        },
    ],
    recommendedActions: [
        {
            id: 'legal_check_scope',
            label: { el: 'Δείτε ποιες διαφορές καλύπτονται', en: 'See which disputes are covered' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιες κατηγορίες διαφορών καλύπτει η νομική μου προστασία;',
                en: 'Which categories of dispute does my legal expenses cover include?',
            },
        },
        {
            id: 'legal_check_waiting',
            label: { el: 'Ελέγξτε αν υπάρχει χρόνος αναμονής', en: 'Check whether a waiting period applies' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Υπάρχει χρόνος αναμονής στη νομική μου προστασία;',
                en: 'Is there a waiting period on my legal expenses cover?',
            },
        },
        {
            id: 'legal_check_lawyer_choice',
            label: { el: 'Δείτε τι ισχύει για την επιλογή δικηγόρου', en: 'See what applies to choosing a lawyer' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Μπορώ να επιλέξω δικό μου δικηγόρο και μέχρι ποιο ποσό καλύπτεται;',
                en: 'Can I choose my own lawyer, and up to what amount is it covered?',
            },
        },
        {
            id: 'legal_review_terms',
            label: { el: 'Διαβάστε τους όρους ανάληψης υπόθεσης', en: 'Read the case-acceptance conditions' },
            href: '/protection',
            ctaType: 'review',
        },
        {
            id: 'legal_ask_agent',
            label: { el: 'Ρωτήστε τον σύμβουλό σας πώς αναγγέλλεται μια υπόθεση', en: 'Ask your advisor how a case is notified' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Ποιες κατηγορίες διαφορών καλύπτει η νομική μου προστασία;', en: 'Which categories of dispute does my legal expenses cover include?' },
        { el: 'Υπάρχει χρόνος αναμονής;', en: 'Is there a waiting period?' },
        { el: 'Καλύπτονται εργασιακές διαφορές;', en: 'Are employment disputes covered?' },
        { el: 'Μπορώ να διαλέξω δικό μου δικηγόρο;', en: 'Can I choose my own lawyer?' },
        { el: 'Τι γίνεται αν ο ασφαλιστής κρίνει ότι η υπόθεση δεν έχει πιθανότητες;', en: 'What happens if the insurer judges the case has no prospects?' },
    ],
    claimsSteps: [
        {
            el: 'Αναγγείλετε τη διαφορά στον ασφαλιστή πριν προχωρήσετε σε οποιαδήποτε νομική ενέργεια — η σειρά των βημάτων μετράει εδώ περισσότερο από αλλού.',
            en: 'Notify the dispute to your insurer before taking any legal step — here the order of the steps matters more than anywhere else.',
        },
        {
            el: 'Στείλτε από την αρχή τα έγγραφα που δείχνουν πότε γεννήθηκε η υπόθεση: σύμβαση, τιμολόγιο, εξώδικο, καταγγελία, δελτίο τροχαίου.',
            en: 'Send from the start the documents that show when the case arose: contract, invoice, formal notice, complaint, accident report.',
        },
        {
            el: 'Περιμένετε γραπτή επιβεβαίωση ανάληψης πριν συμφωνήσετε αμοιβή με δικηγόρο, και κρατήστε την στον φάκελο.',
            en: 'Wait for written confirmation that the case is accepted before agreeing a fee with a lawyer, and keep it on file.',
        },
        {
            el: 'Κρατήστε κάθε παραστατικό εξόδου ξεχωριστά — δικαστικά τέλη, αμοιβές, πραγματογνωμοσύνες αποζημιώνονται με βάση τα δικά τους παραστατικά.',
            en: 'Keep every cost receipt separately — court dues, fees and expert reports are reimbursed against their own documents.',
        },
    ],
    renewalNote: {
        el: 'Στην ανανέωση αξίζει να δείτε αν το πεδίο εφαρμογής άλλαξε: οι όροι της νομικής προστασίας αναδιατυπώνονται συχνότερα από τις υπόλοιπες καλύψεις.',
        en: 'At renewal it is worth checking whether the scope changed: legal-expenses wordings are rewritten more often than other covers.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει ασφαλιστήριο νομικής προστασίας', en: 'No legal expenses policy added yet' },
        description: {
            el: 'Ανεβάστε το έγγραφο — ή το ασφαλιστήριο του αυτοκινήτου, όπου συνήθως προσαρτάται η κάλυψη — και δείτε ποιες διαφορές φαίνεται να αφορά.',
            en: 'Upload the document — or your motor policy, where the cover is usually attached — and see which disputes it appears to address.',
        },
        ctaLabel: { el: 'Ανεβάστε ασφαλιστήριο', en: 'Upload policy' },
    },
}
