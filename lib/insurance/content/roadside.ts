import type { BranchContent } from './types'

/**
 * Standalone roadside assistance — a top-level branch, NOT the roadside rider
 * bundled inside a motor policy. It previously fell through to
 * `buildGenericContent`, which spoke about exclusions and deductibles: the
 * wrong vocabulary for a service contract whose real terms are radius, call-out
 * count and geographic scope.
 *
 * HONESTY: `AcordDataSchema` has NO typed section for a standalone assistance
 * contract (`vehicle.hasRoadsideAssistance` is a flag on a MOTOR policy, not
 * this product's terms). Towing radius, call-out allowance and repatriation
 * live only in the free-text `coverages[]` / `exclusions[]` — `whatWeAnalyze`
 * says so rather than enumerating kilometres we cannot extract.
 */
export const roadsideContent: BranchContent = {
    branchId: 'roadside',
    tagline: {
        el: 'Το ασφαλιστήριο που κρίνεται σε ένα τηλεφώνημα από την άκρη του δρόμου — δείτε τι ακριβώς υπόσχεται.',
        en: 'The contract judged by a single phone call from the roadside — see exactly what it promises.',
    },
    shortDescription: {
        el: 'Ρυμούλκηση και ακτίνα κάλυψης, επιτόπια επισκευή, όχημα αντικατάστασης, αριθμός κλήσεων ανά έτος, γεωγραφική εμβέλεια και επαναπατρισμός: το PolicyWallet σας δείχνει τι δικαιούσαι πριν μείνετε.',
        en: 'Towing and its radius, on-the-spot repair, replacement vehicle, call-outs per year, geographic scope and repatriation: PolicyWallet shows what you are entitled to before you break down.',
    },
    whyItMatters: [
        {
            el: 'Οι περισσότερες υπηρεσίες οδικής βοήθειας δεν είναι απεριόριστες: έχουν συγκεκριμένο αριθμό κλήσεων ανά έτος, και μετά την εξάντλησή τους η επόμενη ρυμούλκηση χρεώνεται.',
            en: 'Most assistance services are not unlimited: they allow a set number of call-outs per year, after which the next tow is charged.',
        },
        {
            el: 'Η ακτίνα ρυμούλκησης καθορίζει αν θα φτάσεις στο συνεργείο της επιλογής σας ή στο πλησιέστερο· η διαφορά φαίνεται μόνο όταν έχετε μείνει μακριά από την πόλη σας.',
            en: 'The towing radius decides whether you reach the garage you want or the nearest one; the difference only shows when you break down far from home.',
        },
        {
            el: 'Η γεωγραφική εμβέλεια είναι το σημείο που εκπλήσσει περισσότερο: αρκετά ασφαλιστήρια καλύπτουν την ηπειρωτική Ελλάδα αλλά όχι κάθε νησί ή διαδρομή στο εξωτερικό.',
            en: 'Geographic scope is what surprises people most: several contracts cover mainland Greece but not every island or route abroad.',
        },
        {
            el: 'Η επιτόπια αποκατάσταση (μπαταρία, ελαστικό, καύσιμο, κλειδιά) λύνει τα περισσότερα περιστατικά χωρίς ρυμούλκηση — αλλά δεν περιλαμβάνεται σε κάθε πακέτο.',
            en: 'On-the-spot fixes (battery, tyre, fuel, keys) resolve most incidents without towing — but are not in every package.',
        },
        {
            el: 'Ο επαναπατρισμός οχήματος και επιβαινόντων είναι ξεχωριστή παροχή από τη ρυμούλκηση, και συνήθως ενεργοποιείται μόνο πέρα από μια απόσταση από την κατοικία σας.',
            en: 'Repatriation of vehicle and occupants is a separate benefit from towing, and usually triggers only beyond a set distance from home.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Το αυτοτελές ασφαλιστήριο οδικής βοήθειας δεν έχει τυποποιημένα πεδία στην ανάλυσή μας: διαβάζουμε τις παροχές και τις εξαιρέσεις όπως τις γράφει το έγγραφο που ανεβάσατε.',
            en: 'A standalone roadside contract has no structured fields in our analysis: we read the benefits and exclusions as the document you uploaded words them.',
        },
        {
            el: 'Εντοπίζουμε τις αναφορές σε ρυμούλκηση, ακτίνα, αριθμό κλήσεων, όχημα αντικατάστασης, γεωγραφική εμβέλεια και επαναπατρισμό — με τη διατύπωση του ασφαλιστηρίου, χωρίς να συμπληρώνουμε αριθμούς που δεν αναγράφονται.',
            en: 'We surface references to towing, radius, call-out allowance, replacement vehicle, geographic scope and repatriation — in the contract’s own wording, adding no figures it does not state.',
        },
        {
            el: 'Το τηλέφωνο του κέντρου βοήθειας, τη διάρκεια ισχύος και τα οχήματα ή πρόσωπα που καλύπτονται, εφόσον αναφέρονται στο έγγραφο.',
            en: 'The assistance centre’s phone number, the term of validity, and which vehicles or people are covered, where the document states them.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Αποθηκεύστε τον αριθμό του κέντρου βοήθειας στις επαφές σας σήμερα — τη στιγμή που θα τον χρειαστείτε, το ασφαλιστήριο είναι συνήθως στο σπίτι.',
            en: 'Save the assistance centre’s number in your contacts today — the moment you need it, the contract is usually at home.',
        },
        {
            el: 'Δείτε αν η κάλυψη ακολουθεί το όχημα ή το πρόσωπο· η διαφορά μετράει όταν οδηγείτε άλλο αυτοκίνητο ή όταν οδηγεί κάποιος άλλος το δικό σας.',
            en: 'Check whether the cover follows the vehicle or the person; the difference matters when you drive another car, or someone else drives yours.',
        },
        {
            el: 'Πριν από ταξίδι σε νησί ή στο εξωτερικό, επιβεβαιώστε ότι η διαδρομή είναι εντός εμβέλειας και ρωτήστε τι ισχύει για μεταφορά με πλοίο.',
            en: 'Before an island or overseas trip, confirm the route is within scope and ask what applies to transport by ferry.',
        },
        {
            el: 'Αν έχετε ήδη οδική βοήθεια μέσα στο ασφαλιστήριο του αυτοκινήτου, δείτε αν οι δύο υπηρεσίες επικαλύπτονται — ίσως πληρώνετε δύο φορές για το ίδιο.',
            en: 'If your motor policy already includes assistance, check whether the two services overlap — you may be paying twice for the same thing.',
        },
    ],
    commonGaps: [
        {
            id: 'roadside_call_limit_gap',
            title: { el: 'Περιορισμένος αριθμός κλήσεων', en: 'Limited number of call-outs' },
            description: {
                el: 'Αν το ασφαλιστήριο ορίζει λίγες κλήσεις ανά έτος, μια δύσκολη χρονιά μπορεί να τις εξαντλήσει νωρίς — και οι επόμενες χρεώνονται κανονικά.',
                en: 'If the contract allows few call-outs per year, a bad year can exhaust them early — and the rest are charged as normal.',
            },
        },
        {
            id: 'roadside_scope_gap',
            title: { el: 'Γεωγραφική εμβέλεια στενότερη από τη χρήση', en: 'Scope narrower than your use' },
            description: {
                el: 'Αν ταξιδεύετε σε νησιά ή εκτός Ελλάδας, αξίζει έλεγχος ότι η εμβέλεια καλύπτει πραγματικά τις διαδρομές σας.',
                en: 'If you travel to islands or outside Greece, it is worth checking the scope actually covers your routes.',
            },
        },
        {
            id: 'roadside_radius_gap',
            title: { el: 'Ακτίνα ρυμούλκησης χωρίς επιλογή συνεργείου', en: 'Towing radius with no garage choice' },
            description: {
                el: 'Μια μικρή ακτίνα σημαίνει μεταφορά στο πλησιέστερο συνεργείο, όχι στο δικό σας — ίσως αξίζει να ξέρετε το όριο από πριν.',
                en: 'A short radius means transport to the nearest garage, not yours — worth knowing the limit in advance.',
            },
        },
        {
            id: 'roadside_overlap_gap',
            title: { el: 'Πιθανή επικάλυψη με το ασφαλιστήριο αυτοκινήτου', en: 'Possible overlap with the motor policy' },
            description: {
                el: 'Αν το ασφαλιστήριο του οχήματος περιλαμβάνει ήδη οδική βοήθεια, οι δύο καλύψεις ενδέχεται να επικαλύπτονται χωρίς επιπλέον όφελος.',
                en: 'If the vehicle policy already includes assistance, the two covers may overlap with no added benefit.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'roadside_check_radius',
            label: { el: 'Δείτε μέχρι πόσα χιλιόμετρα φτάνει η ρυμούλκηση', en: 'See how far the towing reaches' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Μέχρι πόσα χιλιόμετρα καλύπτεται η ρυμούλκηση;', en: 'How many kilometres of towing are covered?' },
        },
        {
            id: 'roadside_check_call_limit',
            label: { el: 'Ελέγξτε πόσες κλήσεις δικαιούσαι τον χρόνο', en: 'Check how many call-outs you get per year' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Πόσες κλήσεις βοήθειας δικαιούμαι ανά έτος;', en: 'How many assistance call-outs am I entitled to per year?' },
        },
        {
            id: 'roadside_check_scope',
            label: { el: 'Δείτε αν η κάλυψη ισχύει σε νησιά και εξωτερικό', en: 'See whether cover applies on islands and abroad' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ισχύει η οδική βοήθεια σε νησιά και εκτός Ελλάδας;',
                en: 'Does the roadside assistance apply on islands and outside Greece?',
            },
        },
        {
            id: 'roadside_check_replacement_vehicle',
            label: { el: 'Ελέγξτε αν προβλέπεται όχημα αντικατάστασης', en: 'Check whether a replacement vehicle is provided' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Δικαιούμαι όχημα αντικατάστασης;', en: 'Am I entitled to a replacement vehicle?' },
        },
        {
            id: 'roadside_review_overlap',
            label: { el: 'Δείτε αν επικαλύπτεται με το ασφαλιστήριο του αυτοκινήτου', en: 'See if it overlaps with your motor policy' },
            href: '/protection',
            ctaType: 'review',
        },
        {
            id: 'roadside_ask_agent_scope',
            label: { el: 'Ρωτήστε τον σύμβουλό σας για ευρύτερη εμβέλεια κάλυψης', en: 'Ask your advisor about wider cover scope' },
            href: '/agent',
            ctaType: 'askAgent',
        },
        {
            id: 'roadside_save_assistance_details',
            label: { el: 'Κρατήστε πρόχειρα τα στοιχεία του κέντρου βοήθειας', en: 'Keep the assistance centre details at hand' },
            href: null,
            ctaType: 'task',
        },
    ],
    suggestedQuestions: [
        { el: 'Πόσες κλήσεις βοήθειας δικαιούμαι;', en: 'How many assistance call-outs am I entitled to?' },
        { el: 'Μέχρι πού φτάνει η ρυμούλκηση;', en: 'How far does the towing go?' },
        { el: 'Καλύπτεται επιτόπια επισκευή ή αλλαγή ελαστικού;', en: 'Is an on-the-spot repair or tyre change covered?' },
        { el: 'Ισχύει η κάλυψη στο εξωτερικό;', en: 'Does the cover apply abroad?' },
        { el: 'Ποιο τηλέφωνο καλώ όταν μείνω;', en: 'Which number do I call when I break down?' },
    ],
    claimsSteps: [
        {
            el: 'Ασφαλίστε πρώτα τη θέση σας: τρίγωνο, φώτα και, όπου γίνεται, έξοδος από το οδόστρωμα πριν από κάθε τηλεφώνημα.',
            en: 'Secure your position first: warning triangle, hazard lights and, where possible, get off the carriageway before making any call.',
        },
        {
            el: 'Καλέστε το κέντρο βοήθειας του ασφαλιστηρίου πριν από οποιοδήποτε ιδιωτικό γερανό — αυθαίρετη ρυμούλκηση συνήθως δεν αποζημιώνεται.',
            en: 'Call the contract’s assistance centre before any private tow truck — an unauthorised tow is usually not reimbursed.',
        },
        {
            el: 'Δώστε ακριβή τοποθεσία, πινακίδα και σύντομη περιγραφή της βλάβης· ο διαχωρισμός μηχανικής βλάβης από ατύχημα αλλάζει την παροχή που ενεργοποιείται.',
            en: 'Give the exact location, plate and a short description of the fault; distinguishing mechanical breakdown from an accident changes which benefit applies.',
        },
        {
            el: 'Κρατήστε τον αριθμό περιστατικού που θα σας δώσουν και όποιο παραστατικό υπογράψετε στο σημείο.',
            en: 'Keep the incident number they give you and any document you sign at the scene.',
        },
    ],
    renewalNote: {
        el: 'Πριν την ανανέωση, δείτε αν άλλαξαν τα οχήματα ή οι διαδρομές σας — η αξία της οδικής βοήθειας κρίνεται από το πού οδηγείτε, όχι από το ασφάλιστρο.',
        en: 'Before renewal, check whether your vehicles or routes have changed — the value of assistance is decided by where you drive, not by the premium.',
    },
    emptyState: {
        headline: { el: 'Δεν έχετε προσθέσει ασφαλιστήριο οδικής βοήθειας', en: 'No roadside assistance contract added yet' },
        description: {
            el: 'Ανεβάστε το ασφαλιστήριο και δείτε πόσες κλήσεις δικαιούσαι, μέχρι πού φτάνει η ρυμούλκηση και πού ισχύει η κάλυψη.',
            en: 'Upload the contract and see how many call-outs you get, how far towing reaches and where the cover applies.',
        },
        ctaLabel: { el: 'Ανεβάστε ασφαλιστήριο', en: 'Upload policy' },
    },
}
