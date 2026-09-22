'use client'
import { useCallback, useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { agentReviewCopy } from '@/lib/i18n/agent-review'

type Revision = { id: string; body: string; status: 'draft' | 'approved' | 'delivered' | 'superseded'; digest: string; stale: boolean; createdAt: string; feedbackNote: string | null; reuseApproved: boolean; privateAdvice: { rationale: string; questions: string[]; uncertainties: string[]; actions: string[] } | null }
export function ReviewWorkspace({ policyId, reviewHref }: { policyId: string; reviewHref: string }) {
    const { language } = useLanguage()
    const t = agentReviewCopy[language]
    const fieldId = useId()
    const [revisions, setRevisions] = useState<Revision[]>([])
    const [current, setCurrent] = useState<string | null>(null)
    const [body, setBody] = useState('')
    const [note, setNote] = useState('')
    const [reuseApproved, setReuseApproved] = useState(false)
    const [errorCode, setErrorCode] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(false)
    const selected = revisions.find(r => r.id === current)
    const feedbackDirty = Boolean(selected && (note !== (selected.feedbackNote ?? '') || reuseApproved !== selected.reuseApproved))
    const dirty = selected ? selected.body !== body : body.length > 0
    const refresh = useCallback(async (selectLatest = false) => {
        const response = await fetch(`/api/v1/agent/review-workspace?policyId=${encodeURIComponent(policyId)}`)
        if (!response.ok) throw new Error('refresh')
        const { data } = await response.json()
        setRevisions(data.revisions)
        if (selectLatest) {
            const latest = data.revisions[0]
            setCurrent(latest?.id ?? null); setBody(latest?.body ?? ''); setNote(latest?.feedbackNote ?? ''); setReuseApproved(latest?.reuseApproved ?? false)
        }
    }, [policyId])
    useEffect(() => { void refresh(true).catch(() => setError(true)) }, [refresh])
    const act = async (operation: string, extra: Record<string, unknown> = {}) => {
        setBusy(true); setError(false); setErrorCode('')
        try {
            const response = await fetch(operation === 'generate' ? '/api/v1/agent/review-workspace/generate' : '/api/v1/agent/review-workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(operation === 'generate' ? { policyId, language } : { operation, policyId, ...(operation === 'save' ? { body, language, ...(current ? { previousId: current } : {}) } : { revisionId: current, digest: selected?.digest }), ...extra }) })
            if (!response.ok) { const failure = await response.json(); setErrorCode(failure.error?.code ?? ''); throw new Error('save') }
            await refresh(true)
            if (operation === 'deliver') window.dispatchEvent(new CustomEvent('pw:collaboration-updated', { detail: { policyId } }))
        } catch { setError(true) } finally { setBusy(false) }
    }
    return <section className="pw-card my-6 space-y-4 p-5" aria-labelledby={`${fieldId}-title`}>
        <h2 id={`${fieldId}-title`} className="text-title font-semibold">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.private}</p>
        <Link href={reviewHref} className="pw-text-link">{t.source}</Link>
        <p className="text-caption text-muted-foreground">{t.channel}</p>
        {error && <p role="alert" className="text-sm text-status-danger">{errorCode === 'AI_CONSENT_REQUIRED' ? t.consentError : errorCode === 'QUOTA_REQUIRED' ? t.quotaError : errorCode === 'STALE_REVIEW' ? t.stale : t.error}</p>}
        <button className="pw-soft-button" disabled={busy || dirty || feedbackDirty} onClick={() => void act('generate')}>{t.generate}</button>
        {selected?.privateAdvice && <aside className="pw-subcard space-y-3 p-4">
            <h3 className="text-sm font-semibold">{t.rationale}</h3><p className="text-sm whitespace-pre-wrap">{selected.privateAdvice.rationale}</p>
            {(['uncertainties', 'questions', 'actions'] as const).map(key => <div key={key}><h4 className="text-sm font-semibold">{t[key]}</h4><ul className="list-disc pl-5 text-sm">{selected.privateAdvice![key].map((item, i) => <li key={i}>{item}</li>)}</ul></div>)}
        </aside>}
        <label htmlFor={fieldId} className="block text-sm font-semibold">{t.body}</label>
        <textarea id={fieldId} value={body} onChange={e => setBody(e.target.value)} maxLength={12000} rows={7} className="pw-input w-full" disabled={busy || feedbackDirty} />
        {dirty && <p role="status" className="text-caption">{t.changed}</p>}
        {selected?.stale && <p role="status" className="text-sm text-status-warning">{t.stale}</p>}
        <div className="flex flex-wrap gap-2">
            <button className="pw-primary-button" disabled={busy || feedbackDirty || !body.trim() || selected?.status === 'superseded'} onClick={() => void act('save')}>{busy ? t.busy : t.save}</button>
            {selected?.status === 'draft' && <button className="pw-soft-button" disabled={busy || dirty || feedbackDirty || selected.stale} onClick={() => void act('approve')}>{t.approve}</button>}
            {selected?.status === 'approved' && <button className="pw-primary-button" disabled={busy || dirty || feedbackDirty || selected.stale} onClick={() => void act('deliver')}>{t.deliver}</button>}
            <button className="pw-soft-button" disabled={busy} onClick={() => { setError(false); void refresh().catch(() => setError(true)) }}>{t.refresh}</button>
        </div>
        {selected && <fieldset className="space-y-2 border-t border-border pt-4" disabled={busy || dirty}>
            <legend className="text-sm font-semibold">{t.feedback}</legend>
            <p className="text-caption text-muted-foreground">{t.feedbackHelp}</p>
            <label htmlFor={`${fieldId}-note`} className="block text-sm">{t.note}</label>
            <textarea id={`${fieldId}-note`} className="pw-input w-full" rows={2} value={note} maxLength={2000} onChange={e => setNote(e.target.value)} />
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reuseApproved} onChange={e => setReuseApproved(e.target.checked)} />{t.reuse}</label>
            <div className="flex flex-wrap gap-2">{(['accept', 'edit', 'reject', 'defer'] as const).map(feedback => <button key={feedback} className="pw-soft-button" onClick={() => void act('feedback', { feedback, note, reuseApproved })}>{t[feedback]}</button>)}</div>
            {feedbackDirty && <p role="status" className="text-caption">{t.feedbackChanged}</p>}
            {feedbackDirty && <button className="pw-text-link" onClick={() => { setNote(selected.feedbackNote ?? ''); setReuseApproved(selected.reuseApproved) }}>{t.discardFeedback}</button>}
            {selected.status !== 'delivered' && <button disabled={feedbackDirty} className="pw-text-link" onClick={() => void act('remove')}>{t.remove}</button>}
        </fieldset>}
        <div className="space-y-2 border-t border-border pt-4">
            {revisions.length === 0 && <p className="text-caption text-muted-foreground">{t.empty}</p>}
            {revisions.map(r => <button key={r.id} disabled={busy || dirty || feedbackDirty} aria-pressed={r.id === current} className="pw-soft-button mr-2" onClick={() => { setCurrent(r.id); setBody(r.body); setNote(r.feedbackNote ?? ''); setReuseApproved(r.reuseApproved) }}>{t[r.status]} · {new Date(r.createdAt).toLocaleString(language === 'el' ? 'el-GR' : 'en-GB')}</button>)}
        </div>
    </section>
}
