/**
 * /changelog — dated entries from a real source (PW-CONTENT-01 Goal 7, Step 0 G15).
 *
 * The source is the merge history of the default branch: every entry names the
 * merged pull request and its merge date. An empty changelog with a start date
 * would be honest; a fabricated backlog would not — so this list starts where
 * the current product does (Direction A, 3 September 2026) and grows one merge
 * at a time. Greek is canonical; English is parity.
 */
export interface ChangelogEntry {
    /** ISO date of the merge into the default branch. */
    date: string
    /** Pull request number(s) merged. */
    prs: number[]
    title: { el: string; en: string }
    body: { el: string; en: string }
}

export const CHANGELOG_START_DATE = "2026-09-03"

export const CHANGELOG: ChangelogEntry[] = [
    {
        date: "2026-09-06",
        prs: [308],
        title: { el: "Μία γλώσσα ανά αίτημα, νέες παραπομπές, τέλος ο δείκτης σχέσης", en: "One language per request, new citations, an end to the relationship index" },
        body: {
            el: "Η γλώσσα κάθε σελίδας αποφασίζεται μία φορά, από την προτίμηση του λογαριασμού, και ισχύει για κείμενο, ημερομηνίες και ποσά μαζί. Οι έλεγχοι για τα στοιχεία ΕΝΦΙΑ, το τηλέφωνο δήλωσης ατυχήματος, τη θέση νοσηλείας και την απευθείας εξόφληση έχουν πλέον παραπομπή σε νόμο ή σε πρακτική της αγοράς. Ο «δείκτης σχέσης» του συμβούλου αφαιρέθηκε. Όταν έχουν προστεθεί έλεγχοι μετά από μια ανάλυση, η σύνθεση το λέει αντί να σιωπά. Προστέθηκαν οι σελίδες μεθοδολογίας, αλλαγών και κατάστασης.",
            en: "The language of every page is decided once, from the account's preference, and applies to text, dates and amounts alike. The checks for the ENFIA components, the accident-declaration phone, the hospital class and direct billing now cite a law or a market practice. The adviser's “relationship index” was removed. When checks were added after an analysis, the composition says so instead of staying silent. The methodology, changelog and status pages were added.",
        },
    },
    {
        date: "2026-09-06",
        prs: [307],
        title: { el: "Παραπομπές στα ευρήματα, τέλος στους δείκτες κινδύνου", en: "Citations on findings, an end to the risk dimension numbers" },
        body: {
            el: "Κάθε ταξινομημένη απαίτηση εμφανίζει τον νόμο και το άρθρο της δίπλα στο εύρημα. Οι αριθμοί των «διαστάσεων κινδύνου» και ο μέσος δείκτης προστασίας του συμβούλου αφαιρέθηκαν. Η σειρά των ευρημάτων είναι πλέον καθορισμένη: προέλευση απαίτησης, μετά η σειρά του καταλόγου. Οι Όροι Χρήσης λένε ακριβώς τι ισχύει στο δωρεάν πλάνο.",
            en: "Every classified requirement shows its law and article beside the finding. The “risk dimension” numbers and the adviser's averaged protection index were removed. Findings are ordered deterministically: requirement provenance, then catalogue order. The Terms state exactly what the free plan enforces.",
        },
    },
    {
        date: "2026-09-05",
        prs: [299, 300, 301, 303, 304],
        title: { el: "Διαφάνεια: τι ελέγχθηκε, από ποια ανάλυση, με ποια βάση", en: "Transparency: what was checked, by which analysis, on what basis" },
        body: {
            el: "Κάθε λίστα ευρημάτων λέει από ποια ανάλυση προέρχεται και πότε. Η «σύνθεση» δείχνει πόσα σημεία ελέγχθηκαν, πόσα καλύπτονται, πόσα όχι και πόσα δεν μπόρεσαν να ελεγχθούν. Η σοβαρότητα δεν ταξινομεί και δεν χρωματίζει τίποτα. Κάθε αριθμός στον πίνακα είναι πόρτα προς τη λίστα που τον εξηγεί.",
            en: "Every findings list says which analysis it came from and when. The “composition” shows how many points were checked, how many are covered, how many are not, and how many could not be checked. Severity orders and colours nothing. Every number on the dashboard is a door to the list that explains it.",
        },
    },
    {
        date: "2026-09-05",
        prs: [298],
        title: { el: "Πύλη ελέγχου εγγράφων", en: "Document validation gate" },
        body: {
            el: "Κανένα έγγραφο δεν μπαίνει σε ανάλυση αν δεν επαληθευτεί πρώτα ότι είναι ασφαλιστήριο: τοπικός έλεγχος του PDF, λεξικό ελληνικών και αγγλικών όρων, και μόνο για τις αμφίβολες περιπτώσεις ένα φθηνό μοντέλο ταξινόμησης.",
            en: "No document enters analysis before it is verified as an insurance policy: a local PDF read, a Greek and English lexicon, and a cheap classification model only for the doubtful middle.",
        },
    },
    {
        date: "2026-09-04",
        prs: [290, 292, 293],
        title: { el: "Το προσωπικό προφίλ κινδύνου και η εισαγωγή πελατών", en: "The personal risk profile and customer intake" },
        body: {
            el: "Η εγγραφή ρωτά λίγα, η αξιολόγηση εμβαθύνει, και κάθε γεγονός καταγράφει από πού προήλθε. Η εισαγωγή πελατών από συμβούλους πέρασε από έλεγχο συναίνεσης και ενημέρωσης. Μια μεταφόρτωση δεν δημιουργεί πλέον ασφαλιστήριο χωρίς έγγραφο.",
            en: "Onboarding asks little, the assessment goes deeper, and every fact records where it came from. Customer intake by advisers passed a consent and notice review. An upload no longer creates a policy without a document.",
        },
    },
    {
        date: "2026-09-03",
        prs: [288, 289],
        title: { el: "Νέα εμφάνιση της εφαρμογής", en: "The redesigned app" },
        body: {
            el: "Πίνακας, πορτοφόλι, σελίδα ασφαλιστηρίου, προστασία και ρυθμίσεις σχεδιασμένα από την αρχή για το κινητό, με ελληνικά ως προεπιλογή.",
            en: "Dashboard, wallet, policy page, protection and settings redesigned from scratch for the phone, Greek by default.",
        },
    },
]
