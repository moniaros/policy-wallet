"use client"
import { useId, useState, useTransition } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { formatDate } from '@/lib/i18n/format'
import type { BenefitUseView, PreventionItem } from '@/lib/prevention/types'
import { savePreventionBenefitUse } from './prevention-actions'

export function BenefitUseControls({ item, uses, today, sharedRestriction }: { item: PreventionItem; uses: BenefitUseView[]; today: string; sharedRestriction: boolean }) {
    const { t, language } = useLanguage()
    const [periodKey, setPeriodKey] = useState(item.period?.key)
    const periods = item.periods?.length ? item.periods : item.period ? [item.period] : []
    const period = periods.find(p => p.key === periodKey) ?? item.period
    if (!period || item.state === 'historical') return null
    return <details className="mt-4 border-t border-border pt-3">
        <summary className="cursor-pointer py-2 text-sm font-semibold">{t.prevention.usage}</summary>
        <label className="mt-3 block text-sm">{t.prevention.period}<select aria-label={t.prevention.period} className="pw-input mt-1 w-full" value={period.key} onChange={e => setPeriodKey(e.target.value)}>{periods.map(p => <option key={p.key} value={p.key}>{formatDate(p.start, language)} – {formatDate(p.end, language)}</option>)}</select></label>
        <BenefitUseForm key={period.key} item={{ ...item, period }} use={uses.find(u => u.itemKey === item.id && u.periodKey === period.key)} today={today} sharedRestriction={period.key === item.period?.key && sharedRestriction} />
    </details>
}
function BenefitUseForm({ item, use, today, sharedRestriction }: { item: PreventionItem; use?: BenefitUseView; today: string; sharedRestriction: boolean }) {
    const { t, language } = useLanguage(); const copy = t.prevention
    const id = useId()
    const [status, setStatus] = useState<'used' | 'not_used' | 'unknown'>((use?.status as 'used' | 'not_used' | 'unknown') ?? 'unknown')
    const [usedOn, setUsedOn] = useState(use?.usedOn ?? '')
    const [consent, setConsent] = useState(false)
    const [message, setMessage] = useState('')
    const [pending, start] = useTransition()
    if (!item.period || item.state === 'historical') return null
    const lastDay = new Date(new Date(`${item.period.end}T00:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10)
    const save = (clear = false) => start(async () => {
        setMessage('')
        try {
            const result = await savePreventionBenefitUse({ policyId: item.policyId, itemKey: item.id, sourceVersion: item.sourceVersion, periodKey: item.period!.key,
                status: clear ? 'clear' : status, healthConsent: consent, ...(!clear && status === 'used' && usedOn ? { usedOn } : {}) })
            setMessage('error' in result ? result.error === 'SOURCE_CHANGED' ? copy.changed : copy.failed : copy.recorded)
            if (!('error' in result) && clear) { setStatus('unknown'); setUsedOn('') }
        } catch { setMessage(copy.failed) }
    })
    return <div className="mt-3 space-y-4 text-sm">
            <p className="text-muted-foreground">{copy.useNote}</p>
            {use && use.sourceVersion !== item.sourceVersion && <p>{copy.usedStale}</p>}
            {sharedRestriction && <p>{copy.exclusiveUse}</p>}
            <label htmlFor={`${id}-status`} className="block">{copy.useQuestion}<select id={`${id}-status`} className="pw-input mt-1 w-full" value={status} onChange={e => setStatus(e.target.value as typeof status)}>{Object.entries(copy.useValues).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            {status === 'used' && <label className="block" htmlFor={`${id}-date`}>{copy.usedOn}<input id={`${id}-date`} type="date" min={item.period.start} max={today < lastDay ? today : lastDay} value={usedOn} onChange={e => setUsedOn(e.target.value)} className="pw-input mt-1 w-full" /></label>}
            {item.healthRelated && <label className="flex items-start gap-2"><input type="checkbox" className="mt-1 size-4 shrink-0" checked={consent} onChange={e => setConsent(e.target.checked)} />{copy.healthConsent}</label>}
            <div className="flex flex-wrap gap-2"><button type="button" className="pw-primary-button" disabled={pending || (item.healthRelated && !consent)} onClick={() => save()}>{copy.saveUse}</button>{use && <button type="button" className="pw-soft-button" disabled={pending} onClick={() => save(true)}>{copy.clearUse}</button>}</div>
            <p role="status" aria-live="polite">{message}</p>
        </div>
}
