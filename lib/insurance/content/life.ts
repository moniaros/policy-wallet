import type { BranchContent } from './types'

export const lifeContent: BranchContent = {
    branchId: 'life',
    tagline: {
        el: 'Σιγουρέψου ότι το συμβόλαιο ζωής προστατεύει τους ανθρώπους που θέλετε — με το σωστό κεφάλαιο και τους σωστούς δικαιούχους.',
        en: 'Make sure your life policy protects the people you intend — with the right amount and the right beneficiaries.',
    },
    shortDescription: {
        el: 'Κεφάλαιο ζωής, δικαιούχοι, ανικανότητα, σοβαρές ασθένειες, διάρκεια: το PolicyWallet σας δείχνει τι προβλέπει το συμβόλαιό σας για την οικογένειά σας.',
        en: 'Life sum, beneficiaries, disability, critical illness, duration: PolicyWallet shows what your policy provides for your family.',
    },
    whyItMatters: [
        {
            el: 'Οι δικαιούχοι δεν ενημερώνονται αυτόματα με τις αλλαγές της ζωής (γάμος, παιδιά, διαζύγιο) — ξεπερασμένοι δικαιούχοι είναι από τα πιο συχνά λάθη.',
            en: 'Beneficiaries do not update automatically with life changes (marriage, children, divorce) — outdated beneficiaries are one of the most common mistakes.',
        },
        {
            el: 'Το κεφάλαιο πρέπει να αντιστοιχεί στις πραγματικές ανάγκες: στεγαστικό, σπουδές παιδιών, εισόδημα για κάποια χρόνια — όχι σε ένα τυχαίο στρογγυλό ποσό.',
            en: 'The sum insured should match real needs: mortgage, children’s education, some years of income — not an arbitrary round number.',
        },
        {
            el: 'Συμπληρωματικές καλύψεις (ανικανότητα, σοβαρές ασθένειες, απαλλαγή ασφαλίστρων) συχνά έχουν δικούς τους όρους και λήξεις.',
            en: 'Riders (disability, critical illness, premium waiver) often carry their own terms and end dates.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Με βάση το έγγραφο που ανεβάσατε: κεφάλαιο ζωής, δικαιούχους όπως αναγράφονται, διάρκεια κάλυψης και ασφάλιστρο.',
            en: 'Based on the document you uploaded: life sum, beneficiaries as written, coverage duration and premium.',
        },
        {
            el: 'Συμπληρωματικές καλύψεις: μόνιμη ολική ανικανότητα, σοβαρές ασθένειες, απώλεια εισοδήματος — αν φαίνεται να περιλαμβάνονται.',
            en: 'Riders: permanent total disability, critical illness, income loss — where they appear to be included.',
        },
        {
            el: 'Εξαιρέσεις και προϋποθέσεις που επηρεάζουν την καταβολή — τα σημεία που αξίζει να ξέρει και η οικογένειά σας.',
            en: 'Exclusions and conditions affecting payout — the parts your family should know too.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Μετά από κάθε σημαντική αλλαγή ζωής (γάμος, παιδί, νέο δάνειο), ξαναδές δικαιούχους και κεφάλαιο — δύο λεπτά που μετράνε πολύ.',
            en: 'After every major life change (marriage, child, new loan), revisit beneficiaries and sum — two minutes that matter a lot.',
        },
        {
            el: 'Ενημερώστε ένα κοντινό σας πρόσωπο ότι υπάρχει το συμβόλαιο και πού βρίσκεται — μια κάλυψη που δεν ξέρει κανείς, δύσκολα αξιοποιείται.',
            en: 'Tell someone close that the policy exists and where it is — cover nobody knows about is hard to ever use.',
        },
        {
            el: 'Αν έχετε στεγαστικό, δείτε αν το κεφάλαιο ζωής παρακολουθεί το υπόλοιπο του δανείου.',
            en: 'If you have a mortgage, see whether the life sum tracks the remaining loan balance.',
        },
    ],
    commonGaps: [
        {
            id: 'life_mortgage_gap',
            title: { el: 'Στεγαστικό χωρίς κάλυψη ζωής', en: 'Mortgage without life cover' },
            description: {
                el: 'Με βάση το προφίλ σας, ένα στεγαστικό χωρίς αντίστοιχη κάλυψη ζωής αφήνει την αποπληρωμή στην οικογένεια.',
                en: 'Based on your profile, a mortgage without matching life cover leaves the repayment to the family.',
            },
            relatedRuleId: 'mortgage_no_life',
        },
        {
            id: 'life_dependents_gap',
            title: { el: 'Εξαρτώμενα μέλη χωρίς προστασία', en: 'Dependents without protection' },
            description: {
                el: 'Αν υπάρχουν παιδιά ή εξαρτώμενα μέλη, η απουσία κάλυψης ζωής είναι από τα σοβαρότερα κενά ενός χαρτοφυλακίου.',
                en: 'With children or dependents, missing life cover is one of the most serious portfolio gaps.',
            },
            relatedRuleId: 'dependents_no_life',
        },
        {
            id: 'life_income_gap',
            title: { el: 'Χωρίς προστασία εισοδήματος', en: 'No income protection' },
            description: {
                el: 'Το συμβόλαιο ζωής πληρώνει σε άλλους μετά τον θάνατο· μια παρατεταμένη ανικανότητα για εργασία αφήνει εσάς χωρίς εισόδημα όσο ζείτε. Είναι δύο διαφορετικές ανάγκες και συχνά η δεύτερη μένει ακάλυπτη.',
                en: 'Life cover pays others after death; a prolonged inability to work leaves you without income while you are alive. They are two different needs, and the second often goes uncovered.',
            },
            relatedRuleId: 'income_no_protection',
        },
    ],
    recommendedActions: [
        {
            id: 'life_check_beneficiaries',
            label: { el: 'Ελέγξτε αν οι δικαιούχοι είναι ενημερωμένοι', en: 'Check the beneficiaries are up to date' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Ποιοι είναι οι δικαιούχοι στο συμβόλαιό μου;', en: 'Who are the beneficiaries on my policy?' },
        },
        {
            id: 'life_check_sum',
            label: { el: 'Δείτε αν το κεφάλαιο καλύπτει τις ανάγκες της οικογένειας', en: 'See if the sum covers your family’s needs' },
            href: '/coverage-insights',
            ctaType: 'review',
        },
        {
            id: 'life_check_duration',
            label: { el: 'Ελέγξτε διάρκεια και λήξη κάλυψης', en: 'Check duration and cover end date' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Πότε λήγει η κάλυψη ζωής μου;', en: 'When does my life cover end?' },
        },
        {
            id: 'life_update_profile',
            label: { el: 'Σημειώστε σημαντικές αλλαγές ζωής στο προφίλ σας', en: 'Note major life changes in your profile' },
            href: '/coverage-insights',
            ctaType: 'profile',
        },
        {
            id: 'life_ask_agent_income',
            label: { el: 'Ρωτήστε τον σύμβουλό σας για κάλυψη ανικανότητας και εισοδήματος', en: 'Ask your advisor about disability and income cover' },
            href: '/agent',
            ctaType: 'askAgent',
        },
        {
            id: 'life_note_life_change',
            label: { el: 'Σημειώστε αλλαγή ζωής', en: 'Note a life change' },
            href: null,
            ctaType: 'task',
        },
    ],
    suggestedQuestions: [
        { el: 'Ποιοι είναι οι δικαιούχοι μου;', en: 'Who are my beneficiaries?' },
        { el: 'Τι κεφάλαιο καλύπτει το συμβόλαιο;', en: 'What sum does the policy cover?' },
        { el: 'Καλύπτεται ανικανότητα ή σοβαρή ασθένεια;', en: 'Is disability or critical illness covered?' },
        { el: 'Πότε λήγει η κάλυψη;', en: 'When does the cover end?' },
        { el: 'Ποιες είναι οι κύριες εξαιρέσεις;', en: 'What are the main exclusions?' },
    ],
    claimsSteps: [
        {
            el: 'Η οικογένεια ή ο δικαιούχος επικοινωνεί με τον ασφαλιστή ή τον σύμβουλο — τα στοιχεία επικοινωνίας είναι πάνω στο συμβόλαιο.',
            en: 'The family or beneficiary contacts the insurer or advisor — contact details are on the policy.',
        },
        {
            el: 'Συνήθως ζητούνται: ληξιαρχική πράξη, πιστοποιητικά, ταυτότητα δικαιούχου και το ασφαλιστήριο.',
            en: 'Usually required: death certificate, supporting certificates, beneficiary ID and the policy document.',
        },
        {
            el: 'Για ανικανότητα ή σοβαρή ασθένεια, χρειάζονται ιατρικές γνωματεύσεις — δείτε στο συμβόλαιο ποιες προθεσμίες ισχύουν.',
            en: 'For disability or critical illness, medical reports are needed — check the policy for the applicable deadlines.',
        },
    ],
    renewalNote: {
        el: 'Τα συμβόλαια ζωής συχνά δεν «ανανεώνονται» ετησίως αλλά έχουν διάρκεια — ελέγξτε πότε λήγει η κάλυψη και τι προβλέπεται μετά.',
        en: 'Life policies often do not renew yearly but run for a term — check when cover ends and what happens after.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει συμβόλαιο ζωής', en: 'No life policy added yet' },
        description: {
            el: 'Ανεβάστε το συμβόλαιο ζωής σας και δείτε κεφάλαιο, δικαιούχους και συμπληρωματικές καλύψεις — όλα σε μία εικόνα.',
            en: 'Upload your life policy and see sum, beneficiaries and riders — all in one view.',
        },
        ctaLabel: { el: 'Ανεβάστε συμβόλαιο', en: 'Upload policy' },
    },
}
