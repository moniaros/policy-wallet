"use client"

import { useState, useMemo } from "react"
import {
    AlertTriangle,
    Building2,
    Calendar,
    Car,
    Download,
    EyeOff,
    FileText,
    History,
    Home,
    Lightbulb,
    Loader2,
    Mail,
    MessageSquare,
    Phone,
    Shield,
    ShieldCheck,
    Share2,
    Sparkles,
    TrendingUp,
    User,
    UserCheck,
    UserRound,
    Users,
    WalletCards,
} from "lucide-react"
import { CollaborationPanel } from "@/components/wallet/CollaborationPanel"
import { PolicyQA } from "@/components/wallet/PolicyQA"
import { localizeCoverageName } from "@/lib/i18n/text-format"
import { analyzeGaps, ignoreGap, notifyAgentAboutGap } from "@/app/(protected)/wallet/actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { LimitReachedModal } from "@/components/account/LimitReachedModal"

interface MobilePolicyDetailsProps {
    policy: any
    t: any
    onDownloadDocument?: (url: string) => void
    onShare?: () => void
    onAddToWallet?: () => void
    initialShares?: any[]
    isOwner?: boolean
}

function parseDate(value: unknown): Date | null {
    if (!value) return null
    const d = new Date(String(value))
    return Number.isNaN(d.getTime()) ? null : d
}

function asText(value: unknown): string {
    return String(value || "").trim()
}



function formatDate(value: unknown, locale: string): string {
    const date = parseDate(value)
    if (!date) return "-"
    return date.toLocaleDateString(locale)
}

export function MobilePolicyDetails({
    policy,
    t,
    onDownloadDocument,
    onShare,
    onAddToWallet,
    initialShares = [],
    isOwner = false,
}: MobilePolicyDetailsProps) {
    const locale = t?.common?.locale || "el-GR"
    const isGreek = locale.startsWith("el")
    const language = isGreek ? "el" : "en"
    const router = useRouter()

    // Gap analysis state
    const [analyzing, setAnalyzing] = useState(false)
    const [ignoring, setIgnoring] = useState<string | null>(null)
    const [notifying, setNotifying] = useState<string | null>(null)
    const [gapLimitReached, setGapLimitReached] = useState(false)

    const copy = {
        share: isGreek ? "Κοινοπ." : "Share",
        wallet: "Wallet",
        policyDetails: isGreek ? "Στοιχεία συμβολαίου" : "Policy details",
        peopleAndRoles: isGreek ? "Πρόσωπα & Ρόλοι" : "People & Roles",
        noPeopleFound: isGreek ? "Δεν βρέθηκαν στοιχεία προσώπων." : "No people information found.",
        rolePolicyholder: isGreek ? "Συμβαλλόμενος" : "Policyholder",
        roleInsured: isGreek ? "Ασφαλισμένος" : "Insured",
        roleBeneficiary: isGreek ? "Δικαιούχος" : "Beneficiary",
        roleAgent: isGreek ? "Ασφαλιστικός Σύμβουλος" : "Agent / Broker",
        roleInsurer: isGreek ? "Ασφαλιστική Εταιρεία" : "Insurer",
        insuredItem: isGreek ? "Ασφαλισμένο Αντικείμενο" : "Insured Item",
        renewalHistory: isGreek ? "Ιστορικό ανανεώσεων" : "Renewal history",
        noRenewalHistory: isGreek ? "Δεν υπάρχει ακόμη ιστορικό ανανεώσεων." : "No renewal history available yet.",
        aiAnalysis: isGreek ? "Ανάλυση Κάλυψης" : "Coverage Analysis",
        gaps: isGreek ? "κενά" : "gaps",
        noGaps: isGreek ? "Δεν εντοπίστηκαν ενεργά κενά κάλυψης." : "No active coverage gaps detected.",
        noGapsRunDesc: isGreek ? 'Κάντε κλικ στο "Ανάλυση" για έλεγχο κάλυψης' : 'Tap "Analyze" to check your coverage',
        fallbackGapTitle: isGreek ? "Κενό κάλυψης" : "Coverage gap",
        topCoverages: isGreek ? "Καλύψεις (AI)" : "Coverages (AI)",
        noCoveragesFound: isGreek ? "Δεν αναλύθηκαν συγκεκριμένες καλύψεις." : "No specific coverages analyzed.",
        aiChat: isGreek ? "Ρωτήστε το AI" : "Ask AI",
        annualPremium: isGreek ? "Ετήσιο Ασφάλιστρο" : "Annual Premium",
        analyze: isGreek ? "Ανάλυση" : "Analyze",
        analyzing: isGreek ? "Ανάλυση..." : "Analyzing...",
        recommendation: isGreek ? "Πρόταση" : "Suggestion",
        hide: isGreek ? "Απόκρυψη" : "Hide",
        alertHidden: isGreek ? "Η ειδοποίηση αποκρύφθηκε" : "Alert hidden",
        sending: isGreek ? "Αποστολή..." : "Sending...",
        moreDetails: isGreek ? "Λεπτομέρειες" : "Details",
        deductibleLabel: isGreek ? "Απαλλαγή:" : "Deductible:",
        gapDetected: isGreek ? "Εντοπίστηκε Κενό" : "Gap Detected",
    }

    const acordPolicy = policy?.acordData?.policy || {}
    const rawHistory = Array.isArray(policy?.acordData?.renewalHistory) ? policy.acordData.renewalHistory : []

    const latestHistoryEndDate = (() => {
        const dated = rawHistory
            .map((item: any) => parseDate(item?.endDate))
            .filter(Boolean) as Date[]
        if (dated.length === 0) return null
        return dated.sort((a, b) => b.getTime() - a.getTime())[0]
    })()

    const startDate = acordPolicy?.effectiveDate || policy?.startDate
    const endDate = latestHistoryEndDate
        ? latestHistoryEndDate.toISOString()
        : (acordPolicy?.expirationDate || policy?.endDate)

    const computedDaysLeft = (() => {
        const end = parseDate(endDate)
        if (!end) return null
        return Math.floor((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    })()

    const insurerName = acordPolicy?.insurerName || policy?.insurerName || "-"
    const policyNumber = acordPolicy?.policyNumber || policy?.policyNumber || "-"

    const premiumAmount = (() => {
        const aiPremium = acordPolicy?.premium?.amount
        if (aiPremium) return Number(aiPremium)
        return Number(policy?.premiumAmount?.toString() || 0)
    })()
    const premiumCurrency = acordPolicy?.premium?.currency || policy?.premiumCurrency || "EUR"

    // ── Structured people extraction ──────────────────────────────────
    type PolicyPerson = {
        name: string
        role: string
        roleLabel: string
        email?: string
        phone?: string
        taxId?: string
        address?: string
        relationship?: string
        percentage?: number
        contact?: string
    }

    const policyPeople = useMemo(() => {
        const people: PolicyPerson[] = []
        const seen = new Set<string>()

        const addPerson = (p: PolicyPerson) => {
            const key = `${p.name.toLowerCase()}|${p.role}`
            if (!p.name || seen.has(key)) return
            seen.add(key)
            people.push(p)
        }

        // Policyholder
        const holderName = asText(policy?.acordData?.policyholder?.name)
        if (holderName) {
            addPerson({
                name: holderName,
                role: "policyholder",
                roleLabel: copy.rolePolicyholder,
                email: asText(policy?.acordData?.policyholder?.email) || undefined,
                phone: asText(policy?.acordData?.policyholder?.phone) || undefined,
            })
        }

        // Insured (may match policyholder — dedup handles it if same name+role combo)
        const insuredData = policy?.acordData?.insured
        const insuredName = asText(insuredData?.name)
        if (insuredName) {
            addPerson({
                name: insuredName,
                role: "insured",
                roleLabel: copy.roleInsured,
                email: asText(insuredData?.email) || undefined,
                phone: asText(insuredData?.phone) || undefined,
                taxId: asText(insuredData?.taxId) || undefined,
                address: asText(insuredData?.address) || undefined,
            })
        }

        // Top-level customerName/customerSurname
        const customerFull = [asText(policy?.acordData?.customerName), asText(policy?.acordData?.customerSurname)]
            .filter(Boolean).join(" ").trim()
        if (customerFull && customerFull !== holderName && customerFull !== insuredName) {
            addPerson({
                name: customerFull,
                role: "insured",
                roleLabel: copy.roleInsured,
                email: asText(policy?.acordData?.customerEmail) || undefined,
            })
        }

        // acordData.policy.insuredName (sometimes a separate field)
        const policyInsuredName = asText(policy?.acordData?.policy?.insuredName)
        if (policyInsuredName) {
            addPerson({
                name: policyInsuredName,
                role: "insured",
                roleLabel: copy.roleInsured,
            })
        }

        // Multiple insureds array
        if (Array.isArray(policy?.acordData?.insureds)) {
            for (const item of policy.acordData.insureds) {
                const iName = asText(item?.name || `${asText(item?.firstName)} ${asText(item?.lastName)}`)
                if (iName) {
                    addPerson({
                        name: iName,
                        role: "insured",
                        roleLabel: copy.roleInsured,
                        email: asText(item?.email) || undefined,
                        phone: asText(item?.phone) || undefined,
                    })
                }
            }
        }

        // Beneficiaries
        if (Array.isArray(policy?.acordData?.beneficiaries)) {
            for (const ben of policy.acordData.beneficiaries) {
                const bName = asText(ben?.name)
                if (bName) {
                    addPerson({
                        name: bName,
                        role: "beneficiary",
                        roleLabel: copy.roleBeneficiary,
                        relationship: asText(ben?.relationship) || undefined,
                        percentage: typeof ben?.percentage === "number" ? ben.percentage : undefined,
                    })
                }
            }
        }

        // Agent / Broker
        const agentName = asText(acordPolicy?.agentName)
        if (agentName) {
            addPerson({
                name: agentName,
                role: "agent",
                roleLabel: copy.roleAgent,
                contact: asText(acordPolicy?.agentContact) || undefined,
            })
        }

        return people
    }, [policy, acordPolicy, copy])

    // Insurer contact info
    const insurerContact = asText(acordPolicy?.insurerContact)

    // Vehicle / Property info for the insured item card
    const vehicleInfo = policy?.acordData?.vehicle
    const propertyInfo = policy?.acordData?.property

    const policyTypeLabel = t?.policyTypes?.[policy?.lineOfBusiness] || policy?.lineOfBusiness || "-"
    const detectedGaps = Array.isArray(policy?.gapInstances) ? policy.gapInstances : []
    const allCoverages = Array.isArray(policy?.acordData?.coverages) ? policy.acordData.coverages : []

    // Deduplicate gaps
    const uniqueGaps = useMemo(() => {
        const seen = new Set()
        return detectedGaps.filter((gap: any) => {
            const explanation = gap.aiExplanation || gap.aiExplanationEl || ""
            const key = `${gap?.definition?.title || ""}|${explanation}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })
    }, [detectedGaps])

    const renewalHistory = rawHistory
        .map((entry: any, index: number) => ({
            id: entry?.id || `renewal-${index}`,
            startDate: entry?.startDate || null,
            endDate: entry?.endDate || null,
            sourceDocumentName: entry?.sourceDocumentName || null,
            mergedAt: entry?.mergedAt || null,
        }))
        .sort((a: any, b: any) => {
            const aDate = parseDate(a.endDate)?.getTime() || 0
            const bDate = parseDate(b.endDate)?.getTime() || 0
            return bDate - aDate
        })

    // Gap analysis handlers
    const handleAnalyze = async () => {
        setAnalyzing(true)
        const toastId = toast.loading(copy.analyzing)
        const res = await analyzeGaps(policy.id)
        setAnalyzing(false)
        if ("error" in res && res.error) {
            if (res.error === "LIMIT_REACHED") {
                setGapLimitReached(true)
                toast.dismiss(toastId)
            } else {
                toast.error(res.error, { id: toastId })
            }
        } else if ("count" in res) {
            toast.success(
                `${t?.analysis?.analysisComplete || "Analysis complete. Found "}${res.count}${t?.analysis?.issues || " issues."}`,
                { id: toastId }
            )
            router.refresh()
        }
    }

    const handleIgnore = async (gapId: string) => {
        setIgnoring(gapId)
        const res = await ignoreGap(gapId)
        setIgnoring(null)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(copy.alertHidden)
            router.refresh()
        }
    }

    const handleNotify = async (gapId: string) => {
        setNotifying(gapId)
        const res = await notifyAgentAboutGap(gapId, policy.id)
        setNotifying(null)
        if (res.error) {
            toast.error(res.error)
        } else {
            toast.success(res.message || (isGreek ? "Ο ασφαλιστής ενημερώθηκε" : "Agent notified"))
        }
    }

    // Coverage explanation helper
    const getCoverageExplanation = (cov: any): string | null => {
        if (!cov.explanation) return null
        if (typeof cov.explanation === "string") return cov.explanation
        if (isGreek) return cov.explanation.el || cov.explanation.en
        return cov.explanation.en || cov.explanation.el
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-100 pb-24">
            {/* Sticky header */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-stone-200">
                <div className="mx-auto max-w-md px-4 py-2.5 flex items-center justify-between">
                    <h1 className="text-[15px] font-black text-stone-900">{t?.wallet?.policyDetails || "Policy details"}</h1>
                    <div className="flex items-center gap-2">
                        {isOwner && (
                            <button
                                onClick={() => router.push(`/wallet/${policy.id}/edit`)}
                                className="h-8 px-2.5 rounded-lg border border-stone-300 text-stone-700 text-[11px] font-semibold hover:bg-stone-100 cursor-pointer"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" />
                                    {isGreek ? "Επεξ." : "Edit"}
                                </span>
                            </button>
                        )}
                        {onShare ? (
                            <button
                                onClick={onShare}
                                className="h-8 px-2.5 rounded-lg border border-stone-300 text-stone-700 text-[11px] font-semibold hover:bg-stone-100 cursor-pointer"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <Share2 className="w-3.5 h-3.5" />
                                    {copy.share}
                                </span>
                            </button>
                        ) : null}
                        {onAddToWallet ? (
                            <button
                                onClick={onAddToWallet}
                                className="h-8 px-2.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 cursor-pointer"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <WalletCards className="w-3.5 h-3.5" />
                                    {copy.wallet}
                                </span>
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-md px-4 py-3 space-y-3">
                {/* Hero: Insurer + Premium */}
                <section className="rounded-2xl overflow-hidden border border-stone-200 bg-white">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-black text-white truncate">{insurerName}</h2>
                                <p className="text-sm font-semibold text-emerald-100 uppercase tracking-wide">{policyTypeLabel}</p>
                            </div>
                        </div>

                        <div className="flex items-end justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest flex items-center gap-1.5">
                                    <TrendingUp className="w-3 h-3" />
                                    {copy.annualPremium}
                                </p>
                                <p className="text-2xl font-black text-white leading-tight mt-0.5">
                                    {premiumAmount > 0
                                        ? premiumAmount.toLocaleString(locale, { style: "currency", currency: premiumCurrency })
                                        : "-"}
                                </p>
                            </div>

                            {computedDaysLeft !== null && computedDaysLeft >= 0 && computedDaysLeft <= 30 ? (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-400/20 backdrop-blur-sm text-amber-100 rounded-full text-[10px] font-bold border border-amber-300/30">
                                    <Calendar className="w-3 h-3" />
                                    {t?.wallet?.expiresIn || "Expires in"} {computedDaysLeft} {t?.wallet?.days || "days"}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </section>

                {/* Policy details grid */}
                <section className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <h2 className="text-[15px] font-black text-stone-900">{copy.policyDetails}</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-xl bg-stone-50 p-2.5">
                            <p className="text-stone-500 mb-1">{t?.wallet?.policyNumber || "Policy number"}</p>
                            <p className="font-bold text-stone-900 break-words">{policyNumber}</p>
                        </div>
                        <div className="rounded-xl bg-stone-50 p-2.5">
                            <p className="text-stone-500 mb-1">{t?.wallet?.type || "Type"}</p>
                            <p className="font-bold text-stone-900">{policyTypeLabel}</p>
                        </div>
                        <div className="rounded-xl bg-stone-50 p-2.5">
                            <p className="text-stone-500 mb-1">{t?.wallet?.starts || "Starts"}</p>
                            <p className="font-bold text-stone-900">{formatDate(startDate, locale)}</p>
                        </div>
                        <div className="rounded-xl bg-stone-50 p-2.5">
                            <p className="text-stone-500 mb-1">{t?.wallet?.ends || "Ends"}</p>
                            <p className="font-bold text-stone-900">{formatDate(endDate, locale)}</p>
                        </div>
                    </div>
                </section>

                {/* People & Roles — structured names with roles, contact, and relationship */}
                <section className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <h2 className="text-[15px] font-black text-stone-900">{copy.peopleAndRoles}</h2>
                    </div>
                    {policyPeople.length > 0 ? (
                        <div className="space-y-2">
                            {policyPeople.map((person, idx) => {
                                const roleColorMap: Record<string, string> = {
                                    policyholder: "bg-sky-100 text-sky-700 border-sky-200",
                                    insured: "bg-emerald-100 text-emerald-700 border-emerald-200",
                                    beneficiary: "bg-violet-100 text-violet-700 border-violet-200",
                                    agent: "bg-amber-100 text-amber-700 border-amber-200",
                                }
                                const roleIconMap: Record<string, React.ReactNode> = {
                                    policyholder: <User className="w-3.5 h-3.5" />,
                                    insured: <UserCheck className="w-3.5 h-3.5" />,
                                    beneficiary: <UserRound className="w-3.5 h-3.5" />,
                                    agent: <Building2 className="w-3.5 h-3.5" />,
                                }
                                return (
                                    <div key={`${person.name}-${person.role}-${idx}`} className="rounded-xl bg-stone-50 border border-stone-200 px-3 py-2.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-stone-900">{person.name}</p>
                                                {person.relationship && (
                                                    <p className="text-[10px] text-stone-400 mt-0.5">
                                                        {person.relationship}
                                                        {person.percentage != null ? ` · ${person.percentage}%` : ""}
                                                    </p>
                                                )}
                                            </div>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border ${roleColorMap[person.role] || "bg-stone-100 text-stone-600 border-stone-200"}`}>
                                                {roleIconMap[person.role]}
                                                {person.roleLabel}
                                            </span>
                                        </div>
                                        {(person.email || person.phone || person.taxId || person.address || person.contact) && (
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-stone-100">
                                                {person.email && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-stone-500">
                                                        <Mail className="w-3 h-3 text-stone-400" />{person.email}
                                                    </span>
                                                )}
                                                {person.phone && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-stone-500">
                                                        <Phone className="w-3 h-3 text-stone-400" />{person.phone}
                                                    </span>
                                                )}
                                                {person.taxId && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-stone-500">
                                                        <Shield className="w-3 h-3 text-stone-400" />
                                                        {isGreek ? "ΑΦΜ" : "Tax ID"}: {person.taxId}
                                                    </span>
                                                )}
                                                {person.address && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-stone-500">
                                                        <Home className="w-3 h-3 text-stone-400" />{person.address}
                                                    </span>
                                                )}
                                                {person.contact && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] text-stone-500">
                                                        <Phone className="w-3 h-3 text-stone-400" />{person.contact}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {/* Insurer contact row */}
                            {insurerContact && (
                                <div className="rounded-xl bg-stone-50 border border-stone-200 px-3 py-2.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-stone-900">{insurerName}</p>
                                        </div>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border bg-teal-100 text-teal-700 border-teal-200">
                                            <Building2 className="w-3.5 h-3.5" />
                                            {copy.roleInsurer}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 pt-2 border-t border-stone-100">
                                        <span className="inline-flex items-center gap-1 text-[10px] text-stone-500">
                                            <Phone className="w-3 h-3 text-stone-400" />{insurerContact}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-stone-500">{copy.noPeopleFound}</p>
                    )}
                </section>

                {/* Insured Item (Vehicle / Property) */}
                {(vehicleInfo?.plateNumber || vehicleInfo?.make || propertyInfo?.address) && (
                    <section className="rounded-2xl border border-stone-200 bg-white p-4">
                        <div className="flex items-center gap-2 mb-2">
                            {vehicleInfo?.plateNumber || vehicleInfo?.make ? (
                                <Car className="w-4 h-4 text-blue-600" />
                            ) : (
                                <Home className="w-4 h-4 text-orange-600" />
                            )}
                            <h2 className="text-[15px] font-black text-stone-900">{copy.insuredItem}</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {vehicleInfo?.make && (
                                <div className="rounded-xl bg-stone-50 p-2.5">
                                    <p className="text-stone-500 mb-1">{isGreek ? "Μάρκα / Μοντέλο" : "Make / Model"}</p>
                                    <p className="font-bold text-stone-900">
                                        {[asText(vehicleInfo.make), asText(vehicleInfo.model)].filter(Boolean).join(" ") || "-"}
                                    </p>
                                </div>
                            )}
                            {vehicleInfo?.year && (
                                <div className="rounded-xl bg-stone-50 p-2.5">
                                    <p className="text-stone-500 mb-1">{isGreek ? "Έτος" : "Year"}</p>
                                    <p className="font-bold text-stone-900">{vehicleInfo.year}</p>
                                </div>
                            )}
                            {vehicleInfo?.plateNumber && (
                                <div className="rounded-xl bg-stone-50 p-2.5">
                                    <p className="text-stone-500 mb-1">{t?.wallet?.plateNumber || "Plate number"}</p>
                                    <p className="font-bold text-stone-900 font-mono">{vehicleInfo.plateNumber}</p>
                                </div>
                            )}
                            {vehicleInfo?.vin && (
                                <div className="rounded-xl bg-stone-50 p-2.5">
                                    <p className="text-stone-500 mb-1">VIN</p>
                                    <p className="font-bold text-stone-900 font-mono text-xs">{vehicleInfo.vin}</p>
                                </div>
                            )}
                            {vehicleInfo?.usage && (
                                <div className="rounded-xl bg-stone-50 p-2.5">
                                    <p className="text-stone-500 mb-1">{isGreek ? "Χρήση" : "Usage"}</p>
                                    <p className="font-bold text-stone-900 capitalize">{vehicleInfo.usage}</p>
                                </div>
                            )}
                            {propertyInfo?.address && (
                                <div className="rounded-xl bg-stone-50 p-2.5 col-span-2">
                                    <p className="text-stone-500 mb-1">{isGreek ? "Διεύθυνση" : "Address"}</p>
                                    <p className="font-bold text-stone-900">{propertyInfo.address}</p>
                                </div>
                            )}
                            {propertyInfo?.type && (
                                <div className="rounded-xl bg-stone-50 p-2.5">
                                    <p className="text-stone-500 mb-1">{isGreek ? "Τύπος" : "Type"}</p>
                                    <p className="font-bold text-stone-900 capitalize">{propertyInfo.type}</p>
                                </div>
                            )}
                            {propertyInfo?.squareMeters && (
                                <div className="rounded-xl bg-stone-50 p-2.5">
                                    <p className="text-stone-500 mb-1">{isGreek ? "Εμβαδόν" : "Area"}</p>
                                    <p className="font-bold text-stone-900">{propertyInfo.squareMeters} m²</p>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* AI Gap Analysis — interactive, matching desktop capabilities */}
                <section className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5 text-white">
                            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <Sparkles className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h2 className="text-[14px] font-black">{copy.aiAnalysis}</h2>
                                {uniqueGaps.length > 0 && (
                                    <p className="text-[10px] text-emerald-100 font-semibold mt-0.5">
                                        {uniqueGaps.length} {copy.gaps}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={handleAnalyze}
                            disabled={analyzing}
                            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 backdrop-blur-sm border border-white/30 cursor-pointer flex items-center gap-1.5"
                        >
                            {analyzing ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    {copy.analyzing}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {copy.analyze}
                                </>
                            )}
                        </button>
                    </div>

                    <div className="p-4">
                        {uniqueGaps.length === 0 ? (
                            <div className="text-center py-6">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                                    <Sparkles className="w-6 h-6 text-emerald-600" />
                                </div>
                                <p className="text-sm text-stone-600 font-semibold mb-1">{copy.noGaps}</p>
                                <p className="text-xs text-stone-400">{copy.noGapsRunDesc}</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {uniqueGaps.map((gap: any) => {
                                    const explanation = isGreek
                                        ? (gap.aiExplanationEl || gap.aiExplanation)
                                        : gap.aiExplanation
                                    const suggestion = isGreek
                                        ? (gap.aiSuggestionEl || gap.aiSuggestion)
                                        : gap.aiSuggestion

                                    return (
                                        <div
                                            key={gap.id}
                                            className="bg-gradient-to-r from-red-50 to-rose-50 p-3.5 rounded-xl border border-red-200"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <AlertTriangle className="w-4 h-4 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <h4 className="font-bold text-red-900 text-sm leading-snug">
                                                            {gap?.definition?.title || copy.gapDetected}
                                                        </h4>
                                                        <button
                                                            onClick={() => handleIgnore(gap.id)}
                                                            disabled={ignoring === gap.id}
                                                            className="p-1 rounded-md text-stone-400 hover:bg-white/60 hover:text-stone-600 transition-colors flex-shrink-0 cursor-pointer"
                                                            title={copy.hide}
                                                        >
                                                            <EyeOff className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>

                                                    {explanation && (
                                                        <p className="text-xs text-red-700 leading-relaxed mt-1.5">{explanation}</p>
                                                    )}

                                                    {suggestion && (
                                                        <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-lg mt-2.5">
                                                            <div className="flex items-start gap-1.5">
                                                                <Lightbulb className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-amber-900 mb-0.5">{copy.recommendation}</p>
                                                                    <p className="text-[11px] text-amber-800 leading-snug">{suggestion}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-end mt-2.5">
                                                        <button
                                                            onClick={() => handleNotify(gap.id)}
                                                            disabled={notifying === gap.id}
                                                            className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-red-200 rounded-lg text-[11px] font-bold text-red-700 hover:bg-red-50 transition-colors shadow-sm cursor-pointer"
                                                        >
                                                            <MessageSquare className="w-3 h-3" />
                                                            {notifying === gap.id ? copy.sending : copy.moreDetails}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </section>

                {/* Structured Coverages */}
                <section className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="w-4 h-4 text-teal-600" />
                        <h2 className="text-[15px] font-black text-stone-900">{copy.topCoverages}</h2>
                    </div>
                    {allCoverages.length > 0 ? (
                        <div className="space-y-2">
                            {allCoverages.map((coverage: any, index: number) => {
                                const explanation = getCoverageExplanation(coverage)
                                return (
                                    <div
                                        key={`${coverage?.name || "coverage"}-${index}`}
                                        className="rounded-xl bg-stone-50 px-3 py-2.5 border border-stone-200"
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-bold text-stone-900 uppercase tracking-tight">
                                                    {localizeCoverageName(
                                                        String(coverage?.name || coverage?.coverageName || "-"),
                                                        t?.coverage_names as Record<string, string>
                                                    )}
                                                </p>
                                                {coverage?.deductible && (
                                                    <p className="text-[10px] text-stone-400 mt-0.5">
                                                        {copy.deductibleLabel} {String(coverage.deductible)}
                                                    </p>
                                                )}
                                            </div>
                                            {coverage?.limit && (
                                                <span className="font-mono text-xs text-teal-600 font-bold bg-teal-50 px-2 py-1 rounded-lg flex-shrink-0">
                                                    {String(coverage.limit)}
                                                </span>
                                            )}
                                        </div>
                                        {explanation && (
                                            <p className="text-[11px] text-stone-500 leading-snug mt-1.5 border-t border-stone-100 pt-1.5">
                                                {explanation}
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-4 border-2 border-dashed border-stone-100 rounded-xl">
                            <p className="text-xs text-stone-400 italic">{copy.noCoveragesFound}</p>
                        </div>
                    )}
                </section>

                {/* AI Chat */}
                <section>
                    <PolicyQA policyId={policy.id} />
                </section>

                {/* (People section moved above AI Analysis) */}

                {/* Renewal history */}
                <section className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <History className="w-4 h-4 text-violet-700" />
                        <h2 className="text-[15px] font-black text-stone-900">{copy.renewalHistory}</h2>
                    </div>
                    {renewalHistory.length > 0 ? (
                        <ul className="space-y-2">
                            {renewalHistory.map((entry: any) => (
                                <li key={entry.id} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                                    <p className="text-sm font-semibold text-stone-900">
                                        {formatDate(entry.startDate, locale)} - {formatDate(entry.endDate, locale)}
                                    </p>
                                    {entry.sourceDocumentName ? (
                                        <p className="text-xs text-stone-500 mt-0.5">{entry.sourceDocumentName}</p>
                                    ) : null}
                                    {entry.mergedAt ? (
                                        <p className="text-xs text-stone-400 mt-0.5">
                                            <span className="inline-flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(entry.mergedAt, locale)}
                                            </span>
                                        </p>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-stone-500">{copy.noRenewalHistory}</p>
                    )}
                </section>

                {/* Documents */}
                <section className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-teal-700" />
                        <h2 className="text-[15px] font-black text-stone-900">{t?.wallet?.documents || "Documents"}</h2>
                    </div>
                    {Array.isArray(policy?.documents) && policy.documents.length > 0 ? (
                        <ul className="space-y-2">
                            {policy.documents.map((doc: any) => (
                                <li key={doc.id}>
                                    <button
                                        onClick={() => onDownloadDocument?.(doc.fileUrl)}
                                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-left hover:bg-stone-50 cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center">
                                                <Download className="w-4 h-4 text-stone-700" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-stone-900 truncate">{doc.fileName}</p>
                                                <p className="text-xs text-stone-500">{formatDate(doc.uploadedAt, locale)}</p>
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-stone-500">{t?.wallet?.noDocuments || "No documents found"}</p>
                    )}
                </section>

                {/* Collaboration */}
                <CollaborationPanel
                    policyId={policy.id}
                    policyNumber={acordPolicy?.policyNumber || policy?.policyNumber}
                    initialShares={initialShares}
                    isOwner={isOwner}
                />
            </div>

            <LimitReachedModal
                isOpen={gapLimitReached}
                reason="gap_limit"
                language={language as "el" | "en"}
                onDismiss={() => setGapLimitReached(false)}
            />
        </div>
    )
}
