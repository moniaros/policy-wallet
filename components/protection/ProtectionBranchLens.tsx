import { buildBranchOverview, type BranchPolicyFacts } from "@/lib/insurance/branch-page"
import { getBranchContent } from "@/lib/insurance/content"
import { getBranchIcon } from "@/lib/insurance/branch-icons"
import { ProductBranchCard } from "@/components/branches/ProductBranchCard"
import type { BranchTileState } from "@/lib/insurance/branch-page"

export interface BranchLensLabels {
    /** t.branches.status* — keyed by tile state. */
    stateLabels: Record<BranchTileState, string>
    /** t.policyTypes — branch id → localized display name. */
    policyTypeLabels: Record<string, string>
    onePolicy: string
    /** Template with {count}. */
    policyCountN: string
}

interface ProtectionBranchLensProps {
    /** Held policies (status ≠ deleted) with LIFECYCLE status already applied. */
    policies: BranchPolicyFacts[]
    /** ProtectionScore.expectedLines — may be empty when no score was ever computed. */
    expectedLines: string[]
    language: "en" | "el"
    labels: BranchLensLabels
}

/**
 * The «ανά κλάδο» lens of /protection — the /branches overview grid, absorbed
 * (§4.2, ledger rows B-01…B-06). Tile states, counts and the not-held register
 * are the SAME derivation as the source surface (buildBranchOverview over
 * lifecycle statuses); only the destination hrefs differ — a line opens inside
 * the new IA at /protection/[branch].
 *
 * B-06 (decided under standing authority, QUEUE.md Phase 2): the `business`
 * line renders to a consumer ONLY when they hold a policy in it. Its
 * `contentTier: 'rich'` carries no B2C/B2B filter, so unconditioned it is
 * noise on a consumer surface; conditioning on ownership keeps the capability
 * exactly where it means something, and is reversible in this one predicate.
 */
export function ProtectionBranchLens({
    policies,
    expectedLines,
    language,
    labels,
}: ProtectionBranchLensProps) {
    const overview = buildBranchOverview(policies, expectedLines).filter(
        // B-06: a B2B line with no held policy does not render on the consumer
        // surface. Today `business` is the only top-level b2b branch; keying on
        // the segment rather than the id keeps the predicate a statement of
        // intent ("no unowned business lines to consumers"), not a name.
        (entry) => entry.branch.segment !== "b2b" || entry.policyCount > 0
    )

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overview.map(({ branch, state, policyCount }) => {
                const content = getBranchContent(branch.id)
                return (
                    <ProductBranchCard
                        key={branch.id}
                        branchId={branch.id}
                        icon={getBranchIcon(branch.id)}
                        href={`/protection/${branch.id}`}
                        title={labels.policyTypeLabels[branch.id] || branch.label[language]}
                        tagline={content.tagline[language]}
                        state={state}
                        stateLabel={labels.stateLabels[state]}
                        policyCount={policyCount}
                        policyCountLabel={
                            policyCount === 1
                                ? labels.onePolicy
                                : labels.policyCountN.replace("{count}", String(policyCount))
                        }
                    />
                )
            })}
        </div>
    )
}
