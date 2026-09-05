import type { GapProvenance } from "@/lib/gaps/provenance"

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
