import Link from "next/link"
import { ArrowRight, CircleHelp, Users } from "lucide-react"
import { ActionLink } from "./RecommendationAnalytics"

/**
 * Advisor status + help — the rail's brand-fill card and the quiet help row
 * beneath it. Returns a fragment; the parent column places both.
 *
 * Direction A: this is the reference's dark "upgrade" card, filled with the
 * one relationship the product actually has on record. The fill is the
 * brand green through `bg-primary` / `text-primary-foreground`, so it becomes
 * mint-on-dark by itself — never a hardcoded dark surface (see
 * tests/unit/always-dark-surfaces.test.ts for why that matters).
 */
export function AdvisorSupportRow({
    agentConnected,
    agentName = null,
    labels,
}: {
    agentConnected: boolean
    /** The advisor's display name when connected — for the initials chip only. */
    agentName?: string | null
    labels: {
        agentStatus: string
        agentLine: string
        helpTitle: string
        helpOpen: string
        /** Card title («Ο σύμβουλός σας») — optional so existing callers still type. */
        title?: string
        /** One line under the name: what the advisor can and cannot see. */
        hint?: string
        /** The card's one action — «Άνοιγμα» when connected, «Σύνδεση με σύμβουλο» when not. */
        cta?: string
    }
}) {
    const initials = agentName
        ? agentName
              .split(/\s+/)
              .map((part) => part[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
        : null

    return (
        <>
            <section
                className="rounded-2xl bg-primary p-5 text-primary-foreground"
                aria-labelledby="advisor-card-heading"
            >
                <p id="advisor-card-heading" className="text-body-lg font-semibold leading-snug tracking-tight">
                    {labels.title ?? labels.agentStatus}
                </p>
                <div className="mt-4 flex items-center gap-3">
                    <span
                        className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-primary-foreground/15 text-sm font-semibold"
                        aria-hidden="true"
                    >
                        {agentConnected && initials ? initials : <Users className="h-5 w-5" />}
                    </span>
                    <p className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">{labels.agentLine}</p>
                </div>
                {labels.hint && <p className="mt-3 text-body-sm leading-snug opacity-90">{labels.hint}</p>}
                <ActionLink
                    kind="contact_advisor"
                    href="/agent"
                    className="pw-primary-button-inverse mt-4 inline-flex min-h-11 items-center gap-2 !px-4 !py-2 text-sm"
                >
                    {labels.cta ?? labels.agentStatus}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                </ActionLink>
            </section>

            <Link href="/help" className="pw-card pw-pad flex min-h-11 items-center gap-3 transition-colors hover:border-primary/40">
                <span className="pw-card-chip" aria-hidden="true">
                    <CircleHelp className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{labels.helpTitle}</span>
                    <span className="block text-xs text-muted-foreground">{labels.helpOpen}</span>
                </span>
                <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden />
            </Link>
        </>
    )
}
