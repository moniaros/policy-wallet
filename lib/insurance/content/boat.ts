import type { BranchContent } from './types'

/**
 * Boat is a top-level branch with no rich parent — it previously fell through
 * to `buildGenericContent`, which said nothing about the things that actually
 * decide a marine claim: navigation limits, lay-up, salvage and wreck removal.
 *
 * HONESTY: `AcordDataSchema` has NO typed section for marine risks. Hull value,
 * navigation area, crew cover and salvage terms live only in the free-text
 * `coverages[]` / `exclusions[]` of the uploaded document — `whatWeAnalyze`
 * states that instead of enumerating limits we cannot extract.
 */
export const boatContent: BranchContent = {
    branchId: 'boat',
    tagline: {
        el: 'Στη θάλασσα, τα όρια του συμβολαίου είναι κυριολεκτικά γεωγραφικά — δες πού και πότε ισχύει το δικό σου.',
        en: 'At sea, a policy’s limits are literally geographic — see where and when yours applies.',
    },
    shortDescription: {
        el: 'Σκάφος, αστική ευθύνη προς τρίτους, ναυαγιαίρεση και ανέλκυση, όρια πλόων, περίοδοι παροπλισμού, πλήρωμα και επιβαίνοντες: το PolicyWallet διαβάζει το ναυτασφαλιστήριο και ξεχωρίζει τι ισχύει εν πλω από τι ισχύει στη μαρίνα.',
        en: 'Hull, third-party liability, salvage and wreck removal, navigation limits, lay-up periods, crew and passengers: PolicyWallet reads the marine policy and separates what applies under way from what applies in the marina.',
    },
    whyItMatters: [
        {
            el: 'Η ασφάλιση αστικής ευθύνης είναι υποχρεωτική για τα σκάφη αναψυχής στα ελληνικά ύδατα — χωρίς αυτήν ο απόπλους είναι ήδη παράβαση, ανεξάρτητα από ζημιά.',
            en: 'Third-party liability insurance is compulsory for pleasure craft in Greek waters — without it, sailing is already a breach, regardless of any damage.',
        },
        {
            el: 'Τα όρια πλόων είναι από τα λιγότερο προσεγμένα σημεία: αν βγεις εκτός της περιοχής που ορίζει το συμβόλαιο, ενδέχεται να μην ισχύει τίποτα από όσα πληρώνεις.',
            en: 'Navigation limits are among the least-noticed clauses: sail outside the area the policy names and none of what you pay for may apply.',
        },
        {
            el: 'Η ανέλκυση ναυαγίου μπορεί να κοστίσει περισσότερο από το ίδιο το σκάφος και συχνά επιβάλλεται από τη λιμενική αρχή — δεν είναι επιλογή του ιδιοκτήτη.',
            en: 'Wreck removal can cost more than the boat itself and is often ordered by the port authority — it is not the owner’s choice.',
        },
        {
            el: 'Στον παροπλισμό, πολλά συμβόλαια μειώνουν ή αναστέλλουν καλύψεις· η κάλυψη «εν πλω» και η κάλυψη «εν όρμω» σπάνια ταυτίζονται.',
            en: 'During lay-up many policies reduce or suspend covers; “under way” and “at moorings” cover are rarely the same thing.',
        },
        {
            el: 'Οι επιβαίνοντες δεν καλύπτονται αυτόματα από την αστική ευθύνη προς τρίτους — φίλοι και πλήρωμα συχνά χρειάζονται δική τους μνεία στο συμβόλαιο.',
            en: 'People on board are not automatically covered by third-party liability — friends and crew often need their own mention in the policy.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Το ναυτασφαλιστήριο δεν έχει τυποποιημένα πεδία στην ανάλυσή μας: διαβάζουμε τις καλύψεις και τις εξαιρέσεις όπως αναγράφονται στο έγγραφο που ανέβασες.',
            en: 'Marine policies have no structured fields in our analysis: we read the coverages and exclusions as stated in the document you uploaded.',
        },
        {
            el: 'Εντοπίζουμε τις αναφορές σε κάλυψη σκάφους, αστική ευθύνη, ναυαγιαίρεση, όρια πλόων και περιόδους παροπλισμού — με τη διατύπωση του συμβολαίου, χωρίς δικές μας συμπληρώσεις.',
            en: 'We surface references to hull cover, liability, salvage, navigation limits and lay-up periods — in the policy’s own wording, with nothing added by us.',
        },
        {
            el: 'Ημερομηνίες ισχύος και όρους ανανέωσης, καθώς και τυχόν προϋποθέσεις για κυβερνήτη ή πλήρωμα, εφόσον αναφέρονται.',
            en: 'Validity dates and renewal terms, plus any skipper or crew conditions, where mentioned.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Πριν από κάθε μεγάλο πλου, σύγκρινε τη διαδρομή που σχεδιάζεις με την περιοχή πλόων του συμβολαίου — ένα νησί παραπέρα μπορεί να είναι εκτός ορίων.',
            en: 'Before any long passage, compare your planned route with the policy’s navigation area — one island further out can be outside the limits.',
        },
        {
            el: 'Κράτα επικαιροποιημένη λίστα του εξοπλισμού με φωτογραφίες και αριθμούς σειράς· ηλεκτρονικά και βοηθητικά σκάφη χάνονται ή κλέβονται συχνότερα από το ίδιο το σκάφος.',
            en: 'Keep an up-to-date equipment list with photos and serial numbers; electronics and tenders are lost or stolen more often than the boat itself.',
        },
        {
            el: 'Δήλωσε ρητά αν το σκάφος εκναυλώνεται ή χρησιμοποιείται από τρίτους — η επαγγελματική χρήση κρίνεται με εντελώς άλλους όρους από την ιδιωτική.',
            en: 'Declare explicitly if the boat is chartered or used by others — commercial use is judged on entirely different terms from private use.',
        },
        {
            el: 'Ενημέρωσε τον ασφαλιστή για την περίοδο παροπλισμού και το σημείο φύλαξης, ώστε να ξέρεις τι ισχύει όσο το σκάφος δεν χρησιμοποιείται.',
            en: 'Tell your insurer about the lay-up period and where the boat is kept, so you know what applies while it is not in use.',
        },
    ],
    commonGaps: [
        {
            id: 'boat_navigation_limits_gap',
            title: { el: 'Πλους εκτός ορίων', en: 'Sailing outside the limits' },
            description: {
                el: 'Αν η περιοχή πλόων είναι στενότερη από τη χρήση που κάνεις, η κάλυψη ενδέχεται να μην ισχύει ακριβώς εκεί που την χρειάζεσαι.',
                en: 'If the navigation area is narrower than your actual use, cover may not apply precisely where you need it.',
            },
        },
        {
            id: 'boat_wreck_removal_gap',
            title: { el: 'Χωρίς κάλυψη ανέλκυσης', en: 'No wreck-removal cover' },
            description: {
                el: 'Η υποχρέωση απομάκρυνσης ναυαγίου βαρύνει τον ιδιοκτήτη. Αν δεν εντοπίζεται σχετική κάλυψη, το κόστος μένει εξ ολοκλήρου σε αυτόν.',
                en: 'The duty to remove a wreck falls on the owner. If no such cover appears, the cost stays entirely with them.',
            },
        },
        {
            id: 'boat_passengers_gap',
            title: { el: 'Επιβαίνοντες χωρίς μνεία', en: 'Passengers not mentioned' },
            description: {
                el: 'Αν το συμβόλαιο δεν αναφέρει επιβαίνοντες ή πλήρωμα, ένας τραυματισμός επί του σκάφους ίσως κριθεί εκτός κάλυψης.',
                en: 'If the policy does not mention passengers or crew, an injury on board may be judged outside cover.',
            },
        },
        {
            id: 'boat_layup_gap',
            title: { el: 'Ασαφείς όροι παροπλισμού', en: 'Unclear lay-up terms' },
            description: {
                el: 'Οι καλύψεις κατά τον παροπλισμό συχνά διαφέρουν από αυτές εν πλω — αξίζει να δεις τι ισχύει όσο το σκάφος είναι δεμένο ή σε στεριά.',
                en: 'Lay-up covers often differ from those under way — worth seeing what applies while the boat is moored or ashore.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'boat_check_navigation_limits',
            label: { el: 'Δες μέχρι πού ισχύει η κάλυψη', en: 'See how far the cover extends' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Ποια είναι τα όρια πλόων στο συμβόλαιό μου;', en: 'What are the navigation limits on my policy?' },
        },
        {
            id: 'boat_check_liability',
            label: { el: 'Έλεγξε την αστική ευθύνη προς τρίτους', en: 'Check the third-party liability cover' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιο είναι το όριο αστικής ευθύνης προς τρίτους;',
                en: 'What is the third-party liability limit?',
            },
        },
        {
            id: 'boat_check_salvage',
            label: { el: 'Δες τι ισχύει για ρυμούλκηση και ανέλκυση', en: 'See what applies for towing and salvage' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Καλύπτονται τα έξοδα ρυμούλκησης και ανέλκυσης;',
                en: 'Are towing and salvage costs covered?',
            },
        },
        {
            id: 'boat_check_crew',
            label: { el: 'Έλεγξε αν καλύπτονται πλήρωμα και επιβαίνοντες', en: 'Check whether crew and passengers are covered' },
            href: null,
            ctaType: 'askAi',
            question: { el: 'Καλύπτονται οι επιβαίνοντες και το πλήρωμα;', en: 'Are passengers and crew covered?' },
        },
        {
            id: 'boat_ask_agent_layup',
            label: { el: 'Ρώτησε τον σύμβουλό σου για την περίοδο παροπλισμού', en: 'Ask your advisor about the lay-up period' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Μέχρι πού μπορώ να ταξιδέψω με αυτή την κάλυψη;', en: 'How far can I sail under this cover?' },
        { el: 'Ποιο είναι το όριο αστικής ευθύνης;', en: 'What is the liability limit?' },
        { el: 'Καλύπτεται η ανέλκυση σε περίπτωση βύθισης;', en: 'Is salvage covered if the boat sinks?' },
        { el: 'Τι ισχύει όσο το σκάφος είναι παροπλισμένο;', en: 'What applies while the boat is laid up?' },
        { el: 'Καλύπτεται ο εξοπλισμός και το βοηθητικό σκάφος;', en: 'Are the equipment and the tender covered?' },
    ],
    claimsSteps: [
        {
            el: 'Πρώτα η ασφάλεια των επιβαινόντων και η ενημέρωση της λιμενικής αρχής — σε πολλά συμβάντα η αναφορά στο λιμεναρχείο είναι προϋπόθεση για τον φάκελο.',
            en: 'First the safety of everyone on board and notifying the port authority — in many incidents the harbour report is a prerequisite for the file.',
        },
        {
            el: 'Κατάγραψε στίγμα, ώρα, καιρικές συνθήκες και κατάσταση θάλασσας· στα ναυτικά συμβάντα αυτά τα στοιχεία κρίνουν την αιτία.',
            en: 'Record position, time, weather and sea state; in marine incidents these details determine the cause.',
        },
        {
            el: 'Φωτογράφισε ζημιές και εξοπλισμό πριν από κάθε ρυμούλκηση ή ανέλκυση — μετά την επέμβαση η αρχική εικόνα χάνεται.',
            en: 'Photograph damage and equipment before any towing or lifting — once the operation starts the original picture is gone.',
        },
        {
            el: 'Μην συμφωνήσεις κόστος ναυαγιαίρεσης πριν ενημερώσεις τον ασφαλιστή, εφόσον οι συνθήκες το επιτρέπουν.',
            en: 'Do not agree salvage costs before notifying your insurer, where conditions allow.',
        },
    ],
    renewalNote: {
        el: 'Πριν την ανανέωση αξίζει έλεγχος στην περιοχή πλόων και στην αξία του σκάφους — και τα δύο αλλάζουν πιο εύκολα από όσο θυμόμαστε.',
        en: 'Before renewal, the navigation area and the boat’s value are worth a check — both change more easily than we remember.',
    },
    emptyState: {
        headline: { el: 'Δεν έχεις προσθέσει ασφαλιστήριο σκάφους', en: 'No boat policy added yet' },
        description: {
            el: 'Ανέβασε το ναυτασφαλιστήριο και δες πού ισχύει, τι καλύπτει εν πλω και τι στον παροπλισμό.',
            en: 'Upload the marine policy and see where it applies, what it covers under way and what it covers in lay-up.',
        },
        ctaLabel: { el: 'Ανέβασε συμβόλαιο', en: 'Upload policy' },
    },
}
