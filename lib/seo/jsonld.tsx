import React from "react"
import {
    getSiteOrigin,
    getSocialProfiles,
    hasCompleteAddress,
    siteConfig,
} from "@/lib/seo/site"
import { CATEGORY } from "@/lib/marketing/positioning"
import { enPathFor, marketingPages, type MarketingPageKey } from "@/lib/seo/marketing-pages"
import { getFounders, teamMembers, type TeamMember } from "@/lib/seo/team"

/**
 * Server-rendered JSON-LD.
 *
 * IMPORTANT: this must stay a plain inline <script> rendered by a server
 * component. next/script with strategy="afterInteractive" injects the tag
 * after hydration, so crawlers that do not execute JavaScript never see the
 * structured data (this was the root cause of "no JSON-LD detected" in the
 * SEO audit despite builders existing in the codebase).
 */
export function JsonLd({ data }: { data: object | object[] }) {
    const items = Array.isArray(data) ? data : [data]
    return (
        <>
            {items.map((item, index) => (
                <script
                    key={index}
                    type="application/ld+json"
                    // Escape "<" so user copy can never break out of the script tag.
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify(item).replace(/</g, "\\u003c"),
                    }}
                />
            ))}
        </>
    )
}

export function organizationJsonLd(locale: "el" | "en" = "el") {
    const origin = getSiteOrigin()
    const sameAs = getSocialProfiles().map((profile) => profile.url)

    const contactPoint: Record<string, unknown> = {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: siteConfig.contactEmail,
        availableLanguage: ["el", "en"],
    }
    if (siteConfig.contactPhone) {
        contactPoint.telephone = siteConfig.contactPhone
    }

    const organization: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: siteConfig.name,
        url: origin,
        logo: `${origin}/icons/icon-512x512.png`,
        // EN pages carried the Greek definition — describe the entity in the
        // page's own language.
        description: siteConfig.definition[locale],
        // The brand motto — the category decode, rendered verbatim in the
        // sitewide footer identity line.
        slogan: CATEGORY[locale],
        email: siteConfig.contactEmail,
        contactPoint,
        areaServed: "GR",
    }
    if (sameAs.length > 0) {
        organization.sameAs = sameAs
    }
    if (hasCompleteAddress()) {
        organization.address = {
            "@type": "PostalAddress",
            ...siteConfig.address,
        }
    }
    const founders = getFounders()
    if (founders.length > 0) {
        organization.founder = founders.map((member) => ({
            "@type": "Person",
            "@id": personId(member),
            name: member.name,
        }))
    }
    return organization
}

function personId(member: TeamMember): string {
    return `${getSiteOrigin()}/company#${member.slug}`
}

/**
 * Minimal NAMED reference to the Organization node. Rich-results validators
 * evaluate each page's graph independently, so a bare `{"@id": …}` on a page
 * that does not define the node renders as an unnamed publisher/author. The
 * stub carries the name so every page's graph is self-contained; the full
 * node (contact point, founders, address) still lives on the pages that
 * render organizationJsonLd().
 */
function organizationRef() {
    const origin = getSiteOrigin()
    return {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: siteConfig.name,
        url: origin,
    }
}

/** Person entity for a published team member (E-E-A-T). */
export function personJsonLd(member: TeamMember) {
    const person: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": "Person",
        "@id": personId(member),
        name: member.name,
        jobTitle: member.role.el,
        description: member.bio.el,
        worksFor: organizationRef(),
    }
    if (member.profileUrl) {
        person.sameAs = [member.profileUrl]
    }
    return person
}

/** Person entities for everyone in the team registry (empty → []). */
export function teamJsonLd() {
    return teamMembers.map(personJsonLd)
}

export function webSiteJsonLd() {
    const origin = getSiteOrigin()
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name: siteConfig.name,
        url: origin,
        inLanguage: ["el", "en"],
        publisher: organizationRef(),
    }
}

export function faqPageJsonLd(items: { question: string; answer: string }[]) {
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
                "@type": "Answer",
                text: item.answer,
            },
        })),
    }
}

/** Breadcrumb trail from arbitrary name/path pairs (home is prepended). */
export function breadcrumbTrailJsonLd(
    trail: { name: string; path: string }[],
    home: { name: string; path: string } = { name: "Αρχική", path: "/" }
) {
    const origin = getSiteOrigin()
    const items = [home, ...trail]
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.path === "/" ? origin : `${origin}${item.path}`,
        })),
    }
}

/** Breadcrumb trail ending at the given marketing page. */
export function breadcrumbJsonLd(keys: MarketingPageKey[]) {
    return breadcrumbTrailJsonLd(
        keys.map((key) => ({
            name: marketingPages[key].breadcrumb,
            path: marketingPages[key].path,
        }))
    )
}

/** English breadcrumb trail for /en/* marketing-page variants. */
export function breadcrumbEnJsonLd(keys: MarketingPageKey[]) {
    return breadcrumbTrailJsonLd(
        keys.map((key) => {
            const page = marketingPages[key]
            return {
                name: page.en?.breadcrumb ?? page.breadcrumb,
                path: enPathFor(page.path),
            }
        }),
        { name: "Home", path: "/en" }
    )
}

export type PricingOfferInput = {
    name: string
    price: string
    priceCurrency?: string
    description?: string
}

export function softwareApplicationJsonLd(offers: PricingOfferInput[], locale: "el" | "en" = "el") {
    const origin = getSiteOrigin()
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        // Shared @id with the homepage node — one app entity sitewide.
        "@id": `${origin}/#app`,
        name: siteConfig.name,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        url: origin,
        description: siteConfig.definition[locale],
        publisher: organizationRef(),
        offers: offers.map((offer) => ({
            "@type": "Offer",
            name: offer.name,
            price: offer.price,
            priceCurrency: offer.priceCurrency ?? "EUR",
            ...(offer.description ? { description: offer.description } : {}),
        })),
    }
}

export function howToJsonLd(input: {
    name: string
    description?: string
    steps: { name: string; text: string }[]
}) {
    return {
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: input.name,
        ...(input.description ? { description: input.description } : {}),
        step: input.steps.map((step, index) => ({
            "@type": "HowToStep",
            position: index + 1,
            name: step.name,
            text: step.text,
        })),
    }
}

/**
 * DefinedTerm for a single glossary entry (AEO: answer engines lift the
 * `description` as the definition). `inDefinedTermSet` links it back to the
 * glossary hub so the whole set reads as one authoritative dictionary.
 */
export function definedTermJsonLd(input: {
    path: string
    name: string
    description: string
    inLanguage?: string
    /** Hub path the term belongs to — defaults to the Greek glossary. */
    termSetPath?: string
}) {
    const origin = getSiteOrigin()
    const termSetPath = input.termSetPath ?? "/lexiko"
    return {
        "@context": "https://schema.org",
        "@type": "DefinedTerm",
        "@id": `${origin}${input.path}#term`,
        name: input.name,
        description: input.description,
        inLanguage: input.inLanguage ?? "el",
        url: `${origin}${input.path}`,
        inDefinedTermSet: `${origin}${termSetPath}#termset`,
    }
}

/** DefinedTermSet for the glossary hub — the dictionary that owns the terms. */
export function definedTermSetJsonLd(input: {
    path: string
    name: string
    description: string
    inLanguage?: string
    terms: { name: string; path: string }[]
}) {
    const origin = getSiteOrigin()
    return {
        "@context": "https://schema.org",
        "@type": "DefinedTermSet",
        "@id": `${origin}${input.path}#termset`,
        name: input.name,
        description: input.description,
        inLanguage: input.inLanguage ?? "el",
        url: `${origin}${input.path}`,
        hasDefinedTerm: input.terms.map((term) => ({
            "@type": "DefinedTerm",
            name: term.name,
            url: `${origin}${term.path}`,
        })),
    }
}

export function articleJsonLd(input: {
    path: string
    headline: string
    description: string
    datePublished: string
    dateModified?: string
    inLanguage?: string
    /** Named author (Person) — falls back to the Organization when absent. */
    author?: { name: string; jobTitle?: string; profileUrl?: string }
}) {
    const origin = getSiteOrigin()
    const author = input.author
        ? {
              "@type": "Person",
              name: input.author.name,
              ...(input.author.jobTitle ? { jobTitle: input.author.jobTitle } : {}),
              ...(input.author.profileUrl ? { sameAs: [input.author.profileUrl] } : {}),
              worksFor: organizationRef(),
          }
        : organizationRef()
    return {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: input.headline,
        description: input.description,
        url: `${origin}${input.path}`,
        datePublished: input.datePublished,
        dateModified: input.dateModified ?? input.datePublished,
        inLanguage: input.inLanguage ?? "el",
        author,
        publisher: organizationRef(),
        mainEntityOfPage: `${origin}${input.path}`,
    }
}

/**
 * The guides index as an enumerable collection.
 *
 * A `Blog` with an `ItemList` of `BlogPosting` entries, each carrying its own
 * headline, description and dates. Three different consumers want three
 * different things from this page and all three are served by the same object:
 *
 *  - **Search** gets a list it can render as a set of results rather than one
 *    opaque page, with per-item freshness from `dateModified`.
 *  - **Answer engines** get `description` — the guide's own direct-answer
 *    summary, the same 40–60 words the page shows — so a citation quotes what
 *    we actually wrote instead of a scraped fragment of navigation.
 *  - **Generative engines** get `position`, which is the editorial ordering.
 *    Without it the list is a bag and the model picks whichever item its
 *    chunker happened to keep.
 *
 * Everything here is rendered visibly on the page too. Structured data that
 * claims more than the page shows is the one thing that reliably gets a site
 * demoted, and it is also just lying in a machine-readable format.
 */
export function guideIndexJsonLd(input: {
    path: string
    name: string
    description: string
    inLanguage: "el" | "en"
    items: {
        path: string
        headline: string
        description: string
        datePublished: string
        dateModified?: string
    }[]
}) {
    const origin = getSiteOrigin()
    return {
        "@context": "https://schema.org",
        "@type": "Blog",
        "@id": `${origin}${input.path}#blog`,
        url: `${origin}${input.path}`,
        name: input.name,
        description: input.description,
        inLanguage: input.inLanguage === "el" ? "el-GR" : "en",
        publisher: organizationRef(),
        blogPost: input.items.map((item) => ({
            "@type": "BlogPosting",
            "@id": `${origin}${item.path}#article`,
            url: `${origin}${item.path}`,
            headline: item.headline,
            description: item.description,
            datePublished: item.datePublished,
            ...(item.dateModified ? { dateModified: item.dateModified } : {}),
            inLanguage: input.inLanguage === "el" ? "el-GR" : "en",
            publisher: organizationRef(),
        })),
        mainEntity: {
            "@type": "ItemList",
            numberOfItems: input.items.length,
            itemListOrder: "https://schema.org/ItemListOrderDescending",
            itemListElement: input.items.map((item, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: `${origin}${item.path}`,
                name: item.headline,
            })),
        },
    }
}
