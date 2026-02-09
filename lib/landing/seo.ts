import type { Metadata } from "next"
import { landingContent } from "@/lib/landing/content"
import type { LandingLocale } from "@/types/landing-content"

function getMetadataBase(): URL {
    const raw =
        process.env.NEXTAUTH_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "http://localhost:3000"
    return new URL(raw)
}

export function buildLandingMetadata(locale: LandingLocale): Metadata {
    const meta = landingContent.seo[locale]
    const canonical = meta.path
    const languages =
        locale === "el"
            ? { el: "/", en: "/en" }
            : { en: "/en", el: "/" }

    return {
        metadataBase: getMetadataBase(),
        title: meta.title,
        description: meta.description,
        keywords: meta.keywords,
        alternates: {
            canonical,
            languages,
        },
        openGraph: {
            type: "website",
            locale: locale === "el" ? "el_GR" : "en_US",
            title: meta.ogTitle,
            description: meta.ogDescription,
            url: canonical,
            siteName: landingContent.productName,
            images: [
                {
                    url: "/opengraph-image.png",
                    width: 1200,
                    height: 630,
                    alt: landingContent.productName,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            title: meta.twitterTitle,
            description: meta.twitterDescription,
            images: ["/twitter-image.png"],
        },
    }
}

export function buildLandingJsonLd(locale: LandingLocale) {
    const baseUrl = getMetadataBase().toString().replace(/\/$/, "")
    const meta = landingContent.seo[locale]
    const pageUrl = `${baseUrl}${meta.path}`

    const softwareApplication = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "PolicyWallet",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        inLanguage: locale === "el" ? "el" : "en",
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "EUR",
        },
        url: pageUrl,
        description: meta.description,
    }

    const organization = {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "PolicyWallet",
        url: baseUrl,
        sameAs: [],
    }

    const website = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "PolicyWallet",
        url: baseUrl,
        inLanguage: locale === "el" ? "el" : "en",
    }

    const faqPage = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: landingContent.faq.items.map((item) => ({
            "@type": "Question",
            name: item.question[locale],
            acceptedAnswer: {
                "@type": "Answer",
                text: item.answer[locale],
            },
        })),
    }

    return [softwareApplication, organization, website, faqPage]
}
