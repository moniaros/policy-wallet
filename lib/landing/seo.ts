import type { Metadata } from "next"
import { landingContent } from "@/lib/landing/content"
import type { LandingLocale } from "@/types/landing-content"
import { getSiteOrigin, getSiteUrl, OG_IMAGES, TWITTER_IMAGES } from "@/lib/seo/site"
import { organizationJsonLd, webSiteJsonLd } from "@/lib/seo/jsonld"

export function buildLandingMetadata(locale: LandingLocale): Metadata {
    const meta = landingContent.seo[locale]
    const canonical = meta.path
    const languages =
        locale === "el"
            ? { el: "/", en: "/en" }
            : { en: "/en", el: "/" }

    return {
        metadataBase: getSiteUrl(),
        // Absolute: the homepage title already contains the brand, so the
        // root "%s | PolicyWallet" template must not apply here.
        title: { absolute: meta.title },
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
            images: OG_IMAGES,
        },
        twitter: {
            card: "summary_large_image",
            title: meta.twitterTitle,
            description: meta.twitterDescription,
            images: TWITTER_IMAGES,
        },
    }
}

export function buildLandingJsonLd(locale: LandingLocale) {
    const baseUrl = getSiteOrigin()
    const meta = landingContent.seo[locale]
    const pageUrl = `${baseUrl}${meta.path}`

    const softwareApplication = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "PolicyWallet",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        inLanguage: locale === "el" ? "el" : "en",
        offers: {
            "@type": "Offer",
            price: "0",
            priceCurrency: "EUR",
        },
        url: pageUrl,
        description: meta.description,
        publisher: { "@id": `${baseUrl}/#organization` },
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

    return [softwareApplication, organizationJsonLd(), webSiteJsonLd(), faqPage]
}
