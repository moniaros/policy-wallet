import type { BranchContent } from './types'

/**
 * Employer-provided group life.
 *
 * HONESTY NOTE: `AcordDataSchema` has NO typed section for this branch — the
 * typed `lifeAndInvestment` section models individual life contracts, not an
 * employer scheme certificate. Everything here is read from the free-text
 * coverages and exclusions of the uploaded document; we never compute a sum
 * from a salary multiple that the document does not spell out.
 */
export const groupLifeContent: BranchContent = {
    branchId: 'group_life',
    tagline: {
        el: 'Ένα κεφάλαιο που το ύψος του το αποφάσισε κάποιος άλλος — και που φεύγει μαζί με τη δουλειά.',
        en: 'A benefit whose size somebody else decided — and that leaves along with the job.',
    },
    shortDescription: {
        el: 'Παροχή ζωής μέσω του εργοδότη: κεφάλαιο συνήθως ως πολλαπλάσιο του ετήσιου μισθού, δικαιούχοι που δηλώνονται μέσα στο εταιρικό σχήμα, ισχύς δεμένη με την εργασιακή σχέση.',
        en: 'A life benefit through the employer: a sum usually set as a multiple of annual salary, beneficiaries nominated inside the corporate scheme, validity tied to the employment relationship.',
    },
    whyItMatters: [
        {
            el: 'Το κεφάλαιο ορίζεται συνήθως ως πολλαπλάσιο των ετήσιων αποδοχών — δύο, τρεις ή τέσσερις μισθοί. Ακολουθεί δηλαδή τον μισθό σας, όχι τις ανάγκες της οικογένειάς σας.',
            en: 'The sum is usually set as a multiple of annual earnings — two, three or four salaries. It therefore tracks your pay, not your family’s needs.',
        },
        {
            el: 'Η δήλωση δικαιούχου γίνεται μέσα από το σχήμα του εργοδότη και όχι σε δικό σας έντυπο. Αν δεν έχει συμπληρωθεί δήλωση στον φάκελό σας, το ποσό ακολουθεί ό,τι προβλέπει ο κανονισμός του προγράμματος.',
            en: 'The beneficiary nomination sits inside the employer’s scheme, not on a form of your own. If no nomination is on your file, the amount follows whatever the scheme rules provide.',
        },
        {
            el: 'Η κάλυψη λήγει μαζί με την εργασιακή σχέση. Την ημέρα που αποχωρείς, συνταξιοδοτείσαι ή τίθεσαι σε παρατεταμένη άδεια, ενδέχεται να μην υπάρχει πια — και η οικογένεια σπάνια το γνωρίζει.',
            en: 'Cover ends with the employment relationship. The day you leave, retire or go on extended leave it may no longer exist — and the family rarely knows.',
        },
        {
            el: 'Γι’ αυτό ένα ομαδικό σπάνια αντικαθιστά μια προσωπική κάλυψη: το ύψος το αποφασίζει τρίτος, η διάρκειά του εξαρτάται από τη δουλειά, και δεν κλειδώνει την ασφαλισιμότητά σας στη σημερινή ηλικία και υγεία σας.',
            en: 'That is why a group scheme rarely replaces personal cover: a third party sets the amount, the duration depends on the job, and it does not lock in your insurability at today’s age and health.',
        },
        {
            el: 'Πολλά προγράμματα συνδυάζουν ζωή με συμπληρωματικές καλύψεις ατυχήματος ή μόνιμης ανικανότητας, με χωριστούς ορισμούς. «Ζωή» και «ατύχημα» πληρώνουν σε διαφορετικές περιπτώσεις και συχνά με διαφορετικό ποσό.',
            en: 'Many schemes combine life with accident or permanent-disability riders that carry their own definitions. "Life" and "accident" pay in different situations and often at different amounts.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Η ομαδική ζωή δεν έχει τυποποιημένα πεδία στην ανάλυσή μας: βασιζόμαστε στο ελεύθερο κείμενο των καλύψεων και των εξαιρέσεων του εγγράφου που ανεβάσατε.',
            en: 'Group life has no standardised fields in our analysis: we rely on the free-text coverages and exclusions of the document you uploaded.',
        },
        {
            el: 'Πώς περιγράφεται το κεφάλαιο — σε συγκεκριμένο ποσό ή ως πολλαπλάσιο αποδοχών — ακριβώς όπως αναγράφεται. Δεν υπολογίζουμε ποσά από μισθό που δεν αναφέρεται στο έγγραφο.',
            en: 'How the benefit is described — as a set amount or as a multiple of earnings — exactly as written. We do not compute amounts from a salary the document does not state.',
        },
        {
            el: 'Αναφορές σε δικαιούχους, σε συμπληρωματικές καλύψεις και στη λήξη της ισχύος με την αποχώρηση, όπου εμφανίζονται στο κείμενο.',
            en: 'Mentions of beneficiaries, of riders and of cover ending on departure, wherever they appear in the text.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Ρωτήστε το HR αν υπάρχει καταχωρημένη δήλωση δικαιούχου στο όνομά σας και επικαιροποίησέ την μετά από γάμο, γέννηση ή διαζύγιο — η δήλωση δεν μεταφέρεται από άλλα έγγραφά σας.',
            en: 'Ask HR whether a beneficiary nomination is on file in your name and refresh it after a marriage, a birth or a divorce — the nomination does not carry over from your other documents.',
        },
        {
            el: 'Υπολογίστε τι θα έμενε αν αύριο αλλάζατε εργοδότη. Αυτό που απομένει είναι το πραγματικό μέγεθος της προσωπικής σας προστασίας.',
            en: 'Work out what would remain if you changed employer tomorrow. What is left is the real size of your personal protection.',
        },
        {
            el: 'Κρατήστε αντίγραφο του πιστοποιητικού εκτός εταιρικών συστημάτων — μετά την αποχώρηση χάνεται η πρόσβαση στο εσωτερικό δίκτυο και μαζί της το έγγραφο.',
            en: 'Keep a copy of the certificate outside corporate systems — after you leave, access to the internal network goes and the document goes with it.',
        },
        {
            el: 'Πριν από μια αποχώρηση, ρωτήστε αν προβλέπεται δικαίωμα συνέχισης σε ατομικό ασφαλιστήριο και μέσα σε ποια προθεσμία ασκείται.',
            en: 'Before leaving, ask whether a right to continue as an individual policy exists and within what deadline it must be exercised.',
        },
    ],
    commonGaps: [
        {
            id: 'group_life_employment_end_gap',
            title: { el: 'Κάλυψη δεμένη με την εργασιακή σχέση', en: 'Cover tied to the employment relationship' },
            description: {
                el: 'Μια αλλαγή εργασίας ή μια συνταξιοδότηση ενδέχεται να μηδενίσει την κάλυψη ζωής από τη μία μέρα στην άλλη, χωρίς περίοδο χάριτος.',
                en: 'A job change or a retirement can zero the life cover from one day to the next, with no grace period.',
            },
        },
        {
            id: 'group_life_beneficiary_gap',
            title: { el: 'Δικαιούχος που δεν έχει δηλωθεί', en: 'Beneficiary never nominated' },
            description: {
                el: 'Αν δεν υπάρχει δήλωση στον εταιρικό φάκελο, το ποσό διανέμεται με βάση τον κανονισμό του προγράμματος και όχι με βάση τη δική σας πρόθεση.',
                en: 'With no nomination on the corporate file, the amount is distributed under the scheme rules rather than by your own intention.',
            },
        },
        {
            id: 'group_life_mortgage_reliance_gap',
            title: { el: 'Στεγαστικό που στηρίζεται σε εταιρική παροχή', en: 'Mortgage leaning on a company benefit' },
            description: {
                el: 'Με βάση το προφίλ σας, ένα δάνειο που βασίζεται σε κεφάλαιο ομαδικού προγράμματος μένει ακάλυπτο τη στιγμή που σταματά η εργασιακή σχέση.',
                en: 'Based on your profile, a loan resting on a group-scheme benefit is left uncovered the moment the employment stops.',
            },
            relatedRuleId: 'mortgage_no_life',
        },
        {
            id: 'group_life_rider_definition_gap',
            title: { el: 'Διαφορετικοί ορισμοί σε ζωή και ατύχημα', en: 'Different definitions for life and accident' },
            description: {
                el: 'Οι συμπληρωματικές καλύψεις ατυχήματος ή ανικανότητας έχουν δικούς τους ορισμούς και δικά τους ποσά — δεν είναι επέκταση του βασικού κεφαλαίου.',
                en: 'Accident or disability riders carry their own definitions and their own amounts — they are not an extension of the main benefit.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'group_life_check_sum',
            label: { el: 'Δείτε πώς ορίζεται το κεφάλαιο', en: 'See how the benefit amount is defined' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Πώς ορίζεται το κεφάλαιο της ομαδικής μου ασφάλισης ζωής;',
                en: 'How is the sum of my group life cover defined?',
            },
        },
        {
            id: 'group_life_check_beneficiaries',
            label: { el: 'Ελέγξτε ποιοι αναφέρονται ως δικαιούχοι', en: 'Check who is named as beneficiary' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιοι αναφέρονται ως δικαιούχοι στο ομαδικό μου πρόγραμμα;',
                en: 'Who is named as beneficiary in my group scheme?',
            },
        },
        {
            id: 'group_life_check_leaving',
            label: { el: 'Δείτε τι ισχύει αν αλλάξετε εργοδότη', en: 'See what applies if you change employer' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Τι γίνεται με την ομαδική ασφάλιση ζωής αν αλλάξω εργοδότη;',
                en: 'What happens to the group life cover if I change employer?',
            },
        },
        {
            id: 'group_life_update_profile',
            label: { el: 'Ενημερώστε το προφίλ σας με εξαρτώμενα και δάνεια', en: 'Update your profile with dependants and loans' },
            href: '/protection',
            ctaType: 'profile',
        },
        {
            id: 'group_life_ask_agent',
            label: { el: 'Ρωτήστε τον σύμβουλό σας τι μένει μετά την αποχώρηση', en: 'Ask your advisor what remains after you leave' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Πώς ορίζεται το κεφάλαιο της ομαδικής ασφάλισης ζωής;', en: 'How is the group life sum defined?' },
        { el: 'Ποιοι αναφέρονται ως δικαιούχοι;', en: 'Who is named as beneficiary?' },
        { el: 'Τι γίνεται με την κάλυψη αν αλλάξω εργοδότη;', en: 'What happens to the cover if I change employer?' },
        { el: 'Περιλαμβάνεται κάλυψη ατυχήματος ή μόνιμης ανικανότητας;', en: 'Is accident or permanent-disability cover included?' },
        { el: 'Μπορεί το πρόγραμμα να μετατραπεί σε ατομικό ασφαλιστήριο;', en: 'Can the scheme be converted into an individual policy?' },
    ],
    claimsSteps: [
        {
            el: 'Η διαδικασία ξεκινά συνήθως από την εταιρεία: ο εργοδότης βεβαιώνει την ιδιότητα του ασφαλισμένου πριν ο ασφαλιστής ανοίξει φάκελο.',
            en: 'The process usually starts at the company: the employer confirms the member’s status before the insurer opens a file.',
        },
        {
            el: 'Χρειάζονται τα πιστοποιητικά της αστικής κατάστασης — ληξιαρχική πράξη, πιστοποιητικό εγγυτέρων συγγενών — μαζί με τα στοιχεία του ομαδικού ασφαλιστηρίου.',
            en: 'Civil-status documents are needed — death certificate, certificate of next of kin — together with the group policy details.',
        },
        {
            el: 'Αν υπάρχει δήλωση δικαιούχου στον εταιρικό φάκελο, ζητήστε αντίγραφό της εγκαίρως: καθορίζει σε ποιον καταβάλλεται το ποσό.',
            en: 'If a beneficiary nomination exists on the corporate file, request a copy early: it determines to whom the amount is paid.',
        },
        {
            el: 'Κρατήστε την ημερομηνία του συμβάντος ως σημείο αναφοράς — η καταβολή κρίνεται με βάση το αν η κάλυψη ίσχυε τότε, όχι σήμερα.',
            en: 'Treat the date of the event as the reference point — payment turns on whether the cover was in force then, not today.',
        },
    ],
    renewalNote: {
        el: 'Το πρόγραμμα ανανεώνεται από την εταιρεία. Αν αλλάξουν οι αποδοχές σας ή ο κανονισμός, ενδέχεται να αλλάξει και το κεφάλαιο — χωρίς να το δείτε πουθενά αν δεν το ζητήσετε.',
        en: 'The scheme is renewed by the company. If your pay or the scheme rules change, the benefit may change too — invisibly, unless you ask.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει ομαδικό πρόγραμμα ζωής', en: 'No group life scheme added yet' },
        description: {
            el: 'Ανεβάστε το πιστοποιητικό της εταιρικής παροχής και δείτε πώς περιγράφεται το κεφάλαιο, ποιοι αναφέρονται ως δικαιούχοι και μέχρι πότε ισχύει.',
            en: 'Upload the certificate of the company benefit and see how the sum is described, who is named as beneficiary and how long it runs.',
        },
        ctaLabel: { el: 'Ανεβάστε πιστοποιητικό', en: 'Upload certificate' },
    },
}
