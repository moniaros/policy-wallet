import type { Policy } from "@/components/wallet/types"

type Lang = "el" | "en"

export type DocumentStatus = {
    label: string
    tone: "critical" | "warning" | "active" | "inactive" | "info"
    message: string
    daysUntilExpiry: number | null
}

export type DocumentPolicySummary = {
    assetTitle: string
    assetSubtitle: string
    insurerLine: string
    policyNumber: string
    coverageTypeLabel: string
    premiumDisplay: string
    expiryDisplay: string
    status: DocumentStatus
    verificationLabel: string
    verificationTone: "warning" | "active" | "inactive"
    exclusions: string[]
    coverageItems: Array<{ label: string; limit?: string }>
}

function toNumber(value: unknown): number | null {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
}

function compactText(value: unknown): string {
    return String(value || "").trim()
}

export function getDocumentPolicySummary(
    policy: Policy,
    language: Lang,
    policyTypeLabel: string
): DocumentPolicySummary {
    const locale = language === "el" ? "el-GR" : "en-US"
    const vehicle = (policy.acordData as any)?.vehicle
    const property = (policy.acordData as any)?.property
    const acordPolicy = (policy.acordData as any)?.policy
    const extraction = (policy.acordData as any)?.extraction

    const insuredTitle =
        policy.insuredItem?.title ||
        `${compactText(vehicle?.make)} ${compactText(vehicle?.model)}`.trim() ||
        compactText(property?.address) ||
        policy.insurerName

    const insuredSubtitle =
        policy.insuredItem?.subtitle ||
        compactText(vehicle?.plateNumber) ||
        (language === "el" ? "Ασφαλιστήριο" : "Policy")

    const coverageTypeRaw =
        compactText(acordPolicy?.coverageType) ||
        compactText(acordPolicy?.planType) ||
        compactText((policy.acordData as any)?.coverageType) ||
        compactText(policyTypeLabel)

    const premiumAmount = toNumber((policy.acordData as any)?.policy?.premium?.amount) ?? toNumber(policy.premiumAmount) ?? 0
    const premiumCurrency = compactText((policy.acordData as any)?.policy?.premium?.currency) || policy.premiumCurrency || "EUR"
    const premiumDisplay = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: premiumCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(premiumAmount)

    const endDateRaw = compactText(acordPolicy?.expirationDate) || policy.endDate || null
    const endDate = endDateRaw ? new Date(endDateRaw) : null
    const daysUntilExpiry = endDate ? Math.floor((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
    const expiryDisplay = endDate
        ? new Date(endDate).toLocaleDateString(locale)
        : "-"

    const status: DocumentStatus = (() => {
        const s = String(policy.status || "").toLowerCase()
        if (s === "analyzing") {
            return {
                label: language === "el" ? "ΑΝΑΛΥΣΗ" : "ANALYZING",
                tone: "info",
                message: language === "el" ? "Η ανάλυση AI είναι σε εξέλιξη." : "AI analysis is in progress.",
                daysUntilExpiry,
            }
        }
        if (s === "cancelled") {
            return {
                label: language === "el" ? "ΑΚΥΡΟ" : "CANCELLED",
                tone: "inactive",
                message: language === "el" ? "Το συμβόλαιο έχει ακυρωθεί." : "This policy is cancelled.",
                daysUntilExpiry,
            }
        }
        if (daysUntilExpiry !== null && daysUntilExpiry < 0) {
            return {
                label: language === "el" ? "ΛΗΞΕ" : "EXPIRED",
                tone: "critical",
                message:
                    language === "el"
                        ? `Έχει λήξει πριν ${Math.abs(daysUntilExpiry)} ημέρες.`
                        : `Expired ${Math.abs(daysUntilExpiry)} days ago.`,
                daysUntilExpiry,
            }
        }
        if (daysUntilExpiry !== null && daysUntilExpiry <= 30) {
            return {
                label: language === "el" ? "ΧΡΕΙΑΖΕΤΑΙ ΑΝΑΝΕΩΣΗ" : "RENEWAL NEEDED",
                tone: "critical",
                message:
                    language === "el"
                        ? `Λήγει σε ${daysUntilExpiry} ημέρες.`
                        : `Expires in ${daysUntilExpiry} days.`,
                daysUntilExpiry,
            }
        }
        if (s === "action_needed" || s === "incomplete") {
            return {
                label: language === "el" ? "ΛΕΙΠΟΥΝ ΣΤΟΙΧΕΙΑ" : "MISSING INFO",
                tone: "warning",
                message:
                    language === "el"
                        ? "Χρειάζεται έλεγχος πεδίων από το έγγραφο."
                        : "Some fields need document review.",
                daysUntilExpiry,
            }
        }
        return {
            label: language === "el" ? "ΕΝΕΡΓΟ" : "ACTIVE",
            tone: "active",
            message:
                endDate
                    ? (language === "el" ? `Ενεργό έως ${expiryDisplay}.` : `Active until ${expiryDisplay}.`)
                    : (language === "el" ? "Ενεργό συμβόλαιο." : "Active policy."),
            daysUntilExpiry,
        }
    })()

    const reviewStatePending =
        extraction?.reviewState === 'unconfirmed' || extraction?.reviewState === 'flagged'
    const computedRequiresReview = Boolean(
        extraction?.requiresReview
        || reviewStatePending
        || (typeof extraction?.confidence?.overall === 'number' && extraction.confidence.overall < 80)
        || (Array.isArray(extraction?.missingCriticalFields) && extraction.missingCriticalFields.length > 0)
    )
    const isVerified = (typeof policy.verified === 'boolean'
        ? policy.verified
        : !computedRequiresReview) && !reviewStatePending

    const verificationLabel = isVerified
        ? (language === "el" ? "ΕΠΙΒΕΒΑΙΩΜΕΝΗ" : "VERIFIED")
        : reviewStatePending
            ? (language === "el" ? "ΕΛΕΓΞΤΕ ΤΑ ΔΕΔΟΜΕΝΑ AI" : "REVIEW EXTRACTED DATA")
            : (language === "el" ? "ΧΡΕΙΑΖΕΤΑΙ ΕΛΕΓΧΟ" : "REVIEW REQUIRED")

    const verificationTone = isVerified ? "active" : "warning"

    const coverageItems = Array.isArray((policy.acordData as any)?.coverages)
        ? (policy.acordData as any).coverages
            .map((cov: any) => ({
                label: compactText(cov.coverageName || cov.name || cov.type || cov.title),
                limit: compactText(cov.limitAmount || cov.limit || cov.amount || cov.value),
            }))
            .filter((cov: any) => cov.label)
        : []

    const exclusionsFromAcord = Array.isArray((policy.acordData as any)?.exclusions)
        ? (policy.acordData as any).exclusions
        : []
    const exclusionsFromAi = Array.isArray(policy.aiInsights?.exclusions)
        ? policy.aiInsights?.exclusions
        : []
    const exclusions = [...exclusionsFromAcord, ...exclusionsFromAi]
        .map((e) => compactText(e))
        .filter(Boolean)
        .slice(0, 5)

    return {
        assetTitle: insuredTitle,
        assetSubtitle: insuredSubtitle,
        insurerLine: `${policy.insurerName} • ${coverageTypeRaw || policyTypeLabel}`,
        policyNumber: policy.policyNumber,
        coverageTypeLabel: coverageTypeRaw || policyTypeLabel,
        premiumDisplay,
        expiryDisplay,
        status,
        verificationLabel,
        verificationTone,
        exclusions,
        coverageItems,
    }
}
