/**
 * What KIND of document was uploaded — asked before anything is believed about
 * its contents.
 *
 * The pipeline used to assume every upload was a policy schedule. Two of the
 * sixteen documents in the reference corpus are not: one is a health policy's
 * terms-and-conditions booklet with no schedule, no parties and no policy
 * number, the other is a set of blank statutory opposition forms. Fed to an
 * extractor whose whole job is to find an insurer, a period and a premium, both
 * invite exactly the fabrication the grounding rules exist to prevent — and the
 * confidence score does not save you, because a booklet genuinely does name an
 * insurer on every page.
 *
 * The fix is cheap: ask for the document kind as ONE MORE FIELD on the existing
 * extraction call, then refuse to treat a non-schedule as a policy. No second
 * round-trip, no extra model, no added latency.
 */

export const DOCUMENT_KINDS = [
    /** A schedule / certificate identifying parties, period and cover. The only kind that IS a policy. */
    'policy_schedule',
    /** Γενικοί / Ειδικοί Όροι — the wording booklet, often bound with a schedule but sometimes alone. */
    'terms_and_conditions',
    /** A renewal offer or reminder: names a policy, prices the next term, is not itself cover. */
    'renewal_notice',
    /** Blank or template forms — δήλωση εναντίωσης, υπαναχώρησης, proposal forms. */
    'forms',
    /** A green card, cover note or proof of insurance without the full schedule. */
    'certificate',
    /** A premium invoice or payment receipt. */
    'invoice',
    'other',
] as const

export type DocumentKind = (typeof DOCUMENT_KINDS)[number]

/** Only a schedule (or a certificate, which carries the essential facts) is a policy. */
const POLICY_BEARING_KINDS: ReadonlySet<DocumentKind> = new Set<DocumentKind>([
    'policy_schedule',
    'certificate',
])

export function isPolicyBearing(kind: DocumentKind | null | undefined): boolean {
    // Absent kind means an older extraction that predates the field. Those must
    // keep behaving exactly as before, so the answer is yes.
    if (!kind) return true
    return POLICY_BEARING_KINDS.has(kind)
}

/** The Layer-1 prompt instruction. Kept here beside the vocabulary it describes. */
export const DOCUMENT_KIND_PROMPT_SECTION = `DOCUMENT KIND — decide this FIRST:
Set documentKind to exactly one of: ${DOCUMENT_KINDS.join(', ')}.
- policy_schedule: identifies the insurer, the insured, a policy number, a period of cover and what is covered.
- terms_and_conditions: the Γενικοί/Ειδικοί Όροι wording alone, with no schedule naming a specific insured and period.
- renewal_notice: prices a forthcoming term for an existing policy.
- forms: blank or template forms (δήλωση εναντίωσης, υπαναχώρησης, αίτηση ασφάλισης) with fields left unfilled.
- certificate: proof of cover without the full schedule.
- invoice: a premium account or receipt.
If documentKind is NOT policy_schedule or certificate, extract only what the document actually states and LEAVE EVERY FIELD YOU CANNOT FIND EMPTY. Do not carry a name, a date or an amount over from a specimen, a heading or an example. A terms booklet names its insurer on every page and is still not a policy.`

export type EvidenceVerdict =
    | { sufficient: true }
    | { sufficient: false; reason: 'not_a_policy_document'; documentKind: DocumentKind }
    | { sufficient: false; reason: 'no_identifying_evidence' }

/**
 * Whether an extraction result should be believed as a policy.
 *
 * Deliberately deterministic and separate from confidence scoring. Confidence
 * answers "how sure is the model about this value"; this answers "is there a
 * policy here at all", and the two fail in different ways — a booklet can
 * produce high confidence in an insurer name that belongs to no contract.
 *
 * The second arm catches the case where the model did not classify but also
 * found nothing identifying: no policy number, no insured, no period. Any ONE
 * of those is enough to proceed, because real schedules do omit fields.
 */
export function assessExtractionEvidence(extraction: {
    documentKind?: string | null
    policyNumber?: string | null
    insurerName?: string | null
    customerName?: string | null
    customerSurname?: string | null
    startDate?: string | null
    endDate?: string | null
}): EvidenceVerdict {
    const kind = DOCUMENT_KINDS.includes(extraction.documentKind as DocumentKind)
        ? (extraction.documentKind as DocumentKind)
        : null

    if (kind && !isPolicyBearing(kind)) {
        return { sufficient: false, reason: 'not_a_policy_document', documentKind: kind }
    }

    const hasIdentifier = Boolean(extraction.policyNumber?.trim())
    const hasParty = Boolean(extraction.customerName?.trim() || extraction.customerSurname?.trim())
    const hasPeriod = Boolean(extraction.startDate?.trim() && extraction.endDate?.trim())

    // An insurer name alone is NOT evidence of a policy — it is printed on
    // brochures, booklets and forms. It takes an identifier, a party or a period.
    if (!hasIdentifier && !hasParty && !hasPeriod) {
        return { sufficient: false, reason: 'no_identifying_evidence' }
    }

    return { sufficient: true }
}

/** Bilingual copy for each refusal, so the reason reaches the user in their language. */
export const EVIDENCE_REFUSAL_COPY: Record<
    Exclude<EvidenceVerdict, { sufficient: true }>['reason'],
    { el: string; en: string }
> = {
    not_a_policy_document: {
        el: 'Το αρχείο δεν φαίνεται να είναι ασφαλιστήριο συμβόλαιο. Αποθηκεύτηκε, αλλά δεν αναλύθηκε ως συμβόλαιο — ανέβασε τη σελίδα με τα στοιχεία του συμβολαίου για ανάλυση.',
        en: 'This file does not appear to be a policy schedule. It has been stored but not analysed as a policy — upload the page carrying the policy details to analyse it.',
    },
    no_identifying_evidence: {
        el: 'Δεν εντοπίστηκαν επαρκή στοιχεία ταυτοποίησης συμβολαίου — ούτε αριθμός συμβολαίου, ούτε ασφαλισμένος, ούτε περίοδος ασφάλισης.',
        en: 'No identifying policy evidence was found — no policy number, no insured party and no period of cover.',
    },
}
