"use client"
import { useId, useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowUpRight, Check, FileText, Leaf, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { PageContainer } from '@/components/ui/PageContainer'
import { AREAS, AREA_ORDER } from '@/lib/protection/domains'
import { formatDate } from '@/lib/i18n/format'
import { BARRIERS, type PreventionItem, type PreventionPolicy, type ProgressView, type ProgressChoice } from '@/lib/prevention/types'
import { savePreventionProgress, savePreventionCheckIn, deletePreventionData } from './prevention-actions'
import { setDailyNudgeOptIn } from './actions'
import { BenefitUseControls } from './BenefitUseControls'
import { chooseNextStep, usageForItem } from '@/lib/prevention/personalization'
import type { BenefitUseView } from '@/lib/prevention/types'
import { revokeHealthShare } from './share-actions'
import type { loadPreventionHub } from '@/lib/prevention/service'

type Hub = Awaited<ReturnType<typeof loadPreventionHub>>
type Props = Hub & { window: { min: string; max: string }; shares: Array<{ id: string }>; nudgePushOn: boolean | null }
const inputClass = 'mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground'

function ProgressControls({ item, progress, window, personalized }: { item: PreventionItem; progress?: ProgressView; window: Props['window']; personalized: boolean }) {
    const { t } = useLanguage(); const copy = t.prevention
    const uid = useId()
    const [knows, setKnows] = useState(progress?.knowsProcedure == null ? '' : String(progress.knowsProcedure))
    const [plannedFor, setPlannedFor] = useState(progress?.plannedFor ?? '')
    const [consent, setConsent] = useState(false)
    const [reminder, setReminder] = useState(false)
    const [date, setDate] = useState(window.min)
    const [barrier, setBarrier] = useState(progress?.barrier ?? '')
    const [helpful, setHelpful] = useState(progress?.helpful == null ? '' : String(progress.helpful))
    const [pending, start] = useTransition()
    function save(choice: ProgressChoice) {
        start(async () => {
            try {
                const result = await savePreventionProgress({ policyId: item.policyId, itemKey: item.id, sourceVersion: item.sourceVersion,
                    choice, healthConsent: consent, ...(reminder && (choice === 'later' || choice === 'planned') ? { remindAt: date } : {}),
                    ...(personalized ? { knowsProcedure: knows === '' ? null : knows === 'true', ...(plannedFor ? { plannedFor } : {}) } : {}),
                    barrier: barrier || null, helpful: helpful === '' ? null : helpful === 'true' })
                if ('error' in result) toast.error(result.error === 'SOURCE_CHANGED' ? copy.changed : copy.failed)
                else toast.success(copy.recorded)
            } catch { toast.error(copy.failed) }
        })
    }
    return <details className="mt-4 border-t border-border pt-3">
        <summary className="cursor-pointer py-2 text-sm font-semibold text-primary dark:text-mint">{copy.choose}</summary>
        <div className="mt-3 space-y-4">
            {item.healthRelated && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 size-4 shrink-0" checked={consent} onChange={e => setConsent(e.target.checked)} />{copy.healthConsent}</label>}
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={reminder} onChange={e => setReminder(e.target.checked)} />{copy.reminder}</label>
            {reminder && <label className="block text-sm" htmlFor={`${uid}-date`}>{copy.date}<input id={`${uid}-date`} type="date" className={inputClass} value={date} min={window.min} max={window.max} onChange={e => setDate(e.target.value)} /></label>}
            {personalized && !item.legacyCheckup && <div className="space-y-3">
                {item.kind === 'benefit' && <label className="block text-sm">{copy.knowsProcedure}<select className={inputClass} value={knows} onChange={e => setKnows(e.target.value)}><option value="">{copy.skip}</option><option value="true">{copy.yes}</option><option value="false">{copy.no}</option></select></label>}
                <label className="block text-sm" htmlFor={`${uid}-plan`}>{copy.plannedFor}<input id={`${uid}-plan`} type="date" className={inputClass} min={window.min} max={window.max} value={plannedFor} onChange={e => setPlannedFor(e.target.value)} /></label><p className="text-caption text-muted-foreground">{copy.planNotReminder}</p>
            </div>}
            {!item.legacyCheckup && <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm">{copy.barrier}<select className={inputClass} value={barrier} onChange={e => setBarrier(e.target.value)}><option value="">{copy.skip}</option>{BARRIERS.map(b => <option value={b} key={b}>{copy.barriers[b]}</option>)}</select></label>
                <label className="text-sm">{copy.helpful}<select className={inputClass} value={helpful} onChange={e => setHelpful(e.target.value)}><option value="">{copy.skip}</option><option value="true">{copy.yes}</option><option value="false">{copy.no}</option></select></label>
            </div>}
            <div className="flex flex-wrap gap-2">{(['planned','done','later','dismissed'] as const).map(choice => <button key={choice} type="button" className={choice === 'planned' ? 'pw-primary-button' : 'pw-soft-button'} disabled={pending || (item.healthRelated && !consent)} onClick={() => save(choice)}>{copy[choice]}</button>)}</div>
            {progress && <button type="button" className="pw-soft-button" disabled={pending} onClick={() => save('clear')}>{copy.clear}</button>}
            <p className="text-caption text-muted-foreground">{copy.noReminder} {copy.selfReport}</p>
        </div>
    </details>
}
function ItemCard({ item, policy, progress, window, personalized, uses, today }: { item: PreventionItem; policy: PreventionPolicy; progress?: ProgressView; window: Props['window']; personalized: boolean; uses: BenefitUseView[]; today: string }) {
    const { t, language } = useLanguage(); const copy = t.prevention
    const locale = language === 'en' ? 'en' : 'el'
    const label = item.title[locale] || copy.benefit
    const page = item.source?.verifiedPage ?? item.source?.page
    const historical = item.state === 'historical'
    const stale = progress?.sourceVersion && progress.sourceVersion !== item.sourceVersion
    return <article id={item.id} className="pw-card pw-pad scroll-mt-24" data-testid="prevention-item" data-fact="prevention.item" data-fact-subject={item.id}>
        <div className="flex items-start gap-3">
            <span className="pw-card-chip shrink-0" aria-hidden="true">{item.kind === 'benefit' ? <FileText className="size-4" /> : item.kind === 'preparation' ? <ShieldCheck className="size-4" /> : <Leaf className="size-4" />}</span>
            <div className="min-w-0 flex-1">
                <h3 className="text-title font-semibold text-foreground">{label}</h3>
                <p className="mt-1 text-caption text-muted-foreground">{copy[item.kind]}</p>
                <Link href={`/wallet/${policy.id}`} className="mt-1 inline-block text-caption text-muted-foreground underline underline-offset-4">{policy.label}</Link>
            </div>
        </div>
        {item.description[locale] && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description[locale]}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
            {item.kind === 'benefit' && <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-caption font-medium text-foreground">{copy[item.state]}</span>}
            {progress && !stale && progress.status !== 'clear' && <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 text-caption font-medium text-foreground">{progress.status === 'done' && <Check className="mr-1 size-3" aria-hidden="true" />}{copy[progress.status as ProgressChoice] ?? copy.planned}</span>}
        </div>
        {progress?.remindAt && <p className="mt-2 text-caption text-muted-foreground">{copy.date}: {formatDate(progress.remindAt, locale)}</p>}
        {stale && <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">{copy.changed}</p>}
        {item.kind === 'benefit' && <>
            <p className="mt-3 text-sm font-medium">{copy.cost[item.costType ?? 'not_stated']}</p>
            <p className="mt-2 text-caption text-muted-foreground">{copy.ask}</p>
            {item.activationUnconfirmed && <p className="mt-2 text-caption text-muted-foreground">{copy.activationUnknown}</p>}
            {!!item.issues?.length && <details className="mt-3"><summary className="cursor-pointer py-2 text-sm font-semibold">{copy.confirm}</summary><ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-muted-foreground">{item.issues.map(issue => <li key={issue}>{copy.issues[issue]}</li>)}</ul></details>}
            <details className="mt-3"><summary className="cursor-pointer py-2 text-sm font-semibold">{copy.terms}</summary>
                <div className="mt-2 space-y-4 text-sm">
                    {item.terms.length > 0 && <dl className="space-y-3">{item.terms.map(term => <div key={term.key}><dt className="text-caption text-muted-foreground">{copy.term[term.key as keyof typeof copy.term] ?? term.key}</dt><dd className="mt-0.5 whitespace-pre-wrap break-words">{term.value}</dd>{term.source?.snippet && <blockquote className="mt-1 border-l-2 border-border pl-3 text-caption text-muted-foreground">{term.source.snippet}</blockquote>}<p className="text-caption text-muted-foreground">{term.source?.verified ? copy.located : copy.unverified}</p>{term.evidence && <a className="text-caption underline" target="_blank" rel="noopener noreferrer" href={`/api/v1/policies/${encodeURIComponent(policy.id)}/documents/${encodeURIComponent(term.evidence.documentId)}${term.evidence.page ? `#page=${term.evidence.page}` : ''}`}>{copy.openDocument}{term.evidence.page ? ` · ${copy.page.replace('{n}', String(term.evidence.page))}` : ''}</a>}</div>)}</dl>}
                    <p className="text-muted-foreground">{copy.missingTerms}</p>
                    {!!item.conflicts?.length && <div className="space-y-3"><h4 className="font-semibold">{copy.conflicting}</h4>{item.conflicts.map((conflict, index) => <div key={index} className="border-t border-border pt-3"><p>{copy.term[conflict.field as keyof typeof copy.term] ?? copy.terms}</p>{([{ value: conflict.priorValue, ref: conflict.priorSource }, { value: conflict.currentValue, ref: conflict.currentSource }]).map((entry, n) => <p key={n} className="mt-1 break-words">{entry.value}{entry.ref && <a className="ml-2 underline" target="_blank" rel="noopener noreferrer" href={`/api/v1/policies/${encodeURIComponent(policy.id)}/documents/${encodeURIComponent(entry.ref.documentId)}${entry.ref.page ? `#page=${entry.ref.page}` : ''}`}>{copy.openDocument}{entry.ref.page ? ` · ${copy.page.replace('{n}', String(entry.ref.page))}` : ''}</a>}</p>)}</div>)}</div>}
                    {!!item.conditions?.length && <details><summary className="cursor-pointer py-2 font-semibold">{copy.extraConditions}</summary><ul className="list-disc space-y-3 pl-5">{item.conditions.map((condition, index) => <li key={index}>{condition.text}{condition.source && <a className="ml-2 underline" target="_blank" rel="noopener noreferrer" href={`/api/v1/policies/${encodeURIComponent(policy.id)}/documents/${encodeURIComponent(condition.source.documentId)}${condition.source.page ? `#page=${condition.source.page}` : ''}`}>{copy.openDocument}{condition.source.page ? ` · ${copy.page.replace('{n}', String(condition.source.page))}` : ''}</a>}</li>)}</ul></details>}
                    {item.source?.snippet ? <div><p className="text-caption text-muted-foreground">{copy.source}{page ? ` · ${copy.page.replace('{n}', String(page))}` : ''}</p><blockquote className="mt-2 border-l-2 border-primary pl-3 whitespace-pre-wrap break-words">{item.source.snippet}</blockquote><p className="mt-2 text-caption text-muted-foreground">{item.source.verified ? copy.located : copy.unverified}</p></div> : <p>{copy.sourceMissing}</p>}
                    <dl className="space-y-1 text-caption text-muted-foreground">{item.extractedAt && <div><dt className="inline">{copy.extracted}: </dt><dd className="inline">{formatDate(item.extractedAt, locale)}</dd></div>}{item.runId && <div><dt className="inline">{copy.run}: </dt><dd className="inline break-all">{item.runId}</dd></div>}{item.documentId && <div><dt className="inline">{copy.document}: </dt><dd className="inline break-all"><a href={`/api/v1/policies/${encodeURIComponent(policy.id)}/documents/${encodeURIComponent(item.documentId)}${page ? `#page=${page}` : ''}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{copy.openDocument}</a></dd></div>}</dl>
                    {(!item.documentId || (!item.runId && !item.extractedAt)) && <p className="text-caption text-muted-foreground">{copy.sourceUnknown}</p>}
                    {item.healthRelated && <p className="text-muted-foreground">{copy.medical}</p>}
                    {(item.contactPhone || item.contactUrl) && <div><p className="text-caption text-muted-foreground">{copy.contact}</p>{item.contactPhone && <p className="break-words">{item.contactPhone}</p>}{item.contactUrl && <a href={item.contactUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{copy.external}</a>}</div>}
                </div>
            </details>
            <Link href={`/wallet/${policy.id}#documents`} className="pw-soft-button mt-3 inline-flex">{copy.inspect}<ArrowUpRight className="ml-1 size-4" aria-hidden="true" /></Link>
        </>}
        {!historical && <ProgressControls item={item} progress={progress} window={window} personalized={personalized} />}
        {personalized && <BenefitUseControls key={`${item.id}:${item.sourceVersion}`} item={item} uses={uses} today={today} sharedRestriction={policy.items.some(other => other.id !== item.id && other.rules && item.rules?.exclusiveWith?.includes(other.rules.code) && usageForItem(other, uses)?.status === 'used')} />}
    </article>
}
function HabitCheckIn({ checkin }: { checkin: Props['checkin'] }) {
    const { t, language } = useLanguage(); const copy = t.prevention
    const [answers, setAnswers] = useState<Record<string, unknown>>(checkin?.answers ?? {})
    const [consent, setConsent] = useState(false); const [pending, start] = useTransition()
    const set = (key: string, value: unknown) => setAnswers(old => { const next = { ...old }; if (value === '') delete next[key]; else next[key] = value; return next })
    return <details className="pw-card pw-pad"><summary className="cursor-pointer text-title font-semibold">{copy.checkin}</summary>
        <p className="mt-3 text-sm text-muted-foreground">{copy.checkinNote}</p>
        {checkin && <p className="mt-2 text-caption text-muted-foreground">{copy.lastSaved.replace('{date}', formatDate(checkin.createdAt, language))}</p>}
        <form className="mt-4 space-y-4" onSubmit={e => { e.preventDefault(); start(async () => { try { const res = await savePreventionCheckIn({ consent, answers }); if ('error' in res) toast.error(copy.failed); else toast.success(copy.recorded) } catch { toast.error(copy.failed) } }) }}>
            <div className="grid gap-4 sm:grid-cols-2">{(['activityDays', 'activityMinutes'] as const).map(key => <label key={key} className="text-sm">{copy[key]}<input type="number" inputMode="numeric" min={0} max={key === 'activityDays' ? 7 : 10080} className={inputClass} value={answers[key] as number ?? ''} onChange={e => set(key, e.target.value === '' ? '' : Number(e.target.value))} /></label>)}</div>
            <label className="block text-sm">{copy.smoking}<select className={inputClass} value={answers.smoking as string ?? ''} onChange={e => set('smoking', e.target.value)}><option value="">{copy.skip}</option>{Object.entries(copy.smokingValues).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label className="flex gap-2 text-sm"><input type="checkbox" checked={answers.smokingSupport === true} onChange={e => set('smokingSupport', e.target.checked)} />{copy.support}</label>
            {answers.smokingSupport === true && <a className="block text-sm underline" href="https://www.who.int/news-room/questions-and-answers/item/tobacco-health-benefits-of-smoking-cessation" target="_blank" rel="noopener noreferrer">{copy.supportLink}</a>}
            <label className="block text-sm">{copy.bp}<select className={inputClass} value={answers.bloodPressure as string ?? ''} onChange={e => set('bloodPressure', e.target.value)}><option value="">{copy.skip}</option>{Object.entries(copy.bpValues).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label className="flex items-start gap-2 text-sm"><input className="mt-1 size-4 shrink-0" type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />{copy.checkinConsent}</label>
            <button type="submit" className="pw-primary-button" disabled={pending || !consent || Object.keys(answers).length === 0}>{copy.save}</button>
        </form>
    </details>
}
export function PreventionHubClient({ policies, actions, progress, checkin, window, shares, nudgePushOn, personalized, uses, today, legacyUsageUnknown }: Props) {
    const { t, language } = useLanguage(); const copy = t.prevention
    const locale = language === 'en' ? 'en' : 'el'
    const [view, setView] = useState<'domain' | 'policy'>('domain'); const [domain, setDomain] = useState('all')
    const [pending, start] = useTransition()
    const progressById = new Map(progress.map(p => [p.itemKey, p]))
    const allItems = policies.flatMap(p => p.items)
    const visible = (item: PreventionItem) => domain === 'all' || item.domains.includes(domain as any)
    const domains = AREA_ORDER.filter(d => policies.some(p => p.domains.includes(d)))
    const recommendation = personalized ? chooseNextStep([...allItems, ...actions].filter(i => view === 'policy' || visible(i)), progress, uses) : null
    const next = personalized ? recommendation?.item : [...allItems.filter(i => i.state !== 'historical'), ...actions].filter(i => view === 'policy' || visible(i)).find(i => { const p = progressById.get(i.id); return (p?.sourceVersion && p.sourceVersion !== i.sourceVersion) || !['done','dismissed','later'].includes(p?.status ?? '') })
    const policyMap = new Map(policies.map(p => [p.id, p]))
    const render = (item: PreventionItem) => <ItemCard key={item.id} item={item} policy={policyMap.get(item.policyId)!} progress={progressById.get(item.id)} window={window} personalized={personalized} uses={uses} today={today} />
    return <PageContainer width="reading" className="space-y-8 py-6 lg:py-10">
        <header><h1 className="text-h3 font-semibold tracking-tight">{copy.title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{copy.intro}</p></header>
        {next && <section className="rounded-2xl bg-primary px-5 py-6 text-primary-foreground sm:px-7" aria-labelledby="next-step-heading"><h2 id="next-step-heading" className="text-h4 font-semibold">{next.kind === 'benefit' ? copy.inspect : next.title[locale]}</h2><p className="mt-2 text-sm opacity-90">{next.kind === 'benefit' ? next.title[locale] || copy.benefit : copy.nextBody}</p>{recommendation && <dl className="mt-4 space-y-3 text-sm"><div><dt className="font-semibold">{copy.why}</dt><dd className="mt-1">{copy.reason[recommendation.reason]}</dd></div><div><dt className="font-semibold">{copy.known}</dt><dd className="mt-1">{next.description[locale]}</dd></div>{next.kind === 'benefit' && <div><dt className="font-semibold">{copy.confirm}</dt><dd className="mt-1">{copy.ask}</dd></div>}{recommendation.progress?.barrier && <div><dt className="font-semibold">{copy.barrier}</dt><dd className="mt-1">{copy.assistance[recommendation.progress.barrier as keyof typeof copy.assistance]}</dd></div>}</dl>}<a href={`#${next.id}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-background px-5 py-2 text-sm font-semibold text-foreground">{copy.viewStep}<ArrowUpRight className="size-4" aria-hidden="true" /></a></section>}
        {legacyUsageUnknown && <p className="text-sm text-muted-foreground">{copy.legacyUnknown}</p>}
        <section id="benefit" aria-labelledby="benefits-heading" className="scroll-mt-24">
            <h2 id="benefits-heading" className="text-title font-semibold">{copy.benefits}</h2>
            {policies.length === 0 ? <div className="pw-card pw-pad mt-4"><p className="text-sm text-muted-foreground">{copy.noPolicies}</p><Link href="/wallet/add" className="pw-primary-button mt-4 inline-flex">{copy.add}</Link></div> : <>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-3"><div className="pw-segmented" role="group" aria-label={copy.filter}>{(['domain','policy'] as const).map(v => <button type="button" key={v} aria-pressed={view === v} className="pw-segment min-h-11" onClick={() => setView(v)}>{v === 'domain' ? copy.byDomain : copy.byPolicy}</button>)}</div>
                    {view === 'domain' && <label className="min-w-0 text-caption text-muted-foreground">{copy.filter}<select className={inputClass} value={domain} onChange={e => setDomain(e.target.value)}><option value="all">{copy.all}</option>{domains.map(d => <option value={d} key={d}>{AREAS[d].label[locale]}</option>)}</select></label>}
                </div>
                <div className="mt-4 space-y-6">{view === 'domain' ? <>
                    {(domain === 'all' ? domains : domains.filter(d => d === domain)).map(d => {
                        // A multi-domain benefit is shown once in the all-domains view; filtering still finds it in each domain.
                        const items = allItems.filter(i => i.domains.includes(d) && (domain !== 'all' || i.domains[0] === d))
                        if (!items.length) return null
                        return <section key={d}><h3 className="mb-3 text-sm font-semibold">{AREAS[d].label[locale]}</h3><div className="space-y-3">{items.map(render)}</div></section>
                    })}

                    <div className="space-y-2">{policies.filter(p => p.items.length === 0 && (domain === 'all' || p.domains.includes(domain as any))).map(p => <div key={p.id} className="border-t border-border py-3"><Link className="text-sm font-semibold underline underline-offset-4" href={`/wallet/${p.id}`}>{p.label}</Link><p className="mt-1 text-caption text-muted-foreground">{p.sourceChanged ? copy.changed : copy.none}</p></div>)}</div>
                </> : policies.map(p => <section key={p.id}><h3 className="mb-1 text-sm font-semibold">{p.label}</h3><p className="mb-3 text-caption text-muted-foreground">{p.domains.map(d => AREAS[d].label[locale]).join(' · ')}</p>{p.items.length ? <div className="space-y-3">{p.items.map(render)}</div> : <div className="pw-card pw-pad"><p className="text-sm text-muted-foreground">{p.sourceChanged ? copy.changed : copy.none}</p><Link href={`/wallet/${p.id}`} className="pw-soft-button mt-3 inline-flex">{copy.inspect}</Link></div>}</section>)}</div>
            </>}
        </section>
        <section aria-labelledby="habits-heading"><h2 id="habits-heading" className="text-title font-semibold">{copy.habits}</h2><p className="mt-2 text-sm text-muted-foreground">{copy.habitsNote}</p><div className="mt-4 space-y-3">{actions.filter(i => view === 'policy' || visible(i)).map(render)}</div>{actions.length === 0 && <p className="mt-3 text-sm text-muted-foreground">{copy.noActions}</p>}</section>
        <HabitCheckIn key={checkin?.createdAt ?? 'empty'} checkin={checkin} />
        <details className="border-t border-border pt-5"><summary className="cursor-pointer text-sm font-semibold">{copy.privacy}</summary><p className="mt-3 text-sm text-muted-foreground">{copy.retired}</p>{nudgePushOn !== null && <label className="mt-4 flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 size-4 shrink-0" checked={nudgePushOn} disabled={pending} onChange={e => { const on = e.target.checked; start(async () => { try { await setDailyNudgeOptIn(on); toast.success(copy.recorded) } catch { toast.error(copy.failed) } }) }} /><span>{copy.healthReminders}<span className="mt-1 block text-caption text-muted-foreground">{copy.healthRemindersNote}</span></span></label>}<div className="mt-4 flex flex-wrap gap-2"><Link href="/account/privacy" className="pw-soft-button">{copy.export}</Link><button type="button" className="pw-soft-button" disabled={pending} onClick={() => { if (globalThis.confirm(copy.eraseConfirm)) start(async () => { try { await deletePreventionData(); toast.success(copy.deleted) } catch { toast.error(copy.failed) } }) }}>{copy.erase}</button></div>
            {shares.length > 0 && <div className="mt-4"><p className="text-sm font-semibold">{copy.shares}</p>{shares.map((s, index) => <button key={s.id} type="button" className="pw-soft-button mt-2 mr-2" disabled={pending} onClick={() => start(async () => { const res = await revokeHealthShare(s.id); if ('error' in res) toast.error(copy.failed); else toast.success(copy.recorded) })}>{copy.revoke} {index + 1}</button>)}</div>}
        </details>
    </PageContainer>
}
