
"use client"

import React, { useState, useRef } from 'react'
import { toast } from "sonner"
import { useRouter } from 'next/navigation'
import { scanPolicyForResolution, commitScannedPolicy, requestAiConsent } from '@/app/(protected)/agent/actions'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDialog } from '@/hooks/useDialog'
import type { CustomerCandidate, CustomerResolution } from '@/lib/services/customer-resolution.service'

interface Props {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    /** When set, the customer is already known — skip the resolution step. */
    presetCustomerId?: string
    presetCustomerName?: string
}

type View = 'upload' | 'parsing' | 'resolve' | 'confirm' | 'duplicate' | 'success'

interface DuplicatePolicy {
    id: string
    policyNumber: string
    insurerName: string
    lineOfBusiness: string
    startDate: string
}

interface Extraction {
    customerName?: string
    customerSurname?: string
    customerEmail?: string
    customerPhone?: string
    customerTaxId?: string
    insurerName?: string
    policyNumber?: string
    lineOfBusiness?: string
    startDate?: string
    endDate?: string
    premiumAmount?: number
}

type AnalysisState = 'started' | 'consent_required' | 'limit_reached' | 'none'

const ACCEPTED = 'application/pdf,image/jpeg,image/png,image/webp'
const INPUT_CLASS = 'w-full h-12 px-5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-bold'

export function UploadPolicyModal({ isOpen, onClose, onSuccess, presetCustomerId, presetCustomerName }: Props) {
    const { t } = useLanguage()
    const dialogRef = useDialog<HTMLDivElement>(onClose, isOpen)
    const up = t.agentModals.uploadPolicy
    const ac = t.agentModals.addCustomer
    const router = useRouter()
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [view, setView] = useState<View>('upload')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [scannedFile, setScannedFile] = useState<File | null>(null)
    const [resolution, setResolution] = useState<CustomerResolution | null>(null)

    // 'new' = create a new customer; otherwise the chosen customer id.
    const [selected, setSelected] = useState<string>('new')

    const [customer, setCustomer] = useState({ name: '', surname: '', email: '', phone: '', taxId: '' })
    const [policy, setPolicy] = useState({
        insurerName: '', policyNumber: '', lineOfBusiness: 'motor', startDate: '', endDate: '', premiumAmount: '',
    })
    const [attestedAiConsent, setAttestedAiConsent] = useState(false)

    const [result, setResult] = useState<{ policyId?: string; customerId?: string; created?: boolean; analysisState?: AnalysisState } | null>(null)
    const [consentSent, setConsentSent] = useState(false)
    const [duplicate, setDuplicate] = useState<DuplicatePolicy | null>(null)

    if (!isOpen) return null

    const reset = () => {
        setView('upload'); setLoading(false); setError(null); setScannedFile(null)
        setResolution(null); setSelected('new'); setResult(null); setConsentSent(false); setDuplicate(null)
        setCustomer({ name: '', surname: '', email: '', phone: '', taxId: '' })
        setPolicy({ insurerName: '', policyNumber: '', lineOfBusiness: 'motor', startDate: '', endDate: '', premiumAmount: '' })
        setAttestedAiConsent(false)
    }

    const closeAll = () => { reset(); onClose() }

    const applyExtraction = (data: Extraction) => {
        setCustomer({
            name: data.customerName || '',
            surname: data.customerSurname || '',
            email: data.customerEmail || '',
            phone: data.customerPhone || '',
            taxId: data.customerTaxId || '',
        })
        setPolicy({
            insurerName: data.insurerName || '',
            policyNumber: data.policyNumber || '',
            lineOfBusiness: data.lineOfBusiness || 'motor',
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            premiumAmount: data.premiumAmount != null ? String(data.premiumAmount) : '',
        })
    }

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setScannedFile(file)
        setView('parsing'); setLoading(true); setError(null)

        const fd = new FormData()
        fd.append('file', file)
        const res = await scanPolicyForResolution(fd)
        setLoading(false)

        if (!res.success) {
            setError(res.error || up.scanError)
            setView('upload')
            return
        }

        applyExtraction(res.extraction as Extraction)

        // Per-customer entry: the customer is known — skip resolution.
        if (presetCustomerId) {
            setSelected(presetCustomerId)
            setView('confirm')
            return
        }

        const r = res.resolution as CustomerResolution
        setResolution(r)
        // Pre-select the confident match, else force a new customer / a pick.
        if (r.exactMatch && !r.conflict) setSelected(r.exactMatch.id)
        else if (r.candidates.length === 0) setSelected('new')
        else setSelected('') // multiple / conflict → agent must choose
        setView('resolve')
    }

    const handleSubmit = async (confirmDuplicate = false) => {
        if (!canSubmitPolicy) return
        setLoading(true); setError(null)

        const documentFormData = new FormData()
        if (scannedFile) documentFormData.append('file', scannedFile)

        const policyInput = {
            insurerName: policy.insurerName,
            policyNumber: policy.policyNumber,
            lineOfBusiness: policy.lineOfBusiness,
            startDate: policy.startDate,
            endDate: policy.endDate,
            premiumAmount: policy.premiumAmount ? parseFloat(policy.premiumAmount) : undefined,
        }

        const decision = selected === 'new'
            ? { mode: 'create_new' as const, customer: { name: customer.name, surname: customer.surname, email: customer.email, phone: customer.phone, taxId: customer.taxId } }
            : { mode: 'attach' as const, customerId: selected, taxId: customer.taxId || undefined }

        const res = await commitScannedPolicy(decision, policyInput, attestedAiConsent, documentFormData, confirmDuplicate)
        setLoading(false)

        // Possible duplicate — let the agent keep (add anyway) or cancel.
        if (!res.success && (res as any).duplicate) {
            setDuplicate((res as any).existing as DuplicatePolicy)
            setView('duplicate')
            return
        }

        if (!res.success) {
            setError((res as any).error || up.genericError)
            return
        }
        setResult({
            policyId: (res as any).policyId,
            customerId: (res as any).customerId,
            created: (res as any).created,
            analysisState: (res as any).analysisState,
        })
        setView('success')
        onSuccess?.()
    }

    const handleRequestConsent = async () => {
        if (!result?.policyId) return
        setLoading(true)
        const consentResult = await requestAiConsent(result.policyId).catch(() => null)
        setLoading(false)
        if (!consentResult || ("error" in consentResult && consentResult.error)) {
            // Rate limit / auth failure — do NOT render "consent sent".
            toast.error((consentResult && "error" in consentResult && consentResult.error) || t.agentDashboard.consentRequestFailed)
            return
        }
        if ("emailDelivered" in consentResult && consentResult.emailDelivered === false) {
            const link = "inviteLink" in consentResult ? consentResult.inviteLink : undefined
            if (link) navigator.clipboard?.writeText(link).catch(() => {})
            toast.warning(link ? t.agentDashboard.consentEmailFailedLinkCopied : t.agentDashboard.consentEmailFailed)
        }
        setConsentSent(true)
    }

    const isCreateNew = selected === 'new'
    const canContinueResolve = selected !== '' && (
        selected !== 'new' || Boolean(customer.email.trim() && customer.name.trim())
    )
    // The confirm submit is a plain button (not a <form>), so the inputs'
    // `required` isn't enforced — guard the required policy fields here, else an
    // empty date reaches the server as new Date('') and Prisma rejects it.
    const canSubmitPolicy = Boolean(
        policy.insurerName.trim() && policy.policyNumber.trim() && policy.startDate && policy.endDate
    )

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={closeAll} />

            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="upload-policy-title" tabIndex={-1} className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-[48px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                <div className="p-12">
                    {/* ── UPLOAD ── */}
                    {view === 'upload' && (
                        <div className="space-y-10">
                            <header>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary dark:text-mint">{up.kicker}</span>
                                <h2 id="upload-policy-title" className="text-3xl font-black text-foreground tracking-tighter mt-3 mb-2">
                                    {up.title} <span className="text-neutral-400 dark:text-neutral-500 italic">{up.titleAccent}</span>
                                </h2>
                                <p className="text-base text-muted-foreground font-medium">{up.desc}</p>
                            </header>

                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full p-12 rounded-[40px] border-2 border-dashed border-neutral-200 dark:border-neutral-700 hover:border-primary dark:hover:border-mint transition-all bg-neutral-50/50 dark:bg-neutral-800/30 flex flex-col items-center gap-4 group"
                            >
                                <div className="w-14 h-14 rounded-2xl bg-primary text-white dark:text-[#1A2420] flex items-center justify-center shadow-xl shadow-primary/25 group-hover:scale-110 transition-transform">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                                <div className="text-center">
                                    <p className="text-base font-black text-foreground">{up.uploadCta}</p>
                                    <p className="text-xs text-neutral-400 font-medium mt-1">{up.dropHint}</p>
                                    <p className="text-[10px] text-neutral-400 font-medium mt-2 uppercase tracking-widest">{up.uploadHint}</p>
                                </div>
                                <input type="file" ref={fileInputRef} onChange={handleFile} accept={ACCEPTED} className="hidden" />
                            </button>

                            {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

                            <button onClick={closeAll} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:text-neutral-900 transition-colors">
                                {up.cancel}
                            </button>
                        </div>
                    )}

                    {/* ── PARSING ── */}
                    {view === 'parsing' && (
                        <div className="py-20 text-center">
                            <div className="relative w-24 h-24 mx-auto mb-10">
                                <div className="absolute inset-0 rounded-full border-4 border-primary/10 border-t-primary animate-spin" />
                                <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center text-primary dark:text-mint">
                                    <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.989-2.386l-.548-.547z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                            </div>
                            <h2 className="text-2xl font-black text-foreground tracking-tighter mb-2">{up.analyzingTitle}</h2>
                            <p className="text-neutral-400 font-medium">{up.analyzingDesc}</p>
                        </div>
                    )}

                    {/* ── RESOLVE ── */}
                    {view === 'resolve' && resolution && (
                        <div className="space-y-8">
                            <header>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary dark:text-mint">{up.resolveKicker}</span>
                                <h2 className="text-2xl font-black text-foreground tracking-tighter mt-2">
                                    {up.resolveTitle} <span className="text-neutral-400 italic">{up.resolveAccent}</span>
                                </h2>
                            </header>

                            {/* Extracted identity card */}
                            <div className="p-6 rounded-[28px] bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">{up.extractedTitle}</p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="text-neutral-400 font-medium">{up.nameLabel}: </span><span className="font-bold text-foreground">{[customer.name, customer.surname].filter(Boolean).join(' ') || '—'}</span></div>
                                    <div><span className="text-neutral-400 font-medium">{up.afmLabel}: </span><span className="font-bold text-foreground">{customer.taxId || '—'}</span></div>
                                    <div><span className="text-neutral-400 font-medium">{up.emailLabel}: </span><span className="font-bold text-foreground">{customer.email || '—'}</span></div>
                                    <div><span className="text-neutral-400 font-medium">{up.phoneLabel}: </span><span className="font-bold text-foreground">{customer.phone || '—'}</span></div>
                                </div>
                            </div>

                            {resolution.conflict && (
                                <p className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-2xl px-4 py-3">{up.conflictNote}</p>
                            )}

                            {resolution.candidates.length === 0 ? (
                                <p className="text-sm font-bold text-foreground">
                                    {up.newCustomerTitle}. <span className="font-medium text-neutral-500">{up.newCustomerDesc}</span>
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm font-bold text-foreground">
                                        {resolution.exactMatch && !resolution.conflict ? up.matchedTitle : up.multipleTitle}
                                    </p>
                                    <p className="text-xs text-neutral-400 font-medium -mt-2">
                                        {resolution.exactMatch && !resolution.conflict ? up.matchedDesc : up.multipleDesc}
                                    </p>
                                    {resolution.candidates.map((c: CustomerCandidate) => (
                                        <label key={c.id} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${selected === c.id ? 'border-primary bg-primary-soft dark:bg-primary/15' : 'border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'}`}>
                                            <input type="radio" name="candidate" checked={selected === c.id} onChange={() => setSelected(c.id)} className="w-4 h-4 text-primary focus:ring-primary/30" />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-foreground truncate">{c.name || c.email}</p>
                                                <p className="text-xs text-neutral-400 font-medium truncate">
                                                    {c.email}{c.taxIdMasked ? ` · ${up.afmLabel} ${c.taxIdMasked}` : ''} · {c.policyCount} {up.policiesLabel}
                                                </p>
                                            </div>
                                        </label>
                                    ))}
                                    <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${selected === 'new' ? 'border-primary bg-primary-soft dark:bg-primary/15' : 'border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'}`}>
                                        <input type="radio" name="candidate" checked={selected === 'new'} onChange={() => setSelected('new')} className="w-4 h-4 text-primary focus:ring-primary/30" />
                                        <span className="text-sm font-bold text-foreground">{up.createNewOption}</span>
                                    </label>
                                </div>
                            )}

                            {/* Editable identity fields when creating a new customer */}
                            {isCreateNew && (
                                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
                                    <input required value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder={ac.phFirstName} className="h-12 px-5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl focus:ring-4 focus:ring-primary/10 outline-none text-sm font-bold" />
                                    <input value={customer.surname} onChange={e => setCustomer({ ...customer, surname: e.target.value })} placeholder={ac.phLastName} className="h-12 px-5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl focus:ring-4 focus:ring-primary/10 outline-none text-sm font-bold" />
                                    <input required type="email" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} placeholder="john@example.com" className="h-12 px-5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl focus:ring-4 focus:ring-primary/10 outline-none text-sm font-bold" />
                                    <input value={customer.taxId} onChange={e => setCustomer({ ...customer, taxId: e.target.value })} placeholder={ac.phTaxId} className="h-12 px-5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl focus:ring-4 focus:ring-primary/10 outline-none text-sm font-bold" />
                                </div>
                            )}

                            {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

                            <div className="flex gap-4">
                                <button onClick={() => setView('upload')} className="flex-1 px-6 py-4 bg-muted text-foreground rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all">{up.back}</button>
                                <button disabled={!canContinueResolve} onClick={() => setView('confirm')} className="flex-[2] px-6 py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-[20px] text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-primary dark:hover:bg-mint hover:text-white dark:hover:text-[#1A2420] transition-all disabled:opacity-40">
                                    {isCreateNew ? up.createNewOption : up.confirmCustomer}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── CONFIRM ── */}
                    {view === 'confirm' && (
                        <div className="space-y-8">
                            <header>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary dark:text-mint">{up.confirmKicker}</span>
                                <h2 className="text-2xl font-black text-foreground tracking-tighter mt-2">
                                    {up.confirmTitle} <span className="text-neutral-400 italic">{up.confirmAccent}</span>
                                </h2>
                                {presetCustomerName && <p className="text-xs text-neutral-400 font-medium mt-1">{presetCustomerName}</p>}
                            </header>

                            <div className="grid grid-cols-2 gap-4">
                                <Field label={ac.insurer}><input required value={policy.insurerName} onChange={e => setPolicy({ ...policy, insurerName: e.target.value })} placeholder={ac.phInsurer} className={INPUT_CLASS} /></Field>
                                <Field label={ac.policyNumber}><input required value={policy.policyNumber} onChange={e => setPolicy({ ...policy, policyNumber: e.target.value })} placeholder="POL-123456" className={INPUT_CLASS} /></Field>
                                <Field label={ac.lineOfBusiness}>
                                    <select value={policy.lineOfBusiness} onChange={e => setPolicy({ ...policy, lineOfBusiness: e.target.value })} className={`${INPUT_CLASS} appearance-none`}>
                                        <option value="motor">{ac.lobMotor}</option>
                                        <option value="health">{ac.lobHealth}</option>
                                        <option value="home">{ac.lobHome}</option>
                                        <option value="life">{ac.lobLife}</option>
                                        <option value="travel">{ac.lobTravel}</option>
                                        <option value="liability">{ac.lobLiability}</option>
                                    </select>
                                </Field>
                                <Field label={ac.premium}><input type="number" value={policy.premiumAmount} onChange={e => setPolicy({ ...policy, premiumAmount: e.target.value })} placeholder="0.00" className={INPUT_CLASS} /></Field>
                                <Field label={ac.startDate}><input required type="date" value={policy.startDate} onChange={e => setPolicy({ ...policy, startDate: e.target.value })} className={INPUT_CLASS} /></Field>
                                <Field label={ac.endDate}><input required type="date" value={policy.endDate} onChange={e => setPolicy({ ...policy, endDate: e.target.value })} className={INPUT_CLASS} /></Field>
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                                <input type="checkbox" checked={attestedAiConsent} onChange={e => setAttestedAiConsent(e.target.checked)} className="w-5 h-5 mt-0.5 rounded-lg border-neutral-300 text-primary focus:ring-primary/30" />
                                <span>
                                    <span className="block text-sm font-black text-foreground">{up.consentLabel}</span>
                                    <span className="block text-xs text-neutral-400 font-medium mt-0.5">{up.consentDesc}</span>
                                </span>
                            </label>

                            {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

                            <div className="flex gap-4">
                                <button onClick={() => setView(presetCustomerId ? 'upload' : 'resolve')} className="flex-1 px-6 py-4 bg-muted text-foreground rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all">{up.back}</button>
                                <button disabled={loading || !canSubmitPolicy} onClick={() => handleSubmit()} className="flex-[2] px-6 py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-[20px] text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-primary dark:hover:bg-mint hover:text-white dark:hover:text-[#1A2420] transition-all disabled:opacity-50">
                                    {loading ? up.submitting : (isCreateNew ? up.submitCreate : up.submitAttach)}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── DUPLICATE WARNING ── */}
                    {view === 'duplicate' && duplicate && (
                        <div className="space-y-8">
                            <header>
                                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5">
                                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </div>
                                <h2 className="text-2xl font-black text-foreground tracking-tighter">{up.duplicateTitle}</h2>
                                <p className="text-sm text-muted-foreground font-medium mt-2">{up.duplicateDesc}</p>
                            </header>

                            <div className="p-6 rounded-[28px] bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3">{up.duplicateExistingLabel}</p>
                                <p className="text-base font-black text-foreground">{duplicate.policyNumber} <span className="text-neutral-400 font-medium">· {duplicate.insurerName}</span></p>
                            </div>

                            {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}

                            <div className="flex gap-4">
                                <button disabled={loading} onClick={() => setView('confirm')} className="flex-1 px-6 py-4 bg-muted text-foreground rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all disabled:opacity-50">{up.duplicateCancel}</button>
                                <button disabled={loading} onClick={() => handleSubmit(true)} className="flex-[2] px-6 py-4 bg-amber-500 text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-amber-600 transition-all disabled:opacity-50">
                                    {loading ? up.submitting : up.duplicateKeep}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── SUCCESS ── */}
                    {view === 'success' && result && (
                        <div className="py-12 text-center space-y-6">
                            <div className="w-20 h-20 rounded-[28px] bg-primary text-white dark:text-[#1A2420] flex items-center justify-center mx-auto shadow-2xl shadow-primary/25">
                                <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-foreground tracking-tighter mb-3">{up.successTitle} <span className="text-neutral-400 italic">{up.successAccent}</span></h2>
                                <p className="text-muted-foreground font-medium max-w-sm mx-auto">{result.created ? up.successCreatedDesc : up.successAttachedDesc}</p>
                            </div>

                            {result.analysisState === 'started' && <p className="text-xs font-bold text-primary dark:text-mint">{up.analysisStarted}</p>}
                            {result.analysisState === 'limit_reached' && <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{up.analysisLimitReached}</p>}
                            {result.analysisState === 'consent_required' && (
                                <div className="space-y-3">
                                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{up.analysisConsentRequired}</p>
                                    {!consentSent && (
                                        <button disabled={loading} onClick={handleRequestConsent} className="px-6 py-3 bg-primary text-white dark:text-[#1A2420] rounded-[18px] text-[10px] font-black uppercase tracking-widest disabled:opacity-50">{up.requestConsentCta}</button>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-4 pt-2">
                                {result.customerId && (
                                    <button onClick={() => { const id = result.customerId; closeAll(); router.push(`/customers/${id}`) }} className="flex-1 px-6 py-4 bg-muted text-foreground rounded-[20px] text-[10px] font-black uppercase tracking-widest hover:bg-neutral-200 transition-all">{up.viewCustomer}</button>
                                )}
                                <button onClick={closeAll} className="flex-1 px-6 py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-[20px] text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-primary dark:hover:bg-mint hover:text-white dark:hover:text-[#1A2420] transition-all">{up.done}</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400 ml-1">{label}</label>
            {children}
        </div>
    )
}
