/**
 * Whether a home policy insures the building, its contents, or both.
 *
 * `property.contentsVsStructure` is free text from the extraction — the schema's
 * examples are "structure-only, contents-only, both". The panel printed it
 * verbatim, so a Greek policyholder read "structure-only" in English.
 *
 * This is not a labelling nicety. It decides whether a burglary, a burst pipe or
 * a fire that destroys everything inside the flat is paid at all: a
 * structure-only policy covers the walls and nothing standing between them.
 * el.ts has carried «Περιεχόμενα» and «Κτίριο» since the panel was written.
 *
 * Conservative, like the motor tier: an unrecognised string is shown verbatim
 * rather than resolved to a scope we are not sure of. Telling someone their
 * contents are covered when they are not is the failure worth avoiding.
 */
export type HomeCoverScope = "structure_only" | "contents_only" | "both"

export function classifyHomeCoverScope(raw: string | null | undefined): HomeCoverScope | null {
    // No \b — JavaScript word boundaries are ASCII-only and match nothing Greek.
    const s = String(raw || "").toLowerCase().trim()
    if (!s) return null

    const mentionsStructure =
        s.includes("structure") || s.includes("building") || s.includes("κτίρ") || s.includes("κτιρ") ||
        s.includes("οικοδομ")
    const mentionsContents =
        s.includes("content") || s.includes("περιεχόμεν") || s.includes("περιεχομεν")

    // "both" is explicit in the schema's own examples, and a policy naming both
    // subjects covers both — check that before the single-subject cases.
    if (s.includes("both") || s.includes("και τα δύο") || (mentionsStructure && mentionsContents)) return "both"
    if (mentionsStructure) return "structure_only"
    if (mentionsContents) return "contents_only"
    return null
}
