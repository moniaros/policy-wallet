import type { Metadata } from "next"
import { PartnersSections } from "@/components/landing/PartnersSections"

/**
 * NOINDEX by decision A-04: the Terms §3 consent qualification and the IDD
 * opinion are with legal. The page exists for direct conversations; it is
 * linked from no nav and offered to no crawler until legal clears it.
 */
export const metadata: Metadata = {
    title: "PolicyWallet for institutions",
    description:
        "Consent-first coverage understanding, embedded in your channels. Early access.",
    robots: { index: false, follow: false },
}

export default function Page() {
    return <PartnersSections locale="en" />
}
