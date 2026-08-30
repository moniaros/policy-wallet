"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bot, Check, Download, Loader2, ShieldCheck, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import { useLanguage } from "@/contexts/LanguageContext"
import { SettingsSection, SettingsRowList } from "@/components/settings/SettingsSection"
import { SettingRow } from "@/components/settings/SettingRow"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { cancelDeletionRequest, deleteAccount } from "@/app/(protected)/me/actions"
import type { PrivacyData } from "@/app/(protected)/me/data"

const CONSENT_ROWS = [
    { type: "ai_processing", key: "consentAi" },
    { type: "terms", key: "consentTerms" },
    { type: "privacy", key: "consentPrivacy" },
    { type: "cookie", key: "consentCookie" },
] as const

/**
 * Privacy and data.
 *
 * The Article 17 deletion copy here was already the strongest compliance
 * writing in the product and is kept word for word. What is new is the part
 * before it: a plain-language statement of what is stored and what the AI does
 * with it, and the consent history — `ConsentAudit` has recorded every
 * acceptance since launch and nothing has ever shown it to the person who gave
 * it.
 */
export function PrivacySection({ data }: { data: PrivacyData }) {
    const { t, language } = useLanguage()
    const router = useRouter()
    const copy = t.settings.privacy

    const [exporting, setExporting] = useState(false)
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [withdrawing, setWithdrawing] = useState(false)
    const [pendingDeletion, setPendingDeletion] = useState(data.pendingDeletion)

    const consentByType = new Map(data.consents.map((consent) => [consent.type, consent]))

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString(language === "el" ? "el-GR" : "en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
        })

    const handleExport = async () => {
        setExporting(true)
        try {
            const response = await fetch("/api/v1/me/data-export", { method: "POST" })
            const body = await response.json().catch(() => null)
            const downloadUrl = body?.data?.download_url
            if (response.ok && downloadUrl) {
                toast.success(t.settings.exportReady)
                window.location.href = downloadUrl
            } else if (response.status === 429) {
                toast.error(t.settings.exportRateLimited)
            } else {
                toast.error(t.settings.exportFailed)
            }
        } catch {
            toast.error(t.settings.exportFailed)
        } finally {
            setExporting(false)
        }
    }

    const handleDelete = async () => {
        const result = await deleteAccount()
        setDeleteOpen(false)
        if (result.success || result.error === "DELETION_ALREADY_PENDING") {
            // Nothing is deleted yet — the request enters a review queue, so the
            // page stays put and says exactly that.
            setPendingDeletion(true)
            if (result.error) toast.info(t.settings.deletionAlreadyPending)
            router.refresh()
            return
        }
        toast.error(t.settings.deleteFailed)
    }

    const handleWithdrawDeletion = async () => {
        setWithdrawing(true)
        const result = await cancelDeletionRequest()
        setWithdrawing(false)
        if (result.success) {
            setPendingDeletion(false)
            toast.success(t.settings.deletionCancelSuccess)
            router.refresh()
            return
        }
        if (result.error === "DELETION_IN_FLIGHT") {
            toast.error(t.settings.deletionCancelInFlight)
            return
        }
        setPendingDeletion(false)
    }

    return (
        <>
            <SettingsSection title={copy.dataTitle} description={copy.dataDesc}>
                <ul className="space-y-4">
                    {[
                        { icon: ShieldCheck, title: copy.whatWeStore, body: copy.whatWeStoreDesc },
                        { icon: Bot, title: copy.whatAiDoes, body: copy.whatAiDoesDesc },
                        { icon: Sparkles, title: copy.whatYouControl, body: copy.whatYouControlDesc },
                    ].map((item) => (
                        <li key={item.title} className="flex items-start gap-3">
                            <span
                                aria-hidden="true"
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-primary-soft text-primary dark:bg-primary/15 dark:text-mint"
                            >
                                <item.icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-black dark:text-white">
                                    {item.title}
                                </span>
                                <span className="mt-0.5 block text-caption leading-relaxed text-muted-foreground">
                                    {item.body}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            </SettingsSection>

            <SettingsSection title={copy.consentTitle} description={copy.consentDesc}>
                <SettingsRowList>
                    {CONSENT_ROWS.map((row) => {
                        const consent = consentByType.get(row.type)
                        const granted =
                            row.type === "ai_processing" ? data.aiConsentGiven : Boolean(consent)
                        return (
                            <SettingRow
                                key={row.type}
                                label={copy[row.key]}
                                value={
                                    <span className="inline-flex items-center gap-1.5">
                                        {/* Icon plus word — never the colour alone. */}
                                        {granted ? (
                                            <Check
                                                aria-hidden="true"
                                                className="h-3.5 w-3.5 text-primary dark:text-mint"
                                            />
                                        ) : (
                                            <X aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                                        )}
                                        {granted ? copy.consentGranted : copy.consentMissing}
                                    </span>
                                }
                                muted={!granted}
                                hint={
                                    consent
                                        ? `${formatDate(consent.acceptedAt)} · ${copy.consentVersion} ${consent.version}`
                                        : undefined
                                }
                                action={
                                    row.type === "ai_processing" && !granted ? (
                                        <Link href="/consent/ai" className="pw-secondary-button pw-btn-sm">
                                            {copy.consentAiCta}
                                        </Link>
                                    ) : undefined
                                }
                            />
                        )
                    })}
                </SettingsRowList>
                <p className="mt-3 text-caption leading-snug text-muted-foreground">
                    {copy.consentWithdrawNote}
                </p>
            </SettingsSection>

            <SettingsSection title={t.settings.myDataTitle} description={t.settings.myDataDesc}>
                <button
                    type="button"
                    onClick={handleExport}
                    disabled={exporting}
                    className="pw-secondary-button pw-btn-sm disabled:opacity-60"
                >
                    {exporting ? (
                        <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Download aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                    {exporting ? t.settings.exportPreparing : t.settings.exportData}
                </button>
            </SettingsSection>

            {pendingDeletion ? (
                <SettingsSection
                    tone="danger"
                    title={t.settings.deletionPendingTitle}
                    description={t.settings.deletionPendingDesc}
                >
                    <button
                        type="button"
                        onClick={handleWithdrawDeletion}
                        disabled={withdrawing}
                        className="pw-secondary-button pw-btn-sm disabled:opacity-60"
                    >
                        {withdrawing && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}
                        {withdrawing ? t.settings.processing : t.settings.cancelDeletion}
                    </button>
                </SettingsSection>
            ) : (
                <SettingsSection
                    tone="danger"
                    title={t.settings.nuclearDeletion}
                    description={t.settings.nuclearDesc}
                >
                    <button
                        type="button"
                        onClick={() => setDeleteOpen(true)}
                        className="inline-flex min-h-11 items-center rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                    >
                        {t.settings.deletePermanently}
                    </button>
                </SettingsSection>
            )}

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                destructive
                title={t.settings.nuclearDeletion}
                description={t.settings.deleteAccountConfirm}
                consequences={[t.settings.nuclearDesc]}
                confirmLabel={t.settings.deletePermanently}
                onConfirm={handleDelete}
            />
        </>
    )
}
