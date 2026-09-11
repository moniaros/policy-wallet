"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { startRegistration } from "@simplewebauthn/browser"

import { useLanguage } from "@/contexts/LanguageContext"
import { SettingsRowList } from "@/components/settings/SettingsSection"
import { SettingRow } from "@/components/settings/SettingRow"
import type { PasskeySummary } from "@/lib/auth/passkeys"
import { resolveLocale } from "@/lib/i18n/format"

/**
 * Enrol, list, remove — PW-PROVENANCE-01 R-01. The browser does the ceremony,
 * the server verifies and writes the claim the proxy reads. Copy says what a
 * passkey changes: from the next sign-in, this account asks for it.
 */
export function PasskeysBlock({ items }: { items: PasskeySummary[] }) {
    const { t, language } = useLanguage()
    const copy = t.settings.security
    const router = useRouter()
    const [busy, setBusy] = useState<null | "add" | string>(null)
    const dateFmt = new Intl.DateTimeFormat(resolveLocale(language), { dateStyle: "medium" })

    async function add() {
        if (typeof window === "undefined" || !("PublicKeyCredential" in window)) {
            toast.error(copy.passkeysUnsupported)
            return
        }
        setBusy("add")
        try {
            const options = await fetch("/api/auth/passkeys/options", { method: "POST" })
            if (!options.ok) throw new Error(`options ${options.status}`)
            const { data } = await options.json()
            const attestation = await startRegistration({ optionsJSON: data })
            const register = await fetch("/api/auth/passkeys/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ response: attestation }),
            })
            if (!register.ok) throw new Error(`register ${register.status}`)
            toast.success(copy.passkeysAdded)
            router.refresh()
        } catch {
            toast.error(copy.passkeysFailed)
        } finally {
            setBusy(null)
        }
    }

    async function remove(id: string) {
        setBusy(id)
        try {
            const res = await fetch(`/api/auth/passkeys/${encodeURIComponent(id)}`, { method: "DELETE" })
            if (!res.ok) throw new Error(`remove ${res.status}`)
            toast.success(copy.passkeysRemoved)
            router.refresh()
        } catch {
            toast.error(copy.passkeysFailed)
        } finally {
            setBusy(null)
        }
    }

    return (
        <div data-passkeys={items.length}>
            {items.length > 0 ? (
                <SettingsRowList>
                    {items.map((p, i) => (
                        <SettingRow
                            key={p.id}
                            label={`${copy.passkeyLabel} ${i + 1}`}
                            hint={`${copy.passkeyAdded} ${dateFmt.format(new Date(p.createdAt))} · ${copy.passkeyLastUsed} ${dateFmt.format(new Date(p.lastUsedAt))}`}
                            action={
                                <button
                                    type="button"
                                    onClick={() => remove(p.id)}
                                    disabled={busy !== null}
                                    aria-label={`${copy.passkeyRemove} ${i + 1}`}
                                    className="pw-soft-button text-status-danger disabled:opacity-60"
                                >
                                    {busy === p.id ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : null}
                                    {copy.passkeyRemove}
                                </button>
                            }
                        />
                    ))}
                </SettingsRowList>
            ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">{copy.passkeysNone}</p>
            )}
            <p className="mt-3 text-caption leading-relaxed text-muted-foreground">{copy.passkeysEffect}</p>
            <button type="button" onClick={add} disabled={busy !== null} className="pw-soft-button mt-3 disabled:opacity-60">
                {busy === "add" ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : null}
                {copy.passkeyAdd}
            </button>
        </div>
    )
}
