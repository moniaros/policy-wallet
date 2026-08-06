import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgCard } from "@/lib/seo/og-card"

/**
 * Site-wide link-preview card. Greek is the default because Greek is the
 * primary market and the Greek tree is the default locale; /en has its own
 * card at app/(public)/en/opengraph-image.tsx.
 */
export const alt = ogAlt("el")
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function OpenGraphImage() {
    return renderOgCard("el")
}
