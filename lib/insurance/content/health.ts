import type { BranchContent } from './types'

export const healthContent: BranchContent = {
    branchId: 'health',
    tagline: {
        el: 'Μάθετε τι πληρώνετε εσείς και τι ο ασφαλιστής σας — πριν βρεθείτε στο νοσοκομείο.',
        en: 'Know what you pay and what your insurer pays — before you are in hospital.',
    },
    shortDescription: {
        el: 'Νοσοκομειακή περίθαλψη, πρωτοβάθμια φροντίδα, απαλλαγές, συμμετοχές, αναμονές και εξαιρέσεις — εξηγημένα με απλά λόγια, από το δικό σας συμβόλαιο.',
        en: 'Hospital care, primary care, deductibles, co-payments, waiting periods and exclusions — explained in plain language, from your own policy.',
    },
    whyItMatters: [
        {
            el: 'Η απαλλαγή και η συμμετοχή καθορίζουν τι θα πληρώσετε εσείς σε μια νοσηλεία — δύο συμβόλαια με ίδιο ασφάλιστρο μπορεί να διαφέρουν χιλιάδες ευρώ στην πράξη.',
            en: 'The deductible and co-payment decide what you pay in a hospitalisation — two policies with the same premium can differ by thousands of euros in practice.',
        },
        {
            el: 'Οι αναμονές σημαίνουν ότι κάποιες παθήσεις δεν καλύπτονται τους πρώτους μήνες — καλό είναι να τις ξέρετε πριν τις χρειαστείτε.',
            en: 'Waiting periods mean some conditions are not covered in the first months — better to know them before you need them.',
        },
        {
            el: 'Αν έχετε και ομαδικό (από τη δουλειά) και ατομικό πρόγραμμα, ο σωστός συνδυασμός τους μπορεί να μειώσει σημαντικά τη δική σας συμμετοχή.',
            en: 'If you have both a group plan (from work) and an individual one, combining them correctly can significantly reduce what you pay.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Με βάση το έγγραφο που ανεβάσατε: όριο κάλυψης, απαλλαγή, ποσοστό συμμετοχής, θέση νοσηλείας και δίκτυο συμβεβλημένων νοσοκομείων.',
            en: 'Based on the document you uploaded: coverage limit, deductible, co-payment percentage, room class and the contracted hospital network.',
        },
        {
            el: 'Αναμονές, εξαιρέσεις και όρους για προϋπάρχουσες παθήσεις — τα σημεία που συνήθως κρύβονται στα ψιλά γράμματα.',
            en: 'Waiting periods, exclusions and pre-existing-condition terms — the parts usually hidden in the fine print.',
        },
        {
            el: 'Παροχές που ίσως ξεχνάτε ότι έχετε: προληπτικός έλεγχος (check-up), δεύτερη ιατρική γνώμη, διαγνωστικές εξετάσεις, παροχές ευεξίας.',
            en: 'Benefits you may forget you have: preventive check-up, second medical opinion, diagnostics, wellbeing perks.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Χρησιμοποιήστε τον δωρεάν προληπτικό έλεγχο αν το πρόγραμμά σας τον περιλαμβάνει — συνήθως ανανεώνεται κάθε χρόνο και χάνεται αν δεν τον κάνετε.',
            en: 'Use the free preventive check-up if your plan includes it — it usually resets yearly and is lost if unused.',
        },
        {
            el: 'Πριν από προγραμματισμένη νοσηλεία, ρωτήστε αν το νοσοκομείο είναι συμβεβλημένο — η διαφορά στη συμμετοχή μπορεί να είναι μεγάλη.',
            en: 'Before a planned hospitalisation, ask whether the hospital is in-network — the difference in what you pay can be large.',
        },
        {
            el: 'Αν έχετε ομαδικό πρόγραμμα, δείτε πρώτα τι καλύπτει εκείνο και μετά τι συμπληρώνει το ατομικό — με αυτή τη σειρά.',
            en: 'If you have a group plan, check what it covers first and what your individual plan tops up — in that order.',
        },
    ],
    commonGaps: [
        {
            id: 'health_outpatient_gap',
            title: { el: 'Χωρίς εξωνοσοκομειακή κάλυψη', en: 'No outpatient coverage' },
            description: {
                el: 'Πολλά νοσοκομειακά προγράμματα δεν καλύπτουν ιατρικές επισκέψεις και διαγνωστικές εξετάσεις εκτός νοσηλείας.',
                en: 'Many hospital plans do not cover doctor visits and diagnostics outside hospitalisation.',
            },
            relatedRuleId: 'health-outpatient',
        },
        {
            id: 'health_low_limit_gap',
            title: { el: 'Χαμηλό όριο κάλυψης', en: 'Low coverage limit' },
            description: {
                el: 'Μια σοβαρή νοσηλεία σε ιδιωτικό νοσοκομείο μπορεί να ξεπεράσει χαμηλά ετήσια όρια — ίσως αξίζει έλεγχος του ορίου.',
                en: 'A serious private-hospital stay can exceed low annual limits — the limit may be worth a review.',
            },
            relatedRuleId: 'health_low_coverage',
        },
        {
            id: 'health_waiting_gap',
            title: { el: 'Αναμονές που δεν έχετε υπόψη', en: 'Waiting periods you may not know' },
            description: {
                el: 'Ορισμένες καλύψεις ενεργοποιούνται μήνες μετά την έναρξη — με βάση το έγγραφο, δείτε ποιες αναμονές ισχύουν ακόμη.',
                en: 'Some coverages activate months after inception — based on the document, see which waits still apply.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'health_check_oop',
            label: { el: 'Δείτε τι πληρώνετε εσείς σε νοσηλεία', en: 'See what you pay in a hospitalisation' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Τι πληρώνω εγώ σε μια νοσηλεία;', en: 'What do I pay in a hospitalisation?' },
        },
        {
            id: 'health_check_group',
            label: { el: 'Ελέγξτε αν το ομαδικό σας αρκεί', en: 'Check whether your group plan is enough' },
            href: '/coverage-insights',
            ctaType: 'review',
        },
        {
            id: 'health_check_waits',
            label: { el: 'Βρείτε πιθανές αναμονές και εξαιρέσεις', en: 'Find possible waits and exclusions' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Ποιες αναμονές και εξαιρέσεις έχει το πρόγραμμά μου;', en: 'What waiting periods and exclusions does my plan have?' },
        },
        {
            id: 'health_use_perks',
            label: { el: 'Δείτε ποιες παροχές μπορείτε να χρησιμοποιήσεις τώρα', en: 'See which benefits you can use now' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Ποιες παροχές του προγράμματός μου μπορώ να χρησιμοποιήσω τώρα;', en: 'Which benefits of my plan can I use right now?' },
        },
        {
            id: 'health_ask_agent',
            label: { el: 'Ρωτήστε τον σύμβουλό σας για συμπληρωματική κάλυψη', en: 'Ask your advisor about supplementary cover' },
            href: '/agent',
            ctaType: 'askAgent',
        },
        {
            id: 'health_save_emergency_line',
            label: { el: 'Αποθηκεύστε τη γραμμή επείγουσας βοήθειας', en: 'Save the emergency assistance line' },
            href: null,
            ctaType: 'task',
            requiresPhone: true,
        },
    ],
    suggestedQuestions: [
        { el: 'Τι πληρώνω εγώ σε νοσηλεία;', en: 'What do I pay in a hospitalisation?' },
        { el: 'Ποια νοσοκομεία είναι συμβεβλημένα;', en: 'Which hospitals are in-network?' },
        { el: 'Ποιες αναμονές ισχύουν ακόμη;', en: 'Which waiting periods still apply?' },
        { el: 'Καλύπτονται διαγνωστικές εξετάσεις;', en: 'Are diagnostic tests covered?' },
        { el: 'Έχω δωρεάν προληπτικό έλεγχο;', en: 'Do I have a free preventive check-up?' },
    ],
    claimsSteps: [
        {
            el: 'Σε έκτακτη νοσηλεία, ενημερώστε το συντονιστικό κέντρο του ασφαλιστή το συντομότερο — συνήθως υπάρχει 24ωρη γραμμή στο συμβόλαιο.',
            en: 'In an emergency admission, notify the insurer’s coordination centre promptly — there is usually a 24h line on the policy.',
        },
        {
            el: 'Για προγραμματισμένη νοσηλεία, ζητήστε προέγκριση πριν μπεις — αποφεύγεις εκπλήξεις στη συμμετοχή.',
            en: 'For a planned admission, get pre-approval before going in — it avoids surprises in your share.',
        },
        {
            el: 'Κρατήστε όλες τις γνωματεύσεις, τα παραπεμπτικά και τις αποδείξεις — ζητούνται σχεδόν πάντα στον φάκελο.',
            en: 'Keep all medical reports, referrals and receipts — they are almost always required in the file.',
        },
    ],
    renewalNote: {
        el: 'Στην ανανέωση, πρόσεξε αλλαγές σε απαλλαγή, συμμετοχή και όρια — και ρωτήστε αν οι αναμονές που έχετε ήδη «χτίσει» μεταφέρονται.',
        en: 'At renewal, watch for changes to deductible, co-payment and limits — and ask whether the waiting periods you have already served carry over.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει συμβόλαιο υγείας', en: 'No health policy added yet' },
        description: {
            el: 'Ανεβάστε το πρόγραμμα υγείας σας (ή το ομαδικό της δουλειάς) και δείτε τι πληρώνετε εσείς, τι αναμονές ισχύουν και ποιες παροχές έχετε.',
            en: 'Upload your health plan (or your work group plan) and see what you pay, which waits apply and what benefits you have.',
        },
        ctaLabel: { el: 'Ανεβάστε συμβόλαιο', en: 'Upload policy' },
    },
}
