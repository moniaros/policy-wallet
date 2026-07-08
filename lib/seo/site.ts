/**
 * Central site identity for SEO / GEO / AEO.
 *
 * Everything that search engines and AI answer engines need to identify the
 * PolicyWallet entity lives here: canonical origin, brand naming, contact
 * data and social profiles. Values that depend on real-world facts we cannot
 * hardcode (phone, street address, social profiles) come from NEXT_PUBLIC_*
 * env vars and are omitted from markup when unset — an absent field is
 * always better than a placeholder.
 */

export function getSiteUrl(): URL {
    const raw =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXTAUTH_URL ||
        "http://localhost:3000"
    return new URL(raw)
}

/** Origin without trailing slash, e.g. "https://app.policywallet.gr". */
export function getSiteOrigin(): string {
    return getSiteUrl().toString().replace(/\/$/, "")
}

function envOrUndefined(value: string | undefined): string | undefined {
    const trimmed = value?.trim()
    return trimmed ? trimmed : undefined
}

export const siteConfig = {
    name: "PolicyWallet",
    /** One-line definition used for snippets and AI extraction (AEO). */
    definition: {
        el: "Το PolicyWallet είναι το ουδέτερο ψηφιακό ασφαλιστικό πορτοφόλι για την ελληνική αγορά: οργανώνει όλα τα ασφαλιστήριά σας σε ένα μέρος, τα αναλύει με AI και εντοπίζει κενά κάλυψης πριν σας κοστίσουν.",
        en: "PolicyWallet is the neutral digital insurance wallet for the Greek market: it organizes all your policies in one place, analyzes them with AI, and detects coverage gaps before they cost you.",
    },
    description: {
        el: "Ψηφιακό ασφαλιστικό πορτοφόλι με ανάλυση AI: οργάνωση συμβολαίων, εντοπισμός κενών κάλυψης και υπενθυμίσεις ανανέωσης, στα ελληνικά και στα αγγλικά.",
        en: "Digital insurance wallet with AI analysis: policy organization, coverage-gap detection, and renewal reminders, in Greek and English.",
    },
    contactEmail: "hello@policywallet.com",
    careersEmail: "careers@policywallet.com",
    /** Real values only — placeholders are never rendered. */
    contactPhone: envOrUndefined(process.env.NEXT_PUBLIC_CONTACT_PHONE),
    address: {
        streetAddress: envOrUndefined(process.env.NEXT_PUBLIC_CONTACT_STREET),
        addressLocality: envOrUndefined(process.env.NEXT_PUBLIC_CONTACT_CITY),
        postalCode: envOrUndefined(process.env.NEXT_PUBLIC_CONTACT_POSTAL_CODE),
        addressCountry: "GR",
    },
    social: {
        linkedin: envOrUndefined(process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN),
        facebook: envOrUndefined(process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK),
        instagram: envOrUndefined(process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM),
        x: envOrUndefined(process.env.NEXT_PUBLIC_SOCIAL_X),
    },
} as const

/**
 * Shared 1200×630 link-preview images (app/opengraph-image.tsx routes).
 * Referenced explicitly in every page's metadata: child `openGraph` objects
 * shallow-replace the parent's, so relying on inheritance or file-convention
 * auto-injection silently drops og:image on pages that set their own OG data.
 */
export const OG_IMAGES = [
    {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "PolicyWallet — Your insurance, understood.",
    },
]

export const TWITTER_IMAGES = ["/twitter-image"]

/** Social profile URLs that are actually configured (for footer + sameAs). */
export function getSocialProfiles(): { label: string; url: string }[] {
    const { linkedin, facebook, instagram, x } = siteConfig.social
    return [
        linkedin && { label: "LinkedIn", url: linkedin },
        facebook && { label: "Facebook", url: facebook },
        instagram && { label: "Instagram", url: instagram },
        x && { label: "X", url: x },
    ].filter(Boolean) as { label: string; url: string }[]
}

export function hasCompleteAddress(): boolean {
    return Boolean(
        siteConfig.address.streetAddress &&
        siteConfig.address.addressLocality &&
        siteConfig.address.postalCode
    )
}
