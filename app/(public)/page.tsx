import type { Metadata } from "next"
import { Suspense } from "react"
import { WorldClassLanding } from "@/components/landing/WorldClassLanding"
import { buildLandingJsonLd, buildLandingMetadata } from "@/lib/landing/seo"
import { JsonLd } from "@/lib/seo/jsonld"
import { getPublicPartnerOffers } from "@/lib/partner-offers/catalog"

export const metadata: Metadata = buildLandingMetadata("el")

// ISR backstop; /admin/partners saves revalidate the partner-offers tag.
export const revalidate = 300

export default async function LandingPage() {
    const jsonLd = buildLandingJsonLd("el")
    // Live partner offers — empty ⇒ the #perks section renders nothing.
    const partnerOffers = await getPublicPartnerOffers()

    return (
        <>
            <Suspense fallback={null}>
                <WorldClassLanding locale="el" partnerOffers={partnerOffers} />
            </Suspense>
            {/* Server-rendered so crawlers without JS see the structured data. */}
            <JsonLd data={jsonLd} />
        </>
    )
}
