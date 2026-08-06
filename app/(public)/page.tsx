import type { Metadata } from "next"
import { WorldClassLanding } from "@/components/landing/WorldClassLanding"
import { buildLandingJsonLd, buildLandingMetadata } from "@/lib/landing/seo"
import { JsonLd } from "@/lib/seo/jsonld"
import { getPublicPartnerOffers } from "@/lib/partner-offers/catalog"
import { getPlanCatalog } from "@/lib/pricing/plan-catalog"
import { buildPublicPricingContent } from "@/lib/pricing/pricing-view-model"

export const metadata: Metadata = buildLandingMetadata("el")

// ISR backstop; /admin/partners saves revalidate the partner-offers tag, and
// /admin/plans revalidates the plan-catalog tag behind the price band.
export const revalidate = 300

export default async function LandingPage() {
    const jsonLd = buildLandingJsonLd("el")
    // Live partner offers — empty ⇒ the #perks section renders nothing.
    const partnerOffers = await getPublicPartnerOffers()
    // The same admin-managed catalog /pricing renders, so the homepage price
    // band can never quote a number the pricing page contradicts.
    const pricingPlans = buildPublicPricingContent(await getPlanCatalog()).policyholder.plans

    return (
        <>
            {/* NOT wrapped in Suspense: a boundary here streamed the whole page
                into a JS-revealed `<div hidden>`, so crawlers that do not run
                JS (several AI crawlers) saw an empty homepage. Both data reads
                above are already awaited, so there is nothing left to suspend
                on — the markup renders straight into the server HTML. */}
            <WorldClassLanding locale="el" partnerOffers={partnerOffers} pricingPlans={pricingPlans} />
            {/* Server-rendered so crawlers without JS see the structured data. */}
            <JsonLd data={jsonLd} />
        </>
    )
}
