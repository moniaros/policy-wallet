import Link from "next/link"
import { CircleHelp } from "lucide-react"

/**
 * Advisor status + help, the two quiet tiles at the foot of the dashboard.
 * Returns a fragment — the parent grid places both tiles.
 */
export function AdvisorSupportRow({
    agentConnected,
    labels,
}: {
    agentConnected: boolean
    labels: {
        agentStatus: string
        agentLine: string
        helpTitle: string
        helpOpen: string
    }
}) {
    return (
        <>
            <Link href="/agent" className="pw-card pw-pad">
                <p className="pw-kicker">{labels.agentStatus}</p>
                <div className="mt-3 flex items-center gap-3">
                    <span
                        className={`inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                            agentConnected ? "bg-primary" : "bg-black/30 dark:bg-white/30"
                        }`}
                        aria-hidden
                    />
                    <p className="text-sm text-black/80 dark:text-white/80">{labels.agentLine}</p>
                </div>
            </Link>

            <Link href="/help" className="pw-card pw-pad">
                <p className="pw-kicker">{labels.helpTitle}</p>
                <div className="mt-3 flex items-center gap-3">
                    <CircleHelp className="h-5 w-5 flex-shrink-0 text-black/60 dark:text-white/65" aria-hidden />
                    <p className="text-sm text-black/80 dark:text-white/80">{labels.helpOpen}</p>
                </div>
            </Link>
        </>
    )
}
