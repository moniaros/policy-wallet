import Link from "next/link"
import { HeartPulse } from "lucide-react"

/**
 * Agent-link status + health check-up reminder + coverage-overlap note.
 * The old "savings estimate" tile fabricated a €/year figure from a 12%
 * multiplier — it now reports the honest signal (branches with multiple
 * policies) and defers the judgement to coverage insights.
 */
export function StatusRow({
    agentConnected,
    labels,
}: {
    agentConnected: boolean
    labels: {
        agentStatus: string
        agentLine: string
        checkupKicker: string
        checkupLine: string
        savingsKicker: string
        savingsLine: string
    }
}) {
    return (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Link href="/agent" className="pw-card pw-pad">
                <p className="pw-kicker">{labels.agentStatus}</p>
                <div className="mt-3 flex items-center gap-3">
                    <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${
                            agentConnected ? "bg-primary" : "bg-black/30 dark:bg-white/30"
                        }`}
                    />
                    <p className="text-sm text-black/80 dark:text-white/80">{labels.agentLine}</p>
                </div>
            </Link>

            <div className="pw-card pw-pad">
                <p className="pw-kicker">{labels.checkupKicker}</p>
                <div className="mt-3 flex items-start gap-3">
                    <HeartPulse className="mt-0.5 h-5 w-5 text-primary dark:text-mint" />
                    <p className="text-sm text-black/80 dark:text-white/80">{labels.checkupLine}</p>
                </div>
            </div>

            <Link href="/coverage-insights" className="pw-card pw-pad">
                <p className="pw-kicker">{labels.savingsKicker}</p>
                <div className="mt-3">
                    <p className="text-sm text-black/80 dark:text-white/80">{labels.savingsLine}</p>
                </div>
            </Link>
        </div>
    )
}
