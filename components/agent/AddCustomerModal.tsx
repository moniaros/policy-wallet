"use client"

import React, { useState, useRef } from 'react'
import { UserPlus, PenLine, FileUp, Sparkles, CheckCircle2 } from 'lucide-react'
import { addCustomerManually, parsePolicyPdfWithGemini } from '@/app/(protected)/agent/actions'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDialog } from '@/hooks/useDialog'
import { CardHead } from '@/components/dashboard/home/CardHead'
import { Checkbox } from '@/components/ui/form'
import { acceptAttribute, preflightUploadSize } from "@/lib/security/file-upload"
import { uploadRejectionMessage } from "@/lib/i18n/upload-errors"
import { WRITE_BRANCH_IDS } from "@/lib/insurance/taxonomy"

// Mirrors the maxBytes parsePolicyPdfWithGemini validates with, and stays under
// next.config.ts's serverActions.bodySizeLimit so we own the rejection message.
const SCAN_MAX_BYTES = 10 * 1024 * 1024

interface Props {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

type View = 'choice' | 'manual' | 'pdf' | 'parsing' | 'success'

// Two steps whichever door the agent takes: choose a method, then the details.
const TOTAL_STEPS = 2

// Sentence-case field label — the 10px uppercase eyebrow it replaces stripped
// the tonos off every Greek label («ΟΝΟΜΑ», «ΕΠΩΝΥΜΟ») and sat under the 12px
// functional floor.
const LABEL = "block text-caption font-semibold text-foreground"

export function AddCustomerModal({ isOpen, onClose, onSuccess }: Props) {
    const { t } = useLanguage()
    const dialogRef = useDialog<HTMLDivElement>(onClose, isOpen)
    const ac = t.agentModals.addCustomer
    const [view, setView] = useState<View>('choice')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Manual Form State
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        phone: '',
        taxId: '',
        addPolicy: false,
        policy: {
            insurerName: '',
            policyNumber: '',
            lineOfBusiness: 'motor',
            startDate: '',
            endDate: '',
            premiumAmount: ''
        }
    })

    if (!isOpen) return null

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        // Transport-level Server Action failures (expired session redirected to
        // signin by proxy.ts, deployment skew, oversized body) reject rather
        // than returning a result. Without this the rejection escapes to
        // window.onunhandledrejection and setLoading(false) never runs, pinning
        // the modal on its spinner. See Sentry POLICYWALLET-V.
        let result: Awaited<ReturnType<typeof addCustomerManually>>
        try {
            result = await addCustomerManually({
                name: formData.name,
                surname: formData.surname,
                email: formData.email,
                phone: formData.phone,
                taxId: formData.taxId,
                policy: formData.addPolicy ? {
                    ...formData.policy,
                    premiumAmount: formData.policy.premiumAmount ? parseFloat(formData.policy.premiumAmount) : undefined
                } : undefined
            })
        } catch {
            setError(t.agentModals.uploadPolicy.genericError)
            setLoading(false)
            return
        }

        if ('error' in result) {
            setError(result.error as string)
        } else {
            setView('success')
            onSuccess?.()
        }
        setLoading(false)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Size pre-flight before the upload starts — the only size check that can
        // fire ahead of Next's Server Action body limit. See UploadPolicyModal.
        const tooBig = preflightUploadSize(file.size, SCAN_MAX_BYTES)
        if (tooBig) {
            setError(uploadRejectionMessage(t, tooBig, null, SCAN_MAX_BYTES))
            setView('choice')
            e.target.value = ''
            return
        }

        setView('parsing')
        setLoading(true)

        const formDataObj = new FormData()
        formDataObj.append('file', file)

        // Same transport-failure guard — this one carries the PDF, so it is the
        // call that actually hit the 1 MB Server Action body cap.
        let result: Awaited<ReturnType<typeof parsePolicyPdfWithGemini>>
        try {
            result = await parsePolicyPdfWithGemini(formDataObj)
        } catch {
            setError(t.agentModals.uploadPolicy.scanError)
            setView('choice')
            setLoading(false)
            return
        }

        if ('error' in result) {
            setError(uploadRejectionMessage(t, (result as any).errorCode, result.error as string, SCAN_MAX_BYTES))
            setView('choice')
        } else if ('success' in result && result.data) {
            const data = result.data
            setFormData(prev => ({
                ...prev,
                name: data.customerName || '',
                surname: data.customerSurname || '',
                email: data.customerEmail || '',
                addPolicy: true,
                policy: {
                    insurerName: data.insurerName || '',
                    policyNumber: data.policyNumber || '',
                    lineOfBusiness: data.lineOfBusiness || 'motor',
                    startDate: data.startDate || '',
                    endDate: data.endDate || '',
                    premiumAmount: data.premiumAmount?.toString() || ''
                }
            }))
            setView('manual')
        }
        setLoading(false)
    }

    const reset = () => {
        setView('choice')
        setFormData({
            name: '',
            surname: '',
            email: '',
            phone: '',
            taxId: '',
            addPolicy: false,
            policy: {
                insurerName: '',
                policyNumber: '',
                lineOfBusiness: 'motor',
                startDate: '',
                endDate: '',
                premiumAmount: ''
            }
        })
        setError(null)
    }

    const stepCaption = (current: number) =>
        t.common.stepOf.replace('{current}', String(current)).replace('{total}', String(TOTAL_STEPS))

    // The thin track under the card head — the onboarding's progress device,
    // one segment per step, described once as a progressbar. A render helper,
    // not a nested component: a component type minted per render remounts
    // its subtree on every keystroke in the form.
    const stepTrack = (current: number, meta?: string) => (
        <div className="mt-3">
            <div className="flex items-center justify-between gap-2 text-caption text-muted-foreground">
                <span className="font-semibold">{stepCaption(current)}</span>
                {meta && <span>{meta}</span>}
            </div>
            <div
                className="mt-1.5 flex gap-1"
                role="progressbar"
                aria-valuenow={current}
                aria-valuemin={1}
                aria-valuemax={TOTAL_STEPS}
                aria-label={stepCaption(current)}
            >
                {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                    <span key={i} className={`h-1 flex-1 rounded-full ${i < current ? "bg-primary" : "bg-muted"}`} />
                ))}
            </div>
        </div>
    )

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { reset(); onClose(); }} />

            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="add-customer-title" tabIndex={-1} className="pw-card pw-pad relative max-h-[90vh] w-full max-w-2xl overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
                {view === 'choice' && (
                    <div className="space-y-5">
                        <header>
                            <CardHead icon={UserPlus} id="add-customer-title" title={`${ac.title} ${ac.titleAccent}`} meta={ac.kicker} />
                            <p className="mt-2 text-sm text-muted-foreground">{ac.desc}</p>
                            {stepTrack(1)}
                        </header>

                        {/* The two doors are sub-cards: chip · title · caption, the
                            row anatomy of every menu in the app. */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <button
                                type="button"
                                onClick={() => setView('manual')}
                                className="pw-subcard flex min-h-11 items-start gap-3 p-4 text-left transition-colors"
                            >
                                <span className="pw-card-chip" aria-hidden="true">
                                    <PenLine className="h-4 w-4" strokeWidth={1.75} />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-foreground">{ac.manualTitle}</span>
                                    <span className="mt-0.5 block text-caption text-muted-foreground">{ac.manualDesc}</span>
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="pw-subcard flex min-h-11 items-start gap-3 p-4 text-left transition-colors"
                            >
                                <span className="pw-card-chip" aria-hidden="true">
                                    <FileUp className="h-4 w-4" strokeWidth={1.75} />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-foreground">{ac.pdfTitle}</span>
                                    <span className="mt-0.5 block text-caption text-muted-foreground">{ac.pdfDesc}</span>
                                </span>
                            </button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept={acceptAttribute("policy")} className="hidden" />
                        </div>

                        {/* A rejected or failed scan sends the agent back here, so
                            the reason has to be readable here — it used to render
                            only on the form step, which this door never reached. */}
                        {error && <p role="alert" className="text-caption font-semibold text-status-danger">{error}</p>}

                        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="pw-soft-button"
                            >
                                {ac.goBack}
                            </button>
                        </div>
                    </div>
                )}

                {view === 'parsing' && (
                    <div className="py-10 text-center">
                        <div className="relative mx-auto mb-6 h-20 w-20">
                            <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/10 border-t-primary" />
                            <div className="absolute inset-3 grid place-items-center rounded-full bg-primary/10 text-primary">
                                <Sparkles className="h-7 w-7 animate-pulse" aria-hidden="true" />
                            </div>
                        </div>
                        <h2 id="add-customer-title" className="text-title font-semibold text-foreground">{ac.analyzingTitle}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{ac.analyzingDesc}</p>
                    </div>
                )}

                {view === 'manual' && (
                    <form onSubmit={handleManualSubmit} className="space-y-5">
                        <header>
                            <CardHead
                                icon={PenLine}
                                id="add-customer-title"
                                title={`${ac.detailsTitle} ${ac.detailsAccent}`}
                                meta={
                                    <button type="button" onClick={() => setView('choice')} className="pw-soft-button">
                                        {ac.changeMethod}
                                    </button>
                                }
                            />
                            {stepTrack(2, ac.manualProtocol)}
                        </header>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label htmlFor="addcustomermodal-f1" className={LABEL}>{ac.firstName}</label>
                                <input id="addcustomermodal-f1"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="pw-input"
                                    placeholder={ac.phFirstName}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="addcustomermodal-f2" className={LABEL}>{ac.lastName}</label>
                                <input id="addcustomermodal-f2"
                                    required
                                    value={formData.surname}
                                    onChange={e => setFormData({ ...formData, surname: e.target.value })}
                                    className="pw-input"
                                    placeholder={ac.phLastName}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="addcustomermodal-f3" className={LABEL}>{ac.emailAddress}</label>
                                <input id="addcustomermodal-f3"
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="pw-input"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="addcustomermodal-f4" className={LABEL}>{ac.phoneNumber}</label>
                                <input id="addcustomermodal-f4"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="pw-input"
                                    placeholder="+30 690 000 0000"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="addcustomermodal-f5" className={LABEL}>{ac.taxId}</label>
                                <input id="addcustomermodal-f5"
                                    value={formData.taxId}
                                    onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                                    className="pw-input"
                                    placeholder={ac.phTaxId}
                                />
                            </div>
                        </div>

                        {/* The optional policy block is a sub-card, never a card inside
                            the dialog card. The shared Checkbox makes the whole row the
                            44px target instead of a 20px box. */}
                        <div className="pw-subcard px-4 py-3">
                            <Checkbox
                                checked={formData.addPolicy}
                                onChange={e => setFormData({ ...formData, addPolicy: e.target.checked })}
                                label={<span className="font-semibold">{ac.includePolicy}</span>}
                            />

                            {formData.addPolicy && (
                                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 animate-in slide-in-from-top-4 duration-300">
                                    <div className="space-y-1.5">
                                        <label htmlFor="addcustomermodal-f6" className={LABEL}>{ac.insurer}</label>
                                        <input id="addcustomermodal-f6"
                                            required={formData.addPolicy}
                                            value={formData.policy.insurerName}
                                            onChange={e => setFormData({ ...formData, policy: { ...formData.policy, insurerName: e.target.value } })}
                                            className="pw-input"
                                            placeholder={ac.phInsurer}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="addcustomermodal-f7" className={LABEL}>{ac.policyNumber}</label>
                                        <input id="addcustomermodal-f7"
                                            required={formData.addPolicy}
                                            value={formData.policy.policyNumber}
                                            onChange={e => setFormData({ ...formData, policy: { ...formData.policy, policyNumber: e.target.value } })}
                                            className="pw-input"
                                            placeholder="POL-123456"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="addcustomermodal-f8" className={LABEL}>{ac.lineOfBusiness}</label>
                                        <select id="addcustomermodal-f8"
                                            required={formData.addPolicy}
                                            value={formData.policy.lineOfBusiness}
                                            onChange={e => setFormData({ ...formData, policy: { ...formData.policy, lineOfBusiness: e.target.value } })}
                                            className="pw-input appearance-none"
                                        >
                                            {WRITE_BRANCH_IDS.map((id) => (
                                                <option key={id} value={id}>{t.policyTypes[id] ?? id}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="addcustomermodal-f9" className={LABEL}>{ac.premium}</label>
                                        <input id="addcustomermodal-f9"
                                            type="number"
                                            value={formData.policy.premiumAmount}
                                            onChange={e => setFormData({ ...formData, policy: { ...formData.policy, premiumAmount: e.target.value } })}
                                            className="pw-input"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="addcustomermodal-f10" className={LABEL}>{ac.startDate}</label>
                                        <input id="addcustomermodal-f10"
                                            required={formData.addPolicy}
                                            type="date"
                                            value={formData.policy.startDate}
                                            onChange={e => setFormData({ ...formData, policy: { ...formData.policy, startDate: e.target.value } })}
                                            className="pw-input"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label htmlFor="addcustomermodal-f11" className={LABEL}>{ac.endDate}</label>
                                        <input id="addcustomermodal-f11"
                                            required={formData.addPolicy}
                                            type="date"
                                            value={formData.policy.endDate}
                                            onChange={e => setFormData({ ...formData, policy: { ...formData.policy, endDate: e.target.value } })}
                                            className="pw-input"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {error && <p role="alert" className="text-caption font-semibold text-status-danger">{error}</p>}

                        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => { reset(); onClose(); }}
                                className="pw-soft-button flex-1"
                            >
                                {ac.cancel}
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="pw-primary-button flex-1"
                            >
                                {loading ? ac.processing : ac.addToPipeline}
                            </button>
                        </div>
                    </form>
                )}

                {view === 'success' && (
                    <div className="py-8 text-center">
                        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-status-success-tint text-status-success" aria-hidden="true">
                            <CheckCircle2 className="h-7 w-7" />
                        </span>
                        <h2 id="add-customer-title" className="mt-4 text-title font-semibold text-foreground">{ac.successTitle} {ac.successAccent}</h2>
                        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{ac.successDesc}</p>
                        <button
                            type="button"
                            onClick={() => { reset(); onClose(); }}
                            className="pw-primary-button mt-6"
                        >
                            {ac.continueToCrm}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
