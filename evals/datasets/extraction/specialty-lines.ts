import type { ExtractionEvalCase } from "./health-ethniki-1"

/**
 * Extraction eval cases for the specialty lines added in the insurance
 * intelligence expansion.
 *
 * ALL DOCUMENTS HERE ARE SYNTHETIC. The real schedules they are modelled on
 * carry a named child insured, roughly forty-five named hospital employees and
 * twenty-one named seafarers; none of that belongs in a repository fixture. The
 * policyholders below are «ΔΕΙΓΜΑ ΣΥΝΘΕΤΙΚΟ», following the pattern set by
 * health-ethniki-1, and the amounts are altered from the originals.
 *
 * Plain text rather than PDF for the same reason as the health case: Gemini
 * accepts inline `text/plain`, hand-rolled PDFs cannot carry Greek without font
 * embedding, and the mock provider ignores document bytes either way — so
 * `eval:ci` is unaffected while a paid run measures something real.
 *
 * WHAT EACH CASE IS FOR:
 *
 *  - marine-cargo: the classification that used to be impossible. "ΚΛΑΔΟΣ
 *    ΜΕΤΑΦΟΡΩΝ" resolved to `boat`, and the extractor was constrained to a
 *    vocabulary with no word for cargo at all.
 *  - marine-hull: a schedule where the sum insured and the premium sit in
 *    adjacent columns, which is the classic premium-vs-sum-insured confusion.
 *  - liability: three limit towers on one page, and a percentage deductible with
 *    a floor — the shapes a single `limit` string cannot hold.
 *  - personal-cyber: per-clause limits that each carry a per-claim AND an
 *    aggregate figure, plus a term written as two bare dates.
 */

const MARINE_CARGO_DOCUMENT = `ΑΣΦΑΛΙΣΤΗΡΙΟ ΚΛΑΔΟΥ ΜΕΤΑΦΟΡΩΝ — MARINE CARGO POLICY
(Συνθετικό δείγμα αξιολόγησης — δεν αποτελεί πραγματικό συμβόλαιο)

Ασφαλιστής: Η ΕΘΝΙΚΗ — ΑΝΩΝΥΜΟΣ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ ΓΕΝΙΚΩΝ ΑΣΦΑΛΕΙΩΝ
Αρ. Ασφαλιστηρίου: 9900011/4
Λήπτης της Ασφάλισης: ΔΕΙΓΜΑ ΣΥΝΘΕΤΙΚΟ Α.Ε.

ΠΕΡΙΟΔΟΣ ΑΣΦΑΛΙΣΗΣ
11.05.2026 - 10.08.2026 B.D.I.

ΤΑΞΙΔΙ
Από Μελίσσια Αττικής έως Σπάτα Αττικής.

ΤΡΟΠΟΣ ΜΕΤΑΦΟΡΑΣ
Οδικώς επί ΦΔΧ.

ΑΣΦΑΛΙΣΜΕΝΑ ΑΝΤΙΚΕΙΜΕΝΑ
Μεταχειρισμένα μηχανήματα.

ΒΑΣΗ ΑΠΟΤΙΜΗΣΗΣ
Τρέχουσα εμπορική αξία τη στιγμή της ζημίας.

ΑΣΦΑΛΙΣΜΕΝΗ ΑΞΙΑ
Ευρώ 31.500,00

ΑΣΦΑΛΙΣΜΕΝΟΙ ΚΙΝΔΥΝΟΙ
- INSTITUTE CARGO CLAUSES (C) 1.1.09
- INSTITUTE STRIKES CLAUSES (CARGO) 1.1.09
- SANCTION LIMITATION AND EXCLUSION CLAUSE

ΠΡΟΫΠΟΘΕΣΕΙΣ ΚΑΛΥΨΗΣ
- Η συσκευασία και στοιβασία πρέπει να είναι κατάλληλη επαγγελματική.
- Η πρόσδεση εντός του ΦΔΧ πρέπει να είναι ασφαλής (LASHING AND SECURING).

ΑΠΑΛΛΑΓΗ
Μηδενική.

ΑΣΦΑΛΙΣΤΡΑ
Ευρώ 55,00 (συμπ. Δ.Σ. 15% & Φ.Α. 15%).
`

const MARINE_HULL_DOCUMENT = `ΚΛΑΔΟΣ ΠΛΟΙΩΝ — MARINE HULL DEPT
ΑΣΦΑΛΙΣΤΗΡΙΟ ΚΛΑΔΟΥ ΠΛΟΙΩΝ (YACHTS)
(Συνθετικό δείγμα αξιολόγησης — δεν αποτελεί πραγματικό συμβόλαιο)

Ασφαλιστής: Η ΕΘΝΙΚΗ — ΑΝΩΝΥΜΟΣ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ ΓΕΝΙΚΩΝ ΑΣΦΑΛΕΙΩΝ
ΑΡΙΘΜΟΣ ΑΣΦΑΛΙΣΤΗΡΙΟΥ: 880042/3
ΑΣΦΑ/ΝΟΣ: ΔΕΙΓΜΑ ΣΥΝΘΕΤΙΚΟ
ΣΚΑΦΟΣ: «ΔΕΙΓΜΑ»
ΠΕΡΙΟΔΟΣ ΑΣΦΑΛΙΣΗΣ: 30.04.2026 - 29.04.2027

ΑΝΤΙΚΕΙΜΕΝΟ ΑΣΦΑΛΙΣΗΣ
 ΣΚΑΦΟΣ ΚΑΙ ΜΗΧΑΝΕΣ                                  EUR   540.000
 ΣΥΜΠΕΡΙΛΑΜΒΑΝΟΜΕΝΗΣ ΒΟΗΘ. ΛΕΜΒΟΥ                    EUR     1.800,00
 ΜΕ ΜΙΑ ΕΞΩΛΕΜΒΙΑ ΜΗΧΑΝΗ 40,00HP                     EUR       950

ΑΣΦΑΛΙΖΟΜΕΝΟ ΚΕΦΑΛΑΙΟ / INSURED HEREUNDER            EUR   540.000

ΑΣΦΑΛΙΣΜΕΝΟΙ ΚΙΝΔΥΝΟΙ
- INSTITUTE YACHT CLAUSES 1/11/85
- INSTITUTE YACHT CLAUSES MACHINERY DAMAGE EXTENSION CLAUSE (CL. 332) 1.11.85

ΑΠΑΛΛΑΓΕΣ
- Ευρώ 8.000,00 για κάθε ζημία (εκτός ολικής απώλειας).
- Ευρώ 15.000,00 για μηχανικές βλάβες.
- Ευρώ 400,00 για κάθε ζημία σε βοηθητικές λέμβους και εξοπλισμό.
Σε περίπτωση συμβάντος που αφορά περισσότερες από μία απαλλαγές, εφαρμόζεται
η μεγαλύτερη μεμονωμένη απαλλαγή.

ΠΡΟΫΠΟΘΕΣΕΙΣ ΚΑΛΥΨΗΣ
- Να διενεργείται η ετήσια συντήρηση σκάφους και μηχανής/ών.
- Ο χειριστής να είναι κάτοχος διπλώματος και να βρίσκεται πάντα στο σκάφος.

ΕΤΗΣΙΑ ΜΙΚΤΑ ΑΣΦΑΛΙΣΤΡΑ: Ευρώ 5.100,00 καταβλητέα εφάπαξ.
`

const LIABILITY_DOCUMENT = `ΑΣΦΑΛΙΣΤΗΡΙΟ ΑΣΤΙΚΗΣ ΕΥΘΥΝΗΣ ΕΝΑΝΤΙ ΤΡΙΤΩΝ
(Συνθετικό δείγμα αξιολόγησης — δεν αποτελεί πραγματικό συμβόλαιο)

Ασφαλιστής: Η ΕΘΝΙΚΗ — ΑΝΩΝΥΜΗ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ ΓΕΝΙΚΩΝ ΑΣΦΑΛΕΙΩΝ
ΑΡΙΘ. ΑΣΦΑΛΙΣΤΗΡΙΟΥ: 770019/5
ΚΑΤΗΓΟΡΙΑ ΑΣΦΑΛΙΣΤΗΡΙΟΥ: ΓΕΝΙΚΗ ΑΣΤΙΚΗ ΕΥΘΥΝΗ
ΛΗΠΤΗΣ ΑΣΦΑΛΙΣΗΣ: ΔΕΙΓΜΑ ΣΥΝΘΕΤΙΚΟ
ΔΙΑΡΚΕΙΑ ΑΠΟ 00.00 ΩΡΑ ΤΗΣ 30.06.2026 ΕΩΣ 24.00 ΩΡΑ ΤΗΣ 29.06.2027

ΑΝΤΙΚΕΙΜΕΝΟ ΑΣΦΑΛΙΣΗΣ
Αστική ευθύνη από τη λειτουργία των κοινοχρήστων και κοινοκτήτων χώρων
πολυκατοικίας 8 διαμερισμάτων. Καλύπτεται και η ευθύνη από τη λειτουργία των
ανελκυστήρων, καθώς και η ευθύνη από διάρρηξη ή διαρροή σωληνώσεων.

Α) ΑΣΦΑΛΙΣΤΙΚΑ ΠΟΣΑ (ΟΡΙΑ ΕΥΘΥΝΗΣ ΤΟΥ ΑΣΦΑΛΙΣΤΗ)
Για το σύνολο των ατυχημάτων αθροιστικά κατά την ασφαλιστική περίοδο,
μέχρι του ποσού των ΕΥΡ 200.000,00

ΠΕΡΙΠΤΩΣΗ                      ΑΤΟΜΟΥ        ΟΜΑΔΑΣ ΑΤΟΜΩΝ
 ΘΑΝΑΤΟΣ/ΣΩΜ.ΒΛΑΒΕΣ            60.000        120.000
 ΥΛΙΚΕΣ ΖΗΜΙΕΣ ΤΡΙΤΩΝ                         60.000

Β) ΑΦΑΙΡΕΤΕΕΣ ΑΠΑΛΛΑΓΕΣ
ΑΦΑΙΡΕΤΕΑ ΑΠΑΛΛΑΓΗ 10% ΕΠΙ ΤΟΥ ΠΟΣΟΥ ΚΑΘΕ ΥΛΙΚΗΣ ΖΗΜΙΑΣ
ΕΛΑΧΙΣΤΟ ΟΡΙΟ ΕΥΡ 400,00

ΛΟΓΑΡΙΑΣΜΟΣ ΑΣΦΑΛΙΣΤΡΩΝ
ΚΑΘΑΡΑ ΑΣΦΑΛΙΣΤΡΑ    98,40
ΟΛΙΚΑ ΑΣΦΑΛΙΣΤΡΑ    130,00
`

const PERSONAL_CYBER_DOCUMENT = `ΑΣΦΑΛΙΣΗ ΔΙΑΔΙΚΤΥΑΚΩΝ ΚΑΙ ΗΛΕΚΤΡΟΝΙΚΩΝ ΚΙΝΔΥΝΩΝ
(Συνθετικό δείγμα αξιολόγησης — δεν αποτελεί πραγματικό συμβόλαιο)

ΠΙΝΑΚΑΣ ΑΣΦΑΛΙΣΗΣ
Σημείο 1.  Αριθμός Ασφαλιστηρίου:      66012345
Σημείο 2.  Ονοματεπώνυμο Ασφαλισμένου: ΔΕΙΓΜΑ ΣΥΝΘΕΤΙΚΟ
Σημείο 4.  Περίοδος Ασφάλισης:         01.01.2026
                                       31.12.2026
Σημείο 5.  Όριο Ευθύνης Ανά Απαίτηση:  4000€
Σημείο 6.  Συνολικό Όριο Ευθύνης:      8000€

Σημείο 7.  Όριο Ευθύνης ανά Ασφαλιστική Ρήτρα:      Ανά Απαίτηση   Συνολικά
           Α. Κλοπή ψηφιακής Ταυτότητας:                4000€        8000€
           Β. Έξοδα αποκατάστασης συστημάτων:            4000€        8000€
           Γ. Απάτη στον Κυβερνοχώρο:                    4000€        8000€
           Δ. Απάτη λόγω Διαδικτυακής Αγοράς:            4000€        8000€

Σημείο 8.  Απαλλαγή:                   60€ ανά απαίτηση
Σημείο 9.  Ετήσια Ολικά Ασφάλιστρα:    42,00€
Σημείο 12. Γεωγραφικά Όρια:            Παγκόσμια

Ασφαλιστής: ΑΝΩΝΥΜΟΣ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ ΓΕΝΙΚΩΝ ΑΣΦΑΛΕΙΩΝ «Η ΕΘΝΙΚΗ»
`

const asDocument = (text: string, fileName: string) => ({
    data: Buffer.from(text, "utf8").toString("base64"),
    mimeType: "text/plain",
    fileName,
})

export const EXTRACTION_MARINE_CARGO: ExtractionEvalCase = {
    id: "extraction/marine-cargo-synthetic",
    document: asDocument(MARINE_CARGO_DOCUMENT, "marine-cargo-synthetic.txt"),
    expected: {
        // The exact string the schedule prints. Pinned rather than shortened so
        // the case also proves the extractor is not paraphrasing — normalising
        // an insurer's many printed forms onto one entity is
        // lib/wallet/insurer-registry.ts's job, not the extractor's.
        insurerName: "Η ΕΘΝΙΚΗ — ΑΝΩΝΥΜΟΣ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ ΓΕΝΙΚΩΝ ΑΣΦΑΛΕΙΩΝ",
        policyNumber: "9900011/4",
        // The whole point of the case: not `boat`, and not `other`.
        lineOfBusiness: "marine_cargo",
        startDate: "2026-05-11",
        endDate: "2026-08-10",
        // Premium, not the 31.500 insured value sitting three lines above it.
        premiumAmount: 55,
        hasCoverageSummary: true,
    },
}

export const EXTRACTION_MARINE_HULL: ExtractionEvalCase = {
    id: "extraction/marine-hull-synthetic",
    document: asDocument(MARINE_HULL_DOCUMENT, "marine-hull-synthetic.txt"),
    expected: {
        insurerName: "Η ΕΘΝΙΚΗ — ΑΝΩΝΥΜΟΣ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ ΓΕΝΙΚΩΝ ΑΣΦΑΛΕΙΩΝ",
        policyNumber: "880042/3",
        lineOfBusiness: "boat_hull",
        startDate: "2026-04-30",
        endDate: "2027-04-29",
        // ΕΤΗΣΙΑ ΜΙΚΤΑ ΑΣΦΑΛΙΣΤΡΑ, not the 540.000 ΑΣΦΑΛΙΖΟΜΕΝΟ ΚΕΦΑΛΑΙΟ.
        premiumAmount: 5100,
        hasCoverageSummary: true,
    },
}

export const EXTRACTION_LIABILITY: ExtractionEvalCase = {
    id: "extraction/liability-synthetic",
    document: asDocument(LIABILITY_DOCUMENT, "liability-synthetic.txt"),
    expected: {
        // ΑΝΩΝΥΜΗ here, ΑΝΩΝΥΜΟΣ above — the real schedules differ line by line,
        // and the fixtures preserve that rather than tidying it away.
        insurerName: "Η ΕΘΝΙΚΗ — ΑΝΩΝΥΜΗ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ ΓΕΝΙΚΩΝ ΑΣΦΑΛΕΙΩΝ",
        policyNumber: "770019/5",
        lineOfBusiness: "liability",
        startDate: "2026-06-30",
        endDate: "2027-06-29",
        // ΟΛΙΚΑ, not ΚΑΘΑΡΑ — the prompt's rule is the total the customer pays.
        premiumAmount: 130,
        hasCoverageSummary: true,
    },
}

export const EXTRACTION_PERSONAL_CYBER: ExtractionEvalCase = {
    id: "extraction/personal-cyber-synthetic",
    document: asDocument(PERSONAL_CYBER_DOCUMENT, "personal-cyber-synthetic.txt"),
    expected: {
        insurerName: "ΑΝΩΝΥΜΟΣ ΕΛΛΗΝΙΚΗ ΕΤΑΙΡΙΑ ΓΕΝΙΚΩΝ ΑΣΦΑΛΕΙΩΝ «Η ΕΘΝΙΚΗ»",
        policyNumber: "66012345",
        lineOfBusiness: "cyber",
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        premiumAmount: 42,
        hasCoverageSummary: true,
    },
}

export const SPECIALTY_EXTRACTION_CASES: ExtractionEvalCase[] = [
    EXTRACTION_MARINE_CARGO,
    EXTRACTION_MARINE_HULL,
    EXTRACTION_LIABILITY,
    EXTRACTION_PERSONAL_CYBER,
]
