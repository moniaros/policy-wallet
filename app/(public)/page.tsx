import type { Metadata } from "next"
import { Suspense } from "react"
import { WorldClassLanding } from "@/components/landing/WorldClassLanding"
import { buildLandingJsonLd, buildLandingMetadata } from "@/lib/landing/seo"
import { JsonLd } from "@/lib/seo/jsonld"

export const metadata: Metadata = buildLandingMetadata("el")

export default function LandingPage() {
    const jsonLd = buildLandingJsonLd("el")

    return (
        <>
            <Suspense fallback={null}>
                <WorldClassLanding locale="el" />
            </Suspense>
            {/* Server-rendered so crawlers without JS see the structured data. */}
            <JsonLd data={jsonLd} />
        </>
    )
}
