import type { Metadata } from "next"
import PricingPageClient from "../../pricing/PricingPageClient"
import { publicPricingContent } from "@/lib/pricing/public-pricing-content"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import {
    JsonLd,
    breadcrumbEnJsonLd,
    faqPageJsonLd,
    softwareApplicationJsonLd,
} from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("pricing", "en")

export default function PricingPageEnglish() {
    const { plans, faqItems } = publicPricingContent.policyholder

    return (
        <StaticLanguageProvider language="en" counterpartPath="/pricing">
            <PricingPageClient />
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
