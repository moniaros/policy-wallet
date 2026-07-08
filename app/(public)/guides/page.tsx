import type { Metadata } from "next"
import GuidesIndexClient from "./GuidesIndexClient"
import { buildMarketingMetadata } from "@/lib/seo/marketing-pages"
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildMarketingMetadata("guides")

export default function GuidesPage() {
    return (
        <>
            <GuidesIndexClient />
            <JsonLd data={breadcrumbJsonLd(["guides"])} />
        </>
    )
}
