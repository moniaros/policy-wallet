import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getPublicPartnerOffers } from "@/lib/partner-offers/catalog"
import { PartnerPerksSection } from "@/components/landing/PartnerPerksSection"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"

export const metadata: Metadata = {
    title: "Παροχές Συνεργατών | PolicyWallet",
    description:
        "Υπηρεσίες πρόληψης και προνόμια από επιλεγμένους συνεργάτες, μέρος των πληρωμένων πλάνων του PolicyWallet.",
    // Deliberately NOT in lib/seo/marketing-pages.ts yet: that registry drives
    // the sitemap, and this page 404s until the first partner goes live.
    // Register it there (one line) when the program launches for real.
    robots: { index: false, follow: false },
}

export const revalidate = 300

export default async function PerksPage() {
    const offers = await getPublicPartnerOffers()
    // Honesty rule: no live partners ⇒ this page does not exist. It comes
    // alive the moment the first vendor is activated in /admin/partners.
    if (offers.length === 0) notFound()

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950">
            <main className="pt-10">
                <div className="px-6 pt-10 text-center lg:px-12">
                    <Link href="/" className="inline-flex items-center text-[20px] font-bold tracking-tight">
                        <span className="text-[#0F172A] dark:text-white">Policy</span>
                        <span className="text-[#64748B] dark:text-slate-400">Wallet</span>
                    </Link>
                </div>
                <PartnerPerksSection offers={offers} isGreek={true} />
                <div className="pb-16 text-center">
                    <Link
                        href="/pricing"
                        className="pw-primary-button inline-flex items-center px-6 py-3 text-sm font-semibold"
                    >
                        Δείτε τα πλάνα
                    </Link>
                </div>
            </main>
            <PublicMegaFooter locale="el" />
        </div>
    )
}
