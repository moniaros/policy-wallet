"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowUpRight, CheckCircle, Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { updateAgentProfile } from "../actions"
import { useLanguage } from "@/contexts/LanguageContext"
import { getRoleCopy } from "@/lib/i18n/role-copy"
import { isAgentRejected, isAgentVerified } from "@/lib/agent/verification"
import { SettingsSection, SettingsRowList } from "@/components/settings/SettingsSection"
import { SettingRow } from "@/components/settings/SettingRow"

const LOB_OPTIONS = [
    { key: "motor", en: "Motor", el: "Αυτοκίνητο" },
    { key: "home", en: "Home", el: "Κατοικία" },
    { key: "health", en: "Health", el: "Υγεία" },
    { key: "life", en: "Life", el: "Ζωή" },
    { key: "travel", en: "Travel", el: "Ταξίδι" },
    { key: "pet", en: "Pet", el: "Κατοικίδιο" },
    { key: "liability", en: "Liability", el: "Αστική ευθύνη" },
    { key: "legal_expenses", en: "Legal Expenses", el: "Νομική προστασία" },
] as const

interface Props {
    initialAgencyName?: string | null
    initialLicenseNumber?: string | null
    initialCommissionRates?: Record<string, number>
    verificationStatus?: string
    subscription?: {
        tier: string
        isPaid: boolean
        maxCustomers: number | null
        currentCustomers: number
        aiAnalysesPerMonth: number | null
    }
}

export function AgentSettingsClient({
    initialAgencyName,
    initialLicenseNumber,
    initialCommissionRates,
    verificationStatus,
    subscription,
}: Props) {
    const { t, language } = useLanguage()
    const roleCopy = getRoleCopy(language)
    const copy = roleCopy.agentSettings

    const [agencyName, setAgencyName] = useState(initialAgencyName || "")
    const [licenseNumber, setLicenseNumber] = useState(initialLicenseNumber || "")
    const [commissionRates, setCommissionRates] = useState<Record<string, number>>(
        initialCommissionRates || {}
    )
    const [saving, setSaving] = useState<null | "profile" | "commissions">(null)

    // "approved" is the value the admin review writes; isAgentVerified is the
    // single source of truth so this card can never drift from it again.
    const verified = isAgentVerified(verificationStatus)
    const rejected = isAgentRejected(verificationStatus)
    const statusLabel = verified ? copy.verifiedLabel : rejected ? copy.rejectedLabel : copy.pending

    const handleCommissionChange = (lob: string, value: string) => {
        const num = parseFloat(value)
        if (value === "" || isNaN(num)) {
            const next = { ...commissionRates }
            delete next[lob]
            setCommissionRates(next)
        } else {
            setCommissionRates({ ...commissionRates, [lob]: Math.min(Math.max(num, 0), 100) })
        }
    }

    const save = async (which: "profile" | "commissions") => {
        setSaving(which)
        const result = await updateAgentProfile({ agencyName, licenseNumber, commissionRates })
        setSaving(null)
        if (result.success) toast.success(copy.updatedSuccess)
        else toast.error(result.error || copy.updatedError)
    }

    const saveButton = (which: "profile" | "commissions", label: string) => (
        <button
            type="button"
            onClick={() => void save(which)}
            disabled={saving !== null}
            className="pw-primary-button pw-btn-sm disabled:opacity-60"
        >
            {saving === which ? (
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
            ) : (
                <Save aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {saving === which ? copy.saving : label}
        </button>
    )

    return (
        <>
            {/* Whether a licensed intermediary's credentials are verified is the
                one line on this page a regulator reads most carefully, so it
                leads — and it reads the SAME status the admin review writes. */}
            <div
                className={`flex items-start gap-3 rounded-xl border p-4 ${
                    verified
                        ? "border-primary/20 bg-primary-soft text-status-success dark:border-primary/30 dark:bg-primary/15"
                        : rejected
                          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                }`}
            >
                {verified ? (
                    <CheckCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                ) : (
                    <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                )}
                <div className="min-w-0">
                    <p className="text-sm font-semibold">
                        {copy.status}: {statusLabel}
                    </p>
                    <p className="mt-0.5 text-caption leading-relaxed">
                        {verified
                            ? copy.verifiedDescription
                            : rejected
                              ? copy.rejectedDescription
                              : copy.underReviewDescription}
                    </p>
                </div>
            </div>

            <SettingsSection title={copy.agencyProfile} description={copy.subtitle}>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label
                            htmlFor="agent-settings-agency-name"
                            className="ml-1 block text-caption font-medium text-muted-foreground"
                        >
                            {copy.agencyName}
                        </label>
                        <input
                            id="agent-settings-agency-name"
                            type="text"
                            value={agencyName}
                            onChange={(e) => setAgencyName(e.target.value)}
                            placeholder={copy.agencyNamePlaceholder}
                            className="pw-input pw-input-sm min-h-11 w-full"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label
                            htmlFor="agent-settings-license-number"
                            className="ml-1 block text-caption font-medium text-muted-foreground"
                        >
                            {copy.licenseNumber}
                        </label>
                        <input
                            id="agent-settings-license-number"
                            type="text"
                            value={licenseNumber}
                            onChange={(e) => setLicenseNumber(e.target.value)}
                            placeholder={copy.licenseNumberPlaceholder}
                            className="pw-input pw-input-sm min-h-11 w-full"
                        />
                    </div>

                    <div className="pt-1">{saveButton("profile", copy.saveChanges)}</div>
                </div>
            </SettingsSection>

            <SettingsSection title={copy.commissionRatesTitle} description={copy.commissionRatesDesc}>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {LOB_OPTIONS.map((lob) => {
                        const label = language === "el" ? lob.el : lob.en
                        return (
                            <div
                                key={lob.key}
                                className="flex min-h-11 items-center gap-3 rounded-xl border border-black/8 bg-black/[0.03] px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]"
                            >
                                <label
                                    htmlFor={`commission-${lob.key}`}
                                    className="flex-1 text-sm font-medium text-black/80 dark:text-white/80"
                                >
                                    {label}
                                </label>
                                <div className="flex items-center gap-1">
                                    <input
                                        id={`commission-${lob.key}`}
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.5}
                                        value={commissionRates[lob.key] ?? ""}
                                        onChange={(e) => handleCommissionChange(lob.key, e.target.value)}
                                        placeholder="—"
                                        className="pw-input pw-input-sm min-h-11 w-20 text-center"
                                    />
                                    <span aria-hidden="true" className="text-caption font-semibold text-muted-foreground">
                                        %
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
                <div className="mt-4">{saveButton("commissions", copy.saveCommissions)}</div>
            </SettingsSection>

            {subscription && (
                <SettingsSection
                    title={copy.subscription}
                    action={
                        <span className="pw-pill">{subscription.tier.replace(/_/g, " ")}</span>
                    }
                >
                    <SettingsRowList>
                        <SettingRow
                            label={copy.customers}
                            value={`${subscription.currentCustomers} / ${subscription.maxCustomers ?? "∞"}`}
                        />
                        <SettingRow
                            label={copy.aiAnalysesPerMonth}
                            value={subscription.aiAnalysesPerMonth ?? "∞"}
                        />
                    </SettingsRowList>
                    <Link
                        href="/agent/pricing"
                        className="pw-secondary-button pw-btn-sm mt-4 inline-flex items-center gap-2"
                    >
                        {copy.upgradePlan}
                        <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" />
                    </Link>
                </SettingsSection>
            )}

            {/* Personal settings are not duplicated here — they are one link
                away, and the rail already lists them. */}
            <SettingsSection title={copy.personalSettingsTitle} description={copy.personalSettingsDesc}>
                <Link href="/account/profile" className="pw-secondary-button pw-btn-sm">
                    {copy.personalSettingsCta}
                </Link>
            </SettingsSection>

            {/* Deactivation has never been implemented here; the real, reviewed
                Article 17 flow lives in privacy settings and this points at it
                rather than pretending to be a second way in. */}
            <SettingsSection tone="danger" title={copy.dangerZone} description={copy.dangerDescription}>
                <Link href="/account/privacy" className="pw-secondary-button pw-btn-sm">
                    {copy.deactivateAccount}
                </Link>
            </SettingsSection>
        </>
    )
}
