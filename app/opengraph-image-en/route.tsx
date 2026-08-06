import { renderOgCard } from "@/lib/seo/og-card"

/**
 * The English link-preview card, served from a STABLE url.
 *
 * It is a route handler rather than a nested `opengraph-image.tsx` because
 * Next appends a build hash to nested metadata routes (the English card was
 * emitted at /en/opengraph-image-5kmpqe), and that hash changes per build —
 * so the URL cannot be referenced from metadata. Shipping it as a convention
 * file made every /en page advertise an og:image that 404'd.
 */
export const dynamic = "force-static"

export async function GET() {
    return renderOgCard("en")
}
