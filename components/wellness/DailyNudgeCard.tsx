"use client"

import { useEffect, useState, useTransition } from "react"
import { Footprints } from "lucide-react"
import { setDailyNudgeOptIn } from "@/app/(protected)/wellness/actions"

/**
 * Prevention brief — the Daily Health Nudge: one small, general habit a day.
 * «Όχι σήμερα» hides it until tomorrow in this browser only (a per-viewer
 * convenience; nothing is stored about the person). The push toggle appears
 * only where the page passes `push`.
 */
export function DailyNudgeCard({ day, text, copy, push }: {
    day: string
    text: string
    copy: { kicker: string; dismiss: string; hidden: string; disclaimer: string; pushLabel: string; pushHint: string; pushOn: string; pushOff: string }
    push?: { on: boolean }
}) {
    const storageKey = `pw_nudge_hidden_${day}`
    const [hidden, setHidden] = useState(false)
    const [pushOn, setPushOn] = useState(push?.on ?? false)
    const [status, setStatus] = useState<string | null>(null)
    const [pending, start] = useTransition()

    useEffect(() => {
        try { setHidden(window.localStorage.getItem(storageKey) === "1") } catch { /* storage unavailable */ }
    }, [storageKey])

    const dismiss = () => {
        setHidden(true)
        try { window.localStorage.setItem(storageKey, "1") } catch { /* storage unavailable */ }
    }

    return (
        <section className="pw-card pw-pad" aria-labelledby="daily-nudge-kicker" data-fact="wellness.dailyNudge" data-fact-subject={day}>
            <div className="flex items-start gap-3">
                <span className="pw-card-chip" aria-hidden="true"><Footprints className="h-4 w-4" strokeWidth={1.75} /></span>
                <div className="min-w-0 flex-1">
                    <p id="daily-nudge-kicker" className="pw-kicker">{copy.kicker}</p>
                    {hidden ? (
                        <p className="mt-1 text-sm text-muted-foreground">{copy.hidden}</p>
                    ) : (
                        <p className="mt-1 text-title font-semibold leading-snug text-foreground">{text}</p>
                    )}
                </div>
            </div>
            {!hidden && (
                <button type="button" onClick={dismiss} className="pw-soft-button mt-3">{copy.dismiss}</button>
            )}
            {push && (
                <label className="mt-4 flex items-start gap-3 text-sm text-foreground">
                    <input
                        type="checkbox"
                        className="mt-1"
                        checked={pushOn}
                        disabled={pending}
                        onChange={(e) => {
                            const next = e.target.checked
                            start(async () => {
                                const res = await setDailyNudgeOptIn(next)
                                if ("ok" in res) { setPushOn(res.on); setStatus(res.on ? copy.pushOn : copy.pushOff) }
                            })
                        }}
                    />
                    <span className="min-w-0">
                        <span className="block font-semibold">{copy.pushLabel}</span>
                        <span className="block text-caption text-muted-foreground">{copy.pushHint}</span>
                    </span>
                </label>
            )}
            <p role="status" className="mt-2 text-caption text-muted-foreground">{status ?? ""}</p>
            <p className="mt-1 text-caption text-muted-foreground">{copy.disclaimer}</p>
        </section>
    )
}
