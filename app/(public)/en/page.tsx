import type { Metadata } from "next"
import Script from "next/script"
import { WorldClassLanding } from "@/components/landing/WorldClassLanding"
import { buildLandingJsonLd, buildLandingMetadata } from "@/lib/landing/seo"

export const metadata: Metadata = buildLandingMetadata("en")

export default function LandingPageEnglish() {
    const jsonLd = buildLandingJsonLd("en")

    return (
        <>
            <WorldClassLanding locale="en" />
            {jsonLd.map((payload, idx) => (
                <Script
                    id={`landing-jsonld-en-${idx}`}
                    key={`landing-jsonld-en-${idx}`}
                    type="application/ld+json"
                    strategy="afterInteractive"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
                />
            ))}
        </>
    )
}
