import type { Metadata } from "next"
import PricingPageClient from "../../pricing/PricingPageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import {
    JsonLd,
    breadcrumbEnJsonLd,
    faqPageJsonLd,
    softwareApplicationJsonLd,
} from "@/lib/seo/jsonld"
import { getPlanCatalog } from "@/lib/pricing/plan-catalog"
import { buildPublicPricingContent } from "@/lib/pricing/pricing-view-model"
import { getPublicPartnerOffers } from "@/lib/partner-offers/catalog"

export const metadata: Metadata = buildMarketingMetadata("pricing", "en")

// ISR backstop for the admin-managed prices (see /pricing).
export const revalidate = 300

export default async function PricingPageEnglish() {
    const pricingContent = buildPublicPricingContent(await getPlanCatalog())
    const partnerOffers = await getPublicPartnerOffers()
    const { plans, faqItems } = pricingContent.policyholder

    return (
        <StaticLanguageProvider language="en" counterpartPath="/pricing">
            <PricingPageClient pricingContent={pricingContent} partnerOffers={partnerOffers} />
            <JsonLd
                data={[
                    breadcrumbEnJsonLd(["pricing"]),
                    faqPageJsonLd(
                        faqItems.map((item) => ({
                            question: item.question.en,
                            answer: item.answer.en,
                        }))
                    ),
                    softwareApplicationJsonLd(
                        plans
                            .filter((plan) => !plan.isContactPlan)
                            .map((plan) => ({
                                name: plan.name.en,
                                price: plan.pricing.monthly.amount.replace(/[^0-9.]/g, ""),
                                description: plan.description.en,
                            }))
                    ),
                ]}
            />
        </StaticLanguageProvider>
    )
}
