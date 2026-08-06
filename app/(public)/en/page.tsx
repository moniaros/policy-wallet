import type { Metadata } from "next"
import { Suspense } from "react"
import { WorldClassLanding } from "@/components/landing/WorldClassLanding"
import { buildLandingJsonLd, buildLandingMetadata } from "@/lib/landing/seo"
import { JsonLd } from "@/lib/seo/jsonld"
import { getPublicPartnerOffers } from "@/lib/partner-offers/catalog"
import { getPlanCatalog } from "@/lib/pricing/plan-catalog"
import { buildPublicPricingContent } from "@/lib/pricing/pricing-view-model"

export const metadata: Metadata = buildLandingMetadata("en")

// ISR backstop; /admin/partners saves revalidate the partner-offers tag, and
// /admin/plans revalidates the plan-catalog tag behind the price band.
export const revalidate = 300

export default async function LandingPageEnglish() {
    const jsonLd = buildLandingJsonLd("en")
    // Live partner offers — empty ⇒ the #perks section renders nothing.
    const partnerOffers = await getPublicPartnerOffers()
    // The same admin-managed catalog /pricing renders, so the homepage price
    // band can never quote a number the pricing page contradicts.
    const pricingPlans = buildPublicPricingContent(await getPlanCatalog()).policyholder.plans

    return (
        <>
            <Suspense fallback={null}>
                <WorldClassLanding locale="en" partnerOffers={partnerOffers} pricingPlans={pricingPlans} />
            </Suspense>
            {/* Server-rendered so crawlers without JS see the structured data. */}
            <JsonLd data={jsonLd} />
        </>
    )
}
