import type { BranchContent } from './types'

/**
 * Commercial marine hull — working craft, port-risk units, floating platforms.
 *
 * Kept apart from the b2c `boat` family because the two are underwritten on
 * different wordings and, more practically, because a commercial hull runs on
 * warranties: breach of a warranty in this line does not reduce a claim, it
 * removes the cover.
 */
export const marineHullContent: BranchContent = {
    branchId: 'marine_hull',
    tagline: {
        el: 'Στα επαγγελματικά σκάφη η κάλυψη κρέμεται από τους απαράβατους όρους, όχι από το ασφαλισμένο κεφάλαιο.',
        en: 'On commercial craft the cover hangs on the warranties, not on the sum insured.',
    },
    shortDescription: {
        el: 'Ασφάλιση επαγγελματικών σκαφών και πλωτών μέσων: αξία σκάφους και μηχανών, ρήτρες χρονικής κάλυψης, ευθύνη σύγκρουσης και προς τρίτους, απαλλαγή ανά ατύχημα, και οι απαράβατοι όροι για πιστοποιητικά, συντήρηση, αγκυροβόλιο και όρια χωρητικότητας.',
        en: 'Cover for working craft and floating units: hull and machinery value, time clauses, collision and third-party liability, a deductible per accident, and the warranties on certificates, maintenance, mooring and capacity limits.',
    },
    whyItMatters: [
        {
            el: 'Ο απαράβατος όρος δεν είναι σύσταση. Η μη τήρησή του — ληγμένο πιστοποιητικό, υπέρβαση χωρητικότητας, εργασίες εν θερμώ επί του σκάφους — μπορεί να αφαιρέσει την κάλυψη για το συγκεκριμένο συμβάν.',
            en: 'A warranty is not a recommendation. Failing it — a lapsed certificate, capacity exceeded, hot works on board — can remove cover for the incident in question.',
        },
        {
            el: 'Οι απαιτήσεις συντήρησης έχουν συχνά ρυθμό: ετήσιο service σύμφωνα με τις οδηγίες του κατασκευαστή, συναρμολόγηση και αποσυναρμολόγηση από εξουσιοδοτημένο συνεργείο. Πρόκειται για ημερολόγιο υποχρεώσεων, όχι για μία υπογραφή στην έναρξη.',
            en: 'Maintenance requirements usually have a rhythm: annual servicing to the maker’s instructions, assembly and disassembly by an authorised workshop. This is a calendar of obligations, not a single signature at inception.',
        },
        {
            el: 'Πολλά συμβόλαια εξαιρούν ρητά τη ζημιά όσο το σκάφος βρίσκεται υπό επισκευή ή μετακινείται — ακριβώς οι στιγμές που ο κίνδυνος είναι υψηλότερος.',
            en: 'Many policies expressly exclude damage while the unit is under repair or being moved — precisely the moments when risk is highest.',
        },
        {
            el: 'Η απαλλαγή αφορά συνήθως το σύνολο των απαιτήσεων ανά ατύχημα και δεν εφαρμόζεται στην ολική ή τεκμαρτή ολική απώλεια. Δύο διαφορετικοί κόσμοι μέσα στο ίδιο συμβόλαιο.',
            en: 'The deductible normally applies to all claims arising from one accident and does not apply to a total or constructive total loss. Two different worlds inside one contract.',
        },
        {
            el: 'Το εφαρμοστέο δίκαιο μπορεί να είναι αγγλικό ενώ η δικαιοδοσία ελληνική. Η διάκριση καθορίζει με ποιους κανόνες ερμηνεύεται το συμβόλαιο και πού κρίνεται η διαφορά.',
            en: 'The governing law can be English while the jurisdiction is Greek. That distinction decides by which rules the contract is read and where a dispute is heard.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Από το έγγραφο που ανέβασες: την ασφαλισμένη αξία σκάφους, μηχανών και εξαρτημάτων, και το ανώτατο όριο ευθύνης.',
            en: 'From the document you uploaded: the insured value of hull, machinery and fittings, and the ceiling of liability.',
        },
        {
            el: 'Τις ρήτρες που κατονομάζονται και τα όρια ευθύνης σύγκρουσης και προς τρίτους, όπως συνδέονται με την αξία του σκάφους.',
            en: 'The named clauses and the collision and third-party liability limits, as they are tied to the hull value.',
        },
        {
            el: 'Τους απαράβατους όρους έναν προς έναν, με τη διατύπωσή τους, ώστε να είναι ορατό τι πρέπει να τηρείται και σε ποια συχνότητα.',
            en: 'The warranties one by one, in their own wording, so that what must be kept and how often is visible.',
        },
        {
            el: 'Την απαλλαγή ανά ατύχημα και τις εξαιρέσεις εδάφους ή κυρώσεων που περιορίζουν πού ισχύει η κάλυψη.',
            en: 'The deductible per accident and the territorial or sanctions exclusions that narrow where cover applies.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Κράτα ημερολόγιο πιστοποιητικών με ημερομηνίες λήξης. Ο όρος «σε ισχύ καθ’ όλη τη διάρκεια» μεταφράζεται σε υπενθυμίσεις, όχι σε πρόθεση.',
            en: 'Keep a certificate calendar with expiry dates. “Valid at all times” translates into reminders, not into intent.',
        },
        {
            el: 'Αρχειοθέτησε τα δελτία ετήσιας συντήρησης μαζί με τις οδηγίες του κατασκευαστή στις οποίες παραπέμπει ο όρος — η αντιστοιχία των δύο είναι αυτό που ελέγχεται.',
            en: 'File the annual service records alongside the maker’s instructions the warranty points to — it is the correspondence between them that gets checked.',
        },
        {
            el: 'Πριν από εργασίες επισκευής ή μετακίνηση της μονάδας, ενημέρωσε τον ασφαλιστή γραπτώς· πολλές εξαιρέσεις ενεργοποιούνται ακριβώς σε αυτές τις περιόδους.',
            en: 'Before repair works or moving the unit, tell the insurer in writing; a number of exclusions switch on precisely in those periods.',
        },
        {
            el: 'Τήρησε αρχείο επιβατών ή σκαφών ανά ημέρα όπου υπάρχει όριο χωρητικότητας — η υπέρβαση κρίνεται εκ των υστέρων και χρειάζεται στοιχεία.',
            en: 'Keep a daily record of persons or craft where a capacity limit exists — an excess is judged after the fact and needs evidence.',
        },
    ],
    commonGaps: [
        {
            id: 'marine_hull_certificate_warranty_gap',
            title: { el: 'Πιστοποιητικά που λήγουν μέσα στην περίοδο', en: 'Certificates expiring inside the period' },
            description: {
                el: 'Όταν ο όρος απαιτεί ισχύ πιστοποιητικών καθ’ όλη τη διάρκεια, μια λήξη που περνά απαρατήρητη αφήνει τη μονάδα χωρίς κάλυψη για ό,τι συμβεί μετά.',
                en: 'Where the warranty requires certificates valid throughout, an expiry that slips by leaves the unit uncovered for whatever happens next.',
            },
        },
        {
            id: 'marine_hull_maintenance_warranty_gap',
            title: { el: 'Ετήσια συντήρηση χωρίς αποδεικτικά', en: 'Annual maintenance with no evidence' },
            description: {
                el: 'Η συντήρηση που έγινε αλλά δεν τεκμηριώθηκε είναι δύσκολο να αποδειχθεί όταν ο όρος εξετάζεται μετά από ζημιά.',
                en: 'Maintenance that was done but not documented is hard to prove when the warranty is examined after a loss.',
            },
        },
        {
            id: 'marine_hull_under_repair_gap',
            title: { el: 'Περίοδοι επισκευής εκτός κάλυψης', en: 'Repair periods outside cover' },
            description: {
                el: 'Αν το συμβόλαιο εξαιρεί τη ζημιά όσο η μονάδα επισκευάζεται ή μετακινείται, το κενό εμφανίζεται σε προγραμματισμένες εργασίες, όχι σε έκτακτα.',
                en: 'If the policy excludes damage while the unit is under repair or being moved, the gap shows up in planned works rather than in emergencies.',
            },
        },
        {
            id: 'marine_hull_capacity_gap',
            title: { el: 'Όριο χωρητικότητας χωρίς παρακολούθηση', en: 'Capacity limit not tracked' },
            description: {
                el: 'Όταν ο όρος αποκλείει απαίτηση σε περίπτωση υπέρβασης της μέγιστης χωρητικότητας, χωρίς καταγραφή δεν υπάρχει τρόπος να δειχθεί ότι τηρήθηκε.',
                en: 'Where the warranty bars a claim if maximum capacity is exceeded, with no record there is no way to show it was respected.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'marine_hull_check_warranties',
            label: { el: 'Δες τη λίστα απαράβατων όρων', en: 'See the list of warranties' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιοι απαράβατοι όροι ισχύουν και τι απαιτεί ο καθένας;',
                en: 'Which warranties apply and what does each one require?',
            },
        },
        {
            id: 'marine_hull_check_deductible',
            label: { el: 'Έλεγξε την απαλλαγή ανά ατύχημα', en: 'Check the deductible per accident' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποια απαλλαγή ισχύει ανά ατύχημα και πού δεν εφαρμόζεται;',
                en: 'What deductible applies per accident, and where does it not apply?',
            },
        },
        {
            id: 'marine_hull_check_liability',
            label: { el: 'Δες τα όρια ευθύνης σύγκρουσης και τρίτων', en: 'See the collision and third-party limits' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Μέχρι ποιο ποσό καλύπτεται η ευθύνη σύγκρουσης και προς τρίτους;',
                en: 'Up to what amount is collision and third-party liability covered?',
            },
        },
        {
            id: 'marine_hull_review_certificates',
            label: { el: 'Οργάνωσε τις ημερομηνίες πιστοποιητικών', en: 'Organise the certificate dates' },
            href: '/renewals',
            ctaType: 'renewals',
        },
        {
            id: 'marine_hull_ask_agent_repairs',
            label: { el: 'Ρώτησε τον σύμβουλό σου για τις περιόδους επισκευής', en: 'Ask your advisor about repair periods' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Ποιοι απαράβατοι όροι πρέπει να τηρούνται;', en: 'Which warranties have to be kept?' },
        { el: 'Τι ισχύει όσο η μονάδα βρίσκεται υπό επισκευή;', en: 'What applies while the unit is under repair?' },
        { el: 'Ποια απαλλαγή εφαρμόζεται σε ολική απώλεια;', en: 'Which deductible applies to a total loss?' },
        { el: 'Ποιο δίκαιο διέπει το συμβόλαιο και πού δικάζεται;', en: 'Which law governs the policy and where is it heard?' },
        { el: 'Καλύπτεται η ευθύνη προς τρίτους και μέχρι ποιο ποσό;', en: 'Is third-party liability covered, and up to what amount?' },
    ],
    claimsSteps: [
        {
            el: 'Ενημέρωσε ασφαλιστή και λιμενική αρχή αμέσως, και μην ξεκινήσεις εργασίες αποκατάστασης πριν οριστεί πραγματογνώμονας.',
            en: 'Inform the insurer and the port authority at once, and do not start remedial works before a surveyor is appointed.',
        },
        {
            el: 'Ετοίμασε τον φάκελο τήρησης όρων — πιστοποιητικά, δελτία συντήρησης, στοιχεία αγκυροβολίου — μαζί με τη δήλωση ζημιάς, γιατί θα ζητηθεί μαζί.',
            en: 'Prepare the compliance file — certificates, service records, mooring details — alongside the loss notice, because it will be asked for together.',
        },
        {
            el: 'Κατάγραψε καιρικές συνθήκες, ώρα και κατάσταση της μονάδας πριν από οποιαδήποτε μετακίνηση ή ρυμούλκηση.',
            en: 'Record weather, time and the unit’s condition before any move or tow.',
        },
        {
            el: 'Κράτα χωριστά τα κόστη διάσωσης και περιορισμού της ζημιάς από τα κόστη επισκευής — εκκαθαρίζονται με διαφορετικούς όρους.',
            en: 'Keep salvage and mitigation costs separate from repair costs — they are adjusted under different terms.',
        },
    ],
    renewalNote: {
        el: 'Πριν την ανανέωση αξίζει έλεγχος στο ημερολόγιο πιστοποιητικών και συντηρήσεων: εκεί συγκεντρώνεται το μεγαλύτερο μέρος του κινδύνου άρνησης.',
        en: 'Before renewal the certificate and maintenance calendar is worth a pass: that is where most of the declinature risk sits.',
    },
    emptyState: {
        headline: { el: 'Δεν έχεις προσθέσει ασφάλιση επαγγελματικού σκάφους', en: 'No commercial marine hull policy added yet' },
        description: {
            el: 'Ανέβασε το ασφαλιστήριο και δες την ασφαλισμένη αξία, τα όρια ευθύνης και τους απαράβατους όρους που το συνοδεύουν.',
            en: 'Upload the policy and see the insured value, the liability limits and the warranties attached to it.',
        },
        ctaLabel: { el: 'Ανέβασε ασφαλιστήριο', en: 'Upload policy' },
    },
}
