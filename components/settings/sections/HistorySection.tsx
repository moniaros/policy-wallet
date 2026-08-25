import { LifeTimeline, type TimelineEntryView } from "@/components/timeline/LifeTimeline"

/**
 * Ιστορικό δραστηριότητας — the Personal Life Timeline, relocated into
 * settings (V2-P2-02, ledger T-01: a relocation, not a deletion).
 *
 * Deliberately a thin wrapper over the SAME component the `/timeline` route
 * renders: the ledger's survival rows — T-02 (filter by kind), T-03 (the
 * cause link that clears the filter first), T-04 (per-entry policy links) —
 * cannot diverge between the old surface and this one while both exist,
 * because there is only one implementation to diverge from. When the removal
 * item deletes `/timeline`, this page keeps the capability.
 */
interface HistorySectionProps {
    entries: TimelineEntryView[]
    language: "en" | "el"
}

export function HistorySection({ entries, language }: HistorySectionProps) {
    return <LifeTimeline entries={entries} language={language} />
}
