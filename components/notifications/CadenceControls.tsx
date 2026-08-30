"use client"

import { useState, useTransition } from "react"
import { BellOff } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { Switch } from "@/components/ui/form/Switch"
import { saveOutboundPause, saveMonthlyCeiling } from "@/app/(protected)/me/cadence-actions"
import { MONTHLY_CEILING_CHOICES } from "@/lib/notifications/cadence-options"

export interface CadenceState {
    outboundPaused: boolean
    monthlyCeiling: number | null
    /** The ceiling is stored on the policyholder profile; other roles get the switch only. */
    ceilingConfigurable: boolean
}

/**
 * The §9.5 cadence controls: the global outbound off switch and the monthly
 * ceiling on non-deadline outbound. Two controls, no more — Ρυθμίσεις is the
 * product's density reference, and everything else about cadence (which
 * streams, which hours) already has its own control on this screen.
 *
 * Both save on change, optimistically, exactly like the stream switches
 * above them: a control that needs a separate save button for one toggle
 * reads as a form, and this is not a form.
 */
export function CadenceControls({ initial }: { initial: CadenceState }) {
    const { t } = useLanguage()
    const copy = t.settings.cadence

    const [paused, setPaused] = useState(initial.outboundPaused)
    const [pausePending, setPausePending] = useState(false)
    const [ceiling, setCeiling] = useState(initial.monthlyCeiling)
    const [ceilingPending, startCeiling] = useTransition()

    const togglePause = async (next: boolean) => {
        setPaused(next)
        setPausePending(true)
        const result = await saveOutboundPause(next).catch(() => ({ error: "FAILED" }))
        setPausePending(false)
        if (result && "error" in result && result.error) {
            setPaused(!next)
            toast.error(copy.saveFailed)
        }
    }

    const changeCeiling = (raw: string) => {
        const next = raw === "" ? null : Number(raw)
        const previous = ceiling
        setCeiling(next)
        startCeiling(async () => {
            const result = await saveMonthlyCeiling(next).catch(() => ({ error: "FAILED" }))
            if (result && "error" in result && result.error) {
                setCeiling(previous)
                toast.error(copy.saveFailed)
            }
        })
    }

    return (
        <div className="space-y-1">
            <Switch
                checked={paused}
                onCheckedChange={(next) => void togglePause(next)}
                pending={pausePending}
                label={copy.pauseLabel}
                description={copy.pauseDescription}
                icon={<BellOff className="h-4 w-4" />}
            />

            {initial.ceilingConfigurable && (
                <div className="pt-2">
                    <label
                        htmlFor="outboundMonthlyCeiling"
                        className="block text-sm font-semibold text-black dark:text-white"
                    >
                        {copy.ceilingLabel}
                    </label>
                    <p
                        id="outboundMonthlyCeiling-desc"
                        className="mt-0.5 text-caption leading-snug text-muted-foreground"
                    >
                        {copy.ceilingDescription}
                    </p>
                    <select
                        id="outboundMonthlyCeiling"
                        aria-describedby="outboundMonthlyCeiling-desc"
                        value={ceiling ?? ""}
                        onChange={(e) => changeCeiling(e.target.value)}
                        disabled={ceilingPending}
                        className="pw-input pw-input-sm mt-2 w-full min-h-11 disabled:opacity-60 sm:max-w-60"
                    >
                        <option value="">{copy.ceilingNone}</option>
                        {MONTHLY_CEILING_CHOICES.map((n) => (
                            <option key={n} value={n}>
                                {n} {copy.ceilingPerMonth}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    )
}
