"use client"

import { Users } from "lucide-react"
import Link from "next/link"
import type { Bilingual } from "@/lib/services/gap-engine/risk-types"
import { agentWorkspaceCopy } from "@/lib/i18n/agent-workspace"

interface HouseholdView {
    userId: string
    name: string
    impact: number
    factors: { exposure: number }
    whatChanged: Bilingual | null
    whyItMatters: Bilingual
    nextAction: Bilingual
    confidence: "high" | "medium" | "low"
    healthIndex: number | null
    dependantCount: number
}

export interface AdvisorBookViewProps {
    language: "en" | "el"
    overview: {
        householdCount: number; peopleCovered: number; urgentHouseholds: number
        openAreas: number; unknownHouseholds: number; medianHealth: number | null
        whatChanged: Bilingual | null; whyItMatters: Bilingual; nextAction: Bilingual
    }
    households: HouseholdView[]
    totalCustomers: number
    truncated: boolean
    page?: number
    failedCount?: number
    hasNextPage?: boolean
}

export function AdvisorBookView({ language, overview, households, totalCustomers, page = 1, failedCount = 0, hasNextPage = false }: AdvisorBookViewProps) {
    const copy = agentWorkspaceCopy[language]
    return <div className="space-y-6">
        <header>
            <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight"><Users className="h-5 w-5" aria-hidden="true" />{copy.title}</h1>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">{copy.scope}</p>
        </header>
        <dl className="flex flex-wrap gap-x-8 gap-y-4 border-y border-border py-4">
            {[[copy.total, totalCustomers], [copy.assessed, households.length], [copy.unknown, overview.unknownHouseholds], [copy.failed, failedCount]].map(([label, value]) =>
                <div key={label}><dt className="text-caption text-muted-foreground">{label}</dt><dd className="text-lg font-semibold tabular-nums">{value}</dd></div>
            )}
        </dl>
        {failedCount > 0 && <p role="status" className="text-sm text-status-warning">{copy.failedHelp}</p>}
        <p className="text-sm text-muted-foreground">{copy.order}</p>
        {households.length === 0 ? <p>{copy.empty}</p> : <ul className="divide-y divide-border">
            {households.map(household => <li key={household.userId} className="py-5 sm:flex sm:items-start sm:justify-between sm:gap-8">
                <div className="min-w-0 max-w-prose">
                    <Link href={`/customers/${household.userId}`} className="font-semibold hover:underline [overflow-wrap:anywhere]">{household.name}</Link>
                    {household.whatChanged && <p className="mt-2 text-sm">{household.whatChanged[language]}</p>}
                    <p className="mt-2 text-sm text-muted-foreground">{household.whyItMatters[language]}</p>
                    <p className="mt-2 text-sm font-medium">{household.nextAction[language]}</p>
                </div>
                <Link href={`/customers/${household.userId}`} className="pw-soft-button mt-3 shrink-0 sm:mt-0">{copy.review}</Link>
            </li>)}
        </ul>}
        <nav aria-label={copy.title} className="flex justify-between gap-4">
            {page > 1 ? <Link className="pw-soft-button" href={`/insights/book?page=${page - 1}`}>{copy.previous}</Link> : <span />}
            {hasNextPage && <Link className="pw-soft-button" href={`/insights/book?page=${page + 1}`}>{copy.next}</Link>}
        </nav>
    </div>
}
