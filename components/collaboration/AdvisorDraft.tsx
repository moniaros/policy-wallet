'use client'

import { useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/contexts/LanguageContext'
import { policyholderFlowCopy } from '@/lib/i18n/policyholder-flow'

/** A private editable draft. Opening this form never creates or sends anything. */
export function AdvisorDraft({ subject, relationshipId, recipient, canSend = true }: { subject?: string; relationshipId: string; recipient: string; canSend?: boolean }) {
    const { language } = useLanguage()
    const copy = policyholderFlowCopy(language)
    const router = useRouter()
    const uid = useId()
    const [title, setTitle] = useState((subject || copy.newSubject).slice(0, 180))
    const [body, setBody] = useState(subject ? copy.draftBody.replace('{subject}', subject) : '')
    const [consent, setConsent] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(false)
    const [requestId, setRequestId] = useState<string>()
    async function send(e: React.FormEvent) {
        e.preventDefault()
        if (!canSend || busy || !consent || title.trim().length < 3 || !body.trim()) return
        setBusy(true); setError(false)
        const id = requestId ?? crypto.randomUUID()
        setRequestId(id)
        try {
            const response = await fetch('/api/v1/collaboration/threads', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ relationshipId, subject: title.trim(), initialMessage: body.trim(), category: 'general', requestId: id }),
            })
            const result = await response.json()
            if (!response.ok || !result.data?.thread?.id) throw new Error('SEND_NOT_CONFIRMED')
            router.push(`/collaboration/threads/${encodeURIComponent(result.data.thread.id)}`)
        } catch { setError(true); setBusy(false) }
    }
    return <details open={!!subject} className="pw-card pw-pad">
        <summary className="min-h-11 cursor-pointer text-title font-semibold">{copy.draftTitle}</summary>
        <form onSubmit={send} className="mt-4 space-y-4">
            <label htmlFor={`${uid}-subject`} className="block text-sm font-medium">{copy.subject}</label><input id={`${uid}-subject`} required minLength={3} maxLength={180} className="pw-input mt-2 w-full" value={title} disabled={busy} onChange={e => { setTitle(e.target.value); setConsent(false); setRequestId(undefined) }} />
            <label htmlFor={`${uid}-body`} className="block text-sm font-medium">{copy.message}</label><textarea id={`${uid}-body`} required maxLength={5000} rows={5} className="pw-input mt-2 w-full" value={body} disabled={busy} onChange={e => { setBody(e.target.value); setConsent(false); setRequestId(undefined) }} />
            <label className="flex items-start gap-3 text-sm"><input className="mt-1 size-4 shrink-0" type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} /><span>{copy.reviewSharing.replace('{name}', recipient)}</span></label>
            {!canSend && <p className="text-sm text-muted-foreground">{copy.planRequired} <Link href="/account/plan" className="underline">{copy.plan}</Link></p>}
            {error && <p role="alert" className="text-sm text-destructive">{copy.sendFailed}</p>}
            <button type="submit" className="pw-primary-button" disabled={!canSend || busy || !consent || !body.trim() || title.trim().length < 3}>{busy ? copy.sending : copy.send}</button>
        </form>
    </details>
}
