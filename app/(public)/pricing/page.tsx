import type { Metadata } from "next"
import PricingPageClient from "./PricingPageClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import {
    JsonLd,
    breadcrumbJsonLd,
    faqPageJsonLd,
    softwareApplicationJsonLd,
} from "@/lib/seo/jsonld"
import { publicPricingContent } from "@/lib/pricing/public-pricing-content"

export const metadata: Metadata = buildMarketingMetadata("pricing")

export default function PricingPage() {
    // The policyholder audience is the server-rendered default view, so its
    // FAQ and plans are what crawlers see — the JSON-LD mirrors exactly that.
    const { plans, faqItems } = publicPricingContent.policyholder

    return (
        <>
            <PricingPageClient />
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
