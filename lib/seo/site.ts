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

/** Absolute URL for a site path — the single place paths become full URLs. */
export function absoluteUrl(path: string): string {
    return `${getSiteOrigin()}${path.startsWith("/") ? path : `/${path}`}`
}

/**
 * Only the production deployment may be indexed. Vercel sets VERCEL_ENV to
 * "production" | "preview" | "development"; preview/branch deploys (and the
 * retired vercel.app alias serving them) must never compete with the
 * production domain in search. Outside Vercel (local dev, self-hosted) we
 * stay indexable so `next start` smoke tests see production behavior.
 */
export function isIndexableDeployment(): boolean {
    const vercelEnv = process.env.VERCEL_ENV
    return vercelEnv ? vercelEnv === "production" : true
}

/**
 * Host shown inside decorative product-mock browser bars on the landing
 * pages. Display-only branding — never used to build real links.
 */
export const PRODUCT_DISPLAY_HOST = "app.policywallet.gr"

function envOrUndefined(value: string | undefined): string | undefined {
    const trimmed = value?.trim()
    return trimmed ? trimmed : undefined
}

export const siteConfig = {
    name: "PolicyWallet",
    /**
     * One-line definition used for snippets and AI extraction (AEO). This is
     * the ONE place the category label lives — visitor-facing copy renders
     * the plain-language CATEGORY sentence from lib/marketing/positioning.ts
     * instead. EL is authoritative; EN must carry the identical meaning
     * («προσωπική ανάλυση ρίσκου» ↔ "personal risk intelligence").
     */
    definition: {
        // "What to fix first" is a Plus output and this sentence ships inside
        // the SAME SoftwareApplication node that advertises the €0 offer — so
        // the prioritisation clause names its plan. Everything before it is
        // baseline (reading your policy, showing where cover ends).
        el: "Το PolicyWallet είναι η ανεξάρτητη πλατφόρμα προσωπικής ανάλυσης ρίσκου για την ελληνική αγορά. Διαβάζει τις ασφάλειές σας και δείχνει πού είστε καλυμμένοι και πού όχι — και, με το Family, τι να διορθώσετε πρώτα. Δεν πουλάμε ασφάλειες και δεν παίρνουμε προμήθεια.",
        en: "PolicyWallet is the independent personal risk intelligence platform for the Greek market. It reads your insurance and shows where you are covered and where you are not — and, with Family, what to fix first. We do not sell insurance and we take no commission.",
    },
    // App-wide fallback meta (root layout). Kept in step with the home meta:
    // no "fix first" (a Plus output) and no free-fusion.
    description: {
        el: "Ανεξάρτητος έλεγχος ρίσκου με AI: δείτε πού είστε καλυμμένοι και πού έχετε κενά. Δεν πουλάμε ασφάλειες. Στα ελληνικά και στα αγγλικά.",
        en: "Independent risk check powered by AI: see where you are covered and where the gaps are. We do not sell insurance. Greek and English.",
    },
    // The product domain is policywallet.gr — a .com address here is rendered
    // publicly on /contact and in JSON-LD, and is not a mailbox we control.
    contactEmail: "info@policywallet.gr",
    careersEmail: "careers@policywallet.gr",
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
/**
 * Link-preview cards are per-locale: the Greek tree gets the Greek card (its
 * category name previously never appeared in any share preview) and /en gets
 * the English one. Alt mirrors the decode sentence so it cannot contradict
 * the image — see lib/seo/og-card.tsx.
 */
export function ogImagesFor(locale: "el" | "en") {
    return [
        {
            url: locale === "en" ? "/opengraph-image-en" : "/opengraph-image",
            width: 1200,
            height: 630,
            alt:
                locale === "en"
                    ? "PolicyWallet — AI Personal Risk Intelligence"
                    : "PolicyWallet — Δεν αξιολογούμε τα συμβόλαιά σας. Αξιολογούμε την προστασία της ζωής σας.",
        },
    ]
}

export function twitterImagesFor(locale: "el" | "en") {
    return [locale === "en" ? "/opengraph-image-en" : "/twitter-image"]
}

/** Greek defaults for the shared shell (root layout) and locale-less callers. */
export const OG_IMAGES = ogImagesFor("el")

export const TWITTER_IMAGES = twitterImagesFor("el")

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
