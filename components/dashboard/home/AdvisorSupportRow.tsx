import Link from "next/link"
import { ArrowRight, CircleHelp, Users } from "lucide-react"
import { ActionLink } from "./RecommendationAnalytics"
import { CardHead } from "./CardHead"

/**
 * Advisor status + help — the rail's people card and the quiet help row
 * beneath it. Returns a fragment; the parent column places both.
 *
 * Story rebuild (2026-09-07): this WAS the reference's brand-fill card. On the
 * story home the one filled surface is the next-step banner, because the page
 * has exactly one thing it wants done today and the fill is how it says so;
 * a second fill in the rail competed with it for the eye. The card now wears
 * the anatomy every other card wears (CardHead · line · soft action).
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
            <section className="pw-card pw-pad" aria-labelledby="advisor-card-heading">
                <CardHead icon={Users} title={labels.title ?? labels.agentStatus} id="advisor-card-heading" />
                <div className="mt-4 flex items-center gap-3">
                    <span
                        className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-xl bg-primary-soft text-sm font-semibold text-primary dark:bg-primary/15 dark:text-mint"
                        aria-hidden="true"
                    >
                        {agentConnected && initials ? initials : <Users className="h-5 w-5" />}
                    </span>
                    <p className="min-w-0 text-sm font-semibold text-foreground [overflow-wrap:anywhere]">{labels.agentLine}</p>
                </div>
                {labels.hint && <p className="mt-3 text-body-sm leading-snug text-muted-foreground">{labels.hint}</p>}
                <ActionLink kind="contact_advisor" href="/agent" className="pw-soft-button mt-4 !px-4">
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
