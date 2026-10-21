import type { Metadata } from "next"
import { PartnersSections } from "@/components/landing/PartnersSections"

/** EL mirror of /en/solutions/partners — same A-04 noindex rule. */
export const metadata: Metadata = {
    title: "PolicyWallet για θεσμικούς συνεργάτες",
    description:
        "Εργαλεία για να εξηγείτε ασφαλιστήρια μέσα από τις δικές σας υπηρεσίες. Η διάθεση βρίσκεται σε αρχικό στάδιο.",
    robots: { index: false, follow: false },
}

export default function Page() {
    return <PartnersSections locale="el" />
}
