import { LandingPageClient } from "@/components/landing/LandingPageClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "PolicyWallet - Your Insurance, Consolidated",
    description: "The neutral wallet to manage all your policies in one place.",
}

export default function LandingPage() {
    return <LandingPageClient />
}
