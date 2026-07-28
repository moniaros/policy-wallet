import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { getPublicPartnerOffers } from "@/lib/partner-offers/catalog"
import { PartnerPerksSection } from "@/components/landing/PartnerPerksSection"
import { PublicHeader } from "@/components/public/PublicHeader"
import { PublicMegaFooter } from "@/components/landing/PublicMegaFooter"
import { SKIP_LINK_TARGET_ID } from "@/lib/nav/public-nav"

export const metadata: Metadata = {
    // The root layout applies `template: "%s | PolicyWallet"` — repeating the
    // suffix here rendered "Παροχές Συνεργατών | PolicyWallet | PolicyWallet".
    title: "Παροχές Συνεργατών",
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
            <PublicHeader locale="el" />
            <main id={SKIP_LINK_TARGET_ID} tabIndex={-1} className="pt-28">
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
