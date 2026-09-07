import type { BranchContent } from './types'

/**
 * Employer-provided group health.
 *
 * This is the ONE group branch with a typed section: `AcordDataSchema.health`
 * (annual limit, room class, co-payment, coordination centre, waiting periods),
 * so `whatWeAnalyze` may name those fields. Anything the schema does not model
 * — vesting-style scheme rules, dependant windows, conversion rights — is
 * described as read from the document's free text.
 */
export const groupHealthContent: BranchContent = {
    branchId: 'group_health',
    tagline: {
        el: 'Το ομαδικό της δουλειάς είναι συνήθως η κάλυψη που χρησιμοποιείτε πιο συχνά και ξέρετε λιγότερο.',
        en: 'The plan from work is usually the cover you use the most and know the least about.',
    },
    shortDescription: {
        el: 'Πρόγραμμα που συνάπτει ο εργοδότης για το προσωπικό: όρια ανά παροχή, συμμετοχές, ένταξη εξαρτώμενων μελών και τι ισχύει την ημέρα που φεύγεις από την εταιρεία — από το δικό σας πιστοποιητικό ασφάλισης.',
        en: 'A plan the employer arranges for staff: per-benefit limits, co-payments, enrolment of dependants, and what applies the day you leave the company — read from your own certificate of insurance.',
    },
    whyItMatters: [
        {
            el: 'Τους όρους τους διαπραγματεύτηκε ο εργοδότης, όχι εσείς. Το πρόγραμμα ενδέχεται να αναδιαμορφωθεί ή να διακοπεί σε κάθε ανανέωση του εταιρικού ασφαλιστηρίου, χωρίς να ερωτηθείς.',
            en: 'The terms were negotiated by the employer, not by you. The plan can be reshaped or discontinued at every renewal of the corporate contract, without your being asked.',
        },
        {
            el: 'Τα ομαδικά δουλεύουν με επιμέρους όρια ανά παροχή — νοσηλεία, διαγνωστικά, φάρμακα, οδοντιατρικά — και όχι με ένα ενιαίο ποσό. Το «καλύπτομαι» μπορεί να σημαίνει πολύ διαφορετικά πράγματα ανά κατηγορία.',
            en: 'Group plans work through separate sub-limits per benefit — hospitalisation, diagnostics, pharmacy, dental — rather than one single amount. "I am covered" can mean very different things per category.',
        },
        {
            el: 'Σύζυγος και παιδιά συνήθως εντάσσονται προαιρετικά, με δική τους επιβάρυνση και μέσα σε συγκεκριμένα χρονικά παράθυρα. Αν χαθεί το παράθυρο, η επόμενη ευκαιρία ένταξης μπορεί να απέχει έναν χρόνο.',
            en: 'A spouse and children are usually enrolled optionally, at their own cost and within specific windows. Miss the window and the next chance to enrol can be a year away.',
        },
        {
            el: 'Η κάλυψη κατά κανόνα σταματά με τη λήξη της εργασιακής σχέσης. Κάποια προγράμματα προβλέπουν δικαίωμα μετατροπής σε ατομικό μέσα σε περιορισμένη προθεσμία — αν υπάρχει, αναγράφεται στο έγγραφο και έχει ημερομηνία.',
            en: 'Cover normally stops when the employment ends. Some schemes provide a right to convert to an individual policy within a short deadline — where it exists, it is written in the document and it has a date.',
        },
        {
            el: 'Αν στηριχθείτε αποκλειστικά στο ομαδικό και ζητήσετε ατομικό αργότερα, η ασφαλισιμότητά σας θα κριθεί τότε — με την ηλικία και το ιστορικό υγείας που θα έχετε εκείνη τη στιγμή, όχι τα σημερινά.',
            en: 'If you lean solely on the group plan and seek an individual one later, your insurability will be assessed then — at the age and health history you will have at that moment, not today’s.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Με βάση το έγγραφο που ανεβάσατε: ετήσιο όριο, συμμετοχή ή απαλλαγή ανά περιστατικό, θέση νοσηλείας και στοιχεία συντονιστικού κέντρου, όπου αναγράφονται.',
            en: 'Based on the document you uploaded: annual limit, co-payment or per-claim deductible, room class and coordination-centre details, where they are stated.',
        },
        {
            el: 'Χρόνους αναμονής και εξαιρέσεις όπως εμφανίζονται στο πιστοποιητικό ή στους όρους του ομαδικού προγράμματος.',
            en: 'Waiting periods and exclusions as they appear in the certificate or in the group scheme’s terms.',
        },
        {
            el: 'Αναφορές σε εξαρτώμενα μέλη και σε δικαίωμα συνέχισης ή μετατροπής μετά την αποχώρηση — αυτά ζουν στο ελεύθερο κείμενο του εγγράφου, οπότε τα διαβάζουμε όπως είναι γραμμένα.',
            en: 'Mentions of dependants and of any right to continue or convert after leaving — these live in the document’s free text, so we read them as written.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Ζητήστε από το HR ολόκληρο το βιβλίο όρων, όχι μόνο την κάρτα. Η κάρτα δείχνει το δίκτυο· οι όροι δείχνουν τα όρια και τις εξαιρέσεις.',
            en: 'Ask HR for the full terms booklet, not just the card. The card shows the network; the terms show the limits and the exclusions.',
        },
        {
            el: 'Πριν αλλάξετε εργασία, ρωτήστε γραπτώς μέχρι ποια ημερομηνία ισχύει η κάλυψη και αν προβλέπεται μετατροπή σε ατομικό ασφαλιστήριο.',
            en: 'Before changing jobs, ask in writing until which date the cover runs and whether conversion to an individual policy is provided.',
        },
        {
            el: 'Αν σκέφτεστε να διακόψετε ένα ατομικό πρόγραμμα επειδή «το καλύπτει η δουλειά», κρατήστε υπόψη ότι το ατομικό είναι εκείνο που σε ακολουθεί όταν αλλάξει η δουλειά.',
            en: 'If you are thinking of dropping an individual plan because "work covers it", bear in mind the individual one is what follows you when the job changes.',
        },
        {
            el: 'Δηλώστε γέννηση, γάμο ή σύμφωνο συμβίωσης στο HR μέσα στην προθεσμία ένταξης — τα παράθυρα για εξαρτώμενα μέλη είναι σύντομα.',
            en: 'Report a birth, marriage or civil partnership to HR within the enrolment deadline — the windows for dependants are short.',
        },
    ],
    commonGaps: [
        {
            id: 'group_health_leaving_gap',
            title: { el: 'Κάλυψη που τελειώνει με τη δουλειά', en: 'Cover that ends with the job' },
            description: {
                el: 'Αν δεν υπάρχει προσωπικό πρόγραμμα από πίσω, η αποχώρηση από την εταιρεία ενδέχεται να σημαίνει μηδενική κάλυψη υγείας από την επόμενη μέρα.',
                en: 'With no personal plan behind it, leaving the company can mean zero health cover from the next day.',
            },
        },
        {
            id: 'group_health_sublimit_gap',
            title: { el: 'Χαμηλά επιμέρους όρια ανά παροχή', en: 'Low per-benefit sub-limits' },
            description: {
                el: 'Ένα γενναιόδωρο ετήσιο όριο μπορεί να συνυπάρχει με πολύ σφιχτά όρια σε διαγνωστικά ή φάρμακα — εκεί γίνεται η καθημερινή δαπάνη.',
                en: 'A generous annual limit can sit alongside very tight sub-limits for diagnostics or pharmacy — which is where day-to-day spending happens.',
            },
            relatedRuleId: 'health_low_coverage',
        },
        {
            id: 'group_health_dependants_gap',
            title: { el: 'Εξαρτώμενα μέλη εκτός προγράμματος', en: 'Dependants outside the plan' },
            description: {
                el: 'Η ένταξη συζύγου και παιδιών σπάνια είναι αυτόματη. Αν δεν έγινε δήλωση στην προθεσμία, ενδέχεται να καλύπτεστε μόνο εσείς.',
                en: 'Enrolling a spouse and children is rarely automatic. If no declaration was made in time, you may be the only person covered.',
            },
        },
        {
            id: 'group_health_network_gap',
            title: { el: 'Περιορισμένο δίκτυο συνεργαζόμενων παρόχων', en: 'Restricted provider network' },
            description: {
                el: 'Εκτός δικτύου η συμμετοχή σας συνήθως ανεβαίνει σημαντικά, ακόμη κι όταν η ίδια παροχή καλύπτεται κανονικά.',
                en: 'Outside the network your share of the cost usually rises sharply, even when the same benefit is otherwise covered.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'group_health_check_sublimits',
            label: { el: 'Δείτε τα όρια ανά κατηγορία παροχής', en: 'See the limits per benefit category' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποια είναι τα επιμέρους όρια ανά παροχή στο ομαδικό μου πρόγραμμα;',
                en: 'What are the per-benefit sub-limits in my group plan?',
            },
        },
        {
            id: 'group_health_check_portability',
            label: { el: 'Ελέγξτε τι γίνεται αν φύγετε από την εταιρεία', en: 'Check what happens if you leave the company' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Τι γίνεται με την κάλυψή μου αν φύγω από την εταιρεία;',
                en: 'What happens to my cover if I leave the company?',
            },
        },
        {
            id: 'group_health_check_dependants',
            label: { el: 'Δείτε αν καλύπτονται σύζυγος και παιδιά', en: 'See whether spouse and children are covered' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Καλύπτονται τα εξαρτώμενα μέλη μου από το ομαδικό;',
                en: 'Are my dependants covered by the group plan?',
            },
        },
        {
            id: 'group_health_review_with_personal',
            label: { el: 'Δείτε πώς συνδυάζεται με το ατομικό σας πρόγραμμα', en: 'See how it combines with your individual plan' },
            href: '/protection',
            ctaType: 'review',
        },
        {
            id: 'group_health_ask_agent',
            label: { el: 'Ρωτήστε τον σύμβουλό σας τι μένει ακάλυπτο', en: 'Ask your advisor what remains uncovered' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Ποια είναι τα όρια ανά παροχή στο ομαδικό μου;', en: 'What are the per-benefit limits in my group plan?' },
        { el: 'Τι γίνεται με την κάλυψή μου αν φύγω από την εταιρεία;', en: 'What happens to my cover if I leave the company?' },
        { el: 'Καλύπτονται σύζυγος και παιδιά;', en: 'Are my spouse and children covered?' },
        { el: 'Ποια είναι η συμμετοχή μου σε μια νοσηλεία;', en: 'What is my share of the cost in a hospitalisation?' },
        { el: 'Υπάρχουν χρόνοι αναμονής στο ομαδικό πρόγραμμα;', en: 'Are there waiting periods in the group plan?' },
    ],
    claimsSteps: [
        {
            el: 'Πριν από προγραμματισμένη νοσηλεία, επικοινωνήστε με το συντονιστικό κέντρο του προγράμματος — συνήθως εκεί ανοίγει ο φάκελος και εκεί κρίνεται η απευθείας πληρωμή.',
            en: 'Before a planned hospitalisation, contact the plan’s coordination centre — that is usually where the file opens and where direct billing is decided.',
        },
        {
            el: 'Κρατήστε τον αριθμό ομαδικού ασφαλιστηρίου και τον κωδικό μέλους μαζί: το ομαδικό ταυτοποιείται από τον συνδυασμό των δύο, όχι από το όνομά σας.',
            en: 'Keep the group policy number and your member code together: a group plan is identified by the pair, not by your name.',
        },
        {
            el: 'Συγκεντρώστε πρωτότυπα παραστατικά και ιατρικές γνωματεύσεις — στα ομαδικά η αποζημίωση εξόδων γίνεται συχνά με υποβολή δικαιολογητικών εκ των υστέρων.',
            en: 'Gather original receipts and medical reports — in group plans reimbursement is often made against documents submitted after the fact.',
        },
        {
            el: 'Αν η εργασιακή σας σχέση λήγει όσο εκκρεμεί περιστατικό, ενημερώστε αμέσως HR και ασφαλιστή — η εκκαθάριση εξαρτάται από την ημερομηνία του συμβάντος, όχι της πληρωμής.',
            en: 'If your employment ends while a case is pending, tell HR and the insurer at once — settlement depends on the date of the event, not of the payment.',
        },
    ],
    renewalNote: {
        el: 'Το ομαδικό ανανεώνεται από την εταιρεία, όχι από εσάς. Μετά από κάθε ανανέωση αξίζει να δείτε αν άλλαξαν όρια, δίκτυο ή συμμετοχές — οι αλλαγές ανακοινώνονται συχνά μόνο εσωτερικά.',
        en: 'The group plan is renewed by the company, not by you. After each renewal it is worth checking whether limits, network or co-payments changed — such changes are often announced internally only.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει ομαδικό πρόγραμμα υγείας', en: 'No group health plan added yet' },
        description: {
            el: 'Ανεβάστε το πιστοποιητικό ασφάλισης που σας έδωσε η εταιρεία και δείτε τι φαίνεται να καλύπτει — και τι μένει στο ατομικό σας πρόγραμμα.',
            en: 'Upload the certificate of insurance your company gave you and see what it appears to cover — and what is left to your individual plan.',
        },
        ctaLabel: { el: 'Ανεβάστε πιστοποιητικό', en: 'Upload certificate' },
    },
}
