"use client"

import { Calendar, Download, FileText, History, ShieldCheck, Share2, UserRound, WalletCards } from "lucide-react"
import { CollaborationPanel } from "@/components/wallet/CollaborationPanel"

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

function uniqueNonEmpty(values: string[]): string[] {
    return Array.from(new Set(values.map(v => v.trim()).filter(Boolean)))
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

    const acordPolicy = policy?.acordData?.policy || {}
    const rawHistory = Array.isArray(policy?.acordData?.renewalHistory) ? policy.acordData.renewalHistory : []

    const getLatestHistoryEndDate = () => {
        const dated = rawHistory
            .map((item: any) => parseDate(item?.endDate))
            .filter(Boolean) as Date[]
        if (dated.length === 0) return null
        return dated.sort((a, b) => b.getTime() - a.getTime())[0]
    }

    const latestHistoryEndDate = getLatestHistoryEndDate()
    const startDate = acordPolicy?.effectiveDate || policy?.startDate
    const endDate = latestHistoryEndDate
        ? latestHistoryEndDate.toISOString()
        : (acordPolicy?.expirationDate || policy?.endDate)

    const insuredNames = uniqueNonEmpty([
        asText(policy?.acordData?.insured?.name),
        asText(policy?.acordData?.policyholder?.name),
        asText(policy?.acordData?.policy?.insuredName),
        asText(policy?.acordData?.customerName && policy?.acordData?.customerSurname
            ? `${policy.acordData.customerName} ${policy.acordData.customerSurname}`
            : ""),
        ...(Array.isArray(policy?.acordData?.insureds)
            ? policy.acordData.insureds.map((item: any) => asText(item?.name || `${asText(item?.firstName)} ${asText(item?.lastName)}`))
            : []),
        ...(Array.isArray(policy?.acordData?.beneficiaries)
            ? policy.acordData.beneficiaries.map((item: any) => asText(item?.name))
            : []),
    ])

    const policyTypeLabel = t?.policyTypes?.[policy?.lineOfBusiness] || policy?.lineOfBusiness || "-"
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

    return (
        <div className="min-h-screen bg-gradient-to-b from-stone-50 via-white to-stone-100 pb-28">
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-stone-200">
                <div className="mx-auto max-w-md px-4 py-3 flex items-center justify-between">
                    <h1 className="text-lg font-black text-stone-900">{t?.wallet?.policyDetails || "Policy details"}</h1>
                    <div className="flex items-center gap-2">
                        {onShare ? (
                            <button
                                onClick={onShare}
                                className="h-9 px-3 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-100 cursor-pointer"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <Share2 className="w-3.5 h-3.5" />
                                    {isGreek ? "Κοινοπ." : "Share"}
                                </span>
                            </button>
                        ) : null}
                        {onAddToWallet ? (
                            <button
                                onClick={onAddToWallet}
                                className="h-9 px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-pointer"
                            >
                                <span className="inline-flex items-center gap-1.5">
                                    <WalletCards className="w-3.5 h-3.5" />
                                    {isGreek ? "Wallet" : "Wallet"}
                                </span>
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-md px-4 py-4 space-y-4">
                <section className="rounded-3xl border border-stone-200 bg-white p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <h2 className="text-base font-black text-stone-900">{isGreek ? "Στοιχεία συμβολαίου" : "Policy details"}</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl bg-stone-50 p-3">
                            <p className="text-stone-500 mb-1">{t?.wallet?.policyNumber || "Policy number"}</p>
                            <p className="font-bold text-stone-900 break-words">{acordPolicy?.policyNumber || policy?.policyNumber || "-"}</p>
                        </div>
                        <div className="rounded-2xl bg-stone-50 p-3">
                            <p className="text-stone-500 mb-1">{t?.wallet?.type || "Type"}</p>
                            <p className="font-bold text-stone-900">{policyTypeLabel}</p>
                        </div>
                        <div className="rounded-2xl bg-stone-50 p-3">
                            <p className="text-stone-500 mb-1">{t?.wallet?.starts || "Starts"}</p>
                            <p className="font-bold text-stone-900">{formatDate(startDate, locale)}</p>
                        </div>
                        <div className="rounded-2xl bg-stone-50 p-3">
                            <p className="text-stone-500 mb-1">{t?.wallet?.ends || "Ends"}</p>
                            <p className="font-bold text-stone-900">{formatDate(endDate, locale)}</p>
                        </div>
                    </div>
                </section>

                <section className="rounded-3xl border border-stone-200 bg-white p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <UserRound className="w-4 h-4 text-sky-700" />
                        <h2 className="text-base font-black text-stone-900">{isGreek ? "Ασφαλισμένοι" : "Insured people"}</h2>
                    </div>
                    {insuredNames.length > 0 ? (
                        <ul className="space-y-2">
                            {insuredNames.map((name) => (
                                <li key={name} className="rounded-xl bg-stone-50 px-3 py-2 text-sm text-stone-800">
                                    {name}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-stone-500">{isGreek ? "Δεν βρέθηκαν ονόματα ασφαλισμένων." : "No insured names found."}</p>
                    )}
                </section>

                <section className="rounded-3xl border border-stone-200 bg-white p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <History className="w-4 h-4 text-violet-700" />
                        <h2 className="text-base font-black text-stone-900">{isGreek ? "Ιστορικό ανανεώσεων" : "Renewal history"}</h2>
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
                        <p className="text-sm text-stone-500">
                            {isGreek ? "Δεν υπάρχει ακόμη καταγεγραμμένο ιστορικό ανανέωσης." : "No renewal history available yet."}
                        </p>
                    )}
                </section>

                <section className="rounded-3xl border border-stone-200 bg-white p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-teal-700" />
                        <h2 className="text-base font-black text-stone-900">{t?.wallet?.documents || "Documents"}</h2>
                    </div>
                    {Array.isArray(policy?.documents) && policy.documents.length > 0 ? (
                        <ul className="space-y-2">
                            {policy.documents.map((doc: any) => (
                                <li key={doc.id}>
                                    <button
                                        onClick={() => onDownloadDocument?.(doc.fileUrl)}
                                        className="w-full rounded-2xl border border-stone-200 bg-white px-3 py-3 text-left hover:bg-stone-50 cursor-pointer"
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

                <CollaborationPanel
                    policyId={policy.id}
                    policyNumber={acordPolicy?.policyNumber || policy?.policyNumber}
                    initialShares={initialShares}
                    isOwner={isOwner}
                />
            </div>
        </div>
    )
}
