import { AlertTriangle, Clock3, Info } from "lucide-react"
import type { ProvenanceLine } from "@/lib/gaps/findings-provenance"

/**
 * The one line that says which run a list of findings came from — and, when
 * the latest attempt is not that run, says so (B0.3).
 *
 * Presentational and server-safe: the caller resolves the sentence through
 * `findingsProvenanceLine()` so every surface (B2C detail, B2B client view,
 * the report) renders the same words for the same state. Text is always
 * present; the icon is decorative and hidden from assistive tech, so colour or
 * glyph is never the only carrier. `data-fact` marks it as the ONE place on a
 * surface that states the findings' provenance.
 */
export function FindingsProvenanceLine({ line, className = "" }: { line: ProvenanceLine; className?: string }) {
    const { text, tone, state } = line
    const Icon = tone === "warning" ? AlertTriangle : tone === "muted" ? Clock3 : Info
    const toneClass =
        tone === "warning"
            ? "text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50"
            : tone === "muted"
              ? "text-muted-foreground bg-muted/40 border-border"
              : "text-foreground/80 bg-muted/30 border-border"
    return (
        <p
            data-fact="gap.findingsProvenance"
            data-provenance-state={state}
            role={tone === "warning" ? "status" : undefined}
            className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm leading-snug ${toneClass} ${className}`}
        >
            <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>{text}</span>
        </p>
    )
}
