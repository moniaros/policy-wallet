import Link from "next/link"

/**
 * Explains an insurance term where it is used, not on a separate marketing page.
 *
 * PolicyWallet already ships a full Greek insurance dictionary at /lexiko, with
 * a 40-60 word `shortDefinition` per term — and none of it was reachable from
 * inside the product. A policyholder reading their own policy saw "Απαλλαγή",
 * "Ασφαλισμένο κεφάλαιο" and "Εξαίρεση" as bare labels, which assumes exactly
 * the prior knowledge someone using a policy-explaining product is least likely
 * to have. Those three terms decide what you actually get paid, so not knowing
 * them is not a cosmetic problem.
 *
 * Presentational on purpose: the definition is resolved on the server by
 * `resolveGlossaryHint` and passed in, because the policy-detail tree is a
 * client component and importing the glossary module there would ship all
 * twelve terms — both locales, bodies and FAQs — to the browser for one
 * sentence.
 *
 * <details>: no JS, keyboard operable, announced, and collapsed by default so a
 * reader who already knows the term is not talked down to.
 */
export type GlossaryHintData = {
    heading: string
    definition: string
    href: string
    moreLabel: string
}

export function GlossaryHint({ hint, className = "" }: { hint: GlossaryHintData; className?: string }) {
    return (
        <details className={`inline-block align-baseline ${className}`}>
            <summary className="inline cursor-pointer list-none underline decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                {hint.heading}
            </summary>
            <span className="mt-1.5 block w-64 max-w-[78vw] rounded-g-control border border-border-subtle bg-surface-sunken p-3 text-g-app-caption font-normal normal-case leading-relaxed tracking-normal text-fg-secondary">
                {hint.definition}{" "}
                <Link href={hint.href} className="inline-flex min-h-11 min-w-11 items-center justify-center font-semibold text-fg-brand underline-offset-2 hover:underline">
                    {hint.moreLabel}
                </Link>
            </span>
        </details>
    )
}
