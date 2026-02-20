import type { Metadata } from "next"
import { Suspense } from "react"
import Script from "next/script"
import { WorldClassLanding } from "@/components/landing/WorldClassLanding"
import { buildLandingJsonLd, buildLandingMetadata } from "@/lib/landing/seo"

export const metadata: Metadata = buildLandingMetadata("el")

export default function LandingPage() {
    const jsonLd = buildLandingJsonLd("el")

    return (
        <>
            <Suspense fallback={null}>
                <WorldClassLanding locale="el" />
            </Suspense>
            {jsonLd.map((payload, idx) => (
                <Script
                    id={`landing-jsonld-el-${idx}`}
                    key={`landing-jsonld-el-${idx}`}
                    type="application/ld+json"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
                />
            ))}
        </>
    )
}
