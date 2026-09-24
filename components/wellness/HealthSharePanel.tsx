"use client"

import { useState, useTransition } from "react"
import { Share2 } from "lucide-react"
import { formatDate } from "@/lib/i18n/format"
import { revokeHealthShare, shareHealthWithAdvisor } from "@/app/(protected)/wellness/share-actions"
import type { el } from "@/lib/i18n/translations/el"

type Copy = (typeof el)["wellness"]["share"]

/**
 * Prevention brief P2 — the person decides, per advisor, what of their health
 * picture that advisor may see. Nothing is shared by default; the consent box
 * names the advisor; withdrawing deletes the snapshot.
 */
export function HealthSharePanel({ advisors, shares, hasAssessment, locale, copy }: {
    advisors: Array<{ relationshipId: string; agentUserId: string; name: string }>
    shares: Array<{ id: string; agentUserId: string; createdAt: string; lastViewedAt: string | null }>
    hasAssessment: boolean
    locale: "el" | "en"
    copy: Copy
}) {
    const [pending, start] = useTransition()
    const [relationshipId, setRelationshipId] = useState(advisors[0]?.relationshipId ?? "")
    const [assessment, setAssessment] = useState(hasAssessment)
    const [profile, setProfile] = useState(false)
    const [consent, setConsent] = useState(false)
    const [status, setStatus] = useState<string | null>(null)

    const selected = advisors.find((a) => a.relationshipId === relationshipId)
    const existing = selected ? shares.find((s) => s.agentUserId === selected.agentUserId) : undefined

    const submit = () => {
        if (!assessment && !profile) { setStatus(copy.nothingSelected); return }
        const scope = assessment && profile ? "both" : assessment ? "assessment" : "profile"
        start(async () => {
            const res = await shareHealthWithAdvisor({ relationshipId, scope, consent })
            setStatus("ok" in res ? copy.shared.replace("{advisor}", selected?.name ?? "").replace("{date}", formatDate(new Date().toISOString(), locale)) : copy.failed)
            if ("ok" in res) setConsent(false)
        })
    }

    return (
        <section className="pw-card pw-pad" aria-labelledby="share-heading">
            <div className="flex items-start gap-3">
                <span className="pw-card-chip" aria-hidden="true"><Share2 className="h-4 w-4" strokeWidth={1.75} /></span>
                <div className="min-w-0 flex-1">
                    <h2 id="share-heading" className="text-title font-semibold text-foreground">{copy.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{copy.intro}</p>
                </div>
            </div>

            {advisors.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">{copy.noAdvisor}</p>
            ) : (
                <div className="mt-4 space-y-3" data-fact="wellness.healthShare" data-fact-subject={relationshipId} data-fact-value={existing ? "active" : "none"}>
                    {advisors.length > 1 && (
                        <label className="block text-sm text-foreground">
                            <span className="block font-semibold">{copy.advisorLabel}</span>
                            <select className="pw-input mt-1 h-10 w-full max-w-full" value={relationshipId} onChange={(e) => setRelationshipId(e.target.value)}>
                                {advisors.map((a) => <option key={a.relationshipId} value={a.relationshipId}>{a.name}</option>)}
                            </select>
                        </label>
                    )}

                    {existing && (
                        <div className="pw-subcard p-3">
                            <p className="text-sm text-foreground">{copy.shared.replace("{advisor}", selected?.name ?? "").replace("{date}", formatDate(existing.createdAt, locale))}</p>
                            <p className="text-caption text-muted-foreground">{existing.lastViewedAt ? copy.lastViewed.replace("{date}", formatDate(existing.lastViewedAt, locale)) : copy.notViewed}</p>
                            <button
                                type="button"
                                disabled={pending}
                                className="pw-soft-button mt-2 text-status-danger"
                                onClick={() => start(async () => { const r = await revokeHealthShare(existing.id); setStatus("ok" in r ? copy.revoked : copy.failed) })}
                            >
                                {copy.revoke}
                            </button>
                            <p className="mt-1 text-caption text-muted-foreground">{copy.revokeConfirm}</p>
                        </div>
                    )}

                    <fieldset className="space-y-2">
                        <label className="flex items-start gap-2 text-sm text-foreground">
                            <input type="checkbox" className="mt-1" checked={assessment} disabled={!hasAssessment} onChange={(e) => setAssessment(e.target.checked)} />
                            <span>{copy.scopeAssessment}{!hasAssessment && <span className="block text-caption text-muted-foreground">{copy.scopeAssessmentMissing}</span>}</span>
                        </label>
                        <label className="flex items-start gap-2 text-sm text-foreground">
                            <input type="checkbox" className="mt-1" checked={profile} onChange={(e) => setProfile(e.target.checked)} />
                            <span>{copy.scopeProfile}</span>
                        </label>
                    </fieldset>
                    <label className="flex items-start gap-2 text-sm text-foreground">
                        <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                        <span>{copy.consent.replace("{advisor}", selected?.name ?? "")}</span>
                    </label>
                    <button type="button" className="pw-primary-button" disabled={pending || !consent || !relationshipId} onClick={submit}>{copy.submit}</button>
                </div>
            )}
            <p role="status" className="mt-2 text-caption text-muted-foreground">{status ?? ""}</p>
        </section>
    )
}
