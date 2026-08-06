/**
 * Single source of truth for the legal identity of the operating company, used
 * across the legal documents (lib/legal/legal-content.ts) and the public footer
 * (components/landing/PublicMegaFooter.tsx).
 *
 * The corporate registry details (legal name, ΓΕΜΗ, ΑΦΜ, registered seat) are
 * intentionally WITHHELD for now and rendered as a single "coming soon" notice
 * (`detailsComingSoon`) in place of the individual values — change the copy once
 * here and every surface follows. When the finalized details are ready, restore
 * the individual `company` / `gemi` / `vat` / `address` fields and inline them
 * back into legal-content.ts + the footer.
 *
 * PolicyWallet is the trade/product name, not the legal entity — it is not a
 * "detail" and stays visible everywhere.
 *
 * Kept in its own tiny module (instead of legal-content.ts) so the client-side
 * footer does not pull the full legal corpus into its bundle.
 */

export type LegalEntity = {
    /** Placeholder shown in place of the withheld company name / ΓΕΜΗ / ΑΦΜ / seat. */
    detailsComingSoon: string
    /** Data Protection Officer / privacy contact mailbox. */
    dpoEmail: string
    /** Competent court venue named in the terms (already in the right grammatical case). */
    venue: string
    /** Liability-cap formulation inlined into the limitation-of-liability section. */
    liabilityCap: string
}

export const LEGAL_ENTITY: Record<"el" | "en", LegalEntity> = {
    el: {
        detailsComingSoon:
            "Τα πλήρη εταιρικά στοιχεία (επωνυμία, αριθμός ΓΕΜΗ, ΑΦΜ και έδρα) θα είναι διαθέσιμα σύντομα.",
        dpoEmail: "dpo@policywallet.gr",
        venue: "της Ελλάδας",
        liabilityCap:
            "το συνολικό ποσό που καταβάλατε για την υπηρεσία κατά τους δώδεκα (12) μήνες που προηγούνται του γεγονότος από το οποίο πηγάζει η αξίωση",
    },
    en: {
        detailsComingSoon:
            "Full company details (legal name, GEMI number, VAT number and registered office) will be available soon.",
        dpoEmail: "dpo@policywallet.gr",
        venue: "Greece",
        liabilityCap:
            "the total amount you paid for the service in the twelve (12) months preceding the event giving rise to the claim",
    },
} as const
