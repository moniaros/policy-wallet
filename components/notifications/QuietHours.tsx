"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { saveQuietHours } from "@/app/(protected)/account/quiet-hours-actions"
import { Switch } from "@/components/ui/form/Switch"

interface QuietHoursProps {
    initial: { enabled: boolean; start: number; end: number; timezone: string }
}

const HOURS = Array.from({ length: 24 }, (_, i) => i)

/**
 * Quiet hours.
 *
 * Mobile-first: the two hour pickers sit side by side from the smallest width
 * because they are one thought ("from X until Y") and stacking them reads as
 * two unrelated questions. Native `<select>` rather than a custom control —
 * on a phone that gives the platform's own wheel picker, which is faster and
 * more accessible than anything worth rebuilding.
 *
 * The urgent-alerts note is not decoration. Someone switching this on is
 * deciding to be unreachable overnight, and they are entitled to know before
 * they choose that a failed payment will still come through.
 */
export function QuietHours({ initial }: QuietHoursProps) {
    const { t } = useLanguage()
    const [enabled, setEnabled] = useState(initial.enabled)
    const [start, setStart] = useState(initial.start)
    const [end, setEnd] = useState(initial.end)
    const [pending, startTransition] = useTransition()

    const copy = t.settings.quietHours
    const sameHour = enabled && start === end

    function onSubmit(formData: FormData) {
        startTransition(async () => {
            const result = await saveQuietHours(formData)
            if (result?.error) toast.error(copy.saveFailed)
            else toast.success(copy.saved)
        })
    }

    const label = (h: number) => `${String(h).padStart(2, "0")}:00`

    return (
        <form action={onSubmit} className="space-y-3">
            {/* The product's ONE switch — the same control the notification
                streams above use — with a hidden field so the form still posts
                `quietHoursEnabled=on` the way the checkbox did. */}
            <Switch
                checked={enabled}
                onCheckedChange={setEnabled}
                label={copy.title}
                description={copy.description}
                className="!py-0"
            />
            {enabled && <input type="hidden" name="quietHoursEnabled" value="on" />}

            {enabled && (
                <>
                    <div className="flex items-end gap-3">
                        <div className="flex-1 min-w-0">
                            <label
                                htmlFor="quietHoursStart"
                                className="block text-caption text-muted-foreground mb-1"
                            >
                                {copy.from}
                            </label>
                            <select
                                id="quietHoursStart"
                                name="quietHoursStart"
                                value={start}
                                onChange={(e) => setStart(Number(e.target.value))}
                                className="pw-input pw-input-sm w-full min-h-11"
                            >
                                {HOURS.map((h) => (
                                    <option key={h} value={h}>
                                        {label(h)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-0">
                            <label
                                htmlFor="quietHoursEnd"
                                className="block text-caption text-muted-foreground mb-1"
                            >
                                {copy.to}
                            </label>
                            <select
                                id="quietHoursEnd"
                                name="quietHoursEnd"
                                value={end}
                                onChange={(e) => setEnd(Number(e.target.value))}
                                className="pw-input pw-input-sm w-full min-h-11"
                                aria-invalid={sameHour || undefined}
                                aria-describedby={sameHour ? "quiet-hours-error" : undefined}
                            >
                                {HOURS.map((h) => (
                                    <option key={h} value={h}>
                                        {label(h)}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {sameHour && (
                        <p
                            id="quiet-hours-error"
                            role="alert"
                            className="text-caption text-status-danger"
                        >
                            {copy.from} {label(start)} — {copy.to} {label(end)}
                        </p>
                    )}

                    <p className="text-caption text-muted-foreground">{copy.urgentNote}</p>
                </>
            )}

            <button
                type="submit"
                disabled={pending || sameHour}
                className="pw-primary-button pw-btn-sm disabled:opacity-60"
            >
                {copy.save}
            </button>
        </form>
    )
}
