import type { Metadata } from "next"
import { landingContent } from "@/lib/landing/content"
import type { LandingLocale } from "@/types/landing-content"
import { getSiteOrigin, getSiteUrl, OG_IMAGES, siteConfig, TWITTER_IMAGES } from "@/lib/seo/site"
import { organizationJsonLd, webSiteJsonLd } from "@/lib/seo/jsonld"

export function buildLandingMetadata(locale: LandingLocale): Metadata {
    const meta = landingContent.seo[locale]
    const canonical = meta.path
    // x-default → the Greek homepage: Greece is the primary market and the
    // Greek page is what an unmatched-language visitor should get.
    const languages = { el: "/", en: "/en", "x-default": "/" }

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
        // Same @id as the pricing page's node so validators read ONE app
        // entity across the site, not two competing ones.
        "@id": `${baseUrl}/#app`,
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
        // The app entity describes itself with the category definition (same
        // string as the pricing page's node — one identity, not two), not the
        // page's meta snippet.
        description: siteConfig.definition[locale],
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

    // "How it works" steps as HowTo — answer engines quote step lists.
    const howTo = {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: landingContent.howItWorks.title[locale],
        step: landingContent.howItWorks.steps.map((step, index) => ({
            "@type": "HowToStep",
            position: index + 1,
            name: step.title[locale],
            text: step.description[locale],
        })),
    }

    return [softwareApplication, organizationJsonLd(locale), webSiteJsonLd(), faqPage, howTo]
}
