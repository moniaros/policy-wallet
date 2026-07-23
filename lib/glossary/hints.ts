import { getGlossaryTerm } from "@/lib/glossary/content"
import type { GlossaryHintData } from "@/components/insurance/GlossaryHint"

/**
 * Server-only: resolve an in-product glossary hint from the dictionary that
 * backs the public /lexiko pages. Keep this out of client components — it pulls
 * the full glossary module.
 */
export function resolveGlossaryHint(
    slug: string,
    lang: "el" | "en",
    label?: string
): GlossaryHintData | null {
    const term = getGlossaryTerm(slug)
    if (!term) return null
    return {
        heading: label ?? term.term[lang],
        definition: term.shortDefinition[lang],
        href: lang === "en" ? `/en/lexiko/${term.slug}` : `/lexiko/${term.slug}`,
        moreLabel: lang === "en" ? "Read more" : "Περισσότερα",
    }
}
