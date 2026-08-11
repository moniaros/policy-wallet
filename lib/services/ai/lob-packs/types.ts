/**
 * Line-of-business knowledge packs — Layer 2 of the prompt architecture.
 *
 * The extraction prompt in `prompts.ts` is Layer 1: universal insurance
 * reasoning that is true of every policy. It deliberately says nothing about
 * what a cargo schedule looks like, because instructions that only apply to one
 * line in twenty are noise on the other nineteen — and a single prompt that
 * tried to cover all of them would be both enormous and, per line, vague.
 *
 * A pack adds the terminology, the field-level hints and the traps for ONE
 * family of lines, and is composed in only when the classifier or the uploader
 * says that family is in play.
 *
 * WHAT A PACK IS NOT: it is not a place to teach the model what a policy
 * "usually" says. Everything here points the model at where to LOOK and warns it
 * about what is easy to confuse. Nothing licenses filling in a value the
 * document does not contain — Layer 1's grounding rules still bind, and the
 * packs say so where the temptation is strongest.
 *
 * `version` is stamped onto the stored extraction alongside the provider and
 * confidence, so a conclusion stays traceable to the guidance that produced it.
 */

export interface LobPack {
    /** Pack id, used in provenance. */
    id: string
    /** Bumped whenever the guidance below changes in a way that could move output. */
    version: string
    /** Branch ids this pack applies to, canonical taxonomy ids. */
    branchIds: string[]
    /** Greek and English terms that identify this line on a schedule. */
    terminology: string[]
    /** Where to look, and what maps to which field. One instruction per line. */
    extractionHints: string[]
    /**
     * Rules that keep the model honest about this line specifically — the places
     * where a plausible guess is most likely and most damaging.
     */
    evidenceRules: string[]
    /** Confusions worth naming outright, as "X is not Y" statements. */
    negativeExamples?: string[]
}

/** Render a pack as the Layer-2 block of an extraction prompt. */
export function formatLobPack(pack: LobPack): string {
    const sections = [
        `LINE-OF-BUSINESS GUIDANCE — ${pack.id} (v${pack.version})`,
        `Recognise this line by: ${pack.terminology.join(", ")}.`,
        `WHERE TO LOOK:\n${pack.extractionHints.map((h) => `- ${h}`).join("\n")}`,
        `EVIDENCE RULES FOR THIS LINE:\n${pack.evidenceRules.map((r) => `- ${r}`).join("\n")}`,
    ]
    if (pack.negativeExamples?.length) {
        sections.push(`DO NOT CONFUSE:\n${pack.negativeExamples.map((n) => `- ${n}`).join("\n")}`)
    }
    return sections.join("\n\n")
}
