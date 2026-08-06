import type { Metadata } from "next"
import { ProductSections } from "./ProductSections"
import { StaticLanguageProvider } from "@/contexts/LanguageContext"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import {
    JsonLd,
    breadcrumbJsonLd,
    faqPageJsonLd,
    howToJsonLd,
} from "@/lib/seo/jsonld"
import { PRODUCT_FAQS, PRODUCT_STEPS } from "./marketing-content"

export const metadata: Metadata = buildMarketingMetadata("product")

export default function ProductPage() {
    return (
        <StaticLanguageProvider language="el" counterpartPath="/en/product">
            <ProductSections language="el" />
            <JsonLd
                data={[
                    breadcrumbJsonLd(["product"]),
                    faqPageJsonLd(
                        PRODUCT_FAQS.map((faq) => ({
                            question: faq.qEl,
                            answer: faq.aEl,
                        }))
                    ),
                    howToJsonLd({
                        name: "Τρία βήματα για τον πλήρη έλεγχο των ασφαλίσεών σας",
                        // Neutral flow summary — tier-gated outputs (reminders,
                        // recommendations) are attributed inside the steps.
                        description:
                            "Πώς λειτουργεί το PolicyWallet: στέλνετε τα ασφαλιστήριά σας, τα διαβάζουμε για εσάς και σας κρατάμε ενήμερους.",
                        steps: PRODUCT_STEPS.map((step) => ({
                            name: step.titleEl,
                            text: step.descEl,
                        })),
                    }),
                ]}
            />
        </StaticLanguageProvider>
    )
}
