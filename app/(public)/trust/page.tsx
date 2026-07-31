import type { Metadata } from "next"
import { TrustPage } from "@/components/legal/TrustPage"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"

export const metadata: Metadata = buildMarketingMetadata("trust")

// Marketing-tree cadence: revalidate rather than rebuild per request.
export const revalidate = 300

export default function Page() {
    return <TrustPage language="el" />
}
