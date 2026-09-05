import { provenanceCitation, provenanceOf, type GapProvenance } from "@/lib/gaps/provenance"

/** The `provenance` i18n namespace (el/en). */
export interface ProvenanceCopy {
    legislative: string
    contractual: string
    market: string
    underReview: string
    emphasisedHeading: string
    marketHeading: string
    marketFraming: string
    underReviewHeading: string
    underReviewDisclosure: string
    underReviewSummaryOmitted: string
    underReviewLink: string
}

const LABEL_KEY: Record<GapProvenance, keyof ProvenanceCopy> = {
    legislative: "legislative",
    contractual: "contractual",
    market: "market",
    under_review: "underReview",
}

/** Text, always. Provenance has no colour of its own anywhere in the product. */
export function provenanceLabel(provenance: GapProvenance, copy: ProvenanceCopy): string {
    return copy[LABEL_KEY[provenance]]
}

/**
 * F5: a classified requirement never renders its class without its citation.
 * «Νομοθετική απαίτηση · Ν. 2496/1997, άρθρο 17 (…)»; an under-review slug
 * renders the label alone. Use this, not provenanceLabel, wherever a slug is
 * at hand — the guard enumerates the callers.
 */
export function provenanceLabelWithCitation(slug: string | null | undefined, lang: "el" | "en", copy: ProvenanceCopy): string {
    const label = provenanceLabel(provenanceOf(slug), copy)
    const citation = provenanceCitation(slug)
    return citation ? `${label} · ${lang === "el" ? citation.el : citation.en}` : label
}
