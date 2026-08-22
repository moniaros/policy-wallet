import { z } from 'zod'

import { AcordDataSchema } from '@/lib/schemas/acord-data'
import { WRITE_BRANCH_IDS } from '@/lib/insurance/taxonomy'

import { DOCUMENT_KINDS } from './document-kind'
import { ExtractionSourcesSchema, extractionCitationsEnabled } from './extraction-citations'

/**
 * The output contract for policy extraction, in one place.
 *
 * There used to be three near-identical copies of this object — one per provider
 * service — and they had already drifted: Gemini's carried `premiumCurrency`
 * that the other two did not, and the `.describe()` hints a Greek schedule needs
 * ("look for Ασφάλιστρο, Premium") existed on one copy and not the others. Only
 * the PROMPT had been centralised, so extraction quality silently depended on
 * which provider the router happened to pick.
 *
 * `.describe()` text is not decoration here. On the Gemini path the whole schema
 * travels inside the prompt (see json-mode-schema.ts — Gemini rejects a
 * response_schema this large with "too many states for serving"), so every
 * description is literally instruction text the model reads.
 *
 * Built as a function rather than a constant because the citations block is
 * feature-flagged per request.
 */
export function buildExtractionSchema() {
    return z.object({
        // Asked first, and cheap: one enum on the existing call is what keeps a
        // terms booklet or a blank form from being read as a contract.
        documentKind: z.enum(DOCUMENT_KINDS).optional().describe(
            'What kind of document this is. Only policy_schedule and certificate carry an actual policy.'
        ),
        insurerName: z.string().optional().describe('Insurance company name from logo, letterhead, or header'),
        policyNumber: z.string().optional().describe('Policy number from headers, footers, or labeled fields'),
        lineOfBusiness: z.string().optional().describe(`Exactly one of: ${WRITE_BRANCH_IDS.join(', ')}`),
        startDate: z.string().optional().describe('Policy start date in YYYY-MM-DD (look for Ισχύς, Διάρκεια, Period, Validity)'),
        endDate: z.string().optional().describe('Policy end date in YYYY-MM-DD'),
        premiumAmount: z.number().optional().describe('Total premium amount, numeric only (look for Ασφάλιστρο, Ολικά Ασφάλιστρα, Premium)'),
        premiumCurrency: z.string().optional().describe('ISO-4217 currency of the premium, e.g. EUR or USD. Greek retail is usually EUR; marine and crew business is frequently USD — read it, do not assume it.'),
        issueDate: z.string().optional().describe('Policy issue/signature date in YYYY-MM-DD (look for Ημερομηνία έκδοσης, Issue date)'),
        premiumFrequency: z.enum(['annual', 'semiannual', 'quarterly', 'monthly', 'one_off']).optional().describe('Premium payment frequency (look for Συχνότητα καταβολής, δόσεις, payment frequency/installments)'),
        renewalDate: z.string().optional().describe('Policy renewal date in YYYY-MM-DD if stated (look for Ημερομηνία ανανέωσης, Renewal)'),
        // COMPOSED, not copied — so unlike the plain string fields above (which
        // keep the document's own language) this one has a language of its own
        // and must be pinned. Left unpinned, a Greek schedule routinely yielded
        // an English sentence, which the wallet rendered verbatim under the
        // heading «Το ασφαλιστήριό σας σε απλά ελληνικά». The reader is a Greek
        // consumer; lib/wallet/summary-language.ts refuses to display a summary
        // that comes back in any other language.
        coverageSummary: z.string().optional().describe('Brief summary of main coverages, max 200 chars. WRITE THIS IN GREEK (στα ελληνικά) regardless of the document language — it is shown to a Greek consumer as plain-language copy.'),
        customerName: z.string().optional().describe('Policyholder first name'),
        customerSurname: z.string().optional().describe('Policyholder surname'),
        customerEmail: z.string().optional(),
        customerPhone: z.string().optional().describe('Policyholder phone number (look for Τηλέφωνο, Κινητό, Phone)'),
        customerTaxId: z.string().optional().describe('Policyholder VAT / tax number — 9-digit Greek ΑΦΜ (look for ΑΦΜ, Α.Φ.Μ., ΔΟΥ, VAT, Tax ID)'),
        exclusions: z.array(z.string()).optional().describe('Top exclusions from Εξαιρέσεις/Exclusions sections'),
        extractionConfidence: z.object({
            overall: z.number().describe('0-100 confidence score'),
            requiresReview: z.boolean().describe('True if overall < 80 or critical fields missing'),
            fields: z.record(z.string(), z.number()).describe('Per-field confidence scores 0-100 for: insurerName, policyNumber, lineOfBusiness, startDate, endDate, premiumAmount, issueDate, premiumFrequency, renewalDate'),
        }).optional(),
        ...(extractionCitationsEnabled() ? { extractionSources: ExtractionSourcesSchema } : {}),
        acordData: AcordDataSchema.optional().describe('Type-specific structured data matching the detected lineOfBusiness'),
    })
}

export type ExtractionSchemaShape = ReturnType<typeof buildExtractionSchema>
