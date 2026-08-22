import type { BranchContent } from './types'

/**
 * Occupational pension / savings schemes (ομαδικά συνταξιοδοτικά).
 *
 * HONESTY NOTE: `AcordDataSchema` has NO typed section for this branch — the
 * typed `lifeAndInvestment` section models individual savings contracts, not a
 * scheme certificate. Contributions, vesting and leaver terms are read from the
 * document's free text; we never project a balance or a return.
 *
 * Tax is treated as a GENERAL CONCEPT only — never a rate, a bracket or a
 * calculation. The copy points at an accountant, not at a number.
 */
export const groupPensionContent: BranchContent = {
    branchId: 'group_pension',
    tagline: {
        el: 'Κεφάλαιο που χτίζεται στο όνομά σας με χρήματα που δεν διαχειρίζεσαι εσείς — αξίζει να ξέρετε τι σας ανήκει ήδη.',
        en: 'Capital building in your name from money you do not manage — worth knowing how much of it is already yours.',
    },
    shortDescription: {
        el: 'Επαγγελματικό πρόγραμμα αποταμίευσης ή σύνταξης: εισφορές εργοδότη και εργαζομένου, περίοδος κατοχύρωσης, τι μεταφέρεται αν αποχωρήσετε και ποιες επιλογές ανοίγουν στη λήξη.',
        en: 'An occupational savings or pension scheme: employer and employee contributions, vesting period, what transfers if you leave, and which options open at maturity.',
    },
    whyItMatters: [
        {
            el: 'Οι εισφορές έχουν δύο πηγές, τη δική σας και του εργοδότη, και συχνά διαφορετικούς κανόνες: το δικό σας σκέλος σας ανήκει κατά κανόνα εξαρχής, ενώ το εργοδοτικό συνήθως κατοχυρώνεται σταδιακά.',
            en: 'Contributions come from two sources, yours and the employer’s, and often follow different rules: your part is normally yours from the start, while the employer’s part usually vests gradually.',
        },
        {
            el: 'Η περίοδος κατοχύρωσης είναι το κλειδί. Αν αποχωρήσεις πριν συμπληρώσετε τα έτη που ορίζει ο κανονισμός, ενδέχεται να πάρετε μόνο μέρος του εργοδοτικού σκέλους — ή τίποτα από αυτό.',
            en: 'The vesting period is the crux. Leave before completing the years the rules set and you may take only part of the employer’s share — or none of it.',
        },
        {
            el: 'Το τι μεταφέρεται στην αποχώρηση διαφέρει ανά πρόγραμμα: άλλα προβλέπουν εξαγορά σε μετρητά, άλλα μεταφορά σε ατομικό συμβόλαιο, άλλα διατήρηση του κεφαλαίου μέχρι τη συνταξιοδότηση.',
            en: 'What transfers on leaving differs by scheme: some allow a cash surrender, some a transfer into an individual contract, some keep the capital until retirement.',
        },
        {
            el: 'Η φορολογική μεταχείριση εισφορών και παροχών ορίζεται από τη νομοθεσία και μεταβάλλεται στον χρόνο. Είναι θέμα που αξίζει να επιβεβαιωθεί με λογιστή ή φοροτεχνικό πριν από κάθε απόφαση — εδώ δεν δίνουμε αριθμούς.',
            en: 'The tax treatment of contributions and benefits is set by legislation and changes over time. It is worth confirming with an accountant or tax adviser before any decision — we give no figures here.',
        },
        {
            el: 'Ένα επαγγελματικό πρόγραμμα λειτουργεί με δικό του κανονισμό, ανεξάρτητο από τον δημόσιο φορέα. Είναι συμπλήρωμα και όχι υποκατάστατο της κύριας σύνταξης.',
            en: 'An occupational scheme runs on its own rulebook, independent of the state system. It is a supplement, not a substitute for the main pension.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Τα επαγγελματικά προγράμματα δεν έχουν τυποποιημένα πεδία στην ανάλυσή μας. Διαβάζουμε το ελεύθερο κείμενο του εγγράφου που ανεβάσατε: τι περιγράφεται ως παροχή και τι ως εξαίρεση ή περιορισμός.',
            en: 'Occupational schemes have no standardised fields in our analysis. We read the free text of the document you uploaded: what is described as a benefit and what as an exclusion or restriction.',
        },
        {
            el: 'Αναφορές στο ύψος και στην κατανομή των εισφορών, στην περίοδο κατοχύρωσης και στους όρους αποχώρησης, όπως ακριβώς διατυπώνονται. Δεν υπολογίζουμε προβολές κεφαλαίου ούτε αποδόσεις.',
            en: 'Mentions of contribution levels and split, of the vesting period and of leaver terms, exactly as worded. We compute no capital projections and no returns.',
        },
        {
            el: 'Ημερομηνίες και προθεσμίες που εμφανίζονται στο έγγραφο — ένταξης, ωρίμανσης, άσκησης επιλογών.',
            en: 'Dates and deadlines that appear in the document — enrolment, maturity, exercising options.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Ζητήστε μία φορά τον χρόνο κατάσταση λογαριασμού και δείτε χωριστά το δικό σας και το εργοδοτικό σκέλος — τα δύο ποσά δεν συμπεριφέρονται με τον ίδιο τρόπο.',
            en: 'Ask once a year for an account statement and look at your part and the employer’s part separately — the two amounts do not behave the same way.',
        },
        {
            el: 'Πριν από μια αποχώρηση, ρωτήστε γραπτώς πόσο έχετε κατοχυρώσει εκείνη τη στιγμή. Λίγοι μήνες διαφορά μπορεί να αλλάζουν το ποσοστό που παίρνεις μαζί σας.',
            en: 'Before leaving, ask in writing how much is vested at that moment. A few months’ difference can change the share you take with you.',
        },
        {
            el: 'Αν το πρόγραμμα προβλέπει προαιρετική δική σας εισφορά με αντιστοίχιση από τον εργοδότη, δείτε αν την αξιοποιείς — είναι μέρος του πακέτου αποδοχών σας.',
            en: 'If the scheme offers an optional employee contribution matched by the employer, check whether you are using it — it is part of your remuneration package.',
        },
        {
            el: 'Για κάθε φορολογικό ερώτημα, απευθύνσου σε λογιστή ή φοροτεχνικό: η μεταχείριση εξαρτάται από τα συνολικά σας οικονομικά, όχι μόνο από το πρόγραμμα.',
            en: 'For any tax question, go to an accountant or tax adviser: the treatment depends on your finances as a whole, not on the scheme alone.',
        },
    ],
    commonGaps: [
        {
            id: 'group_pension_vesting_gap',
            title: { el: 'Άγνωστη περίοδος κατοχύρωσης', en: 'Vesting period unknown' },
            description: {
                el: 'Αν δεν ξέρετε πόσα έτη απαιτούνται για πλήρη κατοχύρωση, δεν μπορείτε να αποτιμήσεις τι πραγματικά αξίζει σήμερα το εργοδοτικό σκέλος.',
                en: 'Without knowing how many years full vesting takes, you cannot value what the employer’s share is actually worth today.',
            },
        },
        {
            id: 'group_pension_transfer_gap',
            title: { el: 'Ασαφείς όροι αποχώρησης', en: 'Unclear leaver terms' },
            description: {
                el: 'Αν το έγγραφο δεν περιγράφει τι γίνεται με το κεφάλαιο σε αποχώρηση, η επιλογή ενδέχεται να πρέπει να ασκηθεί μέσα σε προθεσμία που δεν γνωρίζετε.',
                en: 'If the document does not describe what happens to the capital on leaving, the choice may have to be exercised within a deadline you do not know.',
            },
        },
        {
            id: 'group_pension_sole_reliance_gap',
            title: { el: 'Αποταμίευση μόνο μέσω του εργοδότη', en: 'Saving only through the employer' },
            description: {
                el: 'Ένα πρόγραμμα που εξαρτάται από τη διατήρηση της θέσης εργασίας αφήνει το αποταμιευτικό σχέδιο εκτεθειμένο σε μια αλλαγή καριέρας.',
                en: 'A scheme that depends on keeping the job leaves the savings plan exposed to a change of career.',
            },
        },
        {
            id: 'group_pension_costs_gap',
            title: { el: 'Κόστη που δεν φαίνονται στην κατάσταση', en: 'Costs invisible on the statement' },
            description: {
                el: 'Τα κόστη διαχείρισης ενός επαγγελματικού προγράμματος αναγράφονται συνήθως στον κανονισμό και όχι στην ετήσια κατάσταση λογαριασμού.',
                en: 'Management costs of an occupational scheme are usually stated in the rulebook rather than on the annual account statement.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'group_pension_check_contributions',
            label: { el: 'Δείτε ποιος εισφέρει και σε τι αναλογία', en: 'See who contributes and in what proportion' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιος καταβάλλει τις εισφορές στο πρόγραμμα και σε τι αναλογία;',
                en: 'Who pays the contributions to the scheme and in what proportion?',
            },
        },
        {
            id: 'group_pension_check_vesting',
            label: { el: 'Ελέγξτε πότε κατοχυρώνεται το εργοδοτικό σκέλος', en: 'Check when the employer share vests' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Πότε κατοχυρώνεται το εργοδοτικό σκέλος του προγράμματος;',
                en: 'When does the employer’s share of the scheme vest?',
            },
        },
        {
            id: 'group_pension_check_leaving',
            label: { el: 'Δείτε τι μεταφέρεται αν αποχωρήσετε', en: 'See what transfers if you leave' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Τι γίνεται με το κεφάλαιο αν αποχωρήσω από την εταιρεία;',
                en: 'What happens to the capital if I leave the company?',
            },
        },
        {
            id: 'group_pension_check_dates',
            label: { el: 'Σημειώστε ημερομηνίες ωρίμανσης και προθεσμίες', en: 'Note maturity dates and deadlines' },
            href: '/renewals',
            ctaType: 'renewals',
        },
        {
            id: 'group_pension_ask_agent',
            label: { el: 'Ρωτήστε τον σύμβουλό σας πώς δένει με τη δική σας αποταμίευση', en: 'Ask your advisor how it fits your own saving' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Ποιος καταβάλλει τις εισφορές και σε τι αναλογία;', en: 'Who pays the contributions and in what proportion?' },
        { el: 'Πότε κατοχυρώνεται το εργοδοτικό σκέλος;', en: 'When does the employer share vest?' },
        { el: 'Τι μεταφέρεται αν αποχωρήσω από την εταιρεία;', en: 'What transfers if I leave the company?' },
        { el: 'Πότε ωριμάζει το πρόγραμμα και τι επιλογές υπάρχουν;', en: 'When does the scheme mature and what options exist?' },
        { el: 'Ποια κόστη αναφέρει ο κανονισμός του προγράμματος;', en: 'Which costs does the scheme rulebook state?' },
    ],
    claimsSteps: [
        {
            el: 'Δεν πρόκειται για ζημιά αλλά για καταβολή παροχής: το αίτημα ξεκινά συνήθως από την εταιρεία, που βεβαιώνει τα έτη συμμετοχής σας.',
            en: 'This is not a loss claim but a benefit payment: the request usually starts at the company, which certifies your years of membership.',
        },
        {
            el: 'Ζητήστε γραπτή κατάσταση με το κατοχυρωμένο ποσό πριν υπογράψετε οποιαδήποτε επιλογή — εξαγορά, μεταφορά ή διατήρηση.',
            en: 'Ask for a written statement of the vested amount before signing any option — surrender, transfer or retention.',
        },
        {
            el: 'Σημειώστε τις προθεσμίες άσκησης επιλογής. Αν περάσουν άπρακτες, ο κανονισμός συνήθως εφαρμόζει μια προεπιλεγμένη λύση αντί για τη δική σας.',
            en: 'Note the deadlines for exercising an option. If they lapse, the rulebook usually applies a default outcome instead of your choice.',
        },
        {
            el: 'Πριν από την τελική απόφαση, συζητήστε τη φορολογική διάσταση με λογιστή — η μορφή της καταβολής μπορεί να την επηρεάζει.',
            en: 'Before the final decision, discuss the tax dimension with an accountant — the form of the payout can affect it.',
        },
    ],
    renewalNote: {
        el: 'Δεν υπάρχει κλασική ανανέωση εδώ: υπάρχουν ημερομηνίες κατοχύρωσης και ωρίμανσης. Αυτές είναι που αξίζει να έχετε στο ημερολόγιό σας.',
        en: 'There is no classic renewal here: there are vesting and maturity dates. Those are the ones worth having in your calendar.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει επαγγελματικό συνταξιοδοτικό πρόγραμμα', en: 'No occupational pension scheme added yet' },
        description: {
            el: 'Ανεβάστε το πιστοποιητικό ή τον κανονισμό του προγράμματος και δείτε τι περιγράφεται για εισφορές, κατοχύρωση και αποχώρηση.',
            en: 'Upload the scheme certificate or rulebook and see what is described about contributions, vesting and leaving.',
        },
        ctaLabel: { el: 'Ανεβάστε πιστοποιητικό', en: 'Upload certificate' },
    },
}
