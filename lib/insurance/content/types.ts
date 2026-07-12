/**
 * Per-branch editorial product content — the "what this insurance is, why it
 * matters, how to use it better" layer for every insurance branch.
 *
 * Bilingual `{el, en}` objects colocated per branch (the gap-engine
 * SmartCardContent precedent): Greek is the primary copy, structural parity
 * with English is guaranteed by the Bilingual type, and `.ts` modules pass
 * the hardcoded-text linter (it scans `.tsx` only).
 *
 * COMPLIANCE (docs/audits/ai-advice-compliance.md): copy must stay
 * observational and hedged — "φαίνεται", "ενδέχεται", "ίσως αξίζει" — never
 * directive ("πρέπει να αγοράσεις") or absolute ("είσαι πλήρως καλυμμένος").
 * A unit test scans every bundle for banned phrases. Editorial content is
 * static (not AI output), so AiDisclaimer is required only next to
 * engine/AI-derived sections on the pages that render it.
 */

export interface Bilingual {
    el: string
    en: string
}

export type BranchActionType =
    | 'upload'     // add/scan a policy document
    | 'review'     // check something in existing analyzed data
    | 'askAgent'   // hand off to the connected advisor
    | 'askAi'      // open policy Q&A (deep-links with a prefilled question)
    | 'profile'    // complete the risk profile
    | 'renewals'   // renewal timeline / reminders

export interface BranchAction {
    id: string
    label: Bilingual
    /** Navigation target; askAi actions get their question via `question` */
    href: string | null
    ctaType: BranchActionType
    /** For askAi actions: the question to prefill in PolicyQA */
    question?: Bilingual
}

export interface BranchCommonGap {
    id: string
    title: Bilingual
    description: Bilingual
    /**
     * Optional link to a live gap-engine rule id (profile/portfolio) or a
     * seeded GapDefinition slug — lets branch pages badge editorial gaps
     * that the engine actually detected in this user's portfolio. The
     * engine stays the sole source of DETECTED gaps; this list is education.
     */
    relatedRuleId?: string
}

export interface BranchContent {
    branchId: string
    /** One-line promise shown under the branch title */
    tagline: Bilingual
    shortDescription: Bilingual
    whyItMatters: Bilingual[]
    whatWeAnalyze: Bilingual[]
    howToUseBetter: Bilingual[]
    commonGaps: BranchCommonGap[]
    recommendedActions: BranchAction[]
    suggestedQuestions: Bilingual[]
    /** Ordered claim-preparation guidance (educational, no promises) */
    claimsSteps: Bilingual[]
    renewalNote: Bilingual
    emptyState: {
        headline: Bilingual
        description: Bilingual
        ctaLabel: Bilingual
    }
}
