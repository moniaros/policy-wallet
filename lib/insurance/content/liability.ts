import type { BranchContent } from './types'

/**
 * Personal / family third-party liability.
 *
 * HONESTY NOTE: `AcordDataSchema` has NO typed section for this branch — the
 * coverage detail lives only in the free-text `coverages[]` / exclusions of the
 * uploaded document. `whatWeAnalyze` therefore describes reading that free
 * text and never enumerates limits we cannot extract.
 */
export const liabilityContent: BranchContent = {
    branchId: 'liability',
    tagline: {
        el: 'Η αστική ευθύνη δεν προστατεύει τα δικά σου πράγματα — προστατεύει την τσέπη σου όταν η ζημιά είναι σε άλλον.',
        en: 'Liability cover does not protect your own things — it protects your pocket when the damage is to someone else.',
    },
    shortDescription: {
        el: 'Σωματικές βλάβες και υλικές ζημιές σε τρίτους, ευθύνη ως ιδιοκτήτη σκύλου, ευθύνη ενοικιαστή απέναντι στον ιδιοκτήτη, πράξεις των παιδιών: το PolicyWallet διαβάζει πώς τα περιγράφει το δικό σου έγγραφο και στα εξηγεί με απλά λόγια.',
        en: 'Bodily injury and property damage to others, dog-owner liability, a tenant’s liability to the landlord, children’s acts: PolicyWallet reads how your own document describes them and explains it in plain language.',
    },
    whyItMatters: [
        {
            el: 'Πληρώνει σε άλλον, όχι σε εσένα: σωματικές βλάβες τρίτων και ζημιές σε ξένη περιουσία. Το δικό σου κινητό, έπιπλο ή αυτοκίνητο δεν μπαίνει ποτέ σε αυτόν τον λογαριασμό.',
            en: 'It pays someone else, not you: injury to third parties and damage to other people’s property. Your own phone, furniture or car never enters that account.',
        },
        {
            el: 'Μια σωματική βλάβη τρίτου ενδέχεται να εξελιχθεί σε απαίτηση πολύ μεγαλύτερη από την ορατή ζημιά — νοσήλια, απώλεια εισοδήματος και ηθική βλάβη κρίνονται χωριστά.',
            en: 'An injury to a third party can grow into a claim far larger than the visible damage — medical costs, loss of income and moral damages are assessed separately.',
        },
        {
            el: 'Ως ιδιοκτήτης σκύλου ή ως γονέας ανηλίκου, ενδέχεται να ευθύνεσαι για πράξεις που δεν έκανες εσύ — η ευθύνη προκύπτει από την ιδιότητα, όχι από την πρόθεση.',
            en: 'As a dog owner or as the parent of a minor, you may be liable for acts you did not commit yourself — liability follows the role, not the intent.',
        },
        {
            el: 'Ως ενοικιαστής, μια ζημιά που ξεκινά από το μίσθιο (νερά, φωτιά) φτάνει στον ιδιοκτήτη και στους γείτονες. Η ασφάλιση του κτιρίου καλύπτει τον ιδιοκτήτη — απέναντί του απαντά η δική σου ευθύνη.',
            en: 'As a tenant, damage starting inside the rented flat (water, fire) reaches the landlord and the neighbours. The building’s policy protects the landlord — it is your own liability that answers to him.',
        },
        {
            el: 'Πολύ συχνά η κάλυψη ζει «μέσα» σε ένα συμβόλαιο κατοικίας ως δευτερεύουσα παροχή. Γι’ αυτό αρκετοί την έχουν χωρίς να το θυμούνται — και μερικοί καταλήγουν να πληρώνουν δύο φορές για το ίδιο πράγμα.',
            en: 'Very often the cover lives inside a home policy as a secondary benefit. That is why many people hold it without remembering — and some end up paying twice for the same thing.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Η αστική ευθύνη δεν έχει τυποποιημένη δομή στα ασφαλιστήρια, οπότε δουλεύουμε πάνω στο ελεύθερο κείμενο του εγγράφου που ανέβασες: τις καλύψεις και τις εξαιρέσεις όπως ακριβώς είναι διατυπωμένες.',
            en: 'Liability has no standardised structure in policy documents, so we work from the free text of the document you uploaded: the coverages and exclusions exactly as they are worded.',
        },
        {
            el: 'Ποιος περιγράφεται ως ασφαλισμένος — μόνο εσύ ή και τα μέλη του νοικοκυριού — και ποιες ιδιότητες αναφέρονται ρητά (κατοικίδιο, μίσθωση, ανήλικα τέκνα).',
            en: 'Who is described as insured — only you, or the members of your household too — and which roles are named explicitly (pet, tenancy, minor children).',
        },
        {
            el: 'Εξαιρέσεις που περιορίζουν την κάλυψη, όπως η επαγγελματική δραστηριότητα ή οι σκόπιμες πράξεις, μαζί με τις ημερομηνίες ισχύος. Ό,τι δεν αναγράφεται στο έγγραφο δεν το συμπεραίνουμε.',
            en: 'Exclusions that narrow the cover, such as professional activity or deliberate acts, together with the dates in force. What the document does not state, we do not infer.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Πριν ψάξεις για χωριστή αστική ευθύνη, κοίτα πρώτα το συμβόλαιο της κατοικίας σου — αρκετά συχνά η κάλυψη είναι ήδη εκεί, χωμένη ανάμεσα στις παροχές.',
            en: 'Before looking for standalone liability cover, check your home policy first — quite often the cover is already there, tucked in among the benefits.',
        },
        {
            el: 'Αν έχεις σκύλο, δες αν αναφέρεται ρητά και με ποιες προϋποθέσεις (λουρί, φίμωτρο, δηλωμένη ράτσα) — οι προϋποθέσεις είναι που κρίνουν την απαίτηση.',
            en: 'If you have a dog, see whether it is named explicitly and on what conditions (leash, muzzle, declared breed) — the conditions are what decide the claim.',
        },
        {
            el: 'Αν μένεις με ενοίκιο, κράτα φωτογραφίες της κατάστασης του ακινήτου κατά την παράδοση των κλειδιών — είναι το σημείο αναφοράς σε κάθε μελλοντική διαφωνία.',
            en: 'If you rent, keep photos of the property’s condition at handover — they are the reference point in any later dispute.',
        },
        {
            el: 'Αν ασκείς ελεύθερο επάγγελμα, η οικογενειακή αστική ευθύνη συνήθως δεν καλύπτει την επαγγελματική δραστηριότητα — αυτή είναι χωριστή γραμμή ασφάλισης.',
            en: 'If you are self-employed, family liability usually does not cover professional activity — that is a separate line of insurance.',
        },
    ],
    commonGaps: [
        {
            id: 'liability_duplicate_cover_gap',
            title: { el: 'Πιθανή διπλή κάλυψη με την κατοικία', en: 'Possible duplicate cover with the home policy' },
            description: {
                el: 'Αν η αστική ευθύνη περιγράφεται και στο συμβόλαιο κατοικίας σου, ίσως πληρώνεις δύο φορές για παρόμοια προστασία. Αξίζει μια αντιπαραβολή των δύο κειμένων.',
                en: 'If liability is also described in your home policy, you may be paying twice for similar protection. A side-by-side read of the two texts is worth it.',
            },
        },
        {
            id: 'liability_dog_owner_gap',
            title: { el: 'Ασαφής ευθύνη ιδιοκτήτη κατοικιδίου', en: 'Unclear pet-owner liability' },
            description: {
                el: 'Αν το κατοικίδιο δεν αναφέρεται ρητά, δεν προκύπτει από το κείμενο αν καλύπτεται δάγκωμα ή ζημιά που θα προκαλέσει σε τρίτο.',
                en: 'If the pet is not named explicitly, the text does not show whether a bite or damage it causes to a third party is covered.',
            },
        },
        {
            id: 'liability_tenant_gap',
            title: { el: 'Ευθύνη ενοικιαστή προς τον ιδιοκτήτη', en: 'Tenant liability towards the landlord' },
            description: {
                el: 'Πολλά συμβόλαια ενοικιαζόμενης κατοικίας καλύπτουν το περιεχόμενο αλλά όχι τη ζημιά που θα προκληθεί στο ίδιο το μίσθιο.',
                en: 'Many policies for rented homes cover the contents but not damage caused to the rented property itself.',
            },
        },
        {
            id: 'liability_professional_gap',
            title: { el: 'Επαγγελματική δραστηριότητα εκτός κάλυψης', en: 'Professional activity outside the cover' },
            description: {
                el: 'Αν εργάζεσαι ως ελεύθερος επαγγελματίας, η ιδιωτική αστική ευθύνη συνήθως εξαιρεί ρητά ό,τι σχετίζεται με το επάγγελμά σου.',
                en: 'If you work as a self-employed professional, private liability usually excludes anything connected to your occupation.',
            },
            relatedRuleId: 'self_employed_no_liability',
        },
    ],
    recommendedActions: [
        {
            id: 'liability_check_included',
            label: { el: 'Δες αν έχεις ήδη αστική ευθύνη προς τρίτους', en: 'See if you already have third-party liability' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Περιλαμβάνει το συμβόλαιό μου αστική ευθύνη προς τρίτους;',
                en: 'Does my policy include third-party liability?',
            },
        },
        {
            id: 'liability_check_household',
            label: { el: 'Έλεγξε ποιοι του σπιτιού καλύπτονται', en: 'Check who in the household is covered' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποια πρόσωπα του νοικοκυριού μου αναφέρονται ως ασφαλισμένα;',
                en: 'Which members of my household are named as insured?',
            },
        },
        {
            id: 'liability_check_pet',
            label: { el: 'Δες τι ισχύει για ζημιά από το κατοικίδιο', en: 'See what applies for damage caused by your pet' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Καλύπτεται ζημιά που θα προκαλέσει το κατοικίδιό μου σε τρίτο;',
                en: 'Is damage my pet causes to a third party covered?',
            },
        },
        {
            id: 'liability_review_overlap',
            label: { el: 'Αντιπαράβαλε με το συμβόλαιο κατοικίας για επικαλύψεις', en: 'Cross-check the home policy for overlaps' },
            href: '/coverage-insights',
            ctaType: 'review',
        },
        {
            id: 'liability_ask_agent',
            label: { el: 'Ρώτησε τον σύμβουλό σου για τα όρια ευθύνης', en: 'Ask your advisor about the liability limits' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Περιλαμβάνει το συμβόλαιό μου αστική ευθύνη προς τρίτους;', en: 'Does my policy include third-party liability?' },
        { el: 'Καλύπτεται ζημιά που θα προκαλέσει το κατοικίδιό μου;', en: 'Is damage caused by my pet covered?' },
        { el: 'Καλύπτονται πράξεις των παιδιών μου;', en: 'Are my children’s acts covered?' },
        { el: 'Ως ενοικιαστής, καλύπτομαι για ζημιά στο μίσθιο;', en: 'As a tenant, am I covered for damage to the rented property?' },
        { el: 'Τι εξαιρείται από την αστική ευθύνη μου;', en: 'What is excluded from my liability cover?' },
    ],
    claimsSteps: [
        {
            el: 'Μην αναγνωρίσεις ευθύνη και μη συμφωνήσεις ποσό επί τόπου — η αναγνώριση πριν την εξέταση της υπόθεσης ενδέχεται να επηρεάσει την αποζημίωση.',
            en: 'Do not admit liability or agree an amount on the spot — admitting before the case is assessed can affect the settlement.',
        },
        {
            el: 'Κράτα στοιχεία του τρίτου και τυχόν μαρτύρων, και φωτογράφισε τη ζημιά όπως βρέθηκε.',
            en: 'Take the third party’s details and those of any witnesses, and photograph the damage as found.',
        },
        {
            el: 'Ενημέρωσε τον ασφαλιστή σου αμέσως μόλις μάθεις για την απαίτηση — ακόμη κι αν είναι προφορική και δεν έχει ποσό ακόμη.',
            en: 'Notify your insurer as soon as you learn of the claim — even if it is verbal and has no amount yet.',
        },
        {
            el: 'Αν λάβεις εξώδικο, αγωγή ή οποιοδήποτε δικόγραφο, προώθησέ το χωρίς καθυστέρηση — οι δικονομικές προθεσμίες τρέχουν ανεξάρτητα από την ασφάλισή σου.',
            en: 'If you receive a formal notice, a lawsuit or any court document, forward it without delay — procedural deadlines run regardless of your insurance.',
        },
    ],
    renewalNote: {
        el: 'Πριν την ανανέωση, αξίζει ένας έλεγχος στο τι άλλαξε στη ζωή σου: νέο κατοικίδιο, νέα μίσθωση ή νέα δραστηριότητα αλλάζουν το πόσο εκτεθειμένος είσαι απέναντι σε τρίτους.',
        en: 'Before renewal, it is worth reviewing what changed in your life: a new pet, a new tenancy or a new activity changes how exposed you are towards others.',
    },
    emptyState: {
        headline: { el: 'Δεν έχεις προσθέσει συμβόλαιο αστικής ευθύνης', en: 'No liability policy added yet' },
        description: {
            el: 'Ανέβασε το έγγραφο — ή και το συμβόλαιο κατοικίας σου, όπου συχνά κρύβεται η ίδια κάλυψη — και δες τι φαίνεται να ισχύει για ζημιές σε τρίτους.',
            en: 'Upload the document — or your home policy, where the same cover often hides — and see what appears to apply for damage to others.',
        },
        ctaLabel: { el: 'Ανέβασε συμβόλαιο', en: 'Upload policy' },
    },
}
