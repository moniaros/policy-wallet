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

/**
 * The in-product hint set, resolved once on the server.
 *
 * The dictionary defines 12 terms and backs a full public /lexiko section, but
 * only `exairesi` was ever wired into the product — so a policyholder met
 * «Απαλλαγή» and «Χρόνος αναμονής» on their own policy with no explanation,
 * while the definition sat one route away. These are the terms that decide what
 * someone is actually paid after a claim, which makes them the ones worth
 * explaining at the point of reading.
 *
 * Resolved server-side deliberately: lib/glossary/content.ts is ~62KB and must
 * not ship to the policy detail page.
 */
/** Hint key → dictionary slug. One place to see what the product explains. */
const POLICY_HINT_SLUGS = {
    deductible: "apallagi",
    waitingPeriod: "chronos-anamonis",
    greenCard: "prasini-karta",
    roadside: "odiki-voitheia",
    comprehensive: "mikti-asfaleia",
    beneficiary: "dikaiouchos",
    surrender: "exagora",
    sumInsured: "asfalismeno-kefalaio",
    underinsurance: "ypasfalisi",
    sublimit: "ypoorio",
    copayment: "symmetochi",
    renewal: "ananeosi",
    lapse: "ekpnoi",
} as const

export type PolicyHintKey = keyof typeof POLICY_HINT_SLUGS

export function resolvePolicyGlossaryHints(
    lang: "el" | "en",
    labels: Partial<Record<PolicyHintKey, string>>
) {
    const out = {} as Record<PolicyHintKey, GlossaryHintData | null>
    for (const key of Object.keys(POLICY_HINT_SLUGS) as PolicyHintKey[]) {
        out[key] = resolveGlossaryHint(POLICY_HINT_SLUGS[key], lang, labels[key])
    }
    return out
}

export type PolicyGlossaryHints = ReturnType<typeof resolvePolicyGlossaryHints>
