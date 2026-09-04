/**
 * What insurance documents SAY, in Greek and English, folded into the
 * normalised form of normalize-text.ts.
 *
 * Scoring is by GROUPS, not by keywords. A real schedule names its insurer,
 * gives the contract a number, names the insured, lists cover, states a
 * premium and a period, and cites the law it is written under — seven or
 * eight distinct kinds of statement. A menu that happens to contain the word
 * «κάλυψη» hits one. A prompt-injection paragraph that repeats «ασφαλιστήριο»
 * a hundred times still hits one. That is the whole defence: one repeated
 * word can never look like a policy.
 *
 * Every term here is written in the normalised form (lowercase, no tonos,
 * final sigma folded) and is matched on word boundaries, so «axa» does not
 * match «taxation» and «cover» does not match «discovered».
 */

import insurerDataset from "@/prisma/greek-insurers.json"
import { INSURER_REGISTRY } from "@/lib/wallet/insurer-registry"
import { normalizeDocumentText } from "./normalize-text"
import type { BranchFamily } from "./types"

export const EVIDENCE_GROUPS = [
    "policy_noun",
    "policy_identifier",
    "insurer",
    "insured_party",
    "coverage",
    "premium",
    "period",
    "regulatory",
] as const
export type EvidenceGroup = (typeof EVIDENCE_GROUPS)[number]

export const NON_INSURANCE_TYPES = ["menu", "bank_statement", "cv", "legal", "invoice"] as const
export type NonInsuranceType = (typeof NON_INSURANCE_TYPES)[number]

export const ADJACENT_MARKERS = ["quotation", "claim", "renewal", "endorsement", "certificate", "terms_guide"] as const
export type AdjacentMarker = (typeof ADJACENT_MARKERS)[number]

const INSURER_NAME_TERMS: string[] = (() => {
    const out = new Set<string>()
    const records = (insurerDataset as { insurers?: Array<Record<string, unknown>> }).insurers ?? []
    for (const record of records) {
        for (const key of ["name_el", "name_en", "legal_name_el"]) {
            const value = record[key]
            if (typeof value !== "string") continue
            const term = normalizeDocumentText(value)
            if (term.length >= 4) out.add(term)
        }
    }
    for (const alias of Object.keys(INSURER_REGISTRY)) {
        if (alias.length >= 4) out.add(alias)
    }
    return [...out]
})()

export const EVIDENCE_LEXICON: Record<EvidenceGroup, string[]> = {
    policy_noun: [
        "ασφαλιστηριο", "ασφαλιστηριου", "ασφαλιστηριο συμβολαιο", "συμβολαιο ασφαλισησ", "ασφαλιστικη συμβαση",
        "ασφαλιστικο συμβολαιο", "πινακασ ασφαλιστηριου", "πινακασ καλυψεων", "πιστοποιητικο ασφαλισησ",
        "βεβαιωση ασφαλισησ", "ασφαλιστικο προγραμμα",
        "insurance policy", "policy schedule", "schedule of insurance", "certificate of insurance",
        "certificate of motor insurance", "policy wording", "insurance contract", "insurance schedule",
    ],
    policy_identifier: [
        "αριθμοσ συμβολαιου", "αρ. συμβολαιου", "αρ συμβολαιου", "αριθ. συμβολαιου", "αριθμοσ ασφαλιστηριου",
        "αρ. ασφαλιστηριου", "αριθμοσ συμβασησ", "αριθμοσ πιστοποιητικου", "κωδικοσ συμβολαιου",
        "policy number", "policy no", "policy no.", "policy #", "certificate number", "contract number",
        "policy ref", "policy reference",
    ],
    insurer: [
        "ασφαλιστικη εταιρεια", "ασφαλιστικη εταιρια", "ασφαλιστικη", "ασφαλιστησ", "α.ε.γ.α", "αεγα", "α.ε.α.ζ",
        "α.ε.ε.γ.α", "ανωνυμη ασφαλιστικη", "ασφαλιστικοσ διαμεσολαβητησ", "ασφαλιστικοσ πρακτορασ",
        "insurance company", "insurance co", "insurer", "underwriter", "underwriters", "lloyd's", "lloyds",
        "insurance intermediary", "broker",
        ...INSURER_NAME_TERMS,
    ],
    insured_party: [
        "ασφαλισμενοσ", "ασφαλισμενου", "ασφαλιζομενοσ", "ληπτησ τησ ασφαλισησ", "ληπτησ ασφαλισησ",
        "συμβαλλομενοσ", "συμβαλλομενου", "δικαιουχοσ", "κυριωσ ασφαλισμενοσ", "στοιχεια ασφαλισμενου",
        "στοιχεια ληπτη", "ασφαλισμενα προσωπα",
        "insured", "the insured", "named insured", "policyholder", "beneficiary", "proposer", "insured person",
        "insured party",
    ],
    coverage: [
        "καλυψεισ", "καλυψη", "καλυπτομενοι κινδυνοι", "ασφαλιζομενο κεφαλαιο", "ασφαλιζομενα κεφαλαια",
        "οριο ευθυνησ", "ορια ευθυνησ", "απαλλαγη", "εξαιρεσεισ", "ασφαλιστικο ποσο", "κεφαλαιο καλυψησ",
        "παροχεσ", "ανωτατο οριο",
        "sum insured", "sums insured", "deductible", "excess", "limit of liability", "limits of liability",
        "coverage", "cover", "covers", "exclusions", "insured amount", "benefits", "limit of indemnity",
    ],
    premium: [
        "ασφαλιστρα", "ασφαλιστρο", "καθαρα ασφαλιστρα", "ολικα ασφαλιστρα", "συνολικα ασφαλιστρα", "μικτα ασφαλιστρα",
        "φοροσ ασφαλιστρων", "δικαιωμα συμβολαιου", "ετησια ασφαλιστρα", "δοση ασφαλιστρων",
        "premium", "total premium", "net premium", "gross premium", "insurance premium tax", "annual premium",
        "premium due",
    ],
    period: [
        "διαρκεια ασφαλισησ", "περιοδοσ ασφαλισησ", "ασφαλιστικη περιοδοσ", "εναρξη ασφαλισησ", "ληξη ασφαλισησ",
        "ημερομηνια εναρξησ", "ημερομηνια ληξησ", "ισχυσ απο", "εναρξη", "ληξη", "διαρκεια",
        "period of insurance", "policy period", "period of cover", "effective date", "expiry date",
        "expiration date", "inception date", "renewal date", "valid from", "valid until", "commencement date",
    ],
    regulatory: [
        "ν. 4364/2016", "ν.4364/2016", "4364/2016", "ν.δ. 400/70", "400/1970", "solvency ii", "τραπεζα τησ ελλαδοσ",
        "επικουρικο κεφαλαιο", "ν. 4583/2018", "4583/2018", "ασφαλιστικη διαμεσολαβηση", "π.δ. 237/1986",
        "237/1986", "δικαιωμα εναντιωσησ", "υπαναχωρηση", "γενικοι οροι", "ειδικοι οροι", "ν. 2496/97",
        "2496/1997", "ασφαλιστικη νομοθεσια",
        "general conditions", "special conditions", "policy conditions", "eiopa", "insurance distribution directive",
        "financial conduct authority", "prudential regulation authority",
    ],
}

export const NON_INSURANCE_LEXICON: Record<NonInsuranceType, string[]> = {
    menu: [
        "μενου", "menu", "τιμοκαταλογοσ", "ορεκτικα", "σαλατεσ", "κυρια πιατα", "επιδορπια", "γλυκα", "ποτα", "κρασια",
        "αναψυκτικα", "μεριδα", "σερβιρεται", "τησ ημερασ", "σεφ",
        "appetizers", "starters", "main course", "mains", "desserts", "beverages", "drinks", "wine list", "cocktails",
        "vegan", "gluten free", "chef", "side dishes", "served with",
    ],
    bank_statement: [
        "κινηση λογαριασμου", "αντιγραφο κινησησ", "υπολοιπο", "πιστωση", "χρεωση", "iban", "αριθμοσ λογαριασμου",
        "συναλλαγεσ", "αναληψη", "καταθεση", "μεταφορα", "προμηθεια τραπεζασ",
        "statement of account", "account statement", "bank statement", "opening balance", "closing balance",
        "balance brought forward", "debit", "credit", "transaction", "transactions", "sort code", "swift", "bic",
        "account number", "withdrawal", "deposit", "direct debit", "standing order",
    ],
    cv: [
        "βιογραφικο", "βιογραφικο σημειωμα", "curriculum vitae", "resume", "εργασιακη εμπειρια", "επαγγελματικη εμπειρια",
        "work experience", "professional experience", "εκπαιδευση", "education", "δεξιοτητεσ", "skills", "linkedin",
        "references available", "ξενεσ γλωσσεσ", "languages", "προσωπικα στοιχεια", "σπουδεσ", "πτυχιο", "degree",
        "university", "πανεπιστημιο", "employment history", "career objective", "certifications",
    ],
    legal: [
        "ενωπιον", "δικαστηριο", "πρωτοδικειο", "ειρηνοδικειο", "αγωγη", "εναγων", "εναγομενοσ", "ιδιωτικο συμφωνητικο",
        "συμφωνητικο", "μισθωτηριο", "εκμισθωτησ", "μισθωτησ", "πληρεξουσιο", "συμβολαιογραφοσ", "αστικοσ κωδικασ",
        "court", "plaintiff", "defendant", "hereinafter", "whereas", "witnesseth", "lease agreement", "landlord",
        "tenant", "power of attorney", "notary", "jurisdiction", "the parties", "governing law", "hereby agree",
    ],
    invoice: [
        "τιμολογιο", "αποδειξη", "invoice", "receipt", "φπα", "vat", "δοy", "ποσοτητα", "τιμη μοναδασ", "συνολο",
        "πληρωτεο", "amount due", "subtotal", "quantity", "unit price", "bill to", "payment due", "invoice number",
        "αριθμοσ τιμολογιου", "παραστατικο",
    ],
}

export const ADJACENT_LEXICON: Record<AdjacentMarker, string[]> = {
    quotation: [
        "προσφορα", "προσφορα ασφαλισησ", "οικονομικη προσφορα", "ισχυσ προσφορασ", "η προσφορα ισχυει",
        "ενδεικτικα ασφαλιστρα", "quotation", "quote", "proposal", "premium indication", "indicative premium",
        "this quotation",
    ],
    claim: [
        "δηλωση ζημιασ", "δηλωση ατυχηματοσ", "αναγγελια ζημιασ", "φακελοσ ζημιασ", "αριθμοσ ζημιασ", "αποζημιωση",
        "φιλικοσ διακανονισμοσ", "claim form", "claim number", "notification of loss", "loss adjuster",
        "accident report", "claim reference", "statement of claim",
    ],
    renewal: [
        "ειδοποιηση ανανεωσησ", "ανανεωτηριο", "προσκληση ανανεωσησ", "renewal notice",
        "renewal invitation", "renewal reminder", "renewal offer",
    ],
    endorsement: [
        "προσθετη πραξη", "τροποποιηση συμβολαιου", "τροποποιητικη πραξη", "endorsement", "amendment", "addendum",
        "rider",
    ],
    certificate: [
        "πιστοποιητικο ασφαλισησ", "βεβαιωση ασφαλισησ", "certificate of insurance", "certificate of motor insurance",
        "green card", "πρασινη καρτα", "cover note", "σημα ασφαλισησ", "proof of insurance",
    ],
    terms_guide: [
        "γενικοι οροι", "ειδικοι οροι", "οροι ασφαλισησ", "general conditions", "general terms", "policy wording",
        "terms and conditions", "οδηγοσ", "guide", "checklist", "εγχειριδιο", "handbook", "συχνεσ ερωτησεισ", "faq",
        "τι ειναι", "what is", "πωσ να", "how to", "αρθρο 1", "article 1", "ορισμοι", "definitions",
    ],
}

export const BRANCH_LEXICON: Record<BranchFamily, string[]> = {
    motor: [
        "οχημα", "οχηματοσ", "αυτοκινητο", "αυτοκινητου", "αριθμοσ κυκλοφοριασ", "αρ. κυκλοφοριασ", "πινακιδα",
        "αστικη ευθυνη οχηματοσ", "ιδιεσ ζημιεσ", "μικτη", "θραυση κρυσταλλων", "κλοπη", "οδικη βοηθεια",
        "φροντιδα ατυχηματοσ", "οδηγοσ", "ζημιεσ απο ανασφαλιστο", "υλικεσ ζημιεσ", "σωματικεσ βλαβεσ",
        "εργοστασιο κατασκευησ", "μαρκα", "μοντελο", "κυβικα", "ιπποδυναμη", "χρηση οχηματοσ", "μοτοσυκλετα",
        "δικυκλο", "αριθμοσ πλαισιου",
        "motor", "vehicle", "registration number", "registration no", "chassis", "vin",
        "third party liability", "own damage", "comprehensive", "glass breakage", "roadside assistance", "driver",
        "uninsured driver", "motorcycle", "car insurance",
    ],
    home: [
        "κατοικια", "κατοικιασ", "οικοδομη", "κτιριο", "περιεχομενο", "οικοσκευη", "σεισμοσ", "σεισμου", "πυρκαγια",
        "πυροσ", "κλοπη περιεχομενου", "διαρρηξη", "πλημμυρα", "διαρροη σωληνωσεων", "θυελλα", "καταιγιδα", "χαλαζι",
        "αστικη ευθυνη κατοικιασ", "ετοσ κατασκευησ", "τετραγωνικα", "τ.μ.", "διευθυνση κινδυνου", "ενυποθηκο",
        "home", "household", "buildings", "contents", "dwelling", "earthquake", "fire", "flood", "storm", "burglary",
        "property", "sum insured buildings", "home insurance", "mortgage",
    ],
    health: [
        "νοσοκομειακη", "νοσοκομειακη περιθαλψη", "νοσηλεια", "νοσηλειασ", "εξωνοσοκομειακη", "νοσοκομειο",
        "θεση νοσηλειασ", "δωματιο", "χειρουργικο επιδομα", "χειρουργοσ", "ιατρικεσ εξετασεισ", "διαγνωστικεσ εξετασεισ",
        "υγειασ", "υγεια", "προγραμμα υγειασ", "ασφαλιση υγειασ", "απαλλαγη ανα νοσηλεια", "εοπυυ",
        "συμβεβλημενα νοσοκομεια", "επιδομα νοσηλειασ", "μητροτητα", "ιατροσ",
        "health", "hospital", "hospitalisation", "hospitalization", "inpatient", "outpatient", "medical", "surgery",
        "surgical", "room and board", "maternity", "dental", "optical", "health insurance", "medical expenses",
    ],
    life: [
        "ασφαλιση ζωησ", "ασφαλεια ζωησ", "ζωησ", "θανατοσ", "θανατου", "κεφαλαιο θανατου", "απωλεια ζωησ",
        "μονιμη ολικη ανικανοτητα", "ανικανοτητα", "επιβιωση", "δικαιουχοι", "συνταξη", "συνταξιοδοτικο",
        "αποταμιευτικο", "εγγυημενο επιτοκιο", "εξαγορα", "αξια εξαγορασ", "unit linked", "προσωπικο ατυχημα",
        "απωλεια εισοδηματοσ", "σοβαρεσ ασθενειεσ",
        "life insurance", "life assurance", "death benefit", "sum assured", "term life", "whole life", "beneficiaries",
        "pension", "retirement", "annuity", "surrender value", "disability", "critical illness", "personal accident",
        "income protection", "life cover",
    ],
    marine: [
        "σκαφοσ", "σκαφουσ", "πλοιο", "ναυτασφαλιση", "φορτιο", "μεταφορα εμπορευματων", "ναυλωση", "λιμανι",
        "λιμενασ", "πληρωμα", "μηχανη σκαφουσ", "ελλιμενισμοσ", "ταχυπλοο", "ιστιοπλοικο",
        "hull", "yacht", "vessel", "boat", "marine", "cargo", "p&i", "protection and indemnity", "crew", "outboard",
        "transport", "haulier", "cmr", "freight forwarder", "goods in transit", "voyage", "port",
    ],
    business: [
        "επιχειρηση", "επιχειρησησ", "επαγγελματικη αστικη ευθυνη", "αστικη ευθυνη εργοδοτη", "εργοδοτικη ευθυνη",
        "γενικη αστικη ευθυνη", "αστικη ευθυνη προσ τριτουσ", "επαγγελματικη ευθυνη", "cyber", "κυβερνοασφαλιση",
        "διακοπη εργασιων", "απωλεια κερδων", "εμπορευματα", "εξοπλισμοσ", "μηχανηματα", "χρηματα",
        "διοικητικα στελεχη", "νομικη προστασια", "εργαζομενοι",
        "business", "commercial", "public liability", "employers liability", "employer's liability",
        "professional indemnity", "professional liability", "errors and omissions", "business interruption",
        "loss of profits", "cyber liability", "data breach", "fidelity guarantee", "money in transit", "stock",
        "plant and machinery", "legal expenses", "d&o", "directors and officers", "employees",
    ],
    travel: [
        "ταξιδιωτικη", "ταξιδι", "ταξιδιου", "ταξιδιωτικη ασφαλιση", "ακυρωση ταξιδιου", "απωλεια αποσκευων",
        "αποσκευεσ", "καθυστερηση πτησησ", "επαναπατρισμοσ", "ιατρικα εξοδα στο εξωτερικο", "εξωτερικο",
        "travel", "trip", "trip cancellation", "baggage", "luggage", "flight delay", "repatriation",
        "medical expenses abroad", "schengen", "travel insurance", "abroad",
    ],
    pet: [
        "κατοικιδιο", "κατοικιδιου", "σκυλοσ", "γατα", "κτηνιατροσ", "κτηνιατρικα", "κτηνιατρικεσ δαπανεσ", "ρατσα",
        "microchip", "pet", "dog", "cat", "veterinary", "vet fees", "vet", "pet insurance", "breed", "puppy", "kitten",
    ],
}

/**
 * Text that talks TO a model rather than about insurance. No schedule, booklet
 * or receipt contains these; a document that does is addressing the pipeline,
 * and is refused deterministically so it never reaches a prompt.
 */
export const INJECTION_LEXICON: string[] = [
    "ignore previous instructions", "ignore all previous instructions", "ignore the above", "ignore prior instructions",
    "disregard previous", "disregard the above", "system prompt", "system note", "you are an ai", "as an ai",
    "as a language model", "classify this document as", "classify this as", "insuranceconfidence", "documenttype",
    "return json", "respond with", "assistant:", "new instructions", "override", "jailbreak",
    "αγνοησε τισ προηγουμενεσ οδηγιεσ", "αγνοησε τισ παραπανω οδηγιεσ", "αγνοησε τισ οδηγιεσ",
    "ταξινομησε αυτο το εγγραφο", "εισαι ενα μοντελο",
]

/** Two dates on the same document — the shape of a period even when no label survives extraction. */
export const DATE_PATTERN = /\b\d{1,2}[./-]\d{1,2}[./-](?:19|20)\d{2}\b/g

const TERM_REGEX_CACHE = new Map<string, RegExp>()

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * Word-boundary match that understands Greek. JS `\b` treats every Greek
 * letter as a non-word character, so it cannot be used here; instead a term
 * must not be preceded or followed by a letter or digit of any script.
 */
export function containsTerm(normalizedText: string, term: string): boolean {
    let regex = TERM_REGEX_CACHE.get(term)
    if (!regex) {
        regex = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(term)}(?![\\p{L}\\p{N}])`, "u")
        TERM_REGEX_CACHE.set(term, regex)
    }
    return regex.test(normalizedText)
}

/** How many DISTINCT terms of a list the text contains. */
export function countDistinctTerms(normalizedText: string, terms: readonly string[]): number {
    let count = 0
    for (const term of terms) if (containsTerm(normalizedText, term)) count++
    return count
}
