/**
 * Single source of truth for the legal identity of the operating company, used
 * across the legal documents (lib/legal/legal-content.ts) and the public footer
 * (components/landing/PublicMegaFooter.tsx).
 *
 * These are the REAL corporate registry values. Greek corporate sites must
 * display the ΓΕΜΗ number (ν. 3419/2005), so the footer and the terms both
 * render from here — change a value once and every surface follows.
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
    /** Competent court venue named in the terms (already in the right grammatical case). */
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
        venue: "Χίου (Βορείου Αιγαίου)",
        liabilityCap:
            "το συνολικό ποσό που καταβάλατε για την υπηρεσία κατά τους δώδεκα (12) μήνες που προηγούνται του γεγονότος από το οποίο πηγάζει η αξίωση",
    },
    en: {
        company: "Insurance Martech IKE",
        gemi: "188863359000",
        vat: "Tax ID (ΑΦΜ) 302659440, Chios Tax Office",
        address: "Kalamoti, 82102, Chios, Greece",
        dpoEmail: "dpo@policywallet.gr",
        venue: "Chios (North Aegean, Greece)",
        liabilityCap:
            "the total amount you paid for the service in the twelve (12) months preceding the event giving rise to the claim",
    },
} as const
