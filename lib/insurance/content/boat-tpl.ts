import type { BranchContent } from './types'

/**
 * Recreational-craft third-party liability — compulsory cover, split from
 * `boat_hull` because it is the half the law cares about.
 *
 * Greek recreational craft must carry third-party liability under Ν.4926/2022
 * and the General Port Regulation; the limits are set by regulation, not by
 * preference, and they run in three separate towers (per person, per event,
 * per period) with a further tower for marine pollution.
 *
 * HONESTY: statutory minima change by regulation. The copy explains the SHAPE
 * of the towers and points the reader at their own schedule for the amounts,
 * rather than asserting figures that may be superseded.
 */
export const boatTplContent: BranchContent = {
    branchId: 'boat_tpl',
    tagline: {
        el: 'Η αστική ευθύνη σκάφους δεν είναι επιλογή αγοράς — είναι προϋπόθεση για να βγει το σκάφος στο νερό.',
        en: 'Boat third-party liability is not a purchasing choice — it is a precondition for putting the craft in the water.',
    },
    shortDescription: {
        el: 'Υποχρεωτική κάλυψη ευθύνης έναντι επιβαινόντων και τρίτων για σκάφη αναψυχής, με χωριστά όρια ανά πρόσωπο, ανά συμβάν και συνολικά για την περίοδο, καθώς και ξεχωριστό όριο για πρόκληση θαλάσσιας ρύπανσης.',
        en: 'Compulsory liability cover towards people on board and third parties for recreational craft, with separate limits per person, per event and in aggregate for the period, plus a distinct limit for marine pollution.',
    },
    whyItMatters: [
        {
            el: 'Τα όρια δεν είναι ένα ποσό αλλά τρεις παράλληλοι πύργοι: ανά πρόσωπο, ανά συμβάν και αθροιστικά για όλη την ασφαλιστική περίοδο. Ένα σοβαρό ατύχημα με πολλούς παθόντες μπορεί να εξαντλήσει τον έναν χωρίς να αγγίξει τους άλλους.',
            en: 'The limits are not one amount but three parallel towers: per person, per event and in aggregate across the whole period. A serious accident with several injured can exhaust one without touching the others.',
        },
        {
            el: 'Η θαλάσσια ρύπανση έχει συνήθως δικό της, χαμηλότερο όριο. Μια διαρροή καυσίμου σε μαρίνα φέρνει κόστος καθαρισμού και πρόστιμα που δεν μοιάζουν με υλική ζημιά και δεν αντλούν από τον ίδιο πύργο.',
            en: 'Marine pollution normally carries its own, lower limit. A fuel spill in a marina brings clean-up costs and fines that look nothing like property damage and do not draw on the same tower.',
        },
        {
            el: 'Στα σκάφη αναψυχής οι επιβαίνοντες μετρούν ως δικαιούχοι της κάλυψης, όχι ως τρίτοι με την έννοια της οδικής κυκλοφορίας. Το ποιος ακριβώς περιλαμβάνεται αναγράφεται στο συμβόλαιο και διαφέρει ανά έκδοση.',
            en: 'On recreational craft the people aboard count as beneficiaries of the cover rather than as third parties in the road-traffic sense. Exactly who is included is written in the policy and varies by edition.',
        },
        {
            el: 'Δραστηριότητες που ρυμουλκούνται από το σκάφος — θαλάσσιο σκι, jet ski, φουσκωτά παιχνίδια — συνήθως χρειάζονται ρητή μνεία και δικό τους όριο. Χωρίς αυτήν, ένα ατύχημα στο σκοινί μπορεί να μείνει εκτός.',
            en: 'Activities towed behind the craft — water-skiing, jet-skis, inflatable toys — usually need an explicit mention and a limit of their own. Without it, an accident on the tow line can fall outside.',
        },
        {
            el: 'Το ότι το σκάφος έχει κάλυψη ιδίων ζημιών δεν σημαίνει ότι έχει και την υποχρεωτική αστική ευθύνη. Πρόκειται για δύο διαφορετικές καλύψεις που συχνά εκδίδονται ως χωριστά συμβόλαια και λήγουν σε διαφορετικές ημερομηνίες.',
            en: 'A craft having hull cover does not mean it also has the compulsory liability. These are two different covers, often issued as separate contracts, expiring on different dates.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Από το έγγραφο που ανέβασες: τα όρια ευθύνης ανά πρόσωπο, ανά συμβάν και συνολικά για την περίοδο, όπως αναγράφονται στον πίνακα.',
            en: 'From the document you uploaded: the liability limits per person, per event and in aggregate for the period, as they appear in the schedule.',
        },
        {
            el: 'Το χωριστό όριο για πρόκληση θαλάσσιας ρύπανσης και το ανώτατο όριο ευθύνης του ασφαλιστή για το σύνολο των περιπτώσεων, όπου δηλώνεται.',
            en: 'The separate limit for marine pollution and the insurer’s overall ceiling across all heads of cover, where it is stated.',
        },
        {
            el: 'Τη νομοθετική βάση που επικαλείται το συμβόλαιο και τα στοιχεία του σκάφους — αριθμό λεμβολογίου, ιπποδύναμη, αριθμό μηχανών — όπως καταχωρούνται.',
            en: 'The statutory basis the policy cites and the craft’s details — registry number, horsepower, number of engines — as recorded.',
        },
        {
            el: 'Την ημερομηνία λήξης, ώστε να ξεχωρίζει από τη λήξη τυχόν χωριστού συμβολαίου ιδίων ζημιών.',
            en: 'The expiry date, so it stands apart from the expiry of any separate own-damage contract.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Κράτα το πιστοποιητικό ασφάλισης επάνω στο σκάφος μαζί με τα έγγραφα λεμβολογίου — σε έλεγχο ζητούνται μαζί.',
            en: 'Keep the certificate of insurance aboard alongside the registry papers — a port check asks for them together.',
        },
        {
            el: 'Αν το σκάφος χρησιμοποιείται από άλλους ή εκναυλώνεται έστω περιστασιακά, δήλωσέ το: η ιδιωτική και η επαγγελματική χρήση κρίνονται με διαφορετικά όρια και διαφορετικό πλαίσιο.',
            en: 'If others use the craft, or it is chartered even occasionally, declare it: private and commercial use are judged on different limits and a different framework.',
        },
        {
            el: 'Αν κάνεις θαλάσσιο σκι ή σύρεις φουσκωτά, ζήτησε να αναγράφεται ρητά η σχετική κάλυψη με το όριό της, αντί να θεωρείς ότι περιλαμβάνεται.',
            en: 'If you water-ski or tow inflatables, ask for that cover and its limit to be written in explicitly, rather than assuming it is included.',
        },
        {
            el: 'Σημείωσε χωριστά τις δύο ημερομηνίες λήξης — ευθύνης και ιδίων ζημιών. Η μία μπορεί να ανανεωθεί και η άλλη να ξεχαστεί.',
            en: 'Note the two expiry dates separately — liability and own damage. One can be renewed while the other is forgotten.',
        },
    ],
    commonGaps: [
        {
            id: 'boat_tpl_missing_statutory_gap',
            title: { el: 'Σκάφος χωρίς την υποχρεωτική κάλυψη', en: 'Craft without the compulsory cover' },
            description: {
                el: 'Όταν στο πορτοφόλι υπάρχει μόνο κάλυψη ιδίων ζημιών, η υποχρεωτική αστική ευθύνη ενδέχεται να λείπει εντελώς — με συνέπειες που ξεκινούν πριν από οποιαδήποτε ζημιά.',
                en: 'Where the wallet holds own-damage cover alone, the compulsory liability may be missing entirely — with consequences that begin before any loss.',
            },
        },
        {
            id: 'boat_tpl_pollution_limit_gap',
            title: { el: 'Χαμηλό όριο θαλάσσιας ρύπανσης', en: 'Low marine-pollution limit' },
            description: {
                el: 'Το όριο ρύπανσης είναι συνήθως πολύ μικρότερο από το όριο σωματικών βλαβών, ενώ το κόστος καθαρισμού σε κλειστό λιμένα ανεβαίνει γρήγορα.',
                en: 'The pollution limit is usually far smaller than the bodily-injury limit, while clean-up costs inside an enclosed harbour rise quickly.',
            },
        },
        {
            id: 'boat_tpl_towed_activities_gap',
            title: { el: 'Ρυμουλκούμενες δραστηριότητες χωρίς μνεία', en: 'Towed activities not mentioned' },
            description: {
                el: 'Αν το θαλάσσιο σκι ή τα jet ski δεν αναφέρονται ρητά με δικό τους όριο, ένα ατύχημα κατά τη ρυμούλκηση ενδέχεται να μην καλύπτεται.',
                en: 'If water-skiing or jet-skis are not named with a limit of their own, an accident during towing may not be covered.',
            },
        },
        {
            id: 'boat_tpl_aggregate_gap',
            title: { el: 'Ετήσιο άθροισμα κοντά στο ένα συμβάν', en: 'Annual aggregate close to a single event' },
            description: {
                el: 'Όταν το συνολικό όριο περιόδου δεν απέχει πολύ από το όριο ανά συμβάν, ένα δεύτερο περιστατικό μέσα στην ίδια χρονιά μπορεί να βρει την κάλυψη εξαντλημένη.',
                en: 'When the period aggregate is not far above the per-event limit, a second incident in the same year can find the cover already used up.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'boat_tpl_check_towers',
            label: { el: 'Δες τα όρια ανά πρόσωπο και ανά συμβάν', en: 'See the per-person and per-event limits' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποια είναι τα όρια ευθύνης ανά πρόσωπο, ανά συμβάν και συνολικά;',
                en: 'What are the liability limits per person, per event and in aggregate?',
            },
        },
        {
            id: 'boat_tpl_check_pollution',
            label: { el: 'Έλεγξε το όριο θαλάσσιας ρύπανσης', en: 'Check the marine-pollution limit' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιο είναι το όριο για πρόκληση θαλάσσιας ρύπανσης;',
                en: 'What is the limit for causing marine pollution?',
            },
        },
        {
            id: 'boat_tpl_check_towed',
            label: { el: 'Δες αν καλύπτονται σκι και jet ski', en: 'See whether skiing and jet-skis are covered' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Καλύπτεται η ευθύνη από θαλάσσιο σκι ή jet ski;',
                en: 'Is liability from water-skiing or jet-skis covered?',
            },
        },
        {
            id: 'boat_tpl_review_dates',
            label: { el: 'Σύγκρινε τις ημερομηνίες λήξης των δύο καλύψεων', en: 'Compare the expiry dates of the two covers' },
            href: '/renewals',
            ctaType: 'renewals',
        },
        {
            id: 'boat_tpl_ask_agent_use',
            label: { el: 'Ρώτησε τον σύμβουλό σου για τη χρήση του σκάφους', en: 'Ask your advisor about how the craft is used' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Ποιο είναι το όριο ανά πρόσωπο για σωματικές βλάβες;', en: 'What is the per-person limit for bodily injury?' },
        { el: 'Πόσο είναι το συνολικό όριο για όλη την περίοδο;', en: 'What is the aggregate limit for the whole period?' },
        { el: 'Καλύπτονται οι επιβαίνοντες ή μόνο οι τρίτοι;', en: 'Are people on board covered, or only third parties?' },
        { el: 'Ποιο νόμο επικαλείται το συμβόλαιο για τα όρια;', en: 'Which law does the policy cite for the limits?' },
        { el: 'Ισχύει η κάλυψη αν κυβερνά άλλο πρόσωπο;', en: 'Does the cover apply if someone else is at the helm?' },
    ],
    claimsSteps: [
        {
            el: 'Φρόντισε πρώτα τους ανθρώπους και ενημέρωσε τη λιμενική αρχή — σε συμβάν με τραυματισμό ή ρύπανση η αναφορά είναι υποχρέωση, όχι επιλογή.',
            en: 'See to people first and inform the port authority — where there is injury or pollution the report is an obligation, not a choice.',
        },
        {
            el: 'Μην αναγνωρίσεις ευθύνη επί τόπου. Κατάγραψε στοιχεία των εμπλεκομένων και τυχόν μαρτύρων και άφησε την κρίση στον φάκελο.',
            en: 'Do not admit liability on the spot. Take the details of those involved and of any witnesses, and leave the judgement to the file.',
        },
        {
            el: 'Σε διαρροή καυσίμου ή λαδιών, ειδοποίησε αμέσως τη μαρίνα και τον ασφαλιστή — ο περιορισμός της ρύπανσης στα πρώτα λεπτά καθορίζει το τελικό κόστος.',
            en: 'In a fuel or oil spill, alert the marina and the insurer at once — containment in the first minutes decides the final cost.',
        },
        {
            el: 'Κράτα αντίγραφο κάθε εγγράφου που παραδίδεις στη λιμενική αρχή· ο ασφαλιστής θα ζητήσει τα ίδια στοιχεία στη δική του σειρά.',
            en: 'Keep a copy of every document handed to the port authority; the insurer will ask for the same material in its own sequence.',
        },
    ],
    renewalNote: {
        el: 'Επειδή η κάλυψη είναι υποχρεωτική, το κενό μεταξύ λήξης και ανανέωσης δεν είναι απλώς ρίσκο αλλά και παράβαση. Αξίζει να μπει υπενθύμιση αρκετά πριν.',
        en: 'Because the cover is compulsory, a gap between expiry and renewal is not merely a risk but a breach. A reminder set well in advance is worth having.',
    },
    emptyState: {
        headline: { el: 'Δεν έχεις προσθέσει αστική ευθύνη σκάφους', en: 'No boat liability cover added yet' },
        description: {
            el: 'Ανέβασε το ασφαλιστήριο αστικής ευθύνης και δες τα όρια ανά πρόσωπο, ανά συμβάν και για τη θαλάσσια ρύπανση.',
            en: 'Upload the liability policy and see the limits per person, per event and for marine pollution.',
        },
        ctaLabel: { el: 'Ανέβασε ασφαλιστήριο', en: 'Upload policy' },
    },
}
