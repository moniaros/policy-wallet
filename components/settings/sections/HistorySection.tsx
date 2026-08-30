import { LifeTimeline, type TimelineEntryView } from "@/components/timeline/LifeTimeline"

/**
 * Ιστορικό δραστηριότητας — the Personal Life Timeline, relocated into
 * settings (V2-P2-02, ledger T-01: a relocation, not a deletion).
 *
 * Deliberately a thin wrapper over the same `LifeTimeline` the removed
 * `/timeline` route rendered: the ledger's survival rows — T-02 (filter by
 * kind), T-03 (the cause link that clears the filter first), T-04 (per-entry
 * policy links) — lived in one implementation, so V2-P2-03 could delete the
 * route and this page kept the capability whole.
 */
interface HistorySectionProps {
    entries: TimelineEntryView[]
    language: "en" | "el"
}

export function HistorySection({ entries, language }: HistorySectionProps) {
    return (
        <div className="px-g-4 tablet:px-0">
            <LifeTimeline entries={entries} language={language} />
        </div>
    )
}
