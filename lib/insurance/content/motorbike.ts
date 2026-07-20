import type { BranchContent } from './types'

/**
 * Motorbike is a CHILD of motor in the taxonomy, but the risk is genuinely
 * different: the rider is the crumple zone, the pillion is a separate insured
 * person, theft conditions are stricter and seasonal lay-up is normal. Falling
 * back to the motor bundle told riders about glass breakage and replacement
 * vehicles while saying nothing about rider injury — actively misleading.
 *
 * HONESTY: motorbike policies DO populate `acordData.vehicle`, so the vehicle
 * identifiers, coverage tier, deductible and roadside flag are real extracted
 * fields. Rider/pillion/gear cover has NO typed section — it is read from the
 * free-text coverages, and `whatWeAnalyze` says exactly that.
 */
export const motorbikeContent: BranchContent = {
    branchId: 'motorbike',
    tagline: {
        el: 'Στη μηχανή, ο αναβάτης είναι το πιο ευάλωτο κομμάτι — δες αν το συμβόλαιο καλύπτει εσένα ή μόνο το όχημα.',
        en: 'On a bike, the rider is the most exposed part — see whether the policy covers you or only the machine.',
    },
    shortDescription: {
        el: 'Σωματικές βλάβες αναβάτη, συνεπιβάτης, κλοπή με όρους φύλαξης, εξοπλισμός προστασίας, περίοδοι ακινησίας: το PolicyWallet ξεχωρίζει τι αφορά τη μοτοσικλέτα από τι αφορά εσένα.',
        en: 'Rider bodily injury, pillion passenger, theft with security conditions, protective gear, lay-up periods: PolicyWallet separates what covers the bike from what covers you.',
    },
    whyItMatters: [
        {
            el: 'Η υποχρεωτική ασφάλιση της μοτοσικλέτας καλύπτει τους τρίτους. Ο ίδιος ο αναβάτης καλύπτεται μόνο εφόσον υπάρχει ξεχωριστή κάλυψη σωματικών βλαβών αναβάτη.',
            en: 'Compulsory motorbike insurance covers third parties. The rider is covered only if a separate rider bodily-injury cover exists.',
        },
        {
            el: 'Σε πτώση χωρίς άλλο εμπλεκόμενο όχημα δεν υπάρχει τρίτος να αποζημιώσει — ό,τι ισχύει, ισχύει μόνο από το δικό σου συμβόλαιο.',
            en: 'In a fall with no other vehicle involved there is no third party to pay — whatever applies comes only from your own policy.',
        },
        {
            el: 'Ο συνεπιβάτης δεν αντιμετωπίζεται πάντα με τους ίδιους όρους με τον αναβάτη· αν μεταφέρεις τακτικά κάποιον, ίσως αξίζει να το επιβεβαιώσεις.',
            en: 'A pillion passenger is not always treated on the same terms as the rider; if you regularly carry someone, it may be worth confirming.',
        },
        {
            el: 'Η κάλυψη κλοπής σε δίκυκλα συνήθως συνοδεύεται από προϋποθέσεις — σύστημα ακινητοποίησης, κλειδαριά ή στάθμευση σε κλειστό χώρο. Αν δεν τηρούνται, ενδέχεται να μην ενεργοποιηθεί.',
            en: 'Theft cover on two-wheelers usually comes with conditions — an immobiliser, a lock, or parking in an enclosed space. If they are not met, it may not respond.',
        },
        {
            el: 'Ο εξοπλισμός προστασίας (κράνος, στολή, μπότες) μπορεί να κοστίζει όσο μια μικρή ζημιά, αλλά σπάνια περιλαμβάνεται αυτόματα στην κάλυψη.',
            en: 'Protective gear (helmet, suit, boots) can cost as much as a small claim, yet is rarely included in cover automatically.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Με βάση το έγγραφο που ανέβασες: στοιχεία του δικύκλου (μάρκα, μοντέλο, πινακίδα), τύπο κάλυψης και απαλλαγή, όπως αναγράφονται.',
            en: 'Based on the document you uploaded: the bike’s details (make, model, plate), coverage tier and deductible, as stated.',
        },
        {
            el: 'Αστική ευθύνη, ίδιες ζημιές, κλοπή, πυρκαγιά και οδική βοήθεια — αν φαίνεται να περιλαμβάνονται.',
            en: 'Liability, own damage, theft, fire and roadside assistance — where they appear to be included.',
        },
        {
            el: 'Ό,τι αφορά αναβάτη, συνεπιβάτη ή εξοπλισμό προστασίας δεν είναι τυποποιημένο πεδίο: το διαβάζουμε από το ελεύθερο κείμενο των καλύψεων και των εξαιρέσεων και το εμφανίζουμε όπως το διατυπώνει το συμβόλαιο.',
            en: 'Anything about rider, pillion or protective gear is not a structured field: we read it from the free-text coverages and exclusions and show it as the policy words it.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Ψάξε στο συμβόλαιο τη φράση «σωματικές βλάβες αναβάτη» ή αντίστοιχη — είναι το σημείο που ξεχωρίζει ουσιαστικά δύο δίκυκλα με παρόμοιο ασφάλιστρο.',
            en: 'Look in the policy for “rider bodily injury” or similar wording — it is what genuinely separates two bikes on a similar premium.',
        },
        {
            el: 'Αν έχεις ακριβό κράνος ή στολή, ρώτησε αν ο εξοπλισμός μπορεί να δηλωθεί χωριστά αντί να θεωρείται προσωπικό αντικείμενο.',
            en: 'If you own an expensive helmet or suit, ask whether the gear can be declared separately instead of counting as a personal item.',
        },
        {
            el: 'Πριν αφήσεις τη μηχανή ακίνητη για μήνες, δες τι προβλέπει το συμβόλαιο για κλοπή και ζημιά ενώ δεν κυκλοφορεί — η ακινησία δεν σημαίνει πάντα μειωμένο ρίσκο για τον ασφαλιστή.',
            en: 'Before laying the bike up for months, check what the policy says about theft and damage while it is off the road — lay-up does not always mean lower risk to the insurer.',
        },
        {
            el: 'Φωτογράφισε τον αριθμό πλαισίου και το σημείο στάθμευσης· σε δήλωση κλοπής ζητούνται σχεδόν πάντα.',
            en: 'Photograph the frame number and where you park; a theft report will almost always ask for both.',
        },
    ],
    commonGaps: [
        {
            id: 'motorbike_rider_injury_gap',
            title: { el: 'Χωρίς κάλυψη σωματικών βλαβών αναβάτη', en: 'No rider bodily-injury cover' },
            description: {
                el: 'Αν δεν εντοπίζεται ρητή κάλυψη για τον αναβάτη, ο τραυματισμός σου σε μονομερή πτώση ενδέχεται να μένει εκτός.',
                en: 'If no explicit rider cover appears, your own injury in a single-vehicle fall may fall outside the policy.',
            },
        },
        {
            id: 'motorbike_pillion_gap',
            title: { el: 'Ασαφείς όροι για τον συνεπιβάτη', en: 'Unclear pillion terms' },
            description: {
                el: 'Ορισμένα συμβόλαια δικύκλου περιορίζουν ή εξαιρούν τη μεταφορά επιβάτη. Αν μεταφέρεις τακτικά κάποιον, ίσως χρειάζεται επιβεβαίωση.',
                en: 'Some two-wheeler policies limit or exclude carrying a passenger. If you regularly carry someone, it may need confirming.',
            },
        },
        {
            id: 'motorbike_theft_conditions_gap',
            title: { el: 'Όροι φύλαξης στην κάλυψη κλοπής', en: 'Security conditions on theft cover' },
            description: {
                el: 'Η κλοπή δικύκλου συχνά καλύπτεται υπό προϋποθέσεις ασφάλισης ή στάθμευσης. Αξίζει να δεις ποιες ακριβώς ισχύουν πριν τις χρειαστείς.',
                en: 'Two-wheeler theft is often covered subject to locking or parking conditions. It is worth seeing exactly which apply before you need them.',
            },
            relatedRuleId: 'motor-theft',
        },
        {
            id: 'motorbike_gear_gap',
            title: { el: 'Εξοπλισμός προστασίας εκτός κάλυψης', en: 'Protective gear outside cover' },
            description: {
                el: 'Κράνος, στολή και μπότες συχνά δεν αναφέρονται καθόλου στο συμβόλαιο — μια ζημιά μπορεί να τα αφήσει εξ ολοκλήρου σε εσένα.',
                en: 'Helmet, suit and boots often go unmentioned in the policy — a claim can leave them entirely on you.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'motorbike_check_rider_injury',
            label: { el: 'Δες αν καλύπτεσαι ως αναβάτης', en: 'See whether you are covered as the rider' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Καλύπτονται οι σωματικές βλάβες του αναβάτη;',
                en: 'Is the rider’s bodily injury covered?',
            },
        },
        {
            id: 'motorbike_check_pillion',
            label: { el: 'Έλεγξε τι ισχύει για τον συνεπιβάτη', en: 'Check what applies to the pillion passenger' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Καλύπτεται ο συνεπιβάτης της μηχανής;', en: 'Is the pillion passenger covered?' },
        },
        {
            id: 'motorbike_check_theft_conditions',
            label: { el: 'Δες τους όρους της κάλυψης κλοπής', en: 'See the theft cover conditions' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Υπό ποιες προϋποθέσεις καλύπτεται η κλοπή του δικύκλου;',
                en: 'Under what conditions is theft of the bike covered?',
            },
        },
        {
            id: 'motorbike_check_roadside',
            label: { el: 'Έλεγξε αν υπάρχει οδική βοήθεια για δίκυκλο', en: 'Check whether roadside assistance covers two-wheelers' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Έχω οδική βοήθεια για τη μοτοσικλέτα;', en: 'Do I have roadside assistance for the motorbike?' },
        },
        {
            id: 'motorbike_ask_agent_gear',
            label: { el: 'Ρώτησε τον σύμβουλό σου για κάλυψη εξοπλισμού', en: 'Ask your advisor about gear cover' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Καλύπτονται οι σωματικές βλάβες του αναβάτη;', en: 'Is the rider’s bodily injury covered?' },
        { el: 'Καλύπτεται ο συνεπιβάτης;', en: 'Is the pillion passenger covered?' },
        { el: 'Τι ισχύει για κλοπή της μηχανής;', en: 'What applies if the bike is stolen?' },
        { el: 'Καλύπτεται το κράνος και ο εξοπλισμός μου;', en: 'Are my helmet and gear covered?' },
        { el: 'Τι ισχύει αν η μηχανή μείνει ακίνητη για μήνες;', en: 'What applies if the bike is laid up for months?' },
    ],
    claimsSteps: [
        {
            el: 'Αν υπάρχει τραυματισμός, η ιατρική βοήθεια προηγείται από κάθε διαδικασία — το συμβόλαιο περιμένει, ο τραυματισμός όχι.',
            en: 'If anyone is injured, medical help comes before any procedure — the policy can wait, an injury cannot.',
        },
        {
            el: 'Φωτογράφισε το δίκυκλο, το οδόστρωμα και τα σημεία πρόσκρουσης· σε πτώσεις χωρίς μάρτυρες, οι φωτογραφίες είναι συχνά η μόνη καταγραφή.',
            en: 'Photograph the bike, the road surface and the impact points; in falls without witnesses, photos are often the only record.',
        },
        {
            el: 'Κράτα και τον κατεστραμμένο εξοπλισμό προστασίας — αν καλύπτεται, θα ζητηθεί ως απόδειξη ζημιάς.',
            en: 'Keep the damaged protective gear too — if it is covered, it will be requested as evidence of loss.',
        },
        {
            el: 'Σε κλοπή, η δήλωση στην αστυνομία γίνεται πρώτη και ο αριθμός δικογραφίας συνοδεύει τον φάκελο στον ασφαλιστή.',
            en: 'For theft, the police report comes first and its reference number accompanies the file to the insurer.',
        },
    ],
    renewalNote: {
        el: 'Στα δίκυκλα η ανανέωση είναι καλή στιγμή να ξαναδείς την κάλυψη αναβάτη και τους όρους κλοπής — αλλάζουν πιο συχνά από το ασφάλιστρο.',
        en: 'For two-wheelers, renewal is a good moment to revisit rider cover and theft conditions — they change more often than the premium.',
    },
    emptyState: {
        headline: { el: 'Δεν έχεις προσθέσει συμβόλαιο μοτοσικλέτας', en: 'No motorbike policy added yet' },
        description: {
            el: 'Ανέβασε το ασφαλιστήριο του δικύκλου και δες τι καλύπτει για εσένα ως αναβάτη — όχι μόνο για τη μηχανή.',
            en: 'Upload your two-wheeler policy and see what it covers for you as the rider — not just for the bike.',
        },
        ctaLabel: { el: 'Ανέβασε συμβόλαιο', en: 'Upload policy' },
    },
}
