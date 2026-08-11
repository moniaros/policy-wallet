import type { BranchContent } from './types'

/**
 * Ships' crew — the shipowner's liability towards a lawfully signed-on crew for
 * occupational accident and illness, written as a benefit schedule per rank.
 *
 * Two structural features drive the copy: the cover is a TABLE of benefits with
 * an overall event cap rather than one sum insured, and the periods are short —
 * a voyage or a few weeks — so nothing about annual renewal applies.
 */
export const marineCrewContent: BranchContent = {
    branchId: 'marine_crew',
    tagline: {
        el: 'Το πλήρωμα δεν ασφαλίζεται με ένα ποσό αλλά με πίνακα παροχών — και με ένα ανώτατο όριο που τις δένει όλες.',
        en: 'A crew is not insured with one amount but with a table of benefits — and an overall cap that binds them all together.',
    },
    shortDescription: {
        el: 'Κάλυψη της ευθύνης του πλοιοκτήτη έναντι του ναυτολογημένου πληρώματος για εργατικό ατύχημα ή ασθένεια: παροχές θανάτου, ανικανότητας, νοσοκομειακών και εξωνοσοκομειακών εξόδων, παλιννόστησης και αντικατάστασης, με όριο ανά περιστατικό και σύνθεση πληρώματος ανά ειδικότητα.',
        en: 'Cover for the shipowner’s liability towards a signed-on crew for occupational accident or illness: death, disability, hospital and outpatient expenses, repatriation and replacement benefits, with a per-incident cap and a crew list by rank.',
    },
    whyItMatters: [
        {
            el: 'Οι παροχές έχουν χωριστά όρια ανά κατηγορία — θάνατος, διαρκής ανικανότητα, πρόσκαιρη ανικανότητα, νοσοκομειακά, παλιννόστηση, μεταφορά σορού. Το άθροισμα ανά άτομο συνήθως δεν επιτρέπεται να ξεπεράσει το κεφάλαιο θανάτου από ατύχημα.',
            en: 'Benefits carry separate limits per head — death, permanent disability, temporary disability, hospital costs, repatriation, transport of remains. The total per person is usually not allowed to exceed the accidental-death capital.',
        },
        {
            el: 'Το ανώτατο όριο για ομαδικό ατύχημα ισχύει ανά περιστατικό, ανεξάρτητα από το πόσα άτομα εμπλέκονται. Ένα συμβάν που αφορά πολλά μέλη του πληρώματος δοκιμάζει αυτό το όριο, όχι τα ατομικά.',
            en: 'The cap for a group accident applies per incident, whatever the number of people involved. An event affecting several crew members tests that cap rather than the individual ones.',
        },
        {
            el: 'Η κάλυψη προϋποθέτει νόμιμη ναυτολόγηση. Πρόσωπο που εργάζεται επί του πλοίου χωρίς να έχει ναυτολογηθεί ενδέχεται να μην εμπίπτει καθόλου στη σύμβαση.',
            en: 'Cover presupposes a lawful sign-on. Someone working aboard without being signed on may not fall within the contract at all.',
        },
        {
            el: 'Οι περίοδοι είναι σύντομες και δεμένες στο ταξίδι ή στη ναυτολόγηση — συχνά εβδομάδες αντί για έτος. Η λογική της ετήσιας ανανέωσης δεν εφαρμόζεται και τα κενά δημιουργούνται στις αλλαγές πληρώματος.',
            en: 'Periods are short and tied to the voyage or the sign-on — often weeks rather than a year. Annual renewal logic does not apply, and gaps appear at crew changes.',
        },
        {
            el: 'Το νόμισμα είναι συχνά δολάριο και όχι ευρώ. Όταν το κόστος περίθαλψης προκύπτει σε άλλο νόμισμα, η πραγματική αξία της παροχής μετακινείται με την ισοτιμία.',
            en: 'The currency is often the dollar rather than the euro. When treatment costs arise in another currency, the real value of the benefit moves with the exchange rate.',
        },
    ],
    whatWeAnalyze: [
        {
            el: 'Από το έγγραφο που ανέβασες: τον πίνακα ορίων ανά παροχή και ανά κατηγορία πληρώματος, με το νόμισμα στο οποίο εκφράζονται.',
            en: 'From the document you uploaded: the table of limits per benefit and per crew class, with the currency they are expressed in.',
        },
        {
            el: 'Το ανώτατο όριο ευθύνης ανά περιστατικό και τον κανόνα που συνδέει τις επιμέρους παροχές με το κεφάλαιο θανάτου.',
            en: 'The cap per incident and the rule tying the individual benefits back to the death capital.',
        },
        {
            el: 'Τα στοιχεία του πλοίου και τη σύνθεση πληρώματος ανά ειδικότητα, όπως καταχωρούνται — αριθμούς και ρόλους, όχι ονόματα.',
            en: 'The vessel details and the crew composition by rank, as recorded — numbers and roles, not names.',
        },
        {
            el: 'Την ακριβή περίοδο ασφάλισης με ώρα έναρξης και λήξης, που σε αυτόν τον κλάδο μετράει σε ημέρες.',
            en: 'The precise period of cover with start and end times, which in this line is measured in days.',
        },
    ],
    howToUseBetter: [
        {
            el: 'Συγχρόνισε την περίοδο του συμβολαίου με τις ημερομηνίες ναυτολόγησης. Τα κενά εμφανίζονται στις αλλαγές πληρώματος και στις παρατάσεις ταξιδιού.',
            en: 'Align the policy period with the sign-on dates. Gaps show up at crew changes and voyage extensions.',
        },
        {
            el: 'Ενημέρωσε τη σύνθεση πληρώματος όταν αλλάζει ο αριθμός ή οι ειδικότητες — ο πίνακας παροχών γράφτηκε πάνω σε συγκεκριμένη σύνθεση.',
            en: 'Update the crew composition when the number or the ranks change — the benefit table was written against a specific composition.',
        },
        {
            el: 'Κράτα τα ναυτολόγια και τα πιστοποιητικά ικανότητας προσβάσιμα από το πλοίο και από το γραφείο· σε περιστατικό ζητούνται ταυτόχρονα και από τις δύο πλευρές.',
            en: 'Keep the articles and competency certificates reachable from both ship and office; in an incident both sides are asked for them at once.',
        },
        {
            el: 'Δες πώς συνδυάζεται η κάλυψη με τυχόν αμοιβαία ασφάλιση προστασίας και αποζημίωσης, ώστε να είναι σαφές ποια απαίτηση πηγαίνει πού.',
            en: 'Check how this cover sits alongside any protection-and-indemnity entry, so it is clear which claim goes where.',
        },
    ],
    commonGaps: [
        {
            id: 'marine_crew_period_gap',
            title: { el: 'Κενό ανάμεσα σε δύο ναυτολογήσεις', en: 'Gap between two sign-on periods' },
            description: {
                el: 'Επειδή η κάλυψη μετράει σε ημέρες, μια παράταση ταξιδιού ή μια καθυστερημένη αλλαγή πληρώματος μπορεί να αφήσει ημέρες χωρίς ασφάλιση.',
                en: 'Because cover is counted in days, a voyage extension or a delayed crew change can leave days without insurance.',
            },
        },
        {
            id: 'marine_crew_composition_gap',
            title: { el: 'Σύνθεση πληρώματος που δεν αντιστοιχεί', en: 'Crew composition out of step' },
            description: {
                el: 'Αν επιβαίνουν περισσότερα άτομα ή διαφορετικές ειδικότητες από τις δηλωμένες, ο πίνακας παροχών περιγράφει άλλο πλήρωμα από αυτό που κινδυνεύει.',
                en: 'If more people or different ranks are aboard than were declared, the benefit table describes a different crew from the one at risk.',
            },
        },
        {
            id: 'marine_crew_medical_sublimit_gap',
            title: { el: 'Χαμηλά όρια νοσοκομειακών εξόδων', en: 'Low hospital-expense limits' },
            description: {
                el: 'Τα όρια νοσηλείας και εξωνοσοκομειακών εξόδων είναι συνήθως πολύ μικρότερα από το κεφάλαιο θανάτου, ενώ η περίθαλψη σε ξένο λιμάνι κοστίζει σε ξένο νόμισμα.',
                en: 'Hospital and outpatient limits are usually far below the death capital, while treatment in a foreign port is paid in a foreign currency.',
            },
        },
        {
            id: 'marine_crew_group_cap_gap',
            title: { el: 'Ομαδικό όριο κοντά στο ατομικό', en: 'Group cap close to the individual one' },
            description: {
                el: 'Όταν το όριο ανά περιστατικό δεν απέχει πολύ από το κεφάλαιο ενός ατόμου, ένα συμβάν με πολλούς παθόντες εξαντλείται γρήγορα.',
                en: 'When the per-incident cap is not far above one person’s capital, an event with several injured is exhausted quickly.',
            },
        },
    ],
    recommendedActions: [
        {
            id: 'marine_crew_check_benefits',
            label: { el: 'Δες τον πίνακα παροχών ανά κατηγορία', en: 'See the benefit table per class' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποια είναι τα όρια ανά παροχή για το πλήρωμα;',
                en: 'What are the limits per benefit for the crew?',
            },
        },
        {
            id: 'marine_crew_check_cap',
            label: { el: 'Έλεγξε το όριο ανά περιστατικό', en: 'Check the per-incident cap' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Ποιο είναι το ανώτατο όριο ευθύνης για ομαδικό ατύχημα;',
                en: 'What is the maximum liability for a group accident?',
            },
        },
        {
            id: 'marine_crew_check_period',
            label: { el: 'Δες την ακριβή περίοδο κάλυψης', en: 'See the exact period of cover' },
            href: null,
            ctaType: 'askAi',
            question: {
                el: 'Πότε ακριβώς αρχίζει και πότε λήγει η κάλυψη;',
                en: 'When exactly does the cover start and end?',
            },
        },
        {
            id: 'marine_crew_review_dates',
            label: { el: 'Συγχρόνισε με τις ημερομηνίες ναυτολόγησης', en: 'Align with the sign-on dates' },
            href: '/renewals',
            ctaType: 'renewals',
        },
        {
            id: 'marine_crew_ask_agent_pandi',
            label: { el: 'Ρώτησε τον σύμβουλό σου πώς δένει με το P&I', en: 'Ask your advisor how this sits with P&I' },
            href: '/agent',
            ctaType: 'askAgent',
        },
    ],
    suggestedQuestions: [
        { el: 'Ποιο είναι το κεφάλαιο θανάτου από ατύχημα;', en: 'What is the accidental-death capital?' },
        { el: 'Μέχρι ποιο ποσό καλύπτονται τα νοσοκομειακά έξοδα;', en: 'Up to what amount are hospital expenses covered?' },
        { el: 'Καλύπτεται η παλιννόστηση και η αντικατάσταση μέλους;', en: 'Are repatriation and replacement of a crew member covered?' },
        { el: 'Σε ποιο νόμισμα εκφράζονται οι παροχές;', en: 'In which currency are the benefits expressed?' },
        { el: 'Ισχύει η κάλυψη για μη ναυτολογημένο πρόσωπο;', en: 'Does the cover apply to someone not signed on?' },
    ],
    claimsSteps: [
        {
            el: 'Κατάγραψε το συμβάν στο ημερολόγιο του πλοίου με ώρα, θέση και συνθήκες, και ειδοποίησε τη διαχειρίστρια εταιρεία αμέσως.',
            en: 'Record the incident in the ship’s log with time, position and conditions, and notify the managing company at once.',
        },
        {
            el: 'Ζήτησε ιατρική γνωμάτευση στο πρώτο λιμάνι και κράτησε πρωτότυπα παραστατικά στο νόμισμα που εκδόθηκαν.',
            en: 'Obtain a medical report at the first port and keep original receipts in the currency they were issued in.',
        },
        {
            el: 'Συγκέντρωσε ναυτολόγιο, σύμβαση ναυτολόγησης και πιστοποιητικά ικανότητας — η ιδιότητα του παθόντος κρίνεται πρώτη.',
            en: 'Gather the articles, the employment agreement and competency certificates — the injured person’s status is settled first.',
        },
        {
            el: 'Αν εμπλέκονται περισσότερα μέλη του πληρώματος, δήλωσέ τα ως ένα περιστατικό· η κατανομή γίνεται μέσα στο όριο, όχι με χωριστές δηλώσεις.',
            en: 'If several crew members are involved, report them as one incident; the allocation happens inside the cap, not through separate notices.',
        },
    ],
    renewalNote: {
        el: 'Εδώ δεν υπάρχει ετήσια ανανέωση αλλά διαδοχικές σύντομες περίοδοι. Η υπενθύμιση χρειάζεται στην ημερομηνία λήξης του ταξιδιού, όχι στην επέτειο.',
        en: 'There is no annual renewal here but a run of short periods. The reminder belongs on the voyage end date, not on an anniversary.',
    },
    emptyState: {
        headline: { el: 'Δεν έχεις προσθέσει ασφάλιση πληρώματος', en: 'No crew policy added yet' },
        description: {
            el: 'Ανέβασε το ασφαλιστήριο και δες τον πίνακα παροχών, το όριο ανά περιστατικό και την ακριβή περίοδο κάλυψης.',
            en: 'Upload the policy and see the benefit table, the per-incident cap and the exact period of cover.',
        },
        ctaLabel: { el: 'Ανέβασε ασφαλιστήριο', en: 'Upload policy' },
    },
}
