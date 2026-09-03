"use client"

import React, { useState } from 'react'
import { toast } from "sonner"
import { useRouter } from 'next/navigation'
import { FileUp, FileText, Sparkles, UserRound, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { scanPolicyForResolution, commitScannedPolicy, requestAiConsent } from '@/app/(protected)/agent/actions'
import { useLanguage } from '@/contexts/LanguageContext'
import { useDialog } from '@/hooks/useDialog'
import { CardHead } from '@/components/dashboard/home/CardHead'
import { Checkbox, Radio } from '@/components/ui/form'
import { UploadDropzone } from '@/components/ui/UploadDropzone'
import type { CustomerCandidate, CustomerResolution } from '@/lib/services/customer-resolution.service'
import { acceptAttribute, preflightUploadSize } from "@/lib/security/file-upload"
import { uploadRejectionMessage } from "@/lib/i18n/upload-errors"
import { WRITE_BRANCH_IDS } from "@/lib/insurance/taxonomy"
import { displayInsurerName, displayPolicyNumber } from '@/lib/wallet/policy-identity'

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
    policyNumber: string
    insurerName: string
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

// Derived from the server allowlist — this hand-written copy omitted HEIC, so
// an agent could not select an iPhone photo of a client's policy.
const ACCEPTED = acceptAttribute('policy')
// Mirrors the maxBytes the scan/commit actions validate with (agent/actions.ts).
// Kept below next.config.ts's serverActions.bodySizeLimit so the rejection is
// ours (a clear, translated message) rather than the runtime's opaque failure.
const SCAN_MAX_BYTES = 10 * 1024 * 1024

export function UploadPolicyModal({ isOpen, onClose, onSuccess, presetCustomerId, presetCustomerName }: Props) {
    const { t } = useLanguage()
    const dialogRef = useDialog<HTMLDivElement>(onClose, isOpen)
    const up = t.agentModals.uploadPolicy
    const ac = t.agentModals.addCustomer
    const router = useRouter()

    const [view, setView] = useState<View>('upload')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // Bumped on a pre-flight rejection so the dropzone remounts with an empty
    // input — the shared dropzone owns its <input>, so this replaces the
    // `e.target.value = ''` reset and lets the same file be picked again.
    const [pickerKey, setPickerKey] = useState(0)

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

    const handleFile = async (file: File) => {
        // Size pre-flight BEFORE the upload starts. This is the only size check
        // that can fire ahead of Next's Server Action body limit — past that the
        // runtime kills the request before the action runs, so the server's own
        // "too_large" message can never reach the agent. Also spares them a long
        // upload of a file that was always going to be rejected.
        const tooBig = preflightUploadSize(file.size, SCAN_MAX_BYTES)
        if (tooBig) {
            setError(uploadRejectionMessage(t, tooBig, null, SCAN_MAX_BYTES))
            setView('upload')
            setPickerKey((k) => k + 1)
            return
        }

        setScannedFile(file)
        setView('parsing'); setLoading(true); setError(null)

        const fd = new FormData()
        fd.append('file', file)

        // A Server Action can fail at the TRANSPORT layer — before the action
        // body ever runs — and then it rejects instead of returning a result:
        // an oversized body, an expired session that proxy.ts 307s to signin,
        // or a deployment skew. Without this catch the rejection escaped to
        // window.onunhandledrejection (Sentry POLICYWALLET-V) and, worse, the
        // setLoading(false) below never ran, leaving the modal stuck on the
        // 'parsing' spinner with no way out but a page reload.
        let res: Awaited<ReturnType<typeof scanPolicyForResolution>>
        try {
            res = await scanPolicyForResolution(fd)
        } catch {
            setLoading(false)
            setError(up.scanError)
            setView('upload')
            return
        }
        setLoading(false)

        if (!res.success) {
            setError(uploadRejectionMessage(t, (res as any).errorCode, res.error || up.scanError, SCAN_MAX_BYTES))
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

        // Same transport-failure guard as handleFile — this call carries the
        // PDF too, so it hits the same body-size ceiling.
        let res: Awaited<ReturnType<typeof commitScannedPolicy>>
        try {
            res = await commitScannedPolicy(decision, policyInput, attestedAiConsent, documentFormData, confirmDuplicate)
        } catch {
            setLoading(false)
            setError(up.genericError)
            return
        }
        setLoading(false)

        // Possible duplicate — let the agent keep (add anyway) or cancel.
        if (!res.success && (res as any).duplicate) {
            setDuplicate((res as any).existing as DuplicatePolicy)
            setView('duplicate')
            return
        }

        if (!res.success) {
            setError(uploadRejectionMessage(t, (res as any).errorCode, (res as any).error || up.genericError, SCAN_MAX_BYTES))
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
    // AI-consent state of whoever the policy is about to be attached to. A NEW
    // customer is created unactivated, so attestation applies; a preset customer
    // (per-client entry point) carries no resolution, so leave the existing
    // behaviour rather than guess.
    const selectedConsent: CustomerCandidate['aiConsent'] | null = isCreateNew
        ? 'attestable'
        : resolution?.candidates.find((c) => c.id === selected)?.aiConsent ?? null
    const canContinueResolve = selected !== '' && (
        selected !== 'new' || Boolean(customer.email.trim() && customer.name.trim())
    )
    // The confirm submit is a plain button (not a <form>), so the inputs'
    // `required` isn't enforced — guard the required policy fields here, else an
    // empty date reaches the server as new Date('') and Prisma rejects it.
    const canSubmitPolicy = Boolean(
        policy.insurerName.trim() && policy.policyNumber.trim() && policy.startDate && policy.endDate
    )

    // Upload → (resolve) → confirm. The per-customer entry skips resolution.
    const totalSteps = presetCustomerId ? 2 : 3
    const confirmStep = presetCustomerId ? 2 : 3
    const stepCaption = (current: number) =>
        t.common.stepOf.replace('{current}', String(current)).replace('{total}', String(totalSteps))

    // The thin track under the card head — the onboarding's progress device,
    // one segment per step, described once as a progressbar. A render helper,
    // not a nested component, so the form does not remount on every keystroke.
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
                aria-valuemax={totalSteps}
                aria-label={stepCaption(current)}
            >
                {Array.from({ length: totalSteps }, (_, i) => (
                    <span key={i} className={`h-1 flex-1 rounded-full ${i < current ? "bg-primary" : "bg-muted"}`} />
                ))}
            </div>
        </div>
    )

    const candidateRow = (checked: boolean) =>
        `pw-subcard px-3 transition-shadow ${checked ? 'ring-2 ring-primary' : ''}`

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeAll} />

            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="upload-policy-title" tabIndex={-1} className="pw-card pw-pad relative max-h-[90vh] w-full max-w-2xl overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
                {/* ── UPLOAD ── */}
                {view === 'upload' && (
                    <div className="space-y-5">
                        <header>
                            <CardHead icon={FileUp} id="upload-policy-title" title={`${up.title} ${up.titleAccent}`} meta={up.kicker} />
                            <p className="mt-2 text-sm text-muted-foreground">{up.desc}</p>
                            {stepTrack(1)}
                        </header>

                        {/* The shared dropzone: the old picker button promised
                            «σύρετε και αποθέστε εδώ» and accepted no drop. */}
                        <div>
                            <UploadDropzone
                                key={pickerKey}
                                onFiles={(files) => { const file = files[0]; if (file) void handleFile(file) }}
                                accept={ACCEPTED}
                                multiple={false}
                                inputId="upload-policy-file"
                                title={up.uploadCta}
                                hint={up.dropHint}
                            />
                            <p className="mt-2 text-center text-caption text-muted-foreground">{up.uploadHint}</p>
                        </div>

                        {error && <p role="alert" className="text-caption font-semibold text-status-danger">{error}</p>}

                        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                            <button type="button" onClick={closeAll} className="pw-soft-button">
                                {up.cancel}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── PARSING ── */}
                {view === 'parsing' && (
                    <div className="py-10 text-center">
                        <div className="relative mx-auto mb-6 h-20 w-20">
                            <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/10 border-t-primary" />
                            <div className="absolute inset-3 grid place-items-center rounded-full bg-primary/10 text-primary">
                                <Sparkles className="h-7 w-7 animate-pulse" aria-hidden="true" />
                            </div>
                        </div>
                        <h2 id="upload-policy-title" className="text-title font-semibold text-foreground">{up.analyzingTitle}</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{up.analyzingDesc}</p>
                    </div>
                )}

                {/* ── RESOLVE ── */}
                {view === 'resolve' && resolution && (
                    <div className="space-y-5">
                        <header>
                            <CardHead icon={UserRound} id="upload-policy-title" title={`${up.resolveTitle} ${up.resolveAccent}`} meta={up.resolveKicker} />
                            {stepTrack(2)}
                        </header>

                        {/* What the document said — a summary sub-card. */}
                        <div className="pw-subcard p-4">
                            <p className="text-caption font-semibold text-muted-foreground">{up.extractedTitle}</p>
                            <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                                <div className="min-w-0 [overflow-wrap:anywhere]"><dt className="inline text-muted-foreground">{up.nameLabel}: </dt><dd className="inline font-semibold text-foreground">{[customer.name, customer.surname].filter(Boolean).join(' ') || '—'}</dd></div>
                                <div className="min-w-0 [overflow-wrap:anywhere]"><dt className="inline text-muted-foreground">{up.afmLabel}: </dt><dd className="inline font-semibold text-foreground">{customer.taxId || '—'}</dd></div>
                                <div className="min-w-0 [overflow-wrap:anywhere]"><dt className="inline text-muted-foreground">{up.emailLabel}: </dt><dd className="inline font-semibold text-foreground">{customer.email || '—'}</dd></div>
                                <div className="min-w-0 [overflow-wrap:anywhere]"><dt className="inline text-muted-foreground">{up.phoneLabel}: </dt><dd className="inline font-semibold text-foreground">{customer.phone || '—'}</dd></div>
                            </dl>
                        </div>

                        {resolution.conflict && (
                            <p role="note" className="pw-subcard flex items-start gap-2 p-3 text-caption font-semibold text-status-warning">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>{up.conflictNote}</span>
                            </p>
                        )}

                        {resolution.candidates.length === 0 ? (
                            <p className="text-sm font-semibold text-foreground">
                                {up.newCustomerTitle}. <span className="font-normal text-muted-foreground">{up.newCustomerDesc}</span>
                            </p>
                        ) : (
                            <div className="space-y-2">
                                <div>
                                    <p className="text-sm font-semibold text-foreground">
                                        {resolution.exactMatch && !resolution.conflict ? up.matchedTitle : up.multipleTitle}
                                    </p>
                                    <p className="text-caption text-muted-foreground">
                                        {resolution.exactMatch && !resolution.conflict ? up.matchedDesc : up.multipleDesc}
                                    </p>
                                </div>
                                {/* Each candidate is a sub-card row; the shared Radio
                                    makes the whole row the target and the ring, not
                                    colour alone, says which one is chosen. */}
                                {resolution.candidates.map((c: CustomerCandidate) => (
                                    <div key={c.id} className={candidateRow(selected === c.id)}>
                                        <Radio
                                            name="candidate"
                                            checked={selected === c.id}
                                            onChange={() => setSelected(c.id)}
                                            label={<span className="font-semibold [overflow-wrap:anywhere]">{c.name || c.email}</span>}
                                            hint={
                                                <>
                                                    <span className="block [overflow-wrap:anywhere]">
                                                        {c.email}{c.taxIdMasked ? ` · ${up.afmLabel} ${c.taxIdMasked}` : ''} · {c.policyCount} {up.policiesLabel}
                                                    </span>
                                                    {/* Say BEFORE the upload whether an analysis can run.
                                                        Discovering "consent required" only afterwards cost a
                                                        scan, a slice of the token budget and ~90s, and left the
                                                        advisor with a policy carrying no intelligence. */}
                                                    {c.aiConsent === 'blocked' && (
                                                        <span className="mt-1 block font-semibold text-status-warning">{up.consentBlockedHint}</span>
                                                    )}
                                                    {c.aiConsent === 'attestable' && (
                                                        <span className="mt-1 block font-semibold">{up.consentAttestableHint}</span>
                                                    )}
                                                </>
                                            }
                                        />
                                    </div>
                                ))}
                                <div className={candidateRow(selected === 'new')}>
                                    <Radio
                                        name="candidate"
                                        checked={selected === 'new'}
                                        onChange={() => setSelected('new')}
                                        label={<span className="font-semibold">{up.createNewOption}</span>}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Editable identity fields when creating a new customer */}
                        {isCreateNew && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-in slide-in-from-top-2 duration-200">
                                <Field label={ac.firstName}><input required value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder={ac.phFirstName} className="pw-input" /></Field>
                                <Field label={ac.lastName}><input value={customer.surname} onChange={e => setCustomer({ ...customer, surname: e.target.value })} placeholder={ac.phLastName} className="pw-input" /></Field>
                                <Field label={ac.emailAddress}><input required type="email" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} placeholder="john@example.com" className="pw-input" /></Field>
                                <Field label={ac.taxId}><input value={customer.taxId} onChange={e => setCustomer({ ...customer, taxId: e.target.value })} placeholder={ac.phTaxId} className="pw-input" /></Field>
                            </div>
                        )}

                        {error && <p role="alert" className="text-caption font-semibold text-status-danger">{error}</p>}

                        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row">
                            <button type="button" onClick={() => setView('upload')} className="pw-soft-button flex-1">{up.back}</button>
                            <button type="button" disabled={!canContinueResolve} onClick={() => setView('confirm')} className="pw-primary-button flex-1">
                                {isCreateNew ? up.createNewOption : up.confirmCustomer}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── CONFIRM ── */}
                {view === 'confirm' && (
                    <div className="space-y-5">
                        <header>
                            <CardHead icon={FileText} id="upload-policy-title" title={`${up.confirmTitle} ${up.confirmAccent}`} meta={up.confirmKicker} />
                            {presetCustomerName && <p className="mt-1 text-caption text-muted-foreground">{presetCustomerName}</p>}
                            {stepTrack(confirmStep)}
                        </header>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label={ac.insurer}><input required value={policy.insurerName} onChange={e => setPolicy({ ...policy, insurerName: e.target.value })} placeholder={ac.phInsurer} className="pw-input" /></Field>
                            <Field label={ac.policyNumber}><input required value={policy.policyNumber} onChange={e => setPolicy({ ...policy, policyNumber: e.target.value })} placeholder="POL-123456" className="pw-input" /></Field>
                            <Field label={ac.lineOfBusiness}>
                                <select value={policy.lineOfBusiness} onChange={e => setPolicy({ ...policy, lineOfBusiness: e.target.value })} className="pw-input appearance-none">
                                    {WRITE_BRANCH_IDS.map((id) => (
                                        <option key={id} value={id}>{t.policyTypes[id] ?? id}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label={ac.premium}><input type="number" value={policy.premiumAmount} onChange={e => setPolicy({ ...policy, premiumAmount: e.target.value })} placeholder="0.00" className="pw-input" /></Field>
                            <Field label={ac.startDate}><input required type="date" value={policy.startDate} onChange={e => setPolicy({ ...policy, startDate: e.target.value })} className="pw-input" /></Field>
                            <Field label={ac.endDate}><input required type="date" value={policy.endDate} onChange={e => setPolicy({ ...policy, endDate: e.target.value })} className="pw-input" /></Field>
                        </div>

                        {/* Attestation only exists for accounts the customer has
                            never activated. Offering the checkbox for a live
                            account was a control that silently did nothing: the
                            server refuses to attest on their behalf (correctly),
                            so the advisor ticked it and still got no analysis.
                            Show the real next step instead. */}
                        {selectedConsent === 'blocked' ? (
                            <div role="note" className="pw-subcard flex items-start gap-3 p-4">
                                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-status-warning" aria-hidden="true" />
                                <div className="min-w-0">
                                    <span className="block text-sm font-semibold text-foreground">{up.consentBlockedTitle}</span>
                                    <span className="mt-0.5 block text-caption text-muted-foreground">{up.consentBlockedDesc}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="pw-subcard px-4 py-1.5">
                                <Checkbox
                                    checked={attestedAiConsent}
                                    onChange={e => setAttestedAiConsent(e.target.checked)}
                                    label={<span className="font-semibold">{up.consentLabel}</span>}
                                    hint={up.consentDesc}
                                />
                            </div>
                        )}

                        {error && <p role="alert" className="text-caption font-semibold text-status-danger">{error}</p>}

                        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row">
                            <button type="button" onClick={() => setView(presetCustomerId ? 'upload' : 'resolve')} className="pw-soft-button flex-1">{up.back}</button>
                            <button type="button" disabled={loading || !canSubmitPolicy} onClick={() => handleSubmit()} className="pw-primary-button flex-1">
                                {loading ? up.submitting : (isCreateNew ? up.submitCreate : up.submitAttach)}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── DUPLICATE WARNING ── */}
                {view === 'duplicate' && duplicate && (
                    <div className="space-y-5">
                        <header>
                            <CardHead icon={AlertTriangle} id="upload-policy-title" title={up.duplicateTitle} />
                            <p className="mt-2 text-sm text-muted-foreground">{up.duplicateDesc}</p>
                        </header>

                        <div className="pw-subcard p-4">
                            <p className="text-caption font-semibold text-muted-foreground">{up.duplicateExistingLabel}</p>
                            <p className="mt-1 text-sm font-semibold text-foreground [overflow-wrap:anywhere]">
                                {displayPolicyNumber(duplicate.policyNumber)} <span className="font-normal text-muted-foreground">· {displayInsurerName(duplicate.insurerName)}</span>
                            </p>
                        </div>

                        {error && <p role="alert" className="text-caption font-semibold text-status-danger">{error}</p>}

                        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row">
                            <button type="button" disabled={loading} onClick={() => setView('confirm')} className="pw-soft-button flex-1 disabled:opacity-60">{up.duplicateCancel}</button>
                            <button type="button" disabled={loading} onClick={() => handleSubmit(true)} className="pw-primary-button flex-1">
                                {loading ? up.submitting : up.duplicateKeep}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── SUCCESS ── */}
                {view === 'success' && result && (
                    <div className="space-y-5 py-4 text-center">
                        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-status-success-tint text-status-success" aria-hidden="true">
                            <CheckCircle2 className="h-7 w-7" />
                        </span>
                        <div>
                            <h2 id="upload-policy-title" className="text-title font-semibold text-foreground">{up.successTitle} {up.successAccent}</h2>
                            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{result.created ? up.successCreatedDesc : up.successAttachedDesc}</p>
                        </div>

                        {/* What happens to the analysis — a status sentence on a
                            sub-card, info while it runs, warning when it cannot. */}
                        {result.analysisState === 'started' && (
                            <p role="status" className="pw-subcard p-3 text-left text-caption font-semibold text-status-info">{up.analysisStarted}</p>
                        )}
                        {result.analysisState === 'limit_reached' && (
                            <p role="status" className="pw-subcard p-3 text-left text-caption font-semibold text-status-warning">{up.analysisLimitReached}</p>
                        )}
                        {result.analysisState === 'consent_required' && (
                            <div className="space-y-3">
                                <p role="status" className="pw-subcard p-3 text-left text-caption font-semibold text-status-warning">{up.analysisConsentRequired}</p>
                                {!consentSent && (
                                    <button type="button" disabled={loading} onClick={handleRequestConsent} className="pw-soft-button disabled:opacity-60">{up.requestConsentCta}</button>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row">
                            {result.customerId && (
                                <button type="button" onClick={() => { const id = result.customerId; closeAll(); router.push(`/customers/${id}`) }} className="pw-soft-button flex-1">{up.viewCustomer}</button>
                            )}
                            <button type="button" onClick={closeAll} className="pw-primary-button flex-1">{up.done}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

/**
 * Labelled form field.
 *
 * The label used to be a SIBLING of the control with no htmlFor, so it was
 * decorative: clicking it did nothing, and a screen reader announced every
 * field on the confirm step as "edit text, blank" — Insurer, Policy Number,
 * Premium and both dates, on the advisor's main data-entry surface.
 *
 * The id is generated and pushed onto the child so callers keep passing a plain
 * <input>. A child that already carries an id keeps it, so an explicit one
 * always wins.
 */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    const generatedId = React.useId()
    const child = React.isValidElement(children) ? children : null
    const childId = (child?.props as { id?: string } | undefined)?.id
    const fieldId = childId ?? generatedId

    return (
        <div className="space-y-1.5">
            {/* Sentence case at the 12px functional floor — the uppercase
                eyebrow it replaces stripped the tonos off every Greek label. */}
            <label
                htmlFor={child ? fieldId : undefined}
                className="block text-caption font-semibold text-foreground"
            >
                {label}
            </label>
            {child && !childId
                ? React.cloneElement(child as React.ReactElement<{ id?: string }>, { id: fieldId })
                : children}
        </div>
    )
}
