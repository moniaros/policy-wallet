import type { ProductCategoryId } from "@/lib/product/catalog"
import type { Bilingual } from "@/lib/marketing/positioning"
import { FREE_PLAN_LIMIT } from "@/lib/marketing/limit-statement"

/**
 * Per-branch FAQ blocks for the 15 product pages (AEO).
 *
 * Rules, same as every marketing content module:
 *  - Greek first; English carries the IDENTICAL meaning.
 *  - Direct answer in the FIRST sentence (featured-snippet shape), one to
 *    three short sentences total, no jargon a stressed reader can't parse.
 *  - Only defensible facts. Market facts here are the ones the guides and
 *    glossary already cite (ΕΝΦΙΑ trio up to 20%, Schengen €30,000 minimum,
 *    compulsory motor/boat liability, the pro-rata average rule). Product
 *    claims stay inside the baseline: we read the policy you upload and show
 *    what it says; gap detection is a paid-plan feature; nothing is "advice".
 *  - Rendered AND emitted as FAQPage JSON-LD by the SAME component
 *    (components/landing/LobFaq.tsx), so structured data can never claim a
 *    question the page does not visibly answer.
 */
export type LobFaqItem = { q: Bilingual; a: Bilingual }

export const LOB_FAQS: Record<ProductCategoryId, LobFaqItem[]> = {
    motor: [
        {
            q: { el: "Είναι υποχρεωτική η ασφάλεια αυτοκινήτου στην Ελλάδα;", en: "Is car insurance compulsory in Greece?" },
            a: {
                el: "Η αστική ευθύνη καλύπτει ζημιές που προκαλεί το όχημα σε άλλους. Από 1 Ιουνίου 2025 προβλέπεται επίσης ασφάλιση του ίδιου του οχήματος για δασική πυρκαγιά και πλημμύρα, με τις νόμιμες εξαιρέσεις. Άλλες καλύψεις εξαρτώνται από το πακέτο σας.",
                en: "Third-party liability covers damage the vehicle causes to others. Since 1 June 2025, insurance of the vehicle itself against forest fire and flood is also required, subject to statutory exceptions. Other cover depends on your package.",
            },
        },
        {
            q: { el: "Τι να ελέγξω στο ασφαλιστήριο του αυτοκινήτου μου;", en: "What should I check in my car policy?" },
            a: {
                el: "Τρία πράγματα: την αποζημίωση που προβλέπει σε ολική ζημιά, αν περιλαμβάνεται οδική βοήθεια, και την απαλλαγή — το ποσό που πληρώνετε εσείς σε κάθε ζημιά.",
                en: "Three things: the payout it provides on a total loss, whether roadside assistance is included, and the deductible — the amount you pay yourself on every claim.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με την ασφάλεια αυτοκινήτου;", en: "How does PolicyWallet help with car insurance?" },
            a: {
                el: `Στέλνετε το ασφαλιστήριο και το διαβάζουμε για εσάς: τι καλύπτει, τι όχι, πότε λήγει. ${FREE_PLAN_LIMIT.el}, χωρίς κάρτα. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.`,
                en: `You send us the policy and we read it for you: what it covers, what it does not, and when it runs out. ${FREE_PLAN_LIMIT.en}, no card. We do not sell insurance and take no commission.`,
            },
        },
    ],
    property: [
        {
            q: { el: "Πώς παίρνω έκπτωση ΕΝΦΙΑ με ασφάλιση κατοικίας;", en: "How do I get the ENFIA discount with home insurance?" },
            a: {
                el: "Για τον ΕΝΦΙΑ 2026 χρειάζεται ασφάλιση το 2025 για σεισμό, πυρκαγιά και πλημμύρα, με το απαιτούμενο ποσό και διάρκεια τουλάχιστον τριών μηνών. Η μείωση είναι έως 20% ή 10%, ανάλογα με τη φορολογητέα αξία και τη διάρκεια. Απαιτείται αίτηση στην ΑΑΔΕ.",
                en: "For ENFIA 2026, insurance in 2025 must cover earthquake, fire and flood, meet the required amount and last at least three months. The reduction is up to 20% or 10%, depending on taxable value and duration. An AADE application is required.",
            },
        },
        {
            q: { el: "Τι σημαίνει υπασφάλιση κατοικίας;", en: "What does home underinsurance mean?" },
            a: {
                el: "Υπασφάλιση σημαίνει ότι το ποσό ασφάλισης είναι μικρότερο από την αξία που πρέπει να ασφαλιστεί. Αν εφαρμόζεται αναλογικός κανόνας, μπορεί να μειωθεί και η αποζημίωση για μερική ζημιά. Ελέγξτε τυχόν εξαίρεση από τον κανόνα στους όρους σας.",
                en: "Underinsurance means the insured amount is below the value that needs to be insured. If the average clause applies, even a partial claim may be reduced. Check your terms for any waiver of that clause.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με την ασφάλεια κατοικίας;", en: "How does PolicyWallet help with home insurance?" },
            a: {
                el: "Διαβάζουμε το ασφαλιστήριο και σας δείχνουμε ποιους κινδύνους αναφέρει και με ποιο κεφάλαιο, ώστε να δείτε αν λείπει κάτι από την τριάδα της έκπτωσης ΕΝΦΙΑ. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.",
                en: "We read the policy and show you which perils it names and at what sum, so you can see whether anything is missing from the ENFIA-discount trio. We do not sell insurance and take no commission.",
            },
        },
    ],
    health: [
        {
            q: { el: "Τι είναι η απαλλαγή στην ασφάλεια υγείας;", en: "What is the deductible in health insurance?" },
            a: {
                el: "Το ποσό των εξόδων που πληρώνετε εσείς πριν αρχίσει να πληρώνει η ασφαλιστική. Όσο μεγαλύτερη η απαλλαγή, τόσο χαμηλότερο συνήθως το ασφάλιστρο.",
                en: "The amount of costs you pay yourself before the insurer starts paying. The higher the deductible, the lower the premium usually is.",
            },
        },
        {
            q: { el: "Πώς ξέρω αν το νοσοκομείο χρεώνει απευθείας την ασφαλιστική;", en: "How do I know whether the hospital bills the insurer directly?" },
            a: {
                el: "Η απευθείας πληρωμή σημαίνει ότι, υπό προϋποθέσεις, η ασφαλιστική πληρώνει το νοσοκομείο. Δεν σημαίνει ότι δεν έχετε δικά σας έξοδα. Ελέγξτε το δίκτυο νοσοκομείων, την έγκριση και τη συμμετοχή σας πριν από προγραμματισμένη νοσηλεία.",
                en: "Direct billing means the insurer pays the hospital, subject to conditions. It does not mean you have no expenses. Check the hospital network, approval requirements and your share before planned treatment.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με την ασφάλεια υγείας;", en: "How does PolicyWallet help with health insurance?" },
            a: {
                el: "Μετατρέπουμε τα ψιλά γράμματα σε καθαρή εικόνα: τι καλύπτεται, μέχρι ποιο όριο και με πόση δική σας συμμετοχή — πριν χρειαστεί να μπείτε σε νοσοκομείο. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.",
                en: "We turn the fine print into a clear picture: what is covered, up to what limit, and how much you pay yourself — before you need a hospital. We do not sell insurance and take no commission.",
            },
        },
    ],
    cyber: [
        {
            q: { el: "Τι καλύπτει η κυβερνοασφάλεια;", en: "What does cyber insurance cover?" },
            a: {
                el: "Μπορεί να καλύπτει ζημιές από ψηφιακές επιθέσεις: κλείδωμα αρχείων με απαίτηση λύτρων, κλοπή δεδομένων ή διακοπή της δουλειάς. Μπορεί επίσης να καλύπτει αποζημιώσεις που ζητούν άλλοι για διαρροή των στοιχείων τους. Ισχύουν τα όρια και οι εξαιρέσεις του προγράμματος.",
                en: "Usually losses from attacks such as ransomware, data breaches, the interruption of your operations, and third-party claims if their data leaks — up to each policy's limits and subject to its exclusions.",
            },
        },
        {
            q: { el: "Τι είναι η κάλυψη απώλειας κερδών σε κυβερνοεπίθεση;", en: "What is loss-of-profits cover in a cyber attack?" },
            a: {
                el: "Αποζημίωση για τα έσοδα που χάνετε όσο η επιχείρηση δεν λειτουργεί. Προσέξτε τον χρόνο αναμονής: οι πρώτες ώρες συχνά δεν αποζημιώνονται.",
                en: "Compensation for the income you lose while the business is not operating. Watch the waiting period: the first hours are often not compensated.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με την κυβερνοασφάλεια;", en: "How does PolicyWallet help with cyber insurance?" },
            a: {
                el: "Κρατάμε τα όρια, τις εξαιρέσεις και τα στοιχεία της ομάδας άμεσης επέμβασης πάντα διαθέσιμα — ώστε την ώρα της επίθεσης να ξέρετε ήδη τι ισχύει. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.",
                en: "We keep the limits, the exclusions and the response team's details always at hand — so when an attack hits, you already know what applies. We do not sell insurance and take no commission.",
            },
        },
    ],
    liability: [
        {
            q: { el: "Τι καλύπτει η ασφάλεια αστικής ευθύνης;", en: "What does personal liability insurance cover?" },
            a: {
                el: "Ζημιές που προκαλείτε εσείς, το παιδί ή το κατοικίδιό σας σε τρίτους — από μια πλημμύρα στο διπλανό διαμέρισμα μέχρι ένα σπασμένο τζάμι.",
                en: "Damage that you, your child or your pet cause to others — from a flood in the flat next door to a broken pane of glass.",
            },
        },
        {
            q: { el: "Χρειάζομαι ξεχωριστό ασφαλιστήριο αστικής ευθύνης;", en: "Do I need a separate liability policy?" },
            a: {
                el: "Όχι πάντα. Πολλά ασφαλιστήρια κατοικίας την περιλαμβάνουν ήδη ως ενσωματωμένη κάλυψη — ελέγξτε πριν την αγοράσετε δεύτερη φορά.",
                en: "Not always. Many home policies already include it as a bundled cover — check before you buy it a second time.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με την αστική ευθύνη;", en: "How does PolicyWallet help with liability cover?" },
            a: {
                el: "Διαβάζουμε τις καλύψεις του εγγράφου και συγκεντρώνουμε τα σημεία που χρειάζονται έλεγχο. Παρόμοιες καλύψεις δεν σημαίνουν αυτόματα περιττό κόστος.",
                en: "We read the document's cover and bring together points to check. Similar cover does not automatically mean unnecessary cost.",
            },
        },
    ],
    "legal-expenses": [
        {
            q: { el: "Τι καλύπτει η νομική προστασία;", en: "What does legal expenses insurance cover?" },
            a: {
                el: "Δικηγορικά έξοδα και δικαστικά κόστη για διαφορές όπως τροχαία, εργασιακά και καταναλωτικά ζητήματα — σύμφωνα με τους όρους του κάθε ασφαλιστηρίου.",
                en: "Lawyer fees and court costs for disputes such as traffic, employment and consumer matters — according to each policy's terms.",
            },
        },
        {
            q: { el: "Καλύπτει η νομική προστασία μια διαφορά που έχει ήδη ξεκινήσει;", en: "Does legal expenses cover a dispute that has already started?" },
            a: {
                el: "Συνήθως όχι. Η κάλυψη αφορά μελλοντικές διαφορές· ό,τι ξεκίνησε πριν την έναρξη ή μέσα στην περίοδο αναμονής μένει κατά κανόνα απέξω.",
                en: "Usually not. The cover is for future disputes; anything that began before the start date or during the waiting period is normally excluded.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με τη νομική προστασία;", en: "How does PolicyWallet help with legal expenses cover?" },
            a: {
                el: "Σας δείχνουμε καθαρά ποιες υποθέσεις καλύπτει το ασφαλιστήριό σας και ποιες εξαιρεί, ώστε να το ξέρετε πριν χρειαστείτε δικηγόρο. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.",
                en: "We show you clearly which cases your policy covers and which it excludes, so you know before you need a lawyer. We do not sell insurance and take no commission.",
            },
        },
    ],
    "group-health": [
        {
            q: { el: "Τι είναι το ομαδικό ασφαλιστήριο υγείας;", en: "What is a group health policy?" },
            a: {
                el: "Κάλυψη υγείας που παρέχει ο εργοδότης σε όλους τους εργαζόμενους. Συχνά καλύπτει και μέλη της οικογένειας, με δικά της όρια και όρους.",
                en: "Health cover an employer provides to all employees. It often covers family members too, with its own limits and terms.",
            },
        },
        {
            q: { el: "Χρειάζομαι ατομική ασφάλιση αν έχω ομαδικό στη δουλειά;", en: "Do I need a personal policy if I have a group plan at work?" },
            a: {
                el: "Εξαρτάται από το τι καλύπτει το ομαδικό. Το ομαδικό σταματά όταν αλλάξετε δουλειά, και τα όριά του μπορεί να μην αρκούν — γι' αυτό αξίζει να δείτε τα δύο μαζί.",
                en: "It depends on what the group plan covers. The group plan stops when you change jobs, and its limits may not be enough — which is why it pays to look at the two together.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με το ομαδικό υγείας;", en: "How does PolicyWallet help with group health?" },
            a: {
                el: "Δείτε τι αναφέρουν η ομαδική και η ατομική σας ασφάλιση. Επιβεβαιώστε με τον ασφαλιστή σας πώς συνδυάζονται, πριν αλλάξετε κάποια κάλυψη.",
                en: "See what your group and individual insurance say. Confirm with your adviser how they work together before changing any cover.",
            },
        },
    ],
    "group-life": [
        {
            q: { el: "Τι είναι το ομαδικό ασφαλιστήριο ζωής;", en: "What is a group life policy?" },
            a: {
                el: "Ασφάλιση που παρέχει ο εργοδότης και προβλέπει ένα ποσό σε περίπτωση θανάτου ή αδυναμίας για εργασία, σύμφωνα με τους όρους της. Είναι διαφορετική από την ομαδική ασφάλιση υγείας ή σύνταξης.",
                en: "A life and disability benefit an employer provides for every employee. It completes the benefits package alongside group health and pension.",
            },
        },
        {
            q: { el: "Πόσο κεφάλαιο δίνει συνήθως ένα ομαδικό ζωής;", en: "How much does a group life plan usually pay?" },
            a: {
                el: "Διαφέρει ανά πρόγραμμα — συχνά ορίζεται ως πολλαπλάσιο του μισθού. Το ακριβές ποσό και οι όροι γράφονται στο ασφαλιστήριο του προγράμματος.",
                en: "It varies by plan — often defined as a multiple of salary. The exact amount and terms are written in the plan's policy document.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με το ομαδικό ζωής;", en: "How does PolicyWallet help with group life?" },
            a: {
                el: "Σας δείχνουμε ποιος καλύπτεται, με πόσα και υπό ποιους όρους — ώστε να ξέρετε τι έχετε ήδη πριν αγοράσετε κάτι ατομικά. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.",
                en: "We show you who is covered, for how much and under which terms — so you know what you already have before buying anything personally. We do not sell insurance and take no commission.",
            },
        },
    ],
    "group-pension": [
        {
            q: { el: "Τι είναι το ομαδικό συνταξιοδοτικό πρόγραμμα;", en: "What is a group pension plan?" },
            a: {
                el: "Πρόγραμμα αποταμίευσης για τη σύνταξη μέσω του εργοδότη: εσείς βάζετε εισφορές και συχνά η εταιρεία προσθέτει δικό της ποσοστό.",
                en: "A retirement savings plan through your employer: you make contributions, and the company often adds a share of its own.",
            },
        },
        {
            q: { el: "Τι γίνεται με το ομαδικό συνταξιοδοτικό αν φύγω από τη δουλειά;", en: "What happens to my group pension if I leave the job?" },
            a: {
                el: "Εξαρτάται από τους όρους του προγράμματος: συνήθως ορίζουν από ποια ηλικία ή μετά από πόσα χρόνια το συσσωρευμένο ποσό γίνεται δικό σας. Δείτε τι γράφει το δικό σας πριν αποφασίσετε.",
                en: "It depends on the plan's terms: they usually define from what age, or after how many years, the accumulated amount becomes yours. See what yours says before you decide.",
            },
        },
        {
            q: { el: "Εκπίπτουν από τον φόρο οι εισφορές στο ομαδικό συνταξιοδοτικό;", en: "Are group pension contributions tax-deductible?" },
            a: {
                el: "Η φορολογική μεταχείριση εξαρτάται από το πρόγραμμα, τις εισφορές και την περίπτωσή σας. Το PolicyWallet οργανώνει όσα γράφει το έγγραφο· δεν υπολογίζει τη φορολογική σας δήλωση. Επιβεβαιώστε τα με τον λογιστή σας.",
                en: "Tax treatment depends on the programme, contributions and your circumstances. PolicyWallet organises what the document says; it does not calculate your tax return. Confirm with your accountant.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με το ομαδικό συνταξιοδοτικό;", en: "How does PolicyWallet help with a group pension?" },
            a: {
                el: "Διαβάζουμε τα έγγραφα του προγράμματος και σας δείχνουμε εισφορές, εργοδοτική συμμετοχή και τι ισχύει όταν αποχωρήσετε — σε απλά λόγια. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.",
                en: "We read the plan documents and show you contributions, employer match and what applies when you leave — in plain words. We do not sell insurance and take no commission.",
            },
        },
    ],
    life: [
        {
            q: { el: "Πόσο κεφάλαιο χρειάζεται μια ασφάλεια ζωής;", en: "How much should a life policy pay out?" },
            a: {
                el: "Αρκετό ώστε να καλύψει όσα θα άφηνε πίσω η απώλεια του εισοδήματός σας: υπόλοιπο δανείου, έξοδα οικογένειας, σπουδές. Το σωστό ποσό είναι προσωπικό — γι' αυτό αξίζει να το βάλετε δίπλα στις πραγματικές σας υποχρεώσεις.",
                en: "Enough to cover what losing your income would leave behind: the remaining loan, family expenses, education. The right amount is personal — which is why it belongs next to your real obligations.",
            },
        },
        {
            q: { el: "Τι είναι οι συμπληρωματικές καλύψεις στην ασφάλεια ζωής;", en: "What are supplementary covers in a life policy?" },
            a: {
                el: "Παροχές που πληρώνουν όσο ζείτε — όπως μόνιμη αναπηρία ή σοβαρές ασθένειες. Ελέγξτε ποιες έχει το δικό σας ασφαλιστήριο και με ποια όρια.",
                en: "Benefits that pay while you are alive — such as permanent disability or serious illness. Check which ones your policy has and at what limits.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με την ασφάλεια ζωής;", en: "How does PolicyWallet help with life insurance?" },
            a: {
                el: "Ξεχωρίζουμε τα σκέλη του ασφαλιστηρίου — κεφάλαιο, συμπληρωματικές, δικαιούχοι — και σας τα εξηγούμε ένα προς ένα, με απλά λόγια. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.",
                en: "We separate the policy's components — payout, supplementary covers, beneficiaries — and explain each one to you in plain words. We do not sell insurance and take no commission.",
            },
        },
    ],
    travel: [
        {
            q: { el: "Πόση ιατρική κάλυψη χρειάζεται για βίζα Σένγκεν;", en: "How much medical cover does a Schengen visa need?" },
            a: {
                el: "Για την αίτηση βίζας Σένγκεν, η ελάχιστη ταξιδιωτική ιατρική κάλυψη είναι 30.000 € (κανονισμός (ΕΚ) 810/2009, άρθρο 15 παρ. 3).",
                en: "For a Schengen visa application, the minimum travel medical cover is €30,000 (Regulation (EC) 810/2009, Article 15(3)).",
            },
        },
        {
            q: { el: "Καλύπτει η ταξιδιωτική ασφάλεια την ακύρωση του ταξιδιού;", en: "Does travel insurance cover trip cancellation?" },
            a: {
                el: "Μόνο για τους λόγους που αναφέρει το ασφαλιστήριο — συνήθως ασθένεια ή ατύχημα — μέχρι ένα όριο και με δικαιολογητικά. Οι όροι διαφέρουν πολύ από πρόγραμμα σε πρόγραμμα.",
                en: "Only for the reasons the policy names — usually illness or accident — up to a limit and with proof. Terms vary widely from plan to plan.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με την ταξιδιωτική ασφάλεια;", en: "How does PolicyWallet help with travel insurance?" },
            a: {
                el: "Σας δείχνουμε τα όρια, τις εξαιρέσεις και την απαλλαγή πριν φύγετε — όχι στο ταμείο ενός νοσοκομείου στο εξωτερικό. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.",
                en: "We show you the limits, the exclusions and the deductible before you leave — not at the cashier's desk of a hospital abroad. We do not sell insurance and take no commission.",
            },
        },
    ],
    pension: [
        {
            q: { el: "Εφάπαξ ή σύνταξη: τι παίρνω στη λήξη του προγράμματος;", en: "Lump sum or pension: what do I get when the plan matures?" },
            a: {
                el: "Ό,τι προβλέπουν οι επιλογές ωρίμανσης του ασφαλιστηρίου σας: ένα ποσό μία φορά, μηνιαίο εισόδημα, ή συνδυασμό. Δείτε τις δικές σας επιλογές πριν πλησιάσει η ημερομηνία.",
                en: "Whatever your policy's maturity options provide: a one-off amount, a monthly income, or a mix. See your own options before the date approaches.",
            },
        },
        {
            q: { el: "Τι χάνω αν σταματήσω νωρίς ένα αποταμιευτικό πρόγραμμα;", en: "What do I lose if I stop a savings plan early?" },
            a: {
                el: "Συχνά ένα μέρος όσων έχετε βάλει: οι όροι εξαγοράς προβλέπουν ποινές, ειδικά στα πρώτα χρόνια. Το ακριβές κόστος γράφεται στο ασφαλιστήριό σας.",
                en: "Often part of what you have paid in: the surrender terms carry penalties, especially in the early years. The exact cost is written in your policy.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με το συνταξιοδοτικό μου;", en: "How does PolicyWallet help with my pension plan?" },
            a: {
                el: "Μεταφράζουμε τους όρους σε καθαρή εικόνα: τι πληρώνετε, τι χτίζετε και τι χάνετε αν σταματήσετε — πριν υπογράψετε ή πριν αποφασίσετε να φύγετε. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.",
                en: "We turn the terms into a clear picture: what you pay, what you build, and what you lose if you stop — before you sign or before you decide to leave. We do not sell insurance and take no commission.",
            },
        },
    ],
    boat: [
        // «Είναι υποχρεωτική η ασφάλεια σκάφους στην Ελλάδα;» is REMOVED with its
        // answer (PW-CONTENT-02 H-024): no official source was found for the
        // unqualified sentence. Reinstate with the specific article of ν. 4926/2022
        // (ΦΕΚ Α' 82/20.4.2022), worded to its actual scope.
        {
            q: { el: "Τι να ελέγξω στο ασφαλιστήριο του σκάφους μου;", en: "What should I check in my boat policy?" },
            a: {
                el: "Πού ισχύει η κάλυψη — στη μαρίνα, εν πλω, σε ποια ύδατα — και τι περιλαμβάνει για το σκάφος, τη μηχανή και την επιθαλάσσια αρωγή.",
                en: "Where the cover applies — in the marina, at sea, in which waters — and what it includes for the hull, the engine and sea assistance.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με την ασφάλεια σκάφους;", en: "How does PolicyWallet help with boat insurance?" },
            a: {
                el: "Διαβάζουμε το ασφαλιστήριο και σας δείχνουμε τι καλύπτεται και πού, πριν λύσετε κάβους — το ασφαλιστήριο, και το τι σημαίνει, πάντα μαζί σας. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.",
                en: "We read the policy and show you what is covered and where, before you cast off — your policy, and what it means, always with you. We do not sell insurance and take no commission.",
            },
        },
    ],
    "fine-art": [
        {
            q: { el: "Δεν αρκεί η ασφάλεια περιεχομένου για τα έργα τέχνης;", en: "Isn't home contents insurance enough for artworks?" },
            a: {
                el: "Συνήθως όχι. Τα ασφαλιστήρια περιεχομένου θέτουν χαμηλό όριο ανά αντικείμενο για τιμαλφή, οπότε ένας πίνακας ή ένα κόσμημα αξίας αποζημιώνεται πολύ κάτω από την αξία του. Η ασφάλιση έργων τέχνης δηλώνει κάθε αντικείμενο χωριστά, με τη δική του αξία.",
                en: "Usually not. Contents policies cap individual valuable items at a low per-item limit, so a painting or piece of jewellery is paid out well below its worth. Fine art insurance declares each item separately, at its own value.",
            },
        },
        {
            q: { el: "Τι σημαίνει «συμφωνημένη αξία»;", en: "What does \"agreed value\" mean?" },
            a: {
                el: "Ότι η αποζημίωση για κάθε έργο έχει οριστεί εκ των προτέρων στο ασφαλιστήριο, αντί να εκτιμηθεί η αγοραία αξία τη στιγμή της ζημιάς. Γι' αυτό η κατάσταση αντικειμένων και οι αξίες της πρέπει να μένουν ενημερωμένες.",
                en: "That the payout for each piece is fixed in the policy in advance, instead of being valued at market price at the time of loss. That is why the schedule of items and its values need to stay current.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με την ασφάλιση έργων τέχνης;", en: "How does PolicyWallet help with fine art insurance?" },
            a: {
                el: `Στέλνετε το ασφαλιστήριο και διαβάζουμε την κατάσταση αντικειμένων, τις αξίες, την απαλλαγή και τους όρους ασφαλείας — όπως τον συναγερμό που το ασφαλιστήριο απαιτεί — καθώς και αν προαιρετικές καλύψεις όπως ο σεισμός έχουν επιλεγεί. ${FREE_PLAN_LIMIT.el}, χωρίς κάρτα.`,
                en: `You send us the policy and we read the schedule of items, the values, the deductible and the security conditions — like the alarm the policy requires — plus whether optional covers such as earthquake were taken. ${FREE_PLAN_LIMIT.en}, no card.`,
            },
        },
    ],
    business: [
        {
            q: { el: "Τι καλύπτει ένα πολυασφαλιστήριο επιχείρησης;", en: "What does a business multi-risk policy cover?" },
            a: {
                el: "Συνήθως τη στέγη, τον εξοπλισμό, τα εμπορεύματα, τη διακοπή εργασιών και τις ευθύνες — αλλά όχι πάντα όλα μαζί. Κάθε σκέλος αγοράζεται και ελέγχεται ξεχωριστά.",
                en: "Usually the premises, equipment, stock, business interruption and liabilities — but not always all of them together. Each section is bought and checked separately.",
            },
        },
        {
            q: { el: "Τι είναι η κάλυψη διακοπής εργασιών;", en: "What is business interruption cover?" },
            a: {
                el: "Μπορεί να καλύπτει ορισμένες οικονομικές απώλειες όταν η επιχείρηση σταματήσει λόγω περιστατικού που προβλέπουν οι όροι. Ελέγξτε την αιτία, το διάστημα και τον τρόπο υπολογισμού της παροχής.",
                en: "It may cover certain financial losses when the business stops because of an event specified in the terms. Check the trigger, period and method of calculating the benefit.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με την ασφάλεια επιχείρησης;", en: "How does PolicyWallet help with business insurance?" },
            a: {
                el: "Χαρτογραφούμε το πολυασφαλιστήριό σας ανά σκέλος — με τα όρια και τις απαλλαγές του καθενός — ώστε να δείτε τι έχετε αγοράσει και τι λείπει. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.",
                en: "We map your multi-risk policy section by section — with each one's limits and deductibles — so you can see what you bought and what is missing. We do not sell insurance and take no commission.",
            },
        },
    ],
    pet: [
        {
            q: { el: "Καλύπτει η ασφάλεια κατοικιδίων τη λεϊσμανίαση;", en: "Does pet insurance cover leishmaniasis?" },
            a: {
                el: "Εξαρτάται από το πρόγραμμα — δεν την καλύπτουν όλα. Επειδή είναι από τις πιο σοβαρές μεσογειακές νόσους για τους σκύλους, αξίζει να το ελέγξετε ρητά πριν διαλέξετε.",
                en: "It depends on the plan — not all of them cover it. Since it is one of the most serious Mediterranean diseases for dogs, it is worth checking explicitly before you choose.",
            },
        },
        {
            q: { el: "Τι εξαιρεί συνήθως η ασφάλεια κατοικιδίων;", en: "What does pet insurance usually exclude?" },
            a: {
                el: "Προϋπάρχουσες παθήσεις και συχνά γενετικά νοσήματα συγκεκριμένων φυλών, όπως η δυσπλασία ισχίου. Οι εξαιρέσεις γράφονται στους όρους — με τα ονόματα των παθήσεων.",
                en: "Pre-existing conditions, and often genetic conditions of specific breeds, such as hip dysplasia. The exclusions are written in the terms — with the conditions' names.",
            },
        },
        {
            q: { el: "Πώς με βοηθά το PolicyWallet με την ασφάλεια κατοικιδίου;", en: "How does PolicyWallet help with pet insurance?" },
            a: {
                el: "Βγάζουμε τις εξαιρέσεις στο φως, με τα ονόματα των παθήσεων, και σας δείχνουμε τα ετήσια όρια — πριν σας δώσει ο κτηνίατρος τον λογαριασμό. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.",
                en: "We bring the exclusions to light, with the conditions' names, and show you the yearly limits — before the vet hands you the bill. We do not sell insurance and take no commission.",
            },
        },
    ],
} as const

export function getLobFaqs(categoryId: ProductCategoryId): LobFaqItem[] {
    return LOB_FAQS[categoryId] ?? []
}

/**
 * Related guides and glossary terms per branch (GEO): the guides and glossary
 * already link INTO the product pages; these links close the loop in the
 * other direction so the topic cluster reads as one graph. Only exact
 * topical matches — a branch with no true match gets no strip (an absent
 * link beats a forced one). Slugs are verified against lib/guides/content.ts
 * and lib/glossary/content.ts.
 */
export type LobRelatedLink = { href: string; label: Bilingual }

export const LOB_RELATED: Partial<Record<ProductCategoryId, LobRelatedLink[]>> = {
    motor: [
        { href: "/guides/ti-kalyptei-i-asfaleia-aytokinitou", label: { el: "Οδηγός: Τι καλύπτει η ασφάλεια αυτοκινήτου", en: "Guide: What car insurance covers" } },
        { href: "/guides/prostimo-anasfalistou-oximatos", label: { el: "Οδηγός: Πρόστιμο ανασφάλιστου οχήματος", en: "Guide: Uninsured vehicle fines" } },
        { href: "/lexiko/mikti-asfaleia", label: { el: "Όρος: Μικτή ασφάλεια", en: "Term: Comprehensive cover" } },
    ],
    property: [
        { href: "/guides/ekptosi-enfia-asfalisi-katoikias", label: { el: "Οδηγός: Έκπτωση ΕΝΦΙΑ με ασφάλιση κατοικίας", en: "Guide: The ENFIA discount with home insurance" } },
        { href: "/guides/poso-kostizei-i-asfalisi-seismou", label: { el: "Οδηγός: Πόσο κοστίζει η ασφάλιση σεισμού", en: "Guide: What earthquake insurance costs" } },
        { href: "/lexiko/ypasfalisi", label: { el: "Όρος: Υπασφάλιση", en: "Term: Underinsurance" } },
    ],
    health: [
        { href: "/guides/apallagi-asfaleia-ygeias-pos-leitourgei", label: { el: "Οδηγός: Πώς λειτουργεί η απαλλαγή στην υγεία", en: "Guide: How the health deductible works" } },
        { href: "/lexiko/chronos-anamonis", label: { el: "Όρος: Χρόνος αναμονής", en: "Term: Waiting period" } },
    ],
    life: [
        { href: "/lexiko/dikaiouchos", label: { el: "Όρος: Δικαιούχος", en: "Term: Beneficiary" } },
        { href: "/lexiko/asfalismeno-kefalaio", label: { el: "Όρος: Ασφαλισμένο κεφάλαιο", en: "Term: Sum insured" } },
    ],
    pet: [
        { href: "/guides/asfaleia-katoikidiou-ti-exaireitai", label: { el: "Οδηγός: Τι εξαιρεί η ασφάλεια κατοικιδίου", en: "Guide: What pet insurance excludes" } },
        { href: "/lexiko/exairesi", label: { el: "Όρος: Εξαίρεση", en: "Term: Exclusion" } },
    ],
    travel: [
        { href: "/lexiko/apallagi", label: { el: "Όρος: Απαλλαγή", en: "Term: Deductible" } },
    ],
    pension: [
        { href: "/lexiko/exagora", label: { el: "Όρος: Εξαγορά", en: "Term: Surrender" } },
    ],
    liability: [
        { href: "/guides/kena-kalypsis-ti-einai-pos-ta-vriskete", label: { el: "Οδηγός: Κενά κάλυψης και επικαλύψεις", en: "Guide: Coverage gaps and overlaps" } },
    ],
    "legal-expenses": [
        { href: "/lexiko/chronos-anamonis", label: { el: "Όρος: Χρόνος αναμονής", en: "Term: Waiting period" } },
    ],
    "group-health": [
        { href: "/guides/omadiko-symvolaio-ergasias", label: { el: "Οδηγός: Το ομαδικό συμβόλαιο εργασίας", en: "Guide: Your employer group policy" } },
        { href: "/lexiko/symmetochi", label: { el: "Όρος: Συμμετοχή", en: "Term: Co-payment" } },
    ],
    "group-life": [
        { href: "/guides/omadiko-symvolaio-ergasias", label: { el: "Οδηγός: Το ομαδικό συμβόλαιο εργασίας", en: "Guide: Your employer group policy" } },
    ],
    "group-pension": [
        { href: "/guides/omadiko-symvolaio-ergasias", label: { el: "Οδηγός: Το ομαδικό συμβόλαιο εργασίας", en: "Guide: Your employer group policy" } },
    ],
}

export function getLobRelated(categoryId: ProductCategoryId): LobRelatedLink[] {
    return LOB_RELATED[categoryId] ?? []
}
