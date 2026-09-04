"use client"

/**
 * Declaring a life event, and seeing what it changed.
 *
 * The panel is built around one claim the product could not previously make:
 * **something changed in your life, so we reassessed.** That is why the result
 * of a declaration is the score movement, not a thank-you — the movement is the
 * evidence that telling us was worth the twenty seconds.
 *
 * Mobile-first by construction: one column at every width, a horizontally
 * scrollable domain filter rather than a wrapping row (six chips wrap to four
 * lines at 320px and push the content below the fold), 44px targets throughout,
 * and disclosure that works before hydration.
 *
 * Direction A (2026-09-03): the card head, the sunken rows and the segmented
 * filter are the same three primitives as every other card on /protection —
 * no bordered rows, no brand-green filter pill, no uppercase form labels.
 */

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { CalendarPlus, Check, Loader2 } from "lucide-react"
import { CardHead } from "@/components/dashboard/home/CardHead"
import { EVENT_DOMAIN_LABELS } from "@/lib/services/life-events/registry"

interface Bilingual {
    en: string
    el: string
}

export interface LifeEventOption {
    id: string
    domain: string
    label: Bilingual
    description: Bilingual
    /** True when the event carries an amount (mortgage balance, headcount). */
    needsMagnitude: boolean
    magnitudeLabel: Bilingual | null
    /** Already recorded and not repeatable — shown, disabled, explained. */
    alreadyRecorded: boolean
}

export interface RecordedEvent {
    id: string
    definitionId: string
    label: Bilingual
    occurredAt: string
}

interface LifeEventsPanelProps {
    options: LifeEventOption[]
    recent: RecordedEvent[]
    language: "en" | "el"
}

// One label set for every surface that names a domain (registry.ts).
const DOMAIN_LABELS: Record<string, Bilingual> = EVENT_DOMAIN_LABELS

export function LifeEventsPanel({ options, recent, language }: LifeEventsPanelProps) {
    const lang = language
    const t = (el: string, en: string) => (lang === "el" ? el : en)
    const router = useRouter()

    const [domain, setDomain] = useState<string>("all")
    const [selected, setSelected] = useState<string | null>(null)
    const [occurredAt, setOccurredAt] = useState<string>(() => new Date().toISOString().slice(0, 10))
    const [magnitude, setMagnitude] = useState<string>("")
    const [saving, setSaving] = useState(false)

    const domains = [...new Set(options.map((o) => o.domain))]
    const visible = domain === "all" ? options : options.filter((o) => o.domain === domain)
    const active = options.find((o) => o.id === selected) ?? null

    async function submit() {
        if (!active || saving) return
        setSaving(true)
        try {
            const response = await fetch("/api/v1/life-events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    definitionId: active.id,
                    occurredAt: new Date(`${occurredAt}T12:00:00`).toISOString(),
                    magnitude: magnitude === "" ? null : Number(magnitude),
                }),
            })

            if (!response.ok) {
                const body = await response.json().catch(() => null)
                toast.error(
                    body?.error?.code === "CONFLICT"
                        ? t("Το έχετε ήδη καταγράψει", "You have already recorded this")
                        : t("Δεν αποθηκεύτηκε", "Could not save that")
                )
                return
            }

            // The movement IS the feedback. A bare "saved" would hide the only
            // thing that makes declaring an event worth the reader's time.
            const { data } = await response.json()
            const delta = data?.version?.delta
            if (typeof delta === "number" && delta !== 0) {
                toast.success(
                    delta > 0
                        ? t(
                              `Καταγράφηκε — η προστασία σας ανέβηκε ${delta} μονάδες`,
                              `Recorded — your protection rose by ${delta} points`
                          )
                        : t(
                              `Καταγράφηκε — εντοπίσαμε ${Math.abs(delta)} μονάδες νέας έκθεσης`,
                              `Recorded — we found ${Math.abs(delta)} points of new exposure`
                          )
                )
            } else {
                toast.success(t("Καταγράφηκε", "Recorded"))
            }

            setSelected(null)
            setMagnitude("")
            router.refresh()
        } catch {
            toast.error(t("Δεν αποθηκεύτηκε", "Could not save that"))
        } finally {
            setSaving(false)
        }
    }

    const inputClass = "pw-input pw-input-sm"
    const labelClass = "mb-1 block text-caption font-medium text-muted-foreground"

    return (
        <div className="pw-card pw-pad">
            <CardHead icon={CalendarPlus} title={t("Τι άλλαξε στη ζωή σας;", "What changed in your life?")} />
            <p className="mt-2 text-caption leading-relaxed text-muted-foreground">
                {t(
                    "Κάθε αλλαγή μετακινεί τους κινδύνους σας. Πείτε μας μία και θα επαναξιολογήσουμε αμέσως.",
                    "Every change moves your risks. Tell us one and we will reassess straight away."
                )}
            </p>

            {recent.length > 0 && (
                <div className="pw-subcard mt-4 p-3">
                    <p className="text-caption font-semibold text-muted-foreground">
                        {t("Πρόσφατα", "Recently")}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                        {recent.slice(0, 3).map((event) => (
                            <li
                                key={event.id}
                                className="flex items-start gap-2 text-caption text-foreground"
                            >
                                <Check
                                    className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-status-success"
                                    aria-hidden="true"
                                />
                                <span className="min-w-0">
                                    {event.label[lang] || event.label.en}
                                    <span className="text-muted-foreground">
                                        {" · "}
                                        {new Date(event.occurredAt).toLocaleDateString(
                                            lang === "el" ? "el-GR" : "en-GB",
                                            { day: "numeric", month: "short", year: "numeric" }
                                        )}
                                    </span>
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* A segmented control on the sunken track — the page's lens
                switcher, repeated. Still a scroll strip, not a wrapping row:
                nine domain segments wrap to four lines at 320px and bury the
                events themselves. */}
            <div
                className="pw-segmented pw-scroll-strip mt-4"
                role="group"
                aria-label={t("Φίλτρο κατηγορίας", "Filter by category")}
            >
                <FilterChip
                    active={domain === "all"}
                    onClick={() => setDomain("all")}
                    label={t("Όλα", "All")}
                />
                {domains.map((d) => (
                    <FilterChip
                        key={d}
                        active={domain === d}
                        onClick={() => setDomain(d)}
                        label={DOMAIN_LABELS[d]?.[lang] ?? d}
                    />
                ))}
            </div>

            <ul className="mt-3 space-y-2">
                {visible.map((option) => {
                    const isOpen = selected === option.id
                    return (
                        <li key={option.id}>
                            <button
                                type="button"
                                disabled={option.alreadyRecorded}
                                aria-expanded={isOpen}
                                onClick={() => setSelected(isOpen ? null : option.id)}
                                className={`pw-subcard flex min-h-11 w-full items-start gap-3 p-3 text-left transition-[background-color,box-shadow] ${
                                    option.alreadyRecorded
                                        ? "cursor-not-allowed opacity-60"
                                        : isOpen
                                          ? "cursor-pointer ring-1 ring-primary"
                                          : "cursor-pointer"
                                }`}
                            >
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold text-foreground">
                                        {option.label[lang] || option.label.en}
                                    </span>
                                    {/* The description is reassurance AFTER a
                                        choice, not the thing you scan to find
                                        one. Showing all 21 expanded made the
                                        picker ~2,500px tall at 320px; the reader
                                        knows what changed and only needs to
                                        locate it. */}
                                    {option.alreadyRecorded && (
                                        <span className="mt-0.5 block text-caption leading-relaxed text-muted-foreground">
                                            {t("Το έχετε ήδη καταγράψει", "Already recorded")}
                                        </span>
                                    )}
                                </span>
                            </button>

                            {isOpen && !option.alreadyRecorded && (
                                <div className="pw-subcard mt-2 space-y-3 p-3">
                                    <p className="text-caption leading-relaxed text-foreground/80">
                                        {option.description[lang] || option.description.en}
                                    </p>

                                    <div>
                                        <label htmlFor={`when-${option.id}`} className={labelClass}>
                                            {t("Πότε έγινε;", "When did it happen?")}
                                        </label>
                                        <input
                                            id={`when-${option.id}`}
                                            type="date"
                                            value={occurredAt}
                                            max={new Date().toISOString().slice(0, 10)}
                                            onChange={(e) => setOccurredAt(e.target.value)}
                                            className={inputClass}
                                        />
                                    </div>

                                    {option.needsMagnitude && option.magnitudeLabel && (
                                        <div>
                                            <label htmlFor={`amount-${option.id}`} className={labelClass}>
                                                {option.magnitudeLabel[lang] || option.magnitudeLabel.en}
                                            </label>
                                            <input
                                                id={`amount-${option.id}`}
                                                type="number"
                                                min="0"
                                                inputMode="numeric"
                                                value={magnitude}
                                                onChange={(e) => setMagnitude(e.target.value)}
                                                className={inputClass}
                                                placeholder="0"
                                            />
                                            <p className="mt-1 text-caption text-muted-foreground">
                                                {t(
                                                    "Προαιρετικό — χωρίς αυτό δεν υποθέτουμε ποσό.",
                                                    "Optional — without it we will not assume an amount."
                                                )}
                                            </p>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={submit}
                                        disabled={saving}
                                        className="pw-primary-button min-h-11 w-full cursor-pointer"
                                    >
                                        {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                        {t("Καταγραφή", "Record it")}
                                    </button>
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>

            <p className="mt-4 text-caption leading-snug text-muted-foreground">
                {t(
                    "Ό,τι μας πείτε αλλάζει μόνο την αξιολόγηση κινδύνου σας — δεν αποτελεί ασφαλιστική συμβουλή.",
                    "What you tell us only changes your risk assessment — it is not insurance advice."
                )}
            </p>
        </div>
    )
}

function FilterChip({
    active,
    onClick,
    label,
}: {
    active: boolean
    onClick: () => void
    label: string
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className="pw-segment min-h-11 px-4"
        >
            {label}
        </button>
    )
}
