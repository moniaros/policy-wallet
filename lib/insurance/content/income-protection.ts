import type { BranchContent } from './types'

/**
 * Income protection is a CHILD of life in the taxonomy and shares almost
 * nothing with it. Life pays a lump sum to someone else after death; income
 * protection pays YOU a monthly benefit while you cannot work. Falling back to
 * the life bundle told users to check their beneficiaries — a question that
 * does not apply to this product at all.
 *
 * HONESTY: `AcordDataSchema` has NO typed section for income protection.
 * Benefit period, deferred period and the occupation definition live only in
 * the free-text `coverages[]` / `exclusions[]` of the uploaded document, so
 * `whatWeAnalyze` says that plainly instead of enumerating figures we cannot
 * extract.
 */
export const incomeProtectionContent: BranchContent = {
    branchId: 'income_protection',
    tagline: {
        el: 'Αν σταματήσει ο μισθός επειδή δεν μπορείτε να δουλέψεις, αυτό το ασφαλιστήριο είναι που συνεχίζει να πληρώνει.',
        en: 'If the salary stops because you cannot work, this is the policy that keeps paying.',
    },
    shortDescription: {
        el: 'Μηνιαίο επίδομα, περίοδος αναμονής, διάρκεια καταβολής, ορισμός ανικανότητας και τιμαριθμική αναπροσαρμογή: το PolicyWallet σας δείχνει πότε ξεκινά η παροχή, πόσο κρατά και υπό ποιον ορισμό ενεργοποιείται.',
        en: 'Monthly benefit, waiting period, payment duration, the incapacity definition and indexation: PolicyWallet shows when the benefit starts, how long it lasts and under which definition it triggers.',
    },
    whyItMatters: [
        {
            el: 'Δύο ασφαλιστήρια με το ίδιο μηνιαίο ποσό μπορεί να διαφέρουν δραματικά: το ένα πληρώνει για δύο χρόνια, το άλλο μέχρι τη συνταξιοδότηση.',
            en: 'Two policies with the same monthly amount can differ dramatically: one pays for two years, the other until retirement.',
        },
        {
            el: 'Η περίοδος αναμονής ορίζει πόσο καιρό ζείτε χωρίς την παροχή. Μεγαλύτερη αναμονή ρίχνει το ασφάλιστρο, αλλά μετακινεί το βάρος στις δικές σας αποταμιεύσεις.',
            en: 'The deferred period defines how long you live without the benefit. A longer wait lowers the premium but shifts the burden onto your own savings.',
        },
        {
            el: 'Ο ορισμός της ανικανότητας είναι το κρισιμότερο σημείο: «δικού σας επαγγέλματος» ενεργοποιείται όταν δεν μπορείτε να κάνετε τη δουλειά σας, «οποιουδήποτε επαγγέλματος» μόνο όταν δεν μπορείτε να κάνετε καμία εργασία.',
            en: 'The incapacity definition is the crux: “own occupation” triggers when you cannot do your job, “any occupation” only when you cannot do any work at all.',
        },
        {
            el: 'Χωρίς τιμαριθμική αναπροσαρμογή, ένα επίδομα που φαίνεται επαρκές σήμερα ενδέχεται να έχει χάσει μεγάλο μέρος της αξίας του μετά από χρόνια καταβολής.',
            en: 'Without indexation, a benefit that looks adequate today may have lost much of its value after years of payment.',
        },
        {
            el: 'Η παροχή συχνά συνυπολογίζεται με ό,τι λαμβάνεις από τον εργοδότη ή τον φορέα σας — το άθροισμα μπορεί να είναι μικρότερο από όσο περιμένετε.',
            en: 'The benefit is often offset against what you receive from your employer or state scheme — the total can be less than you expect.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Το ασφαλιστήριο προστασίας εισοδήματος δεν έχει τυποποιημένα πεδία στην ανάλυσή μας: διαβάζουμε το ελεύθερο κείμενο των καλύψεων και των εξαιρέσεων του εγγράφου που ανεβάσατε και το παρουσιάζουμε με απλά λόγια.',
            en: 'Income protection has no structured fields in our analysis: we read the free-text coverages and exclusions of the document you uploaded and present them in plain language.',
        },
        {
            el: 'Εντοπίζουμε τις αναφορές σε περίοδο αναμονής, διάρκεια καταβολής και ορισμό ανικανότητας όπως ακριβώς διατυπώνονται — χωρίς να συμπληρώνουμε ό,τι δεν γράφει το ασφαλιστήριο.',
            en: 'We surface the references to waiting period, payment duration and incapacity definition exactly as worded — without filling in what the policy does not say.',
        },
        {
            el: 'Σημαντικές ημερομηνίες και όρους λήξης ή ανανέωσης, όπου αναγράφονται στο έγγραφο.',
            en: 'Key dates and any expiry or renewal terms, where the document states them.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Υπολογίστε πόσους μήνες αντέχουν οι αποταμιεύσεις σας και σύγκρινέ τους με την περίοδο αναμονής — εκεί φαίνεται αν το ασφαλιστήριο ταιριάζει στη ζωή σας.',
            en: 'Work out how many months your savings would last and compare that to the deferred period — that is where you see whether the policy fits your life.',
        },
        {
            el: 'Αν άλλαξες επάγγελμα ή πέρασες από μισθωτή σε ελεύθερη απασχόληση, ενημερώστε τον ασφαλιστή σας: ο ορισμός της ανικανότητας συνδέεται με το επάγγελμα που δηλώθηκε.',
            en: 'If you changed occupation or moved from employment to freelancing, tell your insurer: the incapacity definition is tied to the occupation you declared.',
        },
        {
            el: 'Δείτε τι ακριβώς προβλέπει ο εργοδότης σας σε μακρά ασθένεια πριν αποφασίσεις ύψος και διάρκεια παροχής — οι δύο πηγές αλληλεπιδρούν.',
            en: 'Check exactly what your employer provides during long-term illness before settling on benefit level and duration — the two sources interact.',
        },
        {
            el: 'Κρατήστε αρχείο των εισοδημάτων σας· η παροχή συνήθως συνδέεται με αποδεδειγμένο εισόδημα πριν την ανικανότητα.',
            en: 'Keep records of your income; the benefit is usually tied to demonstrable earnings before the incapacity.',
        },
    ],
    commonGaps: [
        {
            id: 'income_protection_no_cover_gap',
            title: { el: 'Εισόδημα χωρίς δίχτυ ασφαλείας', en: 'Income with no safety net' },
            description: {
                el: 'Αν το εισόδημά σας εξαρτάται από τη δική σας εργασία και δεν εντοπίζεται σχετική κάλυψη, μια παρατεταμένη ανικανότητα ενδέχεται να μείνει εξ ολοκλήρου σε εσάς.',
                en: 'If your income depends on your own work and no such cover appears, a prolonged incapacity may fall entirely on you.',
            },
            relatedRuleId: 'income_no_protection',
        },
        {
            id: 'income_protection_definition_gap',
            title: { el: 'Αυστηρός ορισμός ανικανότητας', en: 'Strict incapacity definition' },
            description: {
                el: 'Ένας ορισμός «οποιουδήποτε επαγγέλματος» ενεργοποιείται πολύ δυσκολότερα από έναν «δικού σας επαγγέλματος». Αξίζει να δείτε ποιος από τους δύο γράφεται στο ασφαλιστήριο.',
                en: 'An “any occupation” definition triggers far less easily than an “own occupation” one. It is worth seeing which of the two the policy states.',
            },
        },
        {
            id: 'income_protection_duration_gap',
            title: { el: 'Σύντομη διάρκεια καταβολής', en: 'Short benefit period' },
            description: {
                el: 'Μια παροχή που σταματά μετά από 12 ή 24 μήνες καλύπτει προσωρινή, όχι μόνιμη ανικανότητα — μια διάκριση που φαίνεται μόνο στα ψιλά γράμματα.',
                en: 'A benefit that stops after 12 or 24 months covers temporary, not permanent incapacity — a distinction visible only in the fine print.',
            },
        },
        {
            id: 'income_protection_indexation_gap',
            title: { el: 'Χωρίς τιμαριθμική αναπροσαρμογή', en: 'No indexation' },
            description: {
                el: 'Αν η παροχή δεν αναπροσαρμόζεται, η αγοραστική της δύναμη μειώνεται όσο διαρκεί η καταβολή.',
                en: 'If the benefit is not indexed, its purchasing power erodes for as long as it is paid.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'income_protection_check_deferred',
            label: { el: 'Δείτε πόσο κρατά η περίοδος αναμονής', en: 'See how long the waiting period lasts' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Πόση είναι η περίοδος αναμονής πριν αρχίσει η παροχή;',
                en: 'How long is the waiting period before the benefit starts?',
            },
        },
        {
            id: 'income_protection_check_benefit_period',
            label: { el: 'Ελέγξτε για πόσο καιρό πληρώνεται η παροχή', en: 'Check for how long the benefit is paid' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Για πόσο διάστημα καταβάλλεται το επίδομα;', en: 'For how long is the benefit paid?' },
        },
        {
            id: 'income_protection_check_definition',
            label: { el: 'Δείτε με ποιον ορισμό ενεργοποιείται η κάλυψη', en: 'See which definition triggers the cover' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ο ορισμός ανικανότητας αφορά το δικό μου επάγγελμα ή οποιοδήποτε επάγγελμα;',
                en: 'Is the incapacity definition own-occupation or any-occupation?',
            },
        },
        {
            id: 'income_protection_update_occupation',
            label: { el: 'Ενημερώστε επάγγελμα και εισόδημα στο προφίλ σας', en: 'Update occupation and income in your profile' },
            href: '/protection',
            ctaType: 'profile',
        },
        {
            id: 'income_protection_ask_agent_sick_pay',
            label: { el: 'Ρωτήστε τον σύμβουλό σας πώς δένει με τις παροχές ασθενείας', en: 'Ask your advisor how it interacts with sick pay' },
            href: '/agent',
            ctaType: 'askAgent',
        },
        {
            id: 'income_protection_note_life_change',
            label: { el: 'Σημειώστε αλλαγή ζωής', en: 'Note a life change' },
            href: null,
            ctaType: 'task',
        },
    ],
    suggestedQuestions: [
        { el: 'Πόση είναι η περίοδος αναμονής;', en: 'How long is the waiting period?' },
        { el: 'Για πόσο καιρό πληρώνεται η παροχή;', en: 'For how long is the benefit paid?' },
        { el: 'Τι μηνιαίο ποσό προβλέπει το ασφαλιστήριο;', en: 'What monthly amount does the policy provide?' },
        { el: 'Ο ορισμός ανικανότητας αφορά το επάγγελμά μου;', en: 'Does the incapacity definition refer to my own occupation?' },
        { el: 'Αναπροσαρμόζεται η παροχή με τον πληθωρισμό;', en: 'Is the benefit adjusted for inflation?' },
    ],
    claimsSteps: [
        {
            el: 'Ενημερώστε τον ασφαλιστή μόλις γίνει σαφές ότι η αποχή από την εργασία θα παραταθεί — η περίοδος αναμονής συνήθως μετρά από την ημερομηνία δήλωσης ή διάγνωσης, όχι από τότε που το θυμήθηκες.',
            en: 'Notify the insurer as soon as it is clear the absence from work will extend — the deferred period usually runs from the notification or diagnosis date, not from when you remembered.',
        },
        {
            el: 'Συγκεντρώστε ιατρικές γνωματεύσεις που περιγράφουν τι δεν μπορείτε να κάνετε στη δουλειά σας, όχι μόνο τη διάγνωση — ο ορισμός της ανικανότητας κρίνεται σε λειτουργικούς όρους.',
            en: 'Gather medical reports describing what you cannot do at work, not just the diagnosis — the incapacity definition is judged in functional terms.',
        },
        {
            el: 'Ετοιμάστε αποδεικτικά εισοδήματος πριν την ανικανότητα (εκκαθαριστικά, βεβαιώσεις αποδοχών) — σχεδόν πάντα ζητούνται για τον υπολογισμό.',
            en: 'Prepare proof of pre-incapacity income (tax statements, payroll certificates) — they are almost always required for the calculation.',
        },
        {
            el: 'Κρατήστε σημειώσεις για κάθε επικοινωνία και ιατρική εξέταση· οι φάκελοι ανικανότητας εξελίσσονται σε μήνες, όχι σε ημέρες.',
            en: 'Keep notes of every contact and medical assessment; incapacity files unfold over months, not days.',
        },
    ],
    renewalNote: {
        el: 'Κάθε φορά που αλλάζει το εισόδημα ή το επάγγελμά σας, το ποσό και ο ορισμός της παροχής αξίζουν επανεξέταση — αλλιώς το ασφαλιστήριο προστατεύει μια ζωή που δεν ζείτε πια.',
        en: 'Whenever your income or occupation changes, the benefit amount and definition deserve a second look — otherwise the policy protects a life you no longer live.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει ασφαλιστήριο προστασίας εισοδήματος', en: 'No income protection policy added yet' },
        description: {
            el: 'Ανεβάστε το ασφαλιστήριο και δείτε πότε ξεκινά η παροχή, πόσο κρατά και υπό ποιες προϋποθέσεις ενεργοποιείται.',
            en: 'Upload the policy and see when the benefit starts, how long it lasts and on what conditions it triggers.',
        },
        ctaLabel: { el: 'Ανεβάστε ασφαλιστήριο', en: 'Upload policy' },
    },
}
