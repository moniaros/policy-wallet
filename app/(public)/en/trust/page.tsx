import type { Metadata } from "next"
import { TrustPage } from "@/components/legal/TrustPage"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"

export const metadata: Metadata = buildMarketingMetadata("trust", "en")

export const revalidate = 300

export default function Page() {
    return <TrustPage language="en" />
}
