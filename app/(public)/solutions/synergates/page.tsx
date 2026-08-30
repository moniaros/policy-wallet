import type { Metadata } from "next"
import { PartnersSections } from "@/components/landing/PartnersSections"

/** EL mirror of /solutions/partners — same A-04 noindex rule. */
export const metadata: Metadata = {
    title: "PolicyWallet για θεσμικούς συνεργάτες",
    description:
        "Κατανόηση καλύψεων με συγκατάθεση, ενσωματωμένη στα κανάλιά σας. Πρώιμη διάθεση.",
    robots: { index: false, follow: false },
}

export default function Page() {
    return <PartnersSections locale="el" />
}
