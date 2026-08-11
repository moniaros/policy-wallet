import type { BranchContent } from './types'

/**
 * Fine art and valuables — scheduled items at agreed values.
 *
 * Deliberately NOT a child of `gadget`: re-parenting gadget would detach the
 * existing `valuables_loss` risk from every gadget policy already stored. The
 * two lines answer different losses anyway — a phone is replaced, a painting
 * is not.
 *
 * HONESTY: the thing that makes this line work is the schedule of items and the
 * security conditions attached to it, both of which arrive as free text plus a
 * table. `whatWeAnalyze` promises to read that table, not to value anything.
 */
export const fineArtContent: BranchContent = {
    branchId: 'fine_art',
    tagline: {
        el: 'Ό,τι δεν αντικαθίσταται από το κατάστημα ασφαλίζεται ανά τεμάχιο, με συμφωνημένη αξία και όνομα.',
        en: 'What a shop cannot replace is insured item by item, at an agreed value and by name.',
    },
    shortDescription: {
        el: 'Ασφάλιση έργων τέχνης, συλλογών και τιμαλφών με αναλυτική κατάσταση αντικειμένων: συμφωνημένη αξία ανά τεμάχιο, συνολικό όριο, όροι ασφαλείας του χώρου φύλαξης και τι ισχύει όταν το αντικείμενο μετακινείται.',
        en: 'Cover for artworks, collections and valuables on an itemised schedule: an agreed value per piece, an overall limit, the security conditions attached to where they are kept, and what applies when a piece is moved.',
    },
    whyItMatters: [
        {
            el: 'Στα έργα τέχνης η αποζημίωση κρίνεται συνήθως σε συμφωνημένη αξία ανά τεμάχιο, όχι σε αγοραία αξία τη στιγμή της ζημιάς. Αυτό βοηθά — αλλά μόνο αν η αξία έχει δηλωθεί και ενημερώνεται.',
            en: 'For artworks a claim is usually settled at an agreed value per piece rather than at market value on the day of loss. That helps — but only where the value has been declared and is kept current.',
        },
        {
            el: 'Οι όροι ασφαλείας εδώ δεν είναι συστάσεις: συναγερμός συνδεδεμένος με κέντρο λήψης σημάτων και προστασία ανοιγμάτων ενδέχεται να αποτελούν προϋπόθεση κάλυψης. Αν το σύστημα δεν λειτουργεί, η κάλυψη μπορεί να μην ισχύει.',
            en: 'The security terms here are not suggestions: an alarm connected to a monitoring centre and protected openings can be conditions of cover. If the system is not working, the cover may not apply.',
        },
        {
            el: 'Η κάλυψη είναι συνήθως δεμένη στον χώρο που περιγράφεται στο συμβόλαιο. Ένα έργο που πηγαίνει σε έκθεση, σε συντηρητή ή σε δεύτερη κατοικία ενδέχεται να βγαίνει εκτός κάλυψης ενώ μετακινείται.',
            en: 'Cover is normally tied to the premises the policy describes. A piece going to an exhibition, to a restorer or to a second home can fall outside cover while it travels.',
        },
        {
            el: 'Ο σεισμός συχνά προσφέρεται ως προαιρετική κάλυψη και όχι ως μέρος του «κατά παντός κινδύνου». Σε μια χώρα με τη σεισμικότητα της Ελλάδας, η διάκριση αυτή είναι ουσιώδης.',
            en: 'Earthquake is often offered as an optional cover rather than as part of “all risks”. In a country with Greece’s seismicity that distinction matters.',
        },
        {
            el: 'Ένα ζευγάρι ή μια σειρά αποζημιώνεται συνήθως ανά τεμάχιο, χωρίς προσαύξηση για την απώλεια της ενότητας — η αξία του συνόλου δεν ακολουθεί το χαμένο κομμάτι.',
            en: 'A pair or a set is usually settled piece by piece, with nothing added for the loss of the set — the value of the whole does not follow the missing part.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Από το έγγραφο που ανέβασες: την κατάσταση ασφαλιζόμενων αντικειμένων με τον τίτλο και την αξία καθενός, καθώς και το συνολικό ανώτατο όριο ευθύνης.',
            en: 'From the document you uploaded: the schedule of insured items with each title and value, plus the overall ceiling of liability.',
        },
        {
            el: 'Τις καλύψεις που έχουν επιλεγεί και εκείνες που αναγράφονται ως προαιρετικές, ώστε να φαίνεται τι έχει ενεργοποιηθεί και τι όχι.',
            en: 'Which covers have been taken and which are listed as optional, so it is visible what has been activated and what has not.',
        },
        {
            el: 'Τις ειδικές συμφωνίες και προϋποθέσεις ασφαλείας για τον χώρο φύλαξης, όπως είναι διατυπωμένες στο συμβόλαιο.',
            en: 'The special agreements and security conditions for the place of keeping, as worded in the policy.',
        },
        {
            el: 'Την απαλλαγή και τυχόν όρους που περιορίζουν την κάλυψη σε συγκεκριμένη διεύθυνση ή περίοδο.',
            en: 'The deductible and any terms restricting cover to a particular address or period.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Φωτογράφισε κάθε αντικείμενο με λεπτομέρειες υπογραφής και φθορών, και κράτα τιμολόγια, πιστοποιητικά γνησιότητας και εκθέσεις εκτίμησης στο ίδιο σημείο με το συμβόλαιο.',
            en: 'Photograph each piece including the signature and any wear, and keep invoices, certificates of authenticity and valuation reports in the same place as the policy.',
        },
        {
            el: 'Επανεκτίμησε τη συλλογή περιοδικά. Οι αγορές έργων τέχνης κινούνται και μια συμφωνημένη αξία από παλιά μπορεί να έχει μείνει πολύ πίσω.',
            en: 'Revalue the collection periodically. Art markets move, and an agreed value set years ago can be a long way behind.',
        },
        {
            el: 'Πριν δανείσεις έργο για έκθεση ή το στείλεις για συντήρηση, ρώτησε γραπτώς αν η κάλυψη ακολουθεί το αντικείμενο και υπό ποιους όρους μεταφοράς.',
            en: 'Before lending a piece for exhibition or sending it for restoration, ask in writing whether cover follows the object and on what transport terms.',
        },
        {
            el: 'Έλεγχε τον συναγερμό και τη σύνδεσή του με το κέντρο λήψης σημάτων στο ίδιο ρυθμό που ελέγχεις τα υπόλοιπα του σπιτιού — εδώ η συντήρησή του είναι όρος κάλυψης.',
            en: 'Test the alarm and its link to the monitoring centre on the same rhythm as everything else in the house — here its upkeep is a condition of cover.',
        },
    ],
    commonGaps: [
        {
            id: 'fine_art_stale_value_gap',
            title: { el: 'Συμφωνημένη αξία που έμεινε πίσω', en: 'Agreed value left behind' },
            description: {
                el: 'Όταν οι αξίες δεν έχουν ενημερωθεί μετά από ανατίμηση ή νέα απόκτηση, η αποζημίωση κινείται σε παλιά νούμερα ανεξάρτητα από τη σημερινή αξία.',
                en: 'Where values have not been refreshed after an uplift or a new acquisition, a claim settles on old numbers regardless of what a piece is worth today.',
            },
        },
        {
            id: 'fine_art_security_condition_gap',
            title: { el: 'Όροι ασφαλείας που δεν τηρούνται', en: 'Security conditions not being kept' },
            description: {
                el: 'Συναγερμός εκτός λειτουργίας ή σύνδεση που έχει διακοπεί ενδέχεται να αναιρεί την κάλυψη ακριβώς στο συμβάν που την χρειάζεται.',
                en: 'An alarm out of service or a monitoring link that has lapsed can undo the cover in exactly the incident that needs it.',
            },
        },
        {
            id: 'fine_art_transit_gap',
            title: { el: 'Χωρίς κάλυψη εκτός του δηλωμένου χώρου', en: 'No cover away from the declared premises' },
            description: {
                el: 'Αν η κάλυψη είναι δεμένη σε μία διεύθυνση, το έργο μένει εκτεθειμένο κάθε φορά που μεταφέρεται ή εκτίθεται αλλού.',
                en: 'If cover is tied to one address, a piece is exposed every time it is moved or shown elsewhere.',
            },
        },
        {
            id: 'fine_art_earthquake_optional_gap',
            title: { el: 'Σεισμός εκτός των επιλεγμένων καλύψεων', en: 'Earthquake outside the covers taken' },
            description: {
                el: 'Όταν ο σεισμός προσφέρεται προαιρετικά και δεν έχει επιλεγεί, η φράση «κατά παντός κινδύνου» δεν τον περιλαμβάνει.',
                en: 'Where earthquake is offered optionally and has not been taken, the phrase “all risks” does not include it.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'fine_art_check_schedule',
            label: { el: 'Δες την κατάσταση αντικειμένων και τις αξίες', en: 'See the schedule of items and values' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποια αντικείμενα καλύπτονται και με ποια αξία το καθένα;',
                en: 'Which items are covered and at what value each?',
            },
        },
        {
            id: 'fine_art_check_conditions',
            label: { el: 'Έλεγξε τους όρους ασφαλείας του χώρου', en: 'Check the premises security conditions' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιες προϋποθέσεις ασφαλείας ζητά το συμβόλαιο για τον χώρο φύλαξης;',
                en: 'What security conditions does the policy require for the place of keeping?',
            },
        },
        {
            id: 'fine_art_check_transit',
            label: { el: 'Δες τι ισχύει όταν μετακινείται ένα έργο', en: 'See what applies when a piece is moved' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Καλύπτεται το έργο όταν μεταφέρεται ή εκτίθεται αλλού;',
                en: 'Is a piece covered when it is transported or exhibited elsewhere?',
            },
        },
        {
            id: 'fine_art_review_values',
            label: { el: 'Σύγκρινε τις αξίες με τη σημερινή συλλογή', en: 'Compare the values against today’s collection' },
            href: '/coverage-insights',
            ctaType: 'review',
        },
        {
            id: 'fine_art_ask_agent_valuation',
            label: { el: 'Ρώτησε τον σύμβουλό σου για επανεκτίμηση', en: 'Ask your advisor about a revaluation' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Ποια είναι η συνολική ασφαλισμένη αξία της συλλογής;', en: 'What is the total insured value of the collection?' },
        { el: 'Καλύπτεται ο σεισμός στο συμβόλαιό μου;', en: 'Is earthquake covered on my policy?' },
        { el: 'Τι απαλλαγή ισχύει ανά ζημιά;', en: 'What deductible applies per loss?' },
        { el: 'Καλύπτεται έργο που δανείζεται σε έκθεση;', en: 'Is a piece covered when lent to an exhibition?' },
        { el: 'Τι συμβαίνει αν χαθεί ένα κομμάτι από ζεύγος ή σειρά;', en: 'What happens if one piece of a pair or set is lost?' },
    ],
    claimsSteps: [
        {
            el: 'Μην καθαρίσεις και μην επιχειρήσεις αποκατάσταση πριν από την πραγματογνωμοσύνη — σε έργα τέχνης η πρόχειρη επέμβαση μειώνει την αξία περισσότερο από την ίδια τη ζημιά.',
            en: 'Do not clean or attempt restoration before the survey — with artworks a hasty intervention lowers value more than the damage itself.',
        },
        {
            el: 'Σε κλοπή, δήλωσε στην αστυνομία και ζήτησε καταχώριση των στοιχείων του έργου σε βάσεις απολεσθέντων έργων τέχνης.',
            en: 'In a theft, report to the police and ask for the piece to be listed on stolen-art databases.',
        },
        {
            el: 'Παρέδωσε τη φωτογραφική τεκμηρίωση και τις εκθέσεις εκτίμησης που είχες πριν από το συμβάν· η προγενέστερη τεκμηρίωση βαραίνει περισσότερο από κάθε μεταγενέστερη.',
            en: 'Hand over the photographic record and valuation reports you held before the incident; documentation that predates the loss carries more weight than anything produced after it.',
        },
        {
            el: 'Κατάγραψε την κατάσταση του συναγερμού και του χώρου τη στιγμή του συμβάντος, καθώς αυτά θα εξεταστούν ως προϋποθέσεις της κάλυψης.',
            en: 'Record the state of the alarm and the premises at the time of the incident, since these will be examined as conditions of the cover.',
        },
    ],
    renewalNote: {
        el: 'Η ανανέωση είναι η φυσική στιγμή για να μπουν στην κατάσταση τα νέα αποκτήματα και να βγουν όσα πουλήθηκαν — αλλιώς το συμβόλαιο περιγράφει μια συλλογή που δεν υπάρχει πια.',
        en: 'Renewal is the natural moment to add new acquisitions to the schedule and remove what has been sold — otherwise the policy describes a collection that no longer exists.',
    },
    emptyState: {
        headline: { el: 'Δεν έχεις προσθέσει ασφάλιση έργων τέχνης ή τιμαλφών', en: 'No fine art or valuables cover added yet' },
        description: {
            el: 'Ανέβασε το ασφαλιστήριο και δες ποια αντικείμενα περιλαμβάνονται, με ποιες αξίες και υπό ποιους όρους ασφαλείας.',
            en: 'Upload the policy and see which items are included, at what values and under what security conditions.',
        },
        ctaLabel: { el: 'Ανέβασε ασφαλιστήριο', en: 'Upload policy' },
    },
}
