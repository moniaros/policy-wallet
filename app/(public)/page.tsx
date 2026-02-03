import { WorldClassLanding } from "@/components/landing/WorldClassLanding"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "PolicyWallet - Το Έξυπνο Ασφαλιστικό σας Πορτοφόλι με AI",
    description: "Μεγιστοποιήστε τα οφέλη της ασφάλισής σας με έξυπνες πληροφορίες και υπενθυμίσεις προληπτικής φροντίδας. Αποκτήστε πρόωρη πρόσβαση στην πλατφόρμα μας.",
}

export default function LandingPage() {
    return <WorldClassLanding />
}
