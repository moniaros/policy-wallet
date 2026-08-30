import { db } from "@/lib/db"

/**
 * «Τι έκανα για εσάς φέτος» (§8.9): a PROJECTION over BusinessEvent — no
 * ledger table exists (A-14). Each line appears only when at least one event
 * of its kind happened this year; an empty year renders the honest empty
 * sentence, never an invented achievement.
 */
export interface LedgerCounts {
    policiesRead: number
    renewalsCaught: number
    findingsShown: number
    benefitsSurfaced: number
    questionsAnswered: number
    helpRequests: number
    year: number
}

const LINES: ReadonlyArray<{ key: keyof Omit<LedgerCounts, "year">; names: string[] }> = [
    { key: "policiesRead", names: ["policy.analysis_completed"] },
    { key: "renewalsCaught", names: ["policy.renewal_approaching"] },
    { key: "findingsShown", names: ["finding.shown"] },
    { key: "benefitsSurfaced", names: ["benefit.surfaced"] },
    { key: "questionsAnswered", names: ["question.answered"] },
    { key: "helpRequests", names: ["advisor.help_requested"] },
]

export async function loadLedgerCounts(userId: string, now: Date = new Date()): Promise<LedgerCounts> {
    const year = now.getFullYear()
    const start = new Date(Date.UTC(year, 0, 1))
    const grouped = await db.businessEvent.groupBy({
        by: ["name"],
        where: { subjectUserId: userId, occurredAt: { gte: start }, name: { in: LINES.flatMap((l) => l.names) }, isReplay: false },
        _count: { _all: true },
    })
    const byName = new Map(grouped.map((g) => [g.name, g._count._all]))
    const counts = Object.fromEntries(LINES.map((l) => [l.key, l.names.reduce((n, name) => n + (byName.get(name) ?? 0), 0)])) as Record<keyof Omit<LedgerCounts, "year">, number>
    return { ...counts, year }
}
