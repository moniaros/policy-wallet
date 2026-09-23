"use client"

import { useEffect, useState } from "react"
import { Phone, WifiOff } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import type { Translations } from "@/contexts/LanguageContext"
import type { OfflineCardRow } from "@/lib/wallet/offline-card"

type Card = { generatedAt: string; rows: OfflineCardRow[] }
type OfflineCopy = Translations["offline"]

/**
 * Reads the card the service worker cached. No fetch to the server: this page
 * exists for the moment there is none. The age of the numbers is stated.
 */
export function OfflineClient({ copy: copies }: { copy: { el: OfflineCopy; en: OfflineCopy } }) {
    const { language } = useLanguage()
    const locale = language === "el" ? "el" : "en"
    const copy = copies[locale]
    const [card, setCard] = useState<Card | null | undefined>(undefined)

    useEffect(() => {
        let cancelled = false
        async function load() {
            try {
                const cached = await caches.match("/api/v1/me/offline-card")
                const payload = cached ? await cached.json() : null
                if (!cancelled) setCard(payload?.data ?? null)
            } catch {
                if (!cancelled) setCard(null)
            }
        }
        void load()
        return () => { cancelled = true }
    }, [])

    const fmt = (iso: string, withTime: boolean) =>
        new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-GB", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(new Date(iso))

    return (
        <main className="mx-auto w-full max-w-md px-4 py-10">
            <div className="pw-card pw-pad">
                <div className="flex items-center gap-3">
                    <span className="pw-card-chip" aria-hidden="true"><WifiOff className="h-4 w-4" strokeWidth={1.75} /></span>
                    <h1 className="text-title font-semibold text-foreground">{copy.title}</h1>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{copy.intro}</p>

                {card === undefined ? null : card === null || card.rows.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">{copy.nothingCached}</p>
                ) : (
                    <>
                        <p className="mt-4 text-caption text-muted-foreground">{copy.asOf.replace("{when}", fmt(card.generatedAt, true))}</p>
                        <ul className="mt-3 space-y-3">
                            {card.rows.map((row) => (
                                <li key={row.id} className="pw-subcard p-3">
                                    <p className="font-semibold text-foreground">{row.insurer ?? copy.unknownInsurer} · {row.branch[locale]}</p>
                                    {row.endDate && <p className="text-caption text-muted-foreground">{copy.endsOn.replace("{date}", fmt(row.endDate, false))}</p>}
                                    <ul className="mt-2 space-y-1">
                                        {row.phones.map((phone) => (
                                            <li key={phone.kind}>
                                                <a href={`tel:${phone.number.replace(/\s+/g, "")}`} className="pw-soft-button inline-flex w-full justify-between">
                                                    <span>{copy.kinds[phone.kind]}</span>
                                                    <span className="inline-flex items-center gap-1 font-semibold"><Phone className="h-4 w-4" aria-hidden="true" />{phone.number}</span>
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
                <p className="mt-4 text-caption text-muted-foreground">{copy.retryHint}</p>
            </div>
        </main>
    )
}
