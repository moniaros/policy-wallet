import type { Metadata } from "next"
import { ProductSections } from "../../product/ProductSections"
import { PRODUCT_FAQS, PRODUCT_STEPS } from "../../product/marketing-content"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import {
    JsonLd,
    breadcrumbEnJsonLd,
    faqPageJsonLd,
    howToJsonLd,
} from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("product", "en")

export default function ProductPageEnglish() {
    return (
        <StaticLanguageProvider language="en" counterpartPath="/product">
            <ProductSections language="en" />
            <JsonLd
                data={[
                    breadcrumbEnJsonLd(["product"]),
                    faqPageJsonLd(
                        PRODUCT_FAQS.map((faq) => ({
                            question: faq.qEn,
                            answer: faq.aEn,
                        }))
                    ),
                    howToJsonLd({
                        name: "Three steps to full control of your insurance",
                        description:
                            "How PolicyWallet works: you upload your policies, AI analyzes them, and you receive reminders and recommendations.",
                        steps: PRODUCT_STEPS.map((step) => ({
                            name: step.titleEn,
                            text: step.descEn,
                        })),
                    }),
                ]}
            />
        </StaticLanguageProvider>
    )
}
