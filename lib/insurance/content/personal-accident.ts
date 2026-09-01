import type { BranchContent } from './types'

/**
 * Personal accident is a CHILD of life, but it is an accident-only product:
 * illness is excluded by definition, payouts follow a permanent-disability
 * percentage scale rather than a single sum, and cover may be limited to
 * working hours. The life-bundle fallback discussed beneficiaries, mortgages
 * and critical illness — none of which describe this policy.
 *
 * HONESTY: `AcordDataSchema` has NO typed section for personal accident. The
 * disability scale, the capital sums and the 24h/occupational scope live only
 * in the free-text `coverages[]` / `exclusions[]`, so `whatWeAnalyze` says so
 * rather than enumerating limits we cannot extract.
 */
export const personalAccidentContent: BranchContent = {
    branchId: 'personal_accident',
    tagline: {
        el: 'Πληρώνει για ατύχημα — και μόνο για ατύχημα. Δείτε τι μετρά ως τέτοιο και πόσο αποδίδει η κάθε περίπτωση.',
        en: 'It pays for accidents — and only for accidents. See what counts as one and what each case pays.',
    },
    shortDescription: {
        el: 'Εφάπαξ κεφάλαια, πίνακας ποσοστών μόνιμης ανικανότητας, ημερήσια αποζημίωση, εύρος 24 ωρών ή μόνο εργασίας: το PolicyWallet σας δείχνει πώς μεταφράζεται ένα ατύχημα σε ποσό.',
        en: 'Lump-sum capital, permanent-disability percentage scale, daily indemnity, 24-hour or work-only scope: PolicyWallet shows how an accident translates into an amount.',
    },
    whyItMatters: [
        {
            el: 'Το εφάπαξ κεφάλαιο δεν καταβάλλεται ολόκληρο σε κάθε τραυματισμό: συνήθως αποδίδεται ως ποσοστό του, με βάση πίνακα μόνιμης ανικανότητας που ορίζει τι αξίζει η κάθε απώλεια.',
            en: 'The lump sum is not paid in full for every injury: it is usually paid as a percentage of it, from a permanent-disability scale that assigns a value to each loss.',
        },
        {
            el: 'Η κάλυψη ενεργοποιείται από αιφνίδιο, εξωτερικό και βίαιο γεγονός. Οτιδήποτε προκύπτει από ασθένεια ή σταδιακή φθορά μένει εκτός, ακόμη κι αν το αποτέλεσμα μοιάζει ίδιο.',
            en: 'Cover triggers on a sudden, external and violent event. Anything arising from illness or gradual wear falls outside, even where the outcome looks identical.',
        },
        {
            el: 'Ορισμένα συμβόλαια ισχύουν μόνο κατά τις ώρες εργασίας ή τη διαδρομή προς αυτήν — ένα ατύχημα το Σαββατοκύριακο ενδέχεται να μην τα ενεργοποιεί καθόλου.',
            en: 'Some policies apply only during working hours or the commute — a weekend accident may not engage them at all.',
        },
        {
            el: 'Η αποζημίωση εξόδων νοσηλείας λειτουργεί διαφορετικά από το εφάπαξ: αποδίδει πραγματικές δαπάνες με παραστατικά, μέχρι ένα όριο.',
            en: 'Medical-expense indemnity works differently from the lump sum: it reimburses actual documented costs, up to a limit.',
        },
        {
            el: 'Δραστηριότητες όπως αγωνιστικά σπορ, καταδύσεις ή μοτοσικλέτα μεγάλου κυβισμού εμφανίζονται συχνά στις εξαιρέσεις — αξίζει έλεγχος αν σε αφορούν.',
            en: 'Activities such as competitive sports, diving or large-capacity motorbikes often appear in the exclusions — worth a check if they apply to you.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Το προσωπικό ατύχημα δεν έχει τυποποιημένα πεδία στην ανάλυσή μας: διαβάζουμε τις καλύψεις και τις εξαιρέσεις όπως είναι γραμμένες στο έγγραφο που ανεβάσατε.',
            en: 'Personal accident has no structured fields in our analysis: we read the coverages and exclusions as written in the document you uploaded.',
        },
        {
            el: 'Εντοπίζουμε τις αναφορές σε εφάπαξ κεφάλαια, ποσοστά μόνιμης ανικανότητας, ημερήσια αποζημίωση και έξοδα νοσηλείας — όπως τα διατυπώνει το συμβόλαιο, χωρίς δικές μας εκτιμήσεις.',
            en: 'We surface references to lump-sum capital, permanent-disability percentages, daily indemnity and medical expenses — as the policy words them, with no estimates of our own.',
        },
        {
            el: 'Τα σημεία που περιορίζουν το εύρος: ώρες ισχύος, δραστηριότητες, ηλικιακά όρια και προθεσμίες δήλωσης, εφόσον αναγράφονται.',
            en: 'The points that narrow the scope: hours of validity, activities, age limits and notification deadlines, where stated.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Ζητήστε τον πίνακα ποσοστών μόνιμης ανικανότητας και διάβασέ τον μία φορά με ηρεμία — εκεί βρίσκεται η πραγματική αξία του συμβολαίου, όχι στο κεφάλαιο της πρώτης σελίδας.',
            en: 'Ask for the permanent-disability percentage table and read it once, calmly — the policy’s real value lives there, not in the headline capital on page one.',
        },
        {
            el: 'Αν έχετε παρόμοια κάλυψη μέσω εργοδότη ή ομαδικού συμβολαίου, δείτε πώς συνδυάζονται· τα εφάπαξ συνήθως αθροίζονται, οι δαπάνες συνήθως όχι.',
            en: 'If you have similar cover through an employer or group scheme, see how they combine; lump sums usually add up, expense reimbursements usually do not.',
        },
        {
            el: 'Δηλώστε με ακρίβεια τις δραστηριότητες και το επάγγελμά σας — μια παράλειψη εδώ είναι από τους συχνότερους λόγους απόρριψης σε ατύχημα.',
            en: 'Declare your activities and occupation accurately — an omission here is among the most common reasons an accident claim is declined.',
        },
        {
            el: 'Κρατήστε τα ιατρικά έγγραφα κάθε ατυχήματος, ακόμη και μικρού· ορισμένες συνέπειες αποτιμώνται μήνες αργότερα.',
            en: 'Keep the medical records of every accident, even a minor one; some consequences are assessed months later.',
        },
    ],
    commonGaps: [
        {
            id: 'personal_accident_illness_gap',
            title: { el: 'Η ασθένεια μένει εκτός', en: 'Illness stays outside' },
            description: {
                el: 'Το προσωπικό ατύχημα δεν καλύπτει παθήσεις. Αν χρειάζεστε προστασία και για ασθένεια, αυτή έρχεται από άλλο συμβόλαιο.',
                en: 'Personal accident does not cover illness. If you need protection for illness too, that comes from a different policy.',
            },
        },
        {
            id: 'personal_accident_scope_gap',
            title: { el: 'Κάλυψη μόνο σε ώρες εργασίας', en: 'Work-hours-only cover' },
            description: {
                el: 'Αν το συμβόλαιο ισχύει μόνο επαγγελματικά, ο ελεύθερος χρόνος — όπου συμβαίνουν πολλά ατυχήματα — ενδέχεται να μένει ακάλυπτος.',
                en: 'If the policy applies occupationally only, leisure time — where many accidents happen — may go uncovered.',
            },
        },
        {
            id: 'personal_accident_scale_gap',
            title: { el: 'Άγνωστος πίνακας ποσοστών', en: 'Unknown percentage scale' },
            description: {
                el: 'Χωρίς τον πίνακα μόνιμης ανικανότητας, το κεφάλαιο του συμβολαίου δεν λέει σχεδόν τίποτα για το τι θα καταβληθεί στην πράξη.',
                en: 'Without the permanent-disability table, the policy’s headline capital says almost nothing about what would actually be paid.',
            },
        },
        {
            id: 'personal_accident_activities_gap',
            title: { el: 'Δραστηριότητες στις εξαιρέσεις', en: 'Activities in the exclusions' },
            description: {
                el: 'Αθλήματα, χόμπι ή οχήματα που χρησιμοποιείτε τακτικά μπορεί να αναφέρονται ρητά ως εξαιρέσεις — ίσως αξίζει να το επιβεβαιώσετε πριν χρειαστεί.',
                en: 'Sports, hobbies or vehicles you use regularly may be named explicitly as exclusions — worth confirming before it matters.',
            },
            relatedRuleId: 'unclear_exclusions',
        },
    ],
    recommendedActions: [
        {
            id: 'personal_accident_check_scale',
            label: { el: 'Δείτε πώς υπολογίζεται η μόνιμη ανικανότητα', en: 'See how permanent disability is calculated' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Πώς υπολογίζεται η αποζημίωση για μόνιμη ανικανότητα;',
                en: 'How is the permanent-disability payout calculated?',
            },
        },
        {
            id: 'personal_accident_check_scope',
            label: { el: 'Ελέγξτε αν ισχύει 24 ώρες το 24ωρο', en: 'Check whether it applies around the clock' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Η κάλυψη ισχύει 24 ώρες ή μόνο σε ώρες εργασίας;',
                en: 'Does the cover apply 24 hours a day or only during working hours?',
            },
        },
        {
            id: 'personal_accident_check_exclusions',
            label: { el: 'Δείτε ποιες δραστηριότητες εξαιρούνται', en: 'See which activities are excluded' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Ποιες δραστηριότητες εξαιρούνται από την κάλυψη;', en: 'Which activities are excluded from cover?' },
        },
        {
            id: 'personal_accident_review_overlap',
            label: { el: 'Ελέγξτε αν επικαλύπτεται με άλλη κάλυψη ατυχήματος', en: 'Check for overlap with other accident cover' },
            href: '/protection',
            ctaType: 'review',
        },
        {
            id: 'personal_accident_ask_agent_scale',
            label: { el: 'Ζητήστε από τον σύμβουλό σας τον πίνακα ποσοστών', en: 'Ask your advisor for the percentage table' },
            href: '/agent',
            ctaType: 'askAgent',
        },
        {
            id: 'personal_accident_note_life_change',
            label: { el: 'Σημειώστε αλλαγή ζωής', en: 'Note a life change' },
            href: null,
            ctaType: 'task',
        },
    ],
    suggestedQuestions: [
        { el: 'Τι θεωρείται ατύχημα στο συμβόλαιό μου;', en: 'What counts as an accident in my policy?' },
        { el: 'Πόσο αποδίδει η μόνιμη μερική ανικανότητα;', en: 'What does partial permanent disability pay?' },
        { el: 'Καλύπτονται τα έξοδα νοσηλείας μετά από ατύχημα;', en: 'Are medical expenses after an accident covered?' },
        { el: 'Ισχύει η κάλυψη και εκτός εργασίας;', en: 'Does the cover apply outside work as well?' },
        { el: 'Υπάρχει ημερήσια αποζημίωση για ανικανότητα;', en: 'Is there a daily indemnity for incapacity?' },
    ],
    claimsSteps: [
        {
            el: 'Ζητήστε από την πρώτη στιγμή ιατρική βεβαίωση που περιγράφει το γεγονός ως ατύχημα — ο χαρακτηρισμός στο αρχικό έγγραφο βαραίνει πολύ αργότερα.',
            en: 'From the outset, ask for a medical certificate describing the event as an accident — how the first document characterises it carries weight much later.',
        },
        {
            el: 'Καταγράψτε πού, πότε και πώς συνέβη, με μάρτυρες αν υπάρχουν· το «αιφνίδιο και εξωτερικό» πρέπει να προκύπτει από τα στοιχεία.',
            en: 'Record where, when and how it happened, with witnesses if any; “sudden and external” has to be evident from the evidence.',
        },
        {
            el: 'Δηλώστε το συμβάν εντός της προθεσμίας που ορίζει το συμβόλαιο — στα ατυχήματα οι προθεσμίες είναι συχνά σύντομες.',
            en: 'Report the event within the deadline the policy sets — for accidents the deadlines are often short.',
        },
        {
            el: 'Κρατήστε κάθε παραστατικό δαπάνης χωριστά από τις γνωματεύσεις· τα δύο κρίνονται με διαφορετικούς όρους.',
            en: 'Keep every expense receipt separate from the medical opinions; the two are assessed under different terms.',
        },
    ],
    renewalNote: {
        el: 'Αν άλλαξαν επάγγελμα, αθλήματα ή συνήθειες μετακίνησης, η ανανέωση είναι η στιγμή να τα δηλώσετε — το εύρος της κάλυψης εξαρτάται από αυτά.',
        en: 'If your occupation, sports or commuting habits have changed, renewal is the moment to declare them — the scope of cover depends on them.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει συμβόλαιο προσωπικού ατυχήματος', en: 'No personal accident policy added yet' },
        description: {
            el: 'Ανεβάστε το συμβόλαιο και δείτε τι μετρά ως ατύχημα, τι αποδίδει η κάθε περίπτωση και πού σταματά η κάλυψη.',
            en: 'Upload the policy and see what counts as an accident, what each case pays and where the cover stops.',
        },
        ctaLabel: { el: 'Ανεβάστε συμβόλαιο', en: 'Upload policy' },
    },
}
