import { OG_CONTENT_TYPE, OG_SIZE, ogAlt, renderOgCard } from "@/lib/seo/og-card"

/** English link-preview card for the /en tree. */
export const alt = ogAlt("en")
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function OpenGraphImageEnglish() {
    return renderOgCard("en")
}
