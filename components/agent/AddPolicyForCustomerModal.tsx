"use client"

import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/contexts/LanguageContext"

interface AddPolicyForCustomerModalProps {
    isOpen: boolean
    onClose: () => void
    customerId: string
    customerName: string
    customerEmail?: string
}

const COPY = {
    consentLabel: {
        el: "Βεβαιώνω ότι έχω λάβει τη συγκατάθεση του πελάτη για επεξεργασία των εγγράφων του με AI",
        en: "I confirm I have obtained the customer's consent for AI processing of their documents",
    },
    consentHelper: {
        el: "Καταγράφεται ως αποδεικτικό",
        en: "Recorded as evidence",
    },
    limitTitle: {
        el: "Φτάσατε το όριο συμβολαίων ανά πελάτη",
        en: "Per-customer policy limit reached",
    },
    limitBody: {
        el: "Το πλάνο σας επιτρέπει έως {limit} συμβόλαια ανά πελάτη (τρέχοντα: {current}).",
        en: "Your plan allows up to {limit} policies per customer (current: {current}).",
    },
    upgradeCta: {
        el: "Αναβάθμιση πλάνου",
        en: "Upgrade plan",
    },
    successTitle: {
        el: "Το ασφαλιστήριο προστέθηκε",
        en: "Policy added",
    },
    analysisStartedNotice: {
        el: "Η ανάλυση AI ξεκίνησε για αυτό το ασφαλιστήριο.",
        en: "AI analysis has started for this policy.",
    },
    consentRequiredNotice: {
        el: "Το έγγραφο αποθηκεύτηκε, αλλά απαιτείται συγκατάθεση του πελάτη πριν την ανάλυση AI.",
        en: "The document was saved, but customer consent is required before AI analysis.",
    },
    requestConsentCta: {
        el: "Αίτημα συγκατάθεσης",
        en: "Request consent",
    },
    consentRequestSent: {
        el: "Το αίτημα συγκατάθεσης στάλθηκε",
        en: "Consent request sent",
    },
    consentRequestFailed: {
        el: "Αποτυχία αποστολής αιτήματος συγκατάθεσης",
        en: "Failed to send consent request",
    },
    analysisLimitNotice: {
        el: "Το έγγραφο αποθηκεύτηκε, αλλά φτάσατε το όριο αναλύσεων AI του πλάνου σας.",
        en: "The document was saved, but you reached your plan's AI analysis limit.",
    },
    viewPlansCta: {
        el: "Δείτε τα πλάνα",
        en: "View plans",
    },
    inviteCustomerCta: {
        el: "Πρόσκληση πελάτη στο wallet του",
        en: "Invite customer to their wallet",
    },
    inviteSent: {
        el: "Η πρόσκληση στάλθηκε",
        en: "Invitation sent",
    },
    inviteFailed: {
        el: "Αποτυχία αποστολής πρόσκλησης",
        en: "Failed to send invitation",
    },
    closeCta: {
        el: "Κλείσιμο",
        en: "Close",
    },
} as const

interface PolicyFormData {
    insurerName: string
    policyNumber: string
    lineOfBusiness: string
    startDate: string
    endDate: string
    premiumAmount: string
    premiumCurrency: string
    carPlate?: string
}

const insurerOptions = [
    "Ethniki Asfalistiki",
    "Interamerican",
    "Eurolife",
    "AIG",
    "Piraeus",
    "Alpha Bank",
    "Ethniki Bank Wallet",
    "Allianz",
    "NN Hellas",
    "Ergo",
    "Groupama",
    "AOK",
    "Aon",
    "Axa",
    "Bupa",
    "Cigna",
    "Direct Line",
    "Eka",
    "Eurest",
    "FWD",
    "Generali",
    "Hellenic",
    "Icaria",
    "Ivory",
    "Lloyds",
    "Mapfre",
    "Mitsui",
    "National",
    "Omni",
    "Piraeus",
    "Prudential",
    "QBE",
    "Royal & SunAlliance",
    "Safeguard",
    "Samsung Life",
    "Santander",
    "Scor",
    "Swiss Re",
    "Tower",
    "Travelers",
    "Viva",
    "Zurich",
    "Other"
];

const policyTypes = [
    { value: "motor", label: "🚗 Motor", icon: "🚗" },
    { value: "health", label: "❤️ Health", icon: "❤️" },
    { value: "home", label: "🏠 Home", icon: "🏠" },
    { value: "life", label: "🛡️ Life", icon: "🛡️" },
    { value: "travel", label: "✈️ Travel", icon: "✈️" },
    { value: "liability", label: "⚖️ Liability", icon: "⚖️" },
]

type AnalysisState = 'started' | 'consent_required' | 'limit_reached' | 'none'

interface AddPolicyResult {
    success: boolean
    policyId?: string
    analysisState?: AnalysisState
    error?: string
    reason?: string
    current?: number
    limit?: number
}

export function AddPolicyForCustomerModal({
    isOpen,
    onClose,
    customerId,
    customerName,
    customerEmail
}: AddPolicyForCustomerModalProps) {
    const router = useRouter()
    const { language } = useLanguage()
    const isEl = language === "el"
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [step, setStep] = useState<'type' | 'details' | 'confirm' | 'success'>('type')
    const [scannedFile, setScannedFile] = useState<File | null>(null)
    const [attestedAiConsent, setAttestedAiConsent] = useState(false)
    const [limitInfo, setLimitInfo] = useState<{ current?: number; limit?: number } | null>(null)
    const [successResult, setSuccessResult] = useState<{ policyId: string; analysisState: AnalysisState } | null>(null)
    const [isRequestingConsent, setIsRequestingConsent] = useState(false)
    const [consentRequested, setConsentRequested] = useState(false)
    const [isInviting, setIsInviting] = useState(false)
    const [inviteSent, setInviteSent] = useState(false)
    const [formData, setFormData] = useState<PolicyFormData>({
        insurerName: "",
        policyNumber: "",
        lineOfBusiness: "",
        startDate: "",
        endDate: "",
        premiumAmount: "",
        premiumCurrency: "EUR",
        carPlate: ""
    })

    const handleScan = async (file: File) => {
        setIsScanning(true)
        const formData = new FormData()
        formData.append("file", file)

        try {
            const { parsePolicyPdfWithGemini } = await import("@/app/(protected)/agent/actions")
            const result = await parsePolicyPdfWithGemini(formData)

            if (result.success && result.data) {
                const data = result.data
                setFormData(prev => ({
                    ...prev,
                    insurerName: data.insurerName || "",
                    policyNumber: data.policyNumber || "",
                    lineOfBusiness: data.lineOfBusiness || prev.lineOfBusiness,
                    startDate: data.startDate || "",
                    endDate: data.endDate || "",
                    premiumAmount: data.premiumAmount?.toString() || ""
                }))
                // Keep the scanned file so it can be attached to the policy on submit.
                setScannedFile(file)
                toast.success(isEl ? "Το ασφαλιστήριο σαρώθηκε επιτυχώς!" : "Policy scanned successfully!")
                setStep('details')
            } else {
                toast.error(result.error || (isEl ? "Αποτυχία ανάλυσης εγγράφου" : "Failed to parse document"))
            }
        } catch (e) {
            console.error(e)
            toast.error(isEl ? "Προέκυψε σφάλμα κατά τη σάρωση" : "An error occurred during scanning")
        } finally {
            setIsScanning(false)
        }
    }

    if (!isOpen) return null

    const handleTypeSelect = (type: string) => {
        setFormData(prev => ({ ...prev, lineOfBusiness: type }))
        setStep('details')
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setLimitInfo(null)

        try {
            const { addPolicyForCustomer } = await import("@/app/(protected)/agent/actions")

            // Re-attach the scanned document (if any) so the server can persist it.
            let documentFormData: FormData | undefined
            if (scannedFile) {
                documentFormData = new FormData()
                documentFormData.append("file", scannedFile)
            }

            const result = (await addPolicyForCustomer({
                customerId,
                policy: {
                    insurerName: formData.insurerName,
                    policyNumber: formData.policyNumber,
                    lineOfBusiness: formData.lineOfBusiness,
                    startDate: formData.startDate,
                    endDate: formData.endDate,
                    premiumAmount: parseFloat(formData.premiumAmount) || undefined,
                    premiumCurrency: formData.premiumCurrency,
                    carPlate: formData.carPlate
                },
                attestedAiConsent
            }, documentFormData)) as AddPolicyResult

            if (result.success && result.policyId) {
                toast.success(isEl ? "Το ασφαλιστήριο προστέθηκε επιτυχώς!" : "Policy added successfully!")
                router.refresh()
                setSuccessResult({ policyId: result.policyId, analysisState: result.analysisState || 'none' })
                setStep('success')
            } else if (result.reason === 'policy_per_customer_limit') {
                setLimitInfo({ current: result.current, limit: result.limit })
            } else {
                toast.error(result.error || (isEl ? "Αποτυχία προσθήκης ασφαλιστηρίου" : "Failed to add policy"))
            }
        } catch (error) {
            console.error(error)
            toast.error(isEl ? "Προέκυψε σφάλμα κατά την προσθήκη" : "An error occurred while adding the policy")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleRequestConsent = async () => {
        if (!successResult) return
        setIsRequestingConsent(true)
        try {
            const { requestAiConsent } = await import("@/app/(protected)/agent/actions")
            const result = await requestAiConsent(successResult.policyId)
            if (result && "success" in result && result.success) {
                setConsentRequested(true)
                toast.success(COPY.consentRequestSent[language])
            } else {
                toast.error((result as { error?: string }).error || COPY.consentRequestFailed[language])
            }
        } catch (error) {
            console.error(error)
            toast.error(COPY.consentRequestFailed[language])
        } finally {
            setIsRequestingConsent(false)
        }
    }

    const handleInviteCustomer = async () => {
        if (!customerEmail) return
        setIsInviting(true)
        try {
            const { createAgentInvite } = await import("@/app/(protected)/agent/actions")
            const result = (await createAgentInvite(customerEmail, 'portfolio')) as { success: boolean; error?: string }
            if (result.success) {
                setInviteSent(true)
                toast.success(COPY.inviteSent[language])
            } else {
                toast.error(result.error || COPY.inviteFailed[language])
            }
        } catch (error) {
            console.error(error)
            toast.error(COPY.inviteFailed[language])
        } finally {
            setIsInviting(false)
        }
    }

    const handleClose = () => {
        setStep('type')
        setFormData({
            insurerName: "",
            policyNumber: "",
            lineOfBusiness: "",
            startDate: "",
            endDate: "",
            premiumAmount: "",
            premiumCurrency: "EUR",
            carPlate: ""
        })
        setScannedFile(null)
        setAttestedAiConsent(false)
        setLimitInfo(null)
        setSuccessResult(null)
        setConsentRequested(false)
        setInviteSent(false)
        onClose()
    }

    const isFormValid = () => {
        return (
            formData.insurerName &&
            formData.policyNumber &&
            formData.lineOfBusiness &&
            formData.startDate &&
            formData.endDate
        )
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={handleClose} />

            <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                <div className="p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-black text-stone-900 dark:text-white tracking-tight">
                                Add Policy for {customerName}
                            </h2>
                            <p className="text-xs text-stone-500 mt-1">
                                This policy will appear in their wallet
                            </p>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors"
                        >
                            <svg className="w-5 h-5 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Info Banner or Scanner */}
                    {!formData.lineOfBusiness && step === 'type' ? (
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 group hover:border-mint/50 transition-all cursor-pointer relative overflow-hidden" onClick={() => document.getElementById('scan-upload')?.click()}>
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <svg className="w-16 h-16 text-mint" fill="currentColor" viewBox="0 0 24 24"><path d="M5 3C3.89 3 3 3.89 3 5V19C3 20.11 3.89 21 5 21H19C20.11 21 21 20.11 21 19V5C21 3.89 20.11 3 19 3H5M5 5H19V19H5V5M7 7V9H17V7H7M7 11V13H17V11H7M7 15V17H14V15H7Z" /></svg>
                            </div>
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-mint/20 rounded-xl flex items-center justify-center flex-shrink-0 animate-pulse-slow">
                                    <svg className="w-6 h-6 text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-white group-hover:text-mint transition-colors">
                                        AI Policy Scanner
                                    </h3>
                                    <p className="text-xs text-stone-400 mt-1">
                                        Upload a policy to auto-fill details instantly
                                    </p>
                                    {isScanning && (
                                        <div className="mt-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-mint">
                                            <span className="w-2 h-2 bg-mint rounded-full animate-ping"></span>
                                            Analyzing Document...
                                        </div>
                                    )}
                                </div>
                            </div>
                            <input
                                id="scan-upload"
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) handleScan(file)
                                }}
                                disabled={isScanning}
                            />
                        </div>
                    ) : (
                        <div className="bg-primary-tint dark:bg-primary/15 border border-primary/20 dark:border-primary/30 rounded-2xl p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-primary-soft dark:bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <svg className="w-4 h-4 text-primary dark:text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-primary-hover dark:text-mint">
                                        Adding on behalf of customer
                                    </p>
                                    <p className="text-xs text-primary dark:text-mint mt-1">
                                        They will be notified and can manage this policy.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 1: Select Policy Type */}
                    {step === 'type' && (
                        <div className="space-y-4">
                            <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">
                                What type of policy are you adding?
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                                {policyTypes.map((type) => (
                                    <button
                                        key={type.value}
                                        onClick={() => handleTypeSelect(type.value)}
                                        className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-primary dark:hover:border-mint rounded-2xl transition-all hover:shadow-lg group"
                                    >
                                        <span className="text-2xl">{type.icon}</span>
                                        <span className="font-bold text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-mint">
                                            {type.label.split(' ')[1]}
                                        </span>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={handleClose}
                                className="w-full py-4 text-xs font-bold text-stone-400 hover:text-stone-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* Step 2: Policy Details */}
                    {step === 'details' && (
                        <form onSubmit={(e) => { e.preventDefault(); setStep('confirm') }} className="space-y-5">
                            {/* Selected Type Badge */}
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStep('type')}
                                    className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <span className="px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 text-sm font-bold rounded-full capitalize">
                                    {policyTypes.find(t => t.value === formData.lineOfBusiness)?.icon} {formData.lineOfBusiness}
                                </span>
                            </div>

                            {/* Insurer */}
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                                    Insurer *
                                </label>
                                <select
                                    name="insurerName"
                                    value={formData.insurerName}
                                    onChange={handleInputChange}
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="">Select insurer...</option>
                                    {insurerOptions.map(insurer => (
                                        <option key={insurer} value={insurer}>{insurer}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Policy Number */}
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                                    Policy Number *
                                </label>
                                <input
                                    type="text"
                                    name="policyNumber"
                                    value={formData.policyNumber}
                                    onChange={handleInputChange}
                                    placeholder="e.g., POL-2024-12345"
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            {/* Car Plate (for motor only) */}
                            {formData.lineOfBusiness === 'motor' && (
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                                        License Plate
                                    </label>
                                    <input
                                        type="text"
                                        name="carPlate"
                                        value={formData.carPlate}
                                        onChange={handleInputChange}
                                        placeholder="e.g., ΝΑΑ-1234"
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                            )}

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                                        Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                                        End Date *
                                    </label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={formData.endDate}
                                        onChange={handleInputChange}
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* Premium */}
                            <div>
                                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                                    Annual Premium
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        name="premiumAmount"
                                        value={formData.premiumAmount}
                                        onChange={handleInputChange}
                                        placeholder="0.00"
                                        step="0.01"
                                        className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                    <select
                                        name="premiumCurrency"
                                        value={formData.premiumCurrency}
                                        onChange={handleInputChange}
                                        className="w-24 px-3 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                    >
                                        <option value="EUR">EUR</option>
                                        <option value="USD">USD</option>
                                        <option value="GBP">GBP</option>
                                    </select>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-bold rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!isFormValid()}
                                    className="flex-1 px-4 py-3 bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Review
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Step 3: Confirm */}
                    {step === 'confirm' && (
                        <div className="space-y-5">
                            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-5 space-y-4">
                                <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider">
                                    Policy Summary
                                </h4>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-stone-500">Type</span>
                                        <span className="text-sm font-bold text-stone-900 dark:text-white capitalize">
                                            {policyTypes.find(t => t.value === formData.lineOfBusiness)?.icon} {formData.lineOfBusiness}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-stone-500">Insurer</span>
                                        <span className="text-sm font-bold text-stone-900 dark:text-white">{formData.insurerName}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-stone-500">Policy #</span>
                                        <span className="text-sm font-mono text-stone-900 dark:text-white">{formData.policyNumber}</span>
                                    </div>
                                    {formData.carPlate && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-stone-500">Plate</span>
                                            <span className="text-sm font-mono text-stone-900 dark:text-white">{formData.carPlate}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-stone-500">Period</span>
                                        <span className="text-sm font-bold text-stone-900 dark:text-white">
                                            {new Date(formData.startDate).toLocaleDateString()} → {new Date(formData.endDate).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {formData.premiumAmount && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-stone-500">Premium</span>
                                            <span className="text-sm font-bold text-primary dark:text-mint">
                                                {formData.premiumCurrency} {parseFloat(formData.premiumAmount).toLocaleString()}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Customer will be notified */}
                            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                <span className="text-sm font-medium">
                                    {customerName} will be notified about this policy
                                </span>
                            </div>

                            {/* AI-consent attestation */}
                            <div className="bg-stone-50 dark:bg-stone-800/50 rounded-2xl p-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={attestedAiConsent}
                                        onChange={(e) => setAttestedAiConsent(e.target.checked)}
                                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-stone-300 dark:border-stone-600 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm text-stone-700 dark:text-stone-300">
                                        {COPY.consentLabel[language]}
                                    </span>
                                </label>
                                <p className="mt-2 pl-7 text-xs text-stone-400">
                                    {COPY.consentHelper[language]}
                                </p>
                            </div>

                            {/* Per-customer policy limit reached — inline upgrade card */}
                            {limitInfo && (
                                <div className="bg-primary-tint border border-[#E2E8F0] rounded-2xl p-5">
                                    <p className="text-sm font-bold text-stone-900">
                                        {COPY.limitTitle[language]}
                                    </p>
                                    <p className="mt-1 text-xs text-stone-600">
                                        {COPY.limitBody[language]
                                            .replace("{limit}", String(limitInfo.limit ?? "-"))
                                            .replace("{current}", String(limitInfo.current ?? "-"))}
                                    </p>
                                    <Link
                                        href="/agent/pricing"
                                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-hover px-4 py-2 text-xs font-bold text-white dark:text-[#1A2420] transition-colors"
                                    >
                                        {COPY.upgradeCta[language]}
                                    </Link>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep('details')}
                                    className="flex-1 px-4 py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-bold rounded-xl hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-3 bg-primary hover:bg-primary-hover text-white dark:text-[#1A2420] font-bold rounded-xl disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                            </svg>
                                            Add Policy
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {step === 'success' && successResult && (
                        <div className="space-y-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary-soft dark:bg-primary/15 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-primary dark:text-mint" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-lg font-black text-stone-900 dark:text-white tracking-tight">
                                        {COPY.successTitle[language]}
                                    </p>
                                    {successResult.analysisState === 'started' && (
                                        <p className="text-xs text-stone-500 mt-0.5">
                                            {COPY.analysisStartedNotice[language]}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* AI consent still required for analysis */}
                            {successResult.analysisState === 'consent_required' && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                                    <p className="text-sm text-amber-800 dark:text-amber-300">
                                        {COPY.consentRequiredNotice[language]}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleRequestConsent}
                                        disabled={isRequestingConsent || consentRequested}
                                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-hover px-4 py-2 text-xs font-bold text-white dark:text-[#1A2420] disabled:opacity-50 transition-colors"
                                    >
                                        {consentRequested ? COPY.consentRequestSent[language] : COPY.requestConsentCta[language]}
                                    </button>
                                </div>
                            )}

                            {/* Agent AI-analysis limit reached */}
                            {successResult.analysisState === 'limit_reached' && (
                                <div className="bg-primary-tint border border-[#E2E8F0] rounded-2xl p-4">
                                    <p className="text-sm text-stone-700">
                                        {COPY.analysisLimitNotice[language]}
                                    </p>
                                    <Link
                                        href="/agent/pricing"
                                        className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-hover px-4 py-2 text-xs font-bold text-white dark:text-[#1A2420] transition-colors"
                                    >
                                        {COPY.viewPlansCta[language]}
                                    </Link>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col gap-3 pt-2">
                                {customerEmail && (
                                    <button
                                        type="button"
                                        onClick={handleInviteCustomer}
                                        disabled={isInviting || inviteSent}
                                        className="w-full px-4 py-3 bg-primary-soft dark:bg-primary/15 text-primary dark:text-mint font-bold rounded-full hover:bg-primary/20 dark:hover:bg-primary/25 disabled:opacity-50 transition-colors"
                                    >
                                        {inviteSent ? COPY.inviteSent[language] : COPY.inviteCustomerCta[language]}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="w-full px-4 py-3 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 font-bold rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                                >
                                    {COPY.closeCta[language]}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
