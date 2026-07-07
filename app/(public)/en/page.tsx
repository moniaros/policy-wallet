import type { Metadata } from "next"
import { Suspense } from "react"
import { WorldClassLanding } from "@/components/landing/WorldClassLanding"
import { buildLandingJsonLd, buildLandingMetadata } from "@/lib/landing/seo"
import { JsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildLandingMetadata("en")

export default function LandingPageEnglish() {
    const jsonLd = buildLandingJsonLd("en")

    return (
        <>
            <Suspense fallback={null}>
                <WorldClassLanding locale="en" />
            </Suspense>
            {/* Server-rendered so crawlers without JS see the structured data. */}
            <JsonLd data={jsonLd} />
        </>
    )
}
