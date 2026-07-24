import { calendarDaysUntil } from '@/lib/policy-status'
import type { Policy } from "@/components/wallet/types"
import { parseDocumentDate } from "@/lib/dates/document-date"

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
    /** Row title: "{Τύπος} • {Ασφαλιστής}" — the insurer appears exactly once. */
    insurerLine: string
    policyNumber: string
    coverageTypeLabel: string
    premiumDisplay: string
    /** null when no trustworthy end date exists — hide, don't render "-". */
    expiryDisplay: string | null
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
    const locale = language === "el" ? "el-GR" : "en-GB"
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

    // The extracted envelope date wins; an envelope value that EXISTS but
    // cannot be parsed means unknown — never fall back to the DB column,
    // which may hold the historical upload-day placeholder (+365d).
    const envelopeEndRaw = compactText(acordPolicy?.expirationDate)
    const endDate = envelopeEndRaw
        ? parseDocumentDate(envelopeEndRaw)
        : parseDocumentDate(policy.endDate || null)
    const daysUntilExpiry = endDate ? calendarDaysUntil(endDate, new Date()) : null
    const expiryDisplay = endDate ? endDate.toLocaleDateString(locale, { timeZone: "UTC" }) : null

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
            // A fact of the calendar, not an alarm — amber, never green.
            return {
                label: language === "el" ? "ΛΗΓΜΕΝΟ" : "EXPIRED",
                tone: "warning",
                message:
                    language === "el"
                        ? `Έληξε στις ${expiryDisplay}.`
                        : `Expired on ${expiryDisplay}.`,
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
        if (daysUntilExpiry === null) {
            // No trustworthy end date: no ΕΝΕΡΓΟ badge, no fabricated countdown.
            return {
                label: language === "el" ? "ΑΓΝΩΣΤΗ ΔΙΑΡΚΕΙΑ" : "UNKNOWN DURATION",
                tone: "warning",
                message:
                    language === "el"
                        ? "Δεν εντοπίστηκε ημερομηνία λήξης — συμπληρώστε την."
                        : "No expiry date detected — please fill it in.",
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
            message: language === "el" ? `Ενεργό έως ${expiryDisplay}.` : `Active until ${expiryDisplay}.`,
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
        insurerLine: `${policyTypeLabel || coverageTypeRaw} • ${policy.insurerName}`,
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
