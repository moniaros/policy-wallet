/**
 * Single source of truth for the legal identity of the operating company, used
 * across the legal documents (lib/legal/legal-content.ts) and the public footer
 * (components/landing/PublicMegaFooter.tsx).
 *
 * These are the REAL corporate registry values. Greek corporate sites must
 * display the ΓΕΜΗ number (ν. 3419/2005), and a privacy policy has to name its
 * controller (GDPR Art. 13(1)(a)), so the footer and both legal documents
 * render from here — change a value once and every surface follows.
 *
 * They were withheld between 2026-07-22 and 2026-08-20 and shown as a "will be
 * available soon" notice. That was the wrong trade: the identity is published in
 * ΓΕΜΗ, so withholding it concealed nothing from anyone who looked, while
 * leaving a privacy policy with no named controller on a product that processes
 * special-category health data.
 *
 * Greek strings use the Greek legal register («Insurance Martech Ι.Κ.Ε.»); the
 * English strings keep the Latin transliteration ("Insurance Martech IKE").
 * PolicyWallet is the trade/product name, not the legal entity.
 *
 * Kept in its own tiny module (instead of legal-content.ts) so the client-side
 * footer does not pull the full legal corpus into its bundle.
 */

export type LegalEntity = {
    /** Registered company name, in the register of the given language. */
    company: string
    /** ΓΕΜΗ (General Commercial Registry) number — mandatory on Greek corporate sites (ν. 3419/2005). */
    gemi: string
    /** Tax ID + competent tax office, rendered as a ready-to-inline clause. */
    vat: string
    /** Registered address of the company seat. */
    address: string
    /** Data Protection Officer / privacy contact mailbox. */
    dpoEmail: string
    /**
     * Competent court venue named in the terms (already in the right
     * grammatical case).
     *
     * DELIBERATELY still the generic "Greece", not the seat's own courts.
     * Restoring the identity is a disclosure fix and is required; narrowing
     * where a consumer's dispute is heard is a change to the contract itself,
     * it is worse for the consumer, and nobody asked for it. It stays generic
     * until an owner decides otherwise.
     */
    venue: string
    /** Liability-cap formulation inlined into the limitation-of-liability section. */
    liabilityCap: string
}

export const LEGAL_ENTITY: Record<"el" | "en", LegalEntity> = {
    el: {
        company: "«Insurance Martech Ι.Κ.Ε.»",
        gemi: "188863359000",
        vat: "ΑΦΜ 302659440, ΔΟΥ Χίου",
        address: "Εντός Οικισμού Καλαμωτής, 82102, Χίος",
        dpoEmail: "dpo@policywallet.gr",
        venue: "της Ελλάδας",
        liabilityCap:
            "το συνολικό ποσό που καταβάλατε για την υπηρεσία κατά τους δώδεκα (12) μήνες που προηγούνται του γεγονότος από το οποίο πηγάζει η αξίωση",
    },
    en: {
        company: "Insurance Martech IKE",
        gemi: "188863359000",
        vat: "Tax ID (ΑΦΜ) 302659440, Chios Tax Office",
        address: "Kalamoti, 82102, Chios, Greece",
        dpoEmail: "dpo@policywallet.gr",
        venue: "Greece",
        liabilityCap:
            "the total amount you paid for the service in the twelve (12) months preceding the event giving rise to the claim",
    },
} as const
