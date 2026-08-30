import { cn } from "@/lib/utils"

export type ChecklistState = "ok" | "not" | "review"
export interface ChecklistLine {
    id: string
    label: string
    state: ChecklistState
    /** «άρθρο 4.2» / «σελ. 3» / «δεν αναφέρεται» / «δεν εντοπίστηκε» — never empty. */
    citation: string
    href?: string
}

const GLYPH: Record<ChecklistState, string> = { ok: "✓", not: "—", review: "?" }

/** CoverageChecklist (§5.3, §8.4): per policy, ok / not / review lines, each with a document citation. */
export function CoverageChecklist({ lines, stateLabels, className }: { lines: ChecklistLine[]; stateLabels: Record<ChecklistState, string>; className?: string }) {
    return (
        <ul className={cn("overflow-hidden rounded-g-card border border-border-hair bg-surface-raised shadow-g-raised [&>li+li]:border-t [&>li+li]:border-border-hair [&>li+li]:[border-top-width:0.5px]", className)}>
            {lines.map((l) => (
                <li key={l.id} className="flex min-h-14 items-start gap-g-3 px-g-4 py-g-3">
                    <span aria-hidden className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-g-pill text-sm font-bold", l.state === "ok" && "bg-state-covered-fill text-state-covered", l.state === "not" && "bg-state-gap-fill text-state-gap", l.state === "review" && "bg-state-review-fill text-state-review")}>
                        {GLYPH[l.state]}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-g-app-body text-fg-primary">
                            <span className="sr-only">{stateLabels[l.state]}: </span>
                            {l.label}
                        </span>
                        <span className="block text-g-app-caption text-fg-faint">
                            {l.href ? <a href={l.href} className="underline underline-offset-2 hover:text-fg-secondary">{l.citation}</a> : l.citation}
                        </span>
                    </span>
                </li>
            ))}
        </ul>
    )
}
