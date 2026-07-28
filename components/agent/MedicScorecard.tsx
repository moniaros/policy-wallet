"use client"

/**
 * MEDIC scorecard — the qualification VIEW on the opportunity modal (blueprint
 * §F/§K Now: "advisors inspect & prioritize"). Values are seeded from
 * gaps/renewals and from AI-suggested note extraction the advisor confirms.
 * §F's inline fields cover the two dimensions no automation can honestly
 * fill: the Metrics € figure and stakeholder identification — editable only
 * when the parent wires `onPatch`. Transparent everywhere — six dimensions,
 * each 0/1/2, no black box.
 */

import { useState } from "react"
import { calculateMedicScore } from "@/lib/medic/score"
import type { MedicData, MedicStakeholder } from "@/lib/medic/types"
import type { MedicPatch } from "@/lib/medic/patch"

interface ScorecardCopy {
    scorecardTitle: string
    scorecardHint: string
    scorecardEmpty: string
    dimMetrics: string
    dimEconomicBuyer: string
    dimDecisionCriteria: string
    dimDecisionProcess: string
    dimIdentifyPain: string
    dimChampion: string
    ratingMissing: string
    ratingPartial: string
    ratingSolid: string
    qualifiedYes: string
    qualifiedNo: string
    complianceClear: string
    complianceOpen: string
    scValueAtRisk?: string
    scSave?: string
    scAddEb?: string
    scEbNamePlaceholder?: string
    scIdentified?: string
}

const RATING_STYLE: Record<0 | 1 | 2, string> = {
    0: "bg-black/5 text-black/55 dark:bg-white/10 dark:text-white/60",
    1: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    2: "bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint",
}

export function MedicScorecard({
    medic,
    copy,
    onPatch,
}: {
    medic: MedicData | null
    copy: ScorecardCopy
    /** When provided, the Metrics € figure and EB/Champion identification become editable (§F inline fields). */
    onPatch?: (patch: MedicPatch) => Promise<void>
}) {
    const result = calculateMedicScore(medic)
    const hasAnyEvidence = medic && Object.keys(medic).length > 0

    const [varDraft, setVarDraft] = useState(() =>
        medic?.metrics?.valueAtRisk != null ? String(medic.metrics.valueAtRisk) : ""
    )
    const [ebName, setEbName] = useState("")
    const [busy, setBusy] = useState(false)

    const submit = async (patch: MedicPatch) => {
        if (!onPatch || busy) return
        setBusy(true)
        try {
            await onPatch(patch)
        } finally {
            setBusy(false)
        }
    }

    const saveValueAtRisk = () => {
        const trimmed = varDraft.trim().replace(",", ".")
        if (trimmed === "") return void submit({ valueAtRisk: null })
        const parsed = Number(trimmed)
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10_000_000) return
        void submit({ valueAtRisk: parsed })
    }

    const markIdentified = (stance: MedicStakeholder["stance"]) => {
        const list = medic?.stakeholders ?? []
        let flipped = false
        const next = list.map((s) => {
            if (!flipped && s.stance === stance && !s.identified) {
                flipped = true
                return { ...s, identified: true }
            }
            return s
        })
        if (flipped) void submit({ stakeholders: next })
    }

    const addEconomicBuyer = () => {
        const name = ebName.trim()
        if (!name) return
        const next: MedicStakeholder[] = [
            ...(medic?.stakeholders ?? []),
            // The advisor naming the decision-maker IS the identification.
            { name, stance: "economic_buyer", identified: true },
        ]
        setEbName("")
        void submit({ stakeholders: next })
    }

    const eb = medic?.stakeholders?.find((s) => s.stance === "economic_buyer")
    const champion = medic?.stakeholders?.find((s) => s.stance === "champion")

    const inputClass =
        "w-24 rounded-lg border border-black/15 bg-white px-2 py-1 text-xs text-black focus:outline-none focus:ring-1 focus:ring-primary dark:border-white/20 dark:bg-white/10 dark:text-white"
    const miniBtnClass =
        "rounded-lg border border-black/15 px-2 py-1 text-kicker font-bold uppercase tracking-wider text-black/70 transition hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/10"

    const rows: Array<{ label: string; rating: 0 | 1 | 2; detail?: string }> = [
        { label: copy.dimIdentifyPain, rating: result.ratings.identifyPain, detail: medic?.pain?.summary ?? undefined },
        { label: copy.dimMetrics, rating: result.ratings.metrics, detail: medic?.metrics?.valueAtRisk != null ? `€${medic.metrics.valueAtRisk}` : medic?.metrics?.targetOutcome },
        { label: copy.dimEconomicBuyer, rating: result.ratings.economicBuyer, detail: medic?.stakeholders?.find((s) => s.stance === "economic_buyer")?.name },
        { label: copy.dimChampion, rating: result.ratings.champion, detail: medic?.stakeholders?.find((s) => s.stance === "champion")?.name },
        { label: copy.dimDecisionCriteria, rating: result.ratings.decisionCriteria, detail: medic?.criteria?.length ? String(medic.criteria.length) : undefined },
        { label: copy.dimDecisionProcess, rating: result.ratings.decisionProcess, detail: medic?.decisionProcess?.compellingEventAt?.slice(0, 10) ?? medic?.decisionProcess?.compellingEvent },
    ]

    const ratingLabel = (r: 0 | 1 | 2) =>
        r === 2 ? copy.ratingSolid : r === 1 ? copy.ratingPartial : copy.ratingMissing

    if (!hasAnyEvidence) {
        return (
            <p className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2.5 text-xs text-black/60 dark:border-white/15 dark:bg-white/5 dark:text-white/60">
                {copy.scorecardEmpty}
            </p>
        )
    }

    return (
        <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/15 dark:bg-white/5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-black text-black dark:text-white">{result.score}</span>
                    <span className="text-kicker text-muted-foreground">/100</span>
                    <span className={`rounded-full px-2 py-0.5 text-kicker font-bold uppercase tracking-wider ${result.qualified ? RATING_STYLE[2] : RATING_STYLE[0]}`}>
                        {result.qualified ? copy.qualifiedYes : copy.qualifiedNo}
                    </span>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-kicker font-bold uppercase tracking-wider ${result.complianceClear ? RATING_STYLE[2] : RATING_STYLE[1]}`}>
                    {result.complianceClear ? copy.complianceClear : copy.complianceOpen}
                </span>
            </div>
            <ul className="space-y-1">
                {rows.map((row) => (
                    <li key={row.label} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-black/70 dark:text-white/70">{row.label}</span>
                        <span className="flex min-w-0 items-center gap-1.5">
                            {row.detail && (
                                <span className="max-w-[160px] truncate text-muted-foreground">{row.detail}</span>
                            )}
                            <span className={`rounded-full px-2 py-0.5 text-kicker font-bold uppercase tracking-wider ${RATING_STYLE[row.rating]}`}>
                                {ratingLabel(row.rating)}
                            </span>
                        </span>
                    </li>
                ))}
            </ul>
            {onPatch && (
                <div className="mt-2 space-y-1.5 border-t border-black/10 pt-2 dark:border-white/15">
                    <div className="flex items-center justify-between gap-2">
                        <label htmlFor="medic-var" className="text-micro text-black/60 dark:text-white/60">
                            {copy.scValueAtRisk}
                        </label>
                        <span className="flex items-center gap-1.5">
                            <input
                                id="medic-var"
                                type="text"
                                inputMode="decimal"
                                value={varDraft}
                                onChange={(e) => setVarDraft(e.target.value)}
                                disabled={busy}
                                className={inputClass}
                            />
                            <button type="button" id="medic-var-save" onClick={saveValueAtRisk} disabled={busy} className={miniBtnClass}>
                                {copy.scSave}
                            </button>
                        </span>
                    </div>
                    {eb ? (
                        !eb.identified && (
                            <div className="flex items-center justify-between gap-2">
                                <span className="max-w-[160px] truncate text-micro text-black/60 dark:text-white/60">
                                    {copy.dimEconomicBuyer}: {eb.name}
                                </span>
                                <button type="button" onClick={() => markIdentified("economic_buyer")} disabled={busy} className={miniBtnClass}>
                                    {copy.scIdentified}
                                </button>
                            </div>
                        )
                    ) : (
                        <div className="flex items-center justify-between gap-2">
                            <label htmlFor="medic-eb-name" className="text-micro text-black/60 dark:text-white/60">
                                {copy.scAddEb}
                            </label>
                            <span className="flex items-center gap-1.5">
                                <input
                                    id="medic-eb-name"
                                    type="text"
                                    value={ebName}
                                    onChange={(e) => setEbName(e.target.value)}
                                    placeholder={copy.scEbNamePlaceholder}
                                    disabled={busy}
                                    className={inputClass}
                                />
                                <button type="button" id="medic-eb-save" onClick={addEconomicBuyer} disabled={busy || !ebName.trim()} className={miniBtnClass}>
                                    {copy.scSave}
                                </button>
                            </span>
                        </div>
                    )}
                    {champion && !champion.identified && (
                        <div className="flex items-center justify-between gap-2">
                            <span className="max-w-[160px] truncate text-micro text-black/60 dark:text-white/60">
                                {copy.dimChampion}: {champion.name}
                            </span>
                            <button type="button" onClick={() => markIdentified("champion")} disabled={busy} className={miniBtnClass}>
                                {copy.scIdentified}
                            </button>
                        </div>
                    )}
                </div>
            )}
            <p className="mt-2 text-micro leading-snug text-muted-foreground">{copy.scorecardHint}</p>
        </div>
    )
}
