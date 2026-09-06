import type { BranchContent } from './types'

/**
 * Renters — the tenant's own line (PW-CONTENT-01 Goal 5).
 *
 * Until this series a tenant's contract was stored as `home` and no renters
 * rule could exist. The bundle describes what a tenant's policy actually is in
 * Greece — contents, and liability towards the landlord and neighbours — and
 * promises only what the eight authored rules read: whether the document says
 * building or contents, the contents sum, the theft limit, the three perils,
 * itemised valuables and a technical-assistance number.
 *
 * HONESTY: liability towards the landlord, water damage, glass and temporary
 * accommodation are named as questions to ASK, not as things we analyse — the
 * extractor has no field for them (docs/content/DEFERRED-RULES.md, E2–E5).
 */
export const rentersContent: BranchContent = {
    branchId: 'renters',
    tagline: {
        el: 'Το σπίτι δεν είναι δικό σας· τα πράγματα μέσα του και η ευθύνη σας προς τον ιδιοκτήτη είναι.',
        en: 'The home is not yours; what is inside it, and your liability towards the landlord, are.',
    },
    shortDescription: {
        el: 'Ασφάλιση ενοικιαστή: το περιεχόμενο της κατοικίας που μισθώνετε (έπιπλα, συσκευές, προσωπικά αντικείμενα) και, όπου προβλέπεται, η αστική σας ευθύνη προς τον ιδιοκτήτη και τους γείτονες. Το κτίριο ασφαλίζεται από τον ιδιοκτήτη, όχι από εσάς.',
        en: 'Tenant insurance: the contents of the home you rent (furniture, appliances, personal effects) and, where included, your liability towards the landlord and the neighbours. The building is the landlord\'s to insure, not yours.',
    },
    whyItMatters: [
        {
            el: 'Η ασφάλιση του ιδιοκτήτη καλύπτει τους τοίχους, όχι ό,τι έχετε μέσα. Μετά από πυρκαγιά ή διάρρηξη, τα έπιπλα και οι συσκευές αντικαθίστανται μόνο αν υπάρχει δικό σας συμβόλαιο περιεχομένου.',
            en: 'The landlord\'s policy covers the walls, not what you own inside them. After a fire or a burglary, furniture and appliances are replaced only if you hold your own contents policy.',
        },
        {
            el: 'Μια διαρροή από το δικό σας διαμέρισμα στο από κάτω, ή ζημιά που προκαλέσατε στο ακίνητο, είναι δική σας ευθύνη. Πολλά συμβόλαια ενοικιαστή περιλαμβάνουν κάλυψη αστικής ευθύνης ακριβώς γι\' αυτό — αλλά όχι όλα.',
            en: 'A leak from your flat into the one below, or damage you cause to the property, is your liability. Many tenant policies include liability cover for exactly this — but not all of them.',
        },
        {
            el: 'Τα συμβόλαια περιεχομένου έχουν συνήθως όριο ανά αντικείμενο αξίας. Ένα ρολόι ή ένας υπολογιστής πάνω από το όριο αποζημιώνεται μόνο αν έχει δηλωθεί ξεχωριστά.',
            en: 'Contents policies usually carry a limit per valuable item. A watch or a computer above that limit is paid only if it was declared separately.',
        },
        {
            el: 'Σεισμός και πλημμύρα δεν ξεχωρίζουν κτίριο από περιεχόμενο. Όταν το συμβόλαιο περιεχομένου τα εξαιρεί, ο ενοικιαστής μένει με τη ζημιά — και συνήθως χωρίς σπίτι για λίγο.',
            en: 'Earthquake and flood do not distinguish building from contents. When a contents policy excludes them, the tenant is left with the loss — and usually without a home for a while.',
        },
    ],
    whatWeAnalyze: [
        { el: 'Αν το έγγραφο δηλώνει ρητά τι ασφαλίζει — περιεχόμενο, κτίριο ή και τα δύο.', en: 'Whether the document states what it insures — contents, building or both.' },
        { el: 'Αν καταγράφεται ασφαλισμένο κεφάλαιο περιεχομένου και όριο κάλυψης κλοπής.', en: 'Whether a contents sum insured and a theft limit are recorded.' },
        { el: 'Αν το έγγραφο δηλώνει ότι πυρκαγιά, σεισμός ή πλημμύρα δεν καλύπτονται.', en: 'Whether the document says fire, earthquake or flood are not covered.' },
        { el: 'Αν υπάρχουν αντικείμενα αξίας δηλωμένα ξεχωριστά, και αν καταγράφεται τηλέφωνο τεχνικής βοήθειας.', en: 'Whether valuables are itemised, and whether a technical-assistance number is recorded.' },
    ],
    howToUseBetter: [
        { el: 'Ανεβάστε ολόκληρο το συμβόλαιο, όχι μόνο την πρώτη σελίδα: το όριο ανά αντικείμενο και οι εξαιρέσεις βρίσκονται στους γενικούς όρους.', en: 'Upload the whole policy, not just the schedule: the per-item limit and the exclusions live in the general terms.' },
        { el: 'Κρατήστε αποδείξεις ή φωτογραφίες για ό,τι αξίζει πάνω από μερικές εκατοντάδες ευρώ — είναι αυτό που θα ζητηθεί σε ζημιά.', en: 'Keep receipts or photos for anything worth more than a few hundred euros — that is what a claim will ask for.' },
        { el: 'Ρωτήστε τον σύμβουλό σας αν η αστική ευθύνη προς τον ιδιοκτήτη περιλαμβάνεται· δεν μπορούμε να το διαβάσουμε ακόμη από το έγγραφο.', en: 'Ask your adviser whether liability towards the landlord is included; we cannot yet read it from the document.' },
        { el: 'Σημειώστε το τηλέφωνο τεχνικής βοήθειας στο κινητό σας τώρα — μια διαρροή δεν περιμένει να βρείτε το συμβόλαιο.', en: 'Save the technical-assistance number in your phone now — a leak will not wait for you to find the policy.' },
    ],
    commonGaps: [
        {
            id: 'renters_scope_unclear',
            title: { el: 'Δεν λέει τι ασφαλίζει', en: 'Does not say what it insures' },
            description: {
                el: 'Το έγγραφο δεν δηλώνει ρητά αν αφορά περιεχόμενο, κτίριο ή και τα δύο. Σε ζημιά, αυτό είναι η πρώτη ερώτηση της ασφαλιστικής.',
                en: 'The document does not state whether it covers contents, the building or both. In a claim, that is the insurer\'s first question.',
            },
            relatedRuleId: 'renters_scope_not_recorded',
        },
        {
            id: 'renters_valuables_unlisted',
            title: { el: 'Αντικείμενα αξίας χωρίς ξεχωριστή δήλωση', en: 'Valuables not declared separately' },
            description: {
                el: 'Όταν κανένα αντικείμενο δεν δηλώνεται ξεχωριστά, ισχύει το γενικό όριο ανά αντικείμενο για όλα — και είναι συνήθως χαμηλό.',
                en: 'When nothing is declared separately, the general per-item limit applies to everything — and it is usually low.',
            },
            relatedRuleId: 'renters_valuables_not_itemised',
        },
        {
            id: 'renters_perils_excluded',
            title: { el: 'Σεισμός ή πλημμύρα εκτός κάλυψης', en: 'Earthquake or flood not covered' },
            description: {
                el: 'Το περιεχόμενο καταστρέφεται από σεισμό και πλημμύρα όσο και το κτίριο. Όταν το έγγραφο τα εξαιρεί ρητά, δεν αποζημιώνονται.',
                en: 'Contents are destroyed by earthquake and flood as surely as the building is. When the document excludes them explicitly, they are not paid.',
            },
            relatedRuleId: 'renters_no_earthquake_cover',
        },
        {
            id: 'renters_theft_limit_unknown',
            title: { el: 'Όριο κλοπής που δεν καταγράφεται', en: 'Theft limit not recorded' },
            description: {
                el: 'Η κλοπή είναι η συχνότερη ζημιά περιεχομένου. Όταν το όριό της δεν καταγράφεται, δεν διαβάζεται μέχρι πού φτάνει η κάλυψη.',
                en: 'Theft is the most common contents loss. When its limit is not recorded, nobody can read how far the cover goes.',
            },
            relatedRuleId: 'renters_theft_limit_not_recorded',
        },
    ],
    recommendedActions: [
        {
            id: 'renters_check_scope',
            label: { el: 'Δείτε τι ακριβώς ασφαλίζει το συμβόλαιό σας', en: 'See what exactly your policy insures' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Ασφαλίζει το συμβόλαιό μου το περιεχόμενο, το κτίριο ή και τα δύο, και με ποιο κεφάλαιο;', en: 'Does my policy insure the contents, the building or both, and for what sum?' },
        },
        {
            id: 'renters_ask_liability',
            label: { el: 'Ρωτήστε αν καλύπτεται η ευθύνη σας προς τον ιδιοκτήτη', en: 'Ask whether your liability towards the landlord is covered' },
            href: null,
            ctaType: 'askAgent',
        },
        {
            id: 'renters_upload_terms',
            label: { el: 'Ανεβάστε τους γενικούς όρους', en: 'Upload the general terms' },
            href: '/wallet',
            ctaType: 'upload',
        },
        {
            id: 'renters_set_renewal',
            label: { el: 'Δείτε πότε ανανεώνεται', en: 'See when it renews' },
            href: '/wallet',
            ctaType: 'renewals',
        },
    ],
    suggestedQuestions: [
        { el: 'Ποιο είναι το όριο ανά αντικείμενο αξίας;', en: 'What is the per-item limit for valuables?' },
        { el: 'Καλύπτεται ζημιά που θα προκαλέσω στο διαμέρισμα ή σε γείτονα;', en: 'Is damage I cause to the flat or to a neighbour covered?' },
        { el: 'Υπάρχει προσωρινή στέγαση αν το σπίτι γίνει ακατοίκητο;', en: 'Is temporary accommodation covered if the home becomes uninhabitable?' },
        { el: 'Καλύπτεται ζημιά από νερό — διαρροή σωλήνα ή από τον επάνω όροφο;', en: 'Is water damage covered — a burst pipe or a leak from the flat above?' },
    ],
    claimsSteps: [
        { el: 'Φωτογραφίστε τη ζημιά πριν μετακινήσετε οτιδήποτε.', en: 'Photograph the damage before moving anything.' },
        { el: 'Ειδοποιήστε την ασφαλιστική εντός της προθεσμίας που ορίζει το συμβόλαιο και τον ιδιοκτήτη, αν αφορά το ακίνητο.', en: 'Notify the insurer within the policy\'s deadline, and the landlord if the property is affected.' },
        { el: 'Συγκεντρώστε αποδείξεις ή φωτογραφίες των αντικειμένων που χάθηκαν.', en: 'Gather receipts or photos of the items lost.' },
        { el: 'Μην πετάξετε τα κατεστραμμένα αντικείμενα πριν τα δει ο πραγματογνώμονας, εκτός αν είναι επικίνδυνα.', en: 'Do not discard damaged items before the assessor has seen them, unless they are a hazard.' },
    ],
    renewalNote: {
        el: 'Στην ανανέωση ενημερώστε το κεφάλαιο περιεχομένου αν αποκτήσατε κάτι αξίας, και δηλώστε ξεχωριστά ό,τι ξεπερνά το όριο ανά αντικείμενο.',
        en: 'At renewal, update the contents sum if you acquired something valuable, and declare separately anything above the per-item limit.',
    },
    emptyState: {
        headline: { el: 'Κανένα συμβόλαιο ενοικιαστή ακόμη', en: 'No tenant policy yet' },
        description: { el: 'Ανεβάστε το συμβόλαιο περιεχομένου σας για να δείτε τι δηλώνει και τι όχι.', en: 'Upload your contents policy to see what it states and what it does not.' },
        ctaLabel: { el: 'Ανέβασμα συμβολαίου', en: 'Upload a policy' },
    },
}
