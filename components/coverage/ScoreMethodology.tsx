import { Info } from "lucide-react"

/**
 * "How is this score calculated?" — the disclosure that has to sit next to any
 * protection score we show.
 *
 * The score was rendered as a 0–100 number with a red/amber/green verdict and
 * no way for a policyholder to find out what it measured. That is the kind of
 * figure someone could reasonably act on — or feel judged by — so it needs to
 * say what it does, and just as importantly what it does NOT do: it looks at
 * which lines of business you hold against the ones your profile suggests, and
 * says nothing about premiums, insurers or the quality of your wording. A
 * cheaper policy with worse terms scores identically to a better one.
 *
 * It also carries the not-personalised-advice line. Insurance advice in Greece
 * is a regulated activity (IDD; Law 4583/2018) and this product had no such
 * framing anywhere, while presenting AI-derived scores and recommendations.
 *
 * Built on <details> deliberately: it works before hydration, is keyboard
 * operable and screen-reader announced for free, and collapses so the
 * explanation never competes with the number for attention.
 */
export function ScoreMethodology({
    copy,
    className = "",
}: {
    copy: {
        title: string
        body: string
        limits: string
        notAdvice: string
    }
    className?: string
}) {
    return (
        <details className={`group ${className}`}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-caption font-semibold text-black/60 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:text-white/65 [&::-webkit-details-marker]:hidden">
                <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {copy.title}
            </summary>
            <div className="mt-2 space-y-2 border-l-2 border-black/10 pl-3 text-caption leading-relaxed text-black/70 dark:border-white/15 dark:text-white/70">
                <p>{copy.body}</p>
                <p>{copy.limits}</p>
                <p className="text-black/55 dark:text-white/55">{copy.notAdvice}</p>
            </div>
        </details>
    )
}
