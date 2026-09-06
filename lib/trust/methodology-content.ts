import { CATALOGUE_FACTS, PUBLIC_COUNTS } from "@/lib/marketing/public-counts"
import { normalizeBranch } from "@/lib/insurance/taxonomy"
import type { Language } from "@/lib/i18n/types"

/**
 * /methodology — how a finding is decided (PW-CONTENT-01 Goal 7).
 *
 * THE RULE FOR THIS FILE, as for /trust: every sentence is backed by code that
 * is true today, and the citation sits in the comment above it. Every number
 * is read from the catalogue through lib/marketing/public-counts.ts — a literal
 * here fails the fabricated-count guard and the methodology guard.
 */
export interface MethodologySection {
    id: string
    title: { el: string; en: string }
    body: { el: string; en: string }[]
}

const fmt = (n: number, lang: Language) => n.toLocaleString(lang === "el" ? "el-GR" : "en-GB")

export function methodologySections(lang: Language): MethodologySection[] {
    const rules = fmt(PUBLIC_COUNTS.authoredRules.value, lang)
    const withChecks = fmt(PUBLIC_COUNTS.branchesWithChecks.value, lang)
    const writable = fmt(PUBLIC_COUNTS.writableBranches.value, lang)
    const without = fmt(PUBLIC_COUNTS.branchesWithoutChecks.value, lang)
    const classified = fmt(PUBLIC_COUNTS.classifiedRequirements.value, lang)
    const underReview = fmt(PUBLIC_COUNTS.underReviewRequirements.value, lang)
    const branchNames = CATALOGUE_FACTS.branchesWithChecks.map((id) => normalizeBranch(id).label[lang] || normalizeBranch(id).label.en).join(", ")
    return [
        {
            // decideGapsForPolicy (lib/gap-detection.ts) evaluates GapDefinition.detectionLogic against AcordData;
            // the AI contract has no isDetected and no severity field (CLAUDE.md, «Rules decide a coverage gap»).
            id: "who-decides",
            title: { el: "Ποιος αποφασίζει ότι υπάρχει κενό", en: "Who decides that a gap exists" },
            body: [
                {
                    el: "Ένα κενό κάλυψης το αποφασίζει ένας κανόνας, όχι ένα μοντέλο. Κάθε κανόνας είναι μια σταθερή συνθήκη πάνω σε πεδία που εξάγονται από το έγγραφο — «το έγγραφο δηλώνει ότι ο σεισμός δεν καλύπτεται», «δεν καταγράφεται δικαιούχος». Ο ίδιος κανόνας πάνω στα ίδια πεδία δίνει πάντα το ίδιο αποτέλεσμα.",
                    en: "A coverage gap is decided by a rule, not by a model. Each rule is a fixed condition on fields extracted from the document — “the document says earthquake is not covered”, “no beneficiary is recorded”. The same rule on the same fields always gives the same result.",
                },
                {
                    el: "Η τεχνητή νοημοσύνη κάνει δύο πράγματα: διαβάζει το έγγραφο και συμπληρώνει τα πεδία, και γράφει την εξήγηση ενός ευρήματος σε απλά ελληνικά. Δεν αποφασίζει αν υπάρχει κενό ούτε πόσο σοβαρό είναι — το σχήμα που της ζητάμε δεν έχει καν τέτοιο πεδίο.",
                    en: "The AI does two things: it reads the document and fills in the fields, and it writes a finding's explanation in plain language. It does not decide whether a gap exists or how serious it is — the schema we ask it for has no such field.",
                },
                {
                    el: "Η «σοβαρότητα» ενός κανόνα υπάρχει στη βάση επειδή το σχήμα την απαιτεί. Δεν εμφανίζεται πουθενά και δεν ταξινομεί τίποτα: τα ευρήματα ταξινομούνται μόνο κατά την προέλευση της απαίτησης και τη σειρά του καταλόγου.",
                    en: "A rule's “severity” exists in the database because the schema requires it. It renders nowhere and orders nothing: findings are ordered only by the provenance of the requirement and by the catalogue's declared order.",
                },
            ],
        },
        {
            // GapInstance carries rule_id, engine_version, rule_inputs, analysis_run_id, catalogue_version (lib/gaps/gap-instance-writer.ts);
            // Composition.stale (lib/gaps/composition.ts) is the dated stale-catalogue state.
            id: "reproducibility",
            title: { el: "Αναπαραγωγιμότητα", en: "Reproducibility" },
            body: [
                {
                    el: "Το ίδιο έγγραφο, με τον ίδιο κατάλογο κανόνων, δίνει τα ίδια ευρήματα. Κάθε εύρημα καταγράφει ποιος κανόνας το αποφάσισε, με ποια έκδοση του μηχανισμού, πάνω σε ποιες τιμές, και από ποια ανάλυση προήλθε — με ημερομηνία.",
                    en: "The same document, with the same rule catalogue, yields the same findings. Every finding records which rule decided it, with which engine version, on which values, and from which analysis it came — dated.",
                },
                {
                    el: "Όταν ο κατάλογος μεγαλώνει, μια παλαιότερη ανάλυση δεν αποκτά σιωπηλά ελέγχους που δεν έκανε: η σύνθεση υπολογίζεται πάντα με το σχέδιο ελέγχων της ίδιας της ανάλυσης, και μια πρόταση λέει ότι προστέθηκαν έλεγχοι από τότε. Η νέα ανάλυση είναι δική σας ενέργεια, ποτέ αυτόματη.",
                    en: "When the catalogue grows, an older analysis does not silently acquire checks it never ran: the composition is always computed against that analysis's own check plan, and one sentence says checks were added since. A new analysis is your action, never automatic.",
                },
            ],
        },
        {
            // PUBLIC_COUNTS.* — read from lib/gaps/authored-catalogue.ts and lib/insurance/taxonomy.ts at build.
            id: "coverage-today",
            title: { el: "Τι ελέγχουμε σήμερα", en: "What we check today" },
            body: [
                {
                    el: `Ο κατάλογος έχει ${rules} κανόνες σε ${withChecks} κλάδους (${branchNames}) από τους ${writable} κλάδους που δέχεται το προϊόν. Οι υπόλοιποι ${without} κλάδοι δεν έχουν ακόμη κανέναν έλεγχο: εκεί η εφαρμογή λέει «δεν το έχουμε αξιολογήσει» και δεν εμφανίζει σύνθεση, ούτε καθησυχαστικό μήνυμα.`,
                    en: `The catalogue holds ${rules} rules across ${withChecks} lines (${branchNames}) out of the ${writable} lines the product accepts. The remaining ${without} lines have no check yet: there the app says “we have not assessed this” and shows neither a composition nor a reassurance.`,
                },
                {
                    el: "Κάθε κανόνας διαβάζει πεδία που ο μηχανισμός εξαγωγής πράγματι συμπληρώνει για τον κλάδο του, δηλώνει τα δεδομένα εισόδου του εκ των προτέρων, και συνοδεύεται από δύο δοκιμαστικά έγγραφα: ένα που τον ενεργοποιεί και ένα που σωστά δεν τον ενεργοποιεί. Χωρίς αυτά, ο κανόνας δεν μπαίνει στον κατάλογο.",
                    en: "Every rule reads fields the extractor actually fills for its line, declares its inputs up front, and ships with two test documents: one that fires it and one where it correctly stays quiet. Without those, a rule does not enter the catalogue.",
                },
                {
                    el: "Οι έλεγχοι που ρωτούν «καταγράφεται αυτό;» ενεργοποιούνται από τη σιωπή του εγγράφου και λένε πάντα «δεν καταγράφεται», ποτέ «δεν καλύπτεται». Οι έλεγχοι κάλυψης ενεργοποιούνται μόνο όταν το έγγραφο δηλώνει ρητά ότι κάτι δεν καλύπτεται. Ό,τι δεν διαβάστηκε μένει «δεν μπόρεσε να ελεγχθεί».",
                    en: "Checks that ask “is this recorded?” fire on the document's silence and always say “not recorded”, never “not covered”. Coverage checks fire only when the document explicitly says something is not covered. Whatever was not read stays “could not be checked”.",
                },
            ],
        },
        {
            // lib/gaps/provenance.ts GAP_PROVENANCE; docs/transparency/PROVENANCE-REVIEW.md (pre-GA gated).
            id: "provenance",
            title: { el: "Πού στηρίζεται κάθε απαίτηση", en: "What each requirement rests on" },
            body: [
                {
                    el: `Κάθε κανόνας φέρει μια ταξινόμηση της απαίτησης πίσω του: νομοθετική (νόμος και άρθρο), συμβατική (κατηγορία σύμβασης), πρακτική αγοράς (δημόσια πηγή με όνομα) ή υπό αξιολόγηση. Σήμερα ${classified} απαιτήσεις είναι ταξινομημένες με παραπομπή και ${underReview} παραμένουν υπό αξιολόγηση.`,
                    en: `Every rule carries a classification of the requirement behind it: legislative (a law and article), contractual (a named class of contract), market practice (a named public source) or under review. Today ${classified} requirements are classified with a citation and ${underReview} remain under review.`,
                },
                {
                    el: "Μια ταξινομημένη απαίτηση εμφανίζει την παραπομπή της δίπλα στο εύρημα, παντού. Οι υπό αξιολόγηση απαιτήσεις εμφανίζονται σε ξεχωριστή ενότητα, δεν μετρούν σε καμία σύνοψη και δεν φτάνουν σε ειδοποίηση, email ή αναφορά. Η ταξινόμηση είναι πρόταση των συντακτών· την επικυρώνει ο νομικός και ο αναδοχικός έλεγχος πριν από τη γενική διάθεση.",
                    en: "A classified requirement shows its citation beside the finding, everywhere. Requirements under review render in their own section, count in no summary, and reach no notification, email or report. The classification is the authors' proposal; the legal and underwriting reviews sign it before general availability.",
                },
            ],
        },
        {
            // tests/unit/score-containment.test.ts, all-clear-honesty, three-states-distinct; IDD framing (docs/audits).
            id: "what-we-do-not-do",
            title: { el: "Τι δεν κάνουμε", en: "What we do not do" },
            body: [
                {
                    el: "Δεν δίνουμε βαθμολογία προστασίας, ούτε δείκτη από το εκατό, ούτε χρώμα σοβαρότητας. Ένας αριθμός από ένα σύνολο εμφανίζεται μόνο με τον παρονομαστή του και το τι μετρήθηκε.",
                    en: "We do not give a protection score, an index out of a hundred, or a severity colour. A number out of a total appears only with its denominator and what was counted.",
                },
                {
                    el: "Η απουσία ευρήματος δεν είναι καθησυχασμός. Τρεις καταστάσεις λένε ρητά τι δεν ελέγχθηκε: ανάλυση πριν από το σχέδιο ελέγχων, κλάδος χωρίς ελέγχους, και κατάλογος που άλλαξε μετά την ανάλυση.",
                    en: "The absence of a finding is not reassurance. Three states say explicitly what was not checked: an analysis that predates the check plan, a line with no checks, and a catalogue that changed after the analysis.",
                },
                {
                    el: "Δεν συγκρίνουμε προϊόντα, δεν προτείνουμε αλλαγή ασφαλιστικής και δεν δίνουμε συμβουλή. Τα ευρήματα είναι αφορμή για συζήτηση με τον σύμβουλό σας — ο οποίος βλέπει το ίδιο αντικείμενο που βλέπετε κι εσείς.",
                    en: "We do not compare products, suggest switching insurer or give advice. Findings are a prompt for a conversation with your adviser — who sees the same object you see.",
                },
            ],
        },
    ]
}
