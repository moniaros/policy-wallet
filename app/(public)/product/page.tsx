import type { Metadata } from "next"
import ProductPageClient from "./ProductPageClient"
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
        <>
            <ProductPageClient />
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
                        description:
                            "Πώς λειτουργεί το PolicyWallet: ανεβάζετε τα ασφαλιστήρια, η AI τα αναλύει και λαμβάνετε υπενθυμίσεις και συστάσεις.",
                        steps: PRODUCT_STEPS.map((step) => ({
                            name: step.titleEl,
                            text: step.descEl,
                        })),
                    }),
                ]}
            />
        </>
    )
}
