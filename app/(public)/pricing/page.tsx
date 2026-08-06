import type { Metadata } from "next"
import PricingPageClient from "./PricingPageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import {
    JsonLd,
    breadcrumbJsonLd,
    faqPageJsonLd,
    softwareApplicationJsonLd,
} from "@/lib/seo/jsonld"
import { getPlanCatalog } from "@/lib/pricing/plan-catalog"
import { buildPublicPricingContent } from "@/lib/pricing/pricing-view-model"
import { getPublicPartnerOffers } from "@/lib/partner-offers/catalog"

export const metadata: Metadata = buildMarketingMetadata("pricing")

// ISR backstop for the admin-managed prices; /admin/plans saves revalidate
// this path (and the plan-catalog tag) immediately.
export const revalidate = 300

export default async function PricingPage() {
    // Live catalog prices (admin-managed) over the bilingual template.
    const pricingContent = buildPublicPricingContent(await getPlanCatalog())
    const partnerOffers = await getPublicPartnerOffers()
    // Both audiences server-render (the inactive panel is `hidden`), so
    // crawlers see agent tiers too. The JSON-LD stays scoped to the
    // policyholder view — the default panel a visitor lands on — which keeps
    // markup ⊆ rendered content.
    const { plans, faqItems } = pricingContent.policyholder

    return (
        <>
            <PricingPageClient pricingContent={pricingContent} partnerOffers={partnerOffers} />
            <JsonLd
                data={[
                    breadcrumbJsonLd(["pricing"]),
                    faqPageJsonLd(
                        faqItems.map((item) => ({
                            question: item.question.el,
                            answer: item.answer.el,
                        }))
                    ),
                    softwareApplicationJsonLd(
                        plans
                            .filter((plan) => !plan.isContactPlan)
                            .map((plan) => ({
                                name: plan.name.el,
                                price: plan.pricing.monthly.amount.replace(/[^0-9.]/g, ""),
                                description: plan.description.el,
                            }))
                    ),
                ]}
            />
        </>
    )
}
