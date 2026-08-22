import type { BranchContent } from './types'

export const pensionContent: BranchContent = {
    branchId: 'pension',
    tagline: {
        el: 'Δείτε πού πηγαίνουν οι εισφορές σας, τι κοστίζει το πρόγραμμα και πότε ωριμάζει.',
        en: 'See where your contributions go, what the plan costs and when it matures.',
    },
    shortDescription: {
        el: 'Συνταξιοδοτικά, αποταμιευτικά και επενδυτικά προγράμματα: εισφορές, κόστη, όροι εξαγοράς, εγγυήσεις και ωρίμανση — με απλά λόγια, από το δικό σας συμβόλαιο.',
        en: 'Pension, savings and investment plans: contributions, costs, surrender terms, guarantees and maturity — in plain language, from your own contract.',
    },
    whyItMatters: [
        {
            el: 'Τα κόστη (διαχείρισης, διαμεσολάβησης, εξαγοράς) επηρεάζουν άμεσα το τελικό ποσό — μικρές διαφορές στο ποσοστό γίνονται μεγάλες σε βάθος χρόνων.',
            en: 'Costs (management, distribution, surrender) directly affect the final amount — small percentage differences grow large over the years.',
        },
        {
            el: 'Η πρόωρη εξαγορά συχνά έχει σημαντικό κόστος τα πρώτα χρόνια — αξίζει να ξέρετε τους όρους πριν χρειαστείτε τα χρήματα.',
            en: 'Early surrender often carries a significant cost in the first years — know the terms before you need the money.',
        },
        {
            el: 'Αν το πρόγραμμα έχει επενδυτικό σκέλος, η απόδοση δεν είναι εγγυημένη — δείτε τι ακριβώς προβλέπει το δικό σας συμβόλαιο.',
            en: 'If the plan has an investment component, returns are not guaranteed — see exactly what your own contract provides.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Με βάση το έγγραφο που ανεβάσατε: σκοπό και διάρκεια προγράμματος, ύψος και συχνότητα εισφορών, ημερομηνία ωρίμανσης.',
            en: 'Based on the document you uploaded: plan purpose and duration, contribution amount and frequency, maturity date.',
        },
        {
            el: 'Κόστη και όρους εξαγοράς, όπως εμφανίζονται στο συμβόλαιο — και αν φαίνεται να υπάρχει εγγυημένο σκέλος.',
            en: 'Costs and surrender terms as they appear in the contract — and whether a guaranteed component appears to exist.',
        },
        {
            el: 'Ημερομηνίες πληρωμών και τι προβλέπεται αν διακόψετε ή παγώσεις τις καταβολές.',
            en: 'Payment dates and what applies if you stop or pause contributions.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Συγκρίνετε τις εισφορές σας με τον στόχο αποταμίευσης — αν άλλαξαν τα οικονομικά σας, το πρόγραμμα ίσως θέλει αναπροσαρμογή.',
            en: 'Compare your contributions with your savings goal — if your finances changed, the plan may need adjusting.',
        },
        {
            el: 'Σημειώστε την ημερομηνία ωρίμανσης — κοντά σε αυτήν υπάρχουν συνήθως επιλογές (εφάπαξ, σύνταξη, μεταφορά) με προθεσμίες.',
            en: 'Note the maturity date — around it there are usually options (lump sum, annuity, transfer) with deadlines.',
        },
        {
            el: 'Πριν από οποιαδήποτε εξαγορά, ζητήστε αναλυτικό υπολογισμό — το ποσό εξαγοράς συχνά διαφέρει από το «λογιστικό» υπόλοιπο.',
            en: 'Before any surrender, ask for a detailed calculation — the surrender value often differs from the notional balance.',
        },
    ],
    commonGaps: [
        {
            id: 'pension_costs_gap',
            title: { el: 'Ασαφή κόστη προγράμματος', en: 'Unclear plan costs' },
            description: {
                el: 'Αν τα κόστη δεν είναι ξεκάθαρα στο έγγραφο, ίσως αξίζει να ζητήσετε αναλυτική ενημέρωση από τον ασφαλιστή σας.',
                en: 'If costs are not clear in the document, it may be worth asking your insurer for a detailed breakdown.',
            },
        },
        {
            id: 'pension_surrender_gap',
            title: { el: 'Άγνωστοι όροι εξαγοράς', en: 'Unknown surrender terms' },
            description: {
                el: 'Οι όροι πρόωρης εξαγοράς είναι από τα σημαντικότερα σημεία ενός αποταμιευτικού προγράμματος — καλό να είναι γνωστοί από νωρίς.',
                en: 'Early-surrender terms are among the most important parts of a savings plan — best known early.',
            },
        },
        {
            id: 'pension_no_protection_gap',
            title: { el: 'Αποταμίευση χωρίς προστασία', en: 'Savings without protection' },
            description: {
                el: 'Ένα αποταμιευτικό πρόγραμμα δεν αντικαθιστά την κάλυψη ζωής ή εισοδήματος — είναι διαφορετικές ανάγκες.',
                en: 'A savings plan does not replace life or income cover — they answer different needs.',
            },
            relatedRuleId: 'income_no_protection',
        },
    ],
    recommendedActions: [
        {
            id: 'pension_check_maturity',
            label: { el: 'Δείτε πότε ωριμάζει το πρόγραμμα', en: 'See when the plan matures' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Πότε ωριμάζει το πρόγραμμά μου και ποιες είναι οι επιλογές μου;', en: 'When does my plan mature and what are my options?' },
        },
        {
            id: 'pension_check_surrender',
            label: { el: 'Ελέγξτε κόστος και όρους εξαγοράς', en: 'Check surrender cost and terms' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Τι κόστος έχει η πρόωρη εξαγορά;', en: 'What does early surrender cost?' },
        },
        {
            id: 'pension_check_costs',
            label: { el: 'Δείτε ποια κόστη επιβαρύνουν το πρόγραμμα', en: 'See which costs the plan carries' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποια κόστη διαχείρισης και επιβαρύνσεις αναφέρει το συμβόλαιό μου;',
                en: 'Which management costs and charges does my contract state?',
            },
        },
        {
            id: 'pension_check_dates',
            label: { el: 'Σημειώστε ημερομηνίες καταβολών και ωρίμανσης', en: 'Note contribution and maturity dates' },
            href: '/renewals',
            ctaType: 'renewals',
        },
        {
            id: 'pension_compare_goal',
            label: { el: 'Συγκρίνετε εισφορές με τον στόχο αποταμίευσης', en: 'Compare contributions with your savings goal' },
            href: '/coverage-insights',
            ctaType: 'profile',
        },
        {
            id: 'pension_ask_agent',
            label: { el: 'Ρωτήστε τον σύμβουλό σας για εναλλακτικές', en: 'Ask your advisor about alternatives' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Πότε ωριμάζει το πρόγραμμα;', en: 'When does the plan mature?' },
        { el: 'Ποια κόστη έχει το πρόγραμμα;', en: 'What costs does the plan carry?' },
        { el: 'Τι ισχύει αν σταματήσω τις καταβολές;', en: 'What happens if I stop contributions?' },
        { el: 'Υπάρχει εγγυημένο σκέλος στο πρόγραμμα;', en: 'Does the plan have a guaranteed component?' },
        { el: 'Πώς υπολογίζεται η αξία εξαγοράς;', en: 'How is the surrender value calculated?' },
    ],
    claimsSteps: [
        {
            el: 'Κοντά στην ωρίμανση, ο ασφαλιστής σας στέλνει τις επιλογές — αν δεν έρθουν έγκαιρα, ζητήστε τις εσείς.',
            en: 'Close to maturity, your insurer sends the options — if they do not arrive in time, request them yourself.',
        },
        {
            el: 'Για εξαγορά ή μεταφορά, ζητήστε γραπτό υπολογισμό με ημερομηνία ισχύος πριν υπογράψετε.',
            en: 'For surrender or transfer, ask for a written, dated calculation before signing.',
        },
        {
            el: 'Κρατήστε τα ετήσια ενημερωτικά σημειώματα — δείχνουν την πορεία του προγράμματος σε βάθος χρόνου.',
            en: 'Keep the annual statements — they show the plan’s trajectory over time.',
        },
    ],
    renewalNote: {
        el: 'Εδώ δεν υπάρχει κλασική «ανανέωση» — μετρήστε τις ημερομηνίες καταβολών και την ωρίμανση. Θα σας θυμίζουμε ό,τι εντοπίζεται στο έγγραφο.',
        en: 'There is no classic renewal here — what counts are payment dates and maturity. We will remind you of whatever the document shows.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει συνταξιοδοτικό ή αποταμιευτικό πρόγραμμα', en: 'No pension or savings plan added yet' },
        description: {
            el: 'Ανεβάστε το συμβόλαιο του προγράμματός σας και δείτε εισφορές, κόστη, όρους εξαγοράς και πότε ωριμάζει.',
            en: 'Upload your plan contract and see contributions, costs, surrender terms and when it matures.',
        },
        ctaLabel: { el: 'Ανεβάστε συμβόλαιο', en: 'Upload contract' },
    },
}
